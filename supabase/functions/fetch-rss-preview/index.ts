import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { DOMParser } from "https://deno.land/x/deno_dom@v0.1.38/deno-dom-wasm.ts"

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

function parseRSS(xml: string, sourceUrl: string): RSSArticle[] {
  const articles: RSSArticle[] = []

  try {
    const doc = new DOMParser().parseFromString(xml, 'text/xml')
    if (!doc) {
      console.error('Failed to parse RSS XML')
      return articles
    }

    // Determine if it's RSS or Atom format
    const isAtom = !!doc.querySelector('feed')

    if (isAtom) {
      // Parse Atom format
      const entries = doc.querySelectorAll('entry')
      console.log(`🔍 Found ${entries.length} Atom entries`)

      for (const entry of entries) {
        try {
          const title = entry.querySelector('title')?.textContent?.trim() || ''

          // Get link - Atom uses href attribute
          let url = ''
          const linkEl = entry.querySelector('link')
          if (linkEl) {
            url = linkEl.getAttribute('href') || linkEl.textContent?.trim() || ''
          }

          // Get content/summary
          let description = entry.querySelector('content')?.textContent?.trim() ||
                           entry.querySelector('summary')?.textContent?.trim() || ''
          description = description.replace(/<[^>]*>/g, '').trim()

          // Get published date
          const pubDate = entry.querySelector('published')?.textContent?.trim() ||
                         entry.querySelector('updated')?.textContent?.trim() || ''

          // Try to extract image
          let imageUrl: string | null = null
          const mediaContent = entry.querySelector('content[type="image"]')
          if (mediaContent) {
            imageUrl = mediaContent.getAttribute('src') || null
          }

          if (!title || !url) continue

          articles.push({
            id: `${sourceUrl}-${Buffer.from(url).toString('base64').slice(0, 16)}`,
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
    } else {
      // Parse RSS 2.0 format
      const items = doc.querySelectorAll('item')
      console.log(`🔍 Found ${items.length} RSS items`)

      for (const item of items) {
        try {
          const title = item.querySelector('title')?.textContent?.trim() || ''

          let url = item.querySelector('link')?.textContent?.trim() || ''
          if (!url) {
            const linkEl = item.querySelector('link')
            url = linkEl?.getAttribute('href') || ''
          }

          let description = item.querySelector('description')?.textContent?.trim() || ''
          description = description.replace(/<[^>]*>/g, '').trim()

          const pubDate = item.querySelector('pubDate')?.textContent?.trim() || ''

          // Extract image URL
          let imageUrl: string | null = null

          // Try media:thumbnail
          const mediaThumbnail = item.querySelector('thumbnail')
          if (mediaThumbnail) {
            imageUrl = mediaThumbnail.getAttribute('url')
          }

          // Try enclosure
          if (!imageUrl) {
            const enclosure = item.querySelector('enclosure')
            if (enclosure && enclosure.getAttribute('type')?.startsWith('image/')) {
              imageUrl = enclosure.getAttribute('url')
            }
          }

          // Try media:content
          if (!imageUrl) {
            const mediaContent = item.querySelector('content')
            if (mediaContent && mediaContent.getAttribute('medium') === 'image') {
              imageUrl = mediaContent.getAttribute('url')
            }
          }

          // Try to extract from description if it contains img tag
          if (!imageUrl && description) {
            const imgMatch = item.querySelector('description')?.textContent?.match(/<img[^>]+src=["']([^"']+)["']/)
            if (imgMatch) {
              imageUrl = imgMatch[1]
            }
          }

          if (!title || !url) continue

          articles.push({
            id: `${sourceUrl}-${Buffer.from(url).toString('base64').slice(0, 16)}`,
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
    }
  } catch (parseError) {
    console.error('Error in parseRSS:', parseError)
  }

  return articles
}
