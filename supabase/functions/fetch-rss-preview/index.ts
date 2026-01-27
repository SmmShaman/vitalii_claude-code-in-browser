import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface RSSArticle {
  id: string
  title: string
  url: string
  description: string
  pubDate: string
  imageUrl: string | null
  sourceName?: string
}

interface CacheEntry {
  articles: RSSArticle[]
  timestamp: number
}

// In-memory cache with 5 minute TTL
const cache = new Map<string, CacheEntry>()
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

function getCached(url: string): RSSArticle[] | null {
  const entry = cache.get(url)
  if (!entry) return null

  const now = Date.now()
  if (now - entry.timestamp > CACHE_TTL) {
    cache.delete(url)
    return null
  }

  return entry.articles
}

function setCache(url: string, articles: RSSArticle[]) {
  cache.set(url, {
    articles,
    timestamp: Date.now()
  })
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { rssUrl, limit = 5 } = await req.json()

    if (!rssUrl) {
      return new Response(
        JSON.stringify({ error: 'rssUrl is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`📡 Fetching RSS: ${rssUrl}`)

    // Check cache first
    const cached = getCached(rssUrl)
    if (cached) {
      console.log(`📦 Cache hit for ${rssUrl}`)
      return new Response(
        JSON.stringify({
          articles: cached.slice(0, limit),
          cached: true,
          total: cached.length
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Fetch RSS feed
    const response = await fetch(rssUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/rss+xml, application/xml, text/xml, */*',
      },
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch RSS: ${response.status} ${response.statusText}`)
    }

    const xml = await response.text()
    console.log(`✅ Fetched RSS (${xml.length} bytes)`)

    // Parse RSS
    const articles = parseRSS(xml, rssUrl)
    console.log(`📰 Parsed ${articles.length} articles`)

    // Cache the results
    setCache(rssUrl, articles)

    return new Response(
      JSON.stringify({
        articles: articles.slice(0, limit),
        cached: false,
        total: articles.length
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error: any) {
    console.error('❌ Error:', error)
    return new Response(
      JSON.stringify({
        error: error.message || 'Unknown error',
        articles: [],
        cached: false
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

// Helper function to extract text between XML tags
function extractTagContent(xml: string, tagName: string): string | null {
  // Handle namespaced tags (e.g., media:thumbnail)
  const patterns = [
    new RegExp(`<${tagName}[^>]*>([\\s\\S]*?)</${tagName}>`, 'i'),
    new RegExp(`<${tagName}[^>]*/?>`, 'i'), // self-closing tag
  ]

  for (const pattern of patterns) {
    const match = xml.match(pattern)
    if (match) {
      return match[1]?.trim() || ''
    }
  }
  return null
}

// Helper function to extract attribute from tag
function extractAttribute(xml: string, tagName: string, attrName: string): string | null {
  const tagPattern = new RegExp(`<${tagName}[^>]*${attrName}=["']([^"']+)["'][^>]*>`, 'i')
  const match = xml.match(tagPattern)
  return match ? match[1] : null
}

// Helper to decode HTML entities
function decodeHTMLEntities(text: string): string {
  return text
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
}

// Helper to generate a simple ID
function generateId(url: string, sourceUrl: string): string {
  // Simple hash-like ID from URL
  let hash = 0
  for (let i = 0; i < url.length; i++) {
    const char = url.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32bit integer
  }
  return `${sourceUrl.replace(/[^a-z0-9]/gi, '').slice(0, 10)}-${Math.abs(hash).toString(36)}`
}

function parseRSS(xml: string, sourceUrl: string): RSSArticle[] {
  const articles: RSSArticle[] = []

  try {
    // Determine if it's RSS or Atom format
    const isAtom = xml.includes('<feed') && xml.includes('xmlns="http://www.w3.org/2005/Atom"')

    if (isAtom) {
      // Parse Atom format using regex
      const entryRegex = /<entry[^>]*>([\s\S]*?)<\/entry>/gi
      let entryMatch: RegExpExecArray | null
      let count = 0

      while ((entryMatch = entryRegex.exec(xml)) !== null) {
        count++
        try {
          const entryXml = entryMatch[1]

          // Extract title
          let title = extractTagContent(entryXml, 'title') || ''
          title = decodeHTMLEntities(title).replace(/<[^>]*>/g, '').trim()

          // Extract link (Atom uses href attribute)
          let url = extractAttribute(entryXml, 'link', 'href') || ''
          if (!url) {
            url = extractTagContent(entryXml, 'link') || ''
          }

          // Extract content/summary
          let description = extractTagContent(entryXml, 'content') ||
                           extractTagContent(entryXml, 'summary') || ''
          description = decodeHTMLEntities(description).replace(/<[^>]*>/g, '').trim()

          // Extract published date
          const pubDate = extractTagContent(entryXml, 'published') ||
                         extractTagContent(entryXml, 'updated') || ''

          // Try to extract image
          let imageUrl: string | null = null
          // Check for media:thumbnail or media:content
          imageUrl = extractAttribute(entryXml, 'media:thumbnail', 'url') ||
                    extractAttribute(entryXml, 'media:content', 'url') ||
                    null

          if (!title || !url) continue

          articles.push({
            id: generateId(url, sourceUrl),
            title,
            url,
            description: description.substring(0, 500),
            pubDate,
            imageUrl,
          })
        } catch (e) {
          console.error('Error parsing Atom entry:', e)
        }
      }
      console.log(`🔍 Found ${count} Atom entries`)

    } else {
      // Parse RSS 2.0 format using regex
      const itemRegex = /<item[^>]*>([\s\S]*?)<\/item>/gi
      let itemMatch: RegExpExecArray | null
      let count = 0

      while ((itemMatch = itemRegex.exec(xml)) !== null) {
        count++
        try {
          const itemXml = itemMatch[1]

          // Extract title
          let title = extractTagContent(itemXml, 'title') || ''
          title = decodeHTMLEntities(title).replace(/<[^>]*>/g, '').trim()

          // Extract link
          let url = extractTagContent(itemXml, 'link') || ''
          if (!url) {
            url = extractAttribute(itemXml, 'link', 'href') || ''
          }
          url = url.trim()

          // Extract description
          let description = extractTagContent(itemXml, 'description') || ''
          const rawDescription = description // Keep for image extraction
          description = decodeHTMLEntities(description).replace(/<[^>]*>/g, '').trim()

          // Extract pubDate
          const pubDate = extractTagContent(itemXml, 'pubDate') || ''

          // Extract image URL - try various sources
          let imageUrl: string | null = null

          // Try media:thumbnail
          imageUrl = extractAttribute(itemXml, 'media:thumbnail', 'url')

          // Try enclosure with image type
          if (!imageUrl) {
            const enclosureType = extractAttribute(itemXml, 'enclosure', 'type')
            if (enclosureType?.startsWith('image/')) {
              imageUrl = extractAttribute(itemXml, 'enclosure', 'url')
            }
          }

          // Try media:content
          if (!imageUrl) {
            const medium = extractAttribute(itemXml, 'media:content', 'medium')
            if (medium === 'image') {
              imageUrl = extractAttribute(itemXml, 'media:content', 'url')
            }
            // Also try without medium check
            if (!imageUrl) {
              imageUrl = extractAttribute(itemXml, 'media:content', 'url')
            }
          }

          // Try to extract from description if it contains img tag
          if (!imageUrl && rawDescription) {
            const imgMatch = decodeHTMLEntities(rawDescription).match(/<img[^>]+src=["']([^"']+)["']/)
            if (imgMatch) {
              imageUrl = imgMatch[1]
            }
          }

          if (!title || !url) continue

          articles.push({
            id: generateId(url, sourceUrl),
            title,
            url,
            description: description.substring(0, 500),
            pubDate,
            imageUrl,
          })
        } catch (e) {
          console.error('Error parsing RSS item:', e)
        }
      }
      console.log(`🔍 Found ${count} RSS items`)
    }
  } catch (parseError) {
    console.error('Error in parseRSS:', parseError)
  }

  return articles
}
