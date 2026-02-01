import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Image with metadata for copyright compliance
interface ImageWithMeta {
  url: string
  alt?: string         // Alt text / description
  title?: string       // Image title
  credit?: string      // Author / photographer credit
  caption?: string     // Image caption
  source?: string      // Source attribution
}

interface RSSArticle {
  id: string
  title: string
  url: string
  description: string
  pubDate: string
  imageUrl: string | null
  images: string[]  // Array of all extracted image URLs (backwards compat)
  imagesWithMeta: ImageWithMeta[]  // Images with full metadata for copyright
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

// Helper function to extract ALL attributes from multiple matching tags
function extractAllAttributes(xml: string, tagName: string, attrName: string): string[] {
  const tagPattern = new RegExp(`<${tagName}[^>]*${attrName}=["']([^"']+)["'][^>]*>`, 'gi')
  const results: string[] = []
  let match
  while ((match = tagPattern.exec(xml)) !== null) {
    if (match[1]) {
      results.push(match[1])
    }
  }
  return results
}

// Helper function to extract ALL image URLs from enclosure tags
function extractAllEnclosureImages(xml: string): string[] {
  const results: string[] = []
  // Match enclosure tags with type containing "image"
  const enclosurePattern = /<enclosure[^>]*>/gi
  let match
  while ((match = enclosurePattern.exec(xml)) !== null) {
    const enclosureTag = match[0]
    const typeMatch = enclosureTag.match(/type=["']([^"']+)["']/i)
    const urlMatch = enclosureTag.match(/url=["']([^"']+)["']/i)
    if (typeMatch && urlMatch && typeMatch[1].startsWith('image/')) {
      results.push(urlMatch[1])
    }
  }
  return results
}

// Helper function to extract ALL img tags from HTML content
function extractAllImgTags(html: string): string[] {
  const decoded = decodeHTMLEntities(html)
  const imgPattern = /<img[^>]+src=["']([^"']+)["'][^>]*>/gi
  const results: string[] = []
  let match
  while ((match = imgPattern.exec(decoded)) !== null) {
    if (match[1]) {
      results.push(match[1])
    }
  }
  return results
}

// Helper function to check if URL looks like an image
function isImageUrl(url: string): boolean {
  if (!url) return false
  const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.bmp', '.ico']
  const lowerUrl = url.toLowerCase()
  return imageExtensions.some(ext => lowerUrl.includes(ext)) ||
         lowerUrl.includes('/image') ||
         lowerUrl.includes('img') ||
         lowerUrl.includes('photo') ||
         lowerUrl.includes('picture')
}

// Extract full media:thumbnail/media:content tag with all attributes
function extractMediaTagsWithMeta(xml: string, tagName: string): ImageWithMeta[] {
  const results: ImageWithMeta[] = []
  // Match full tag with all attributes
  const tagPattern = new RegExp(`<${tagName}([^>]*)(?:>([\\s\\S]*?)<\\/${tagName}>|\\s*\\/?>)`, 'gi')
  let match
  while ((match = tagPattern.exec(xml)) !== null) {
    const attributes = match[1] || ''
    const innerContent = match[2] || ''

    // Extract URL
    const urlMatch = attributes.match(/url=["']([^"']+)["']/i)
    if (!urlMatch) continue

    const img: ImageWithMeta = { url: urlMatch[1] }

    // Extract credit/author from media:credit tag inside
    const creditMatch = innerContent.match(/<media:credit[^>]*>([^<]*)<\/media:credit>/i)
    if (creditMatch) {
      img.credit = decodeHTMLEntities(creditMatch[1]).trim()
    }

    // Extract description/caption from media:description tag inside
    const descMatch = innerContent.match(/<media:description[^>]*>([^<]*)<\/media:description>/i)
    if (descMatch) {
      img.caption = decodeHTMLEntities(descMatch[1]).trim()
    }

    // Extract title from media:title tag inside
    const titleMatch = innerContent.match(/<media:title[^>]*>([^<]*)<\/media:title>/i)
    if (titleMatch) {
      img.title = decodeHTMLEntities(titleMatch[1]).trim()
    }

    // Also check for inline attributes (less common but possible)
    const altMatch = attributes.match(/(?:alt|description)=["']([^"']+)["']/i)
    if (altMatch && !img.caption) {
      img.alt = decodeHTMLEntities(altMatch[1]).trim()
    }

    results.push(img)
  }
  return results
}

// Extract img tags from HTML with alt/title attributes
function extractImgTagsWithMeta(html: string): ImageWithMeta[] {
  const decoded = decodeHTMLEntities(html)
  const results: ImageWithMeta[] = []
  // Match img tags with all attributes
  const imgPattern = /<img([^>]*)>/gi
  let match
  while ((match = imgPattern.exec(decoded)) !== null) {
    const attributes = match[1] || ''

    // Extract src URL
    const srcMatch = attributes.match(/src=["']([^"']+)["']/i)
    if (!srcMatch) continue

    const img: ImageWithMeta = { url: srcMatch[1] }

    // Extract alt text
    const altMatch = attributes.match(/alt=["']([^"']+)["']/i)
    if (altMatch) {
      img.alt = altMatch[1].trim()
    }

    // Extract title
    const titleMatch = attributes.match(/title=["']([^"']+)["']/i)
    if (titleMatch) {
      img.title = titleMatch[1].trim()
    }

    // Extract data-caption (common pattern)
    const captionMatch = attributes.match(/data-caption=["']([^"']+)["']/i)
    if (captionMatch) {
      img.caption = captionMatch[1].trim()
    }

    // Extract data-credit or data-author
    const creditMatch = attributes.match(/data-(?:credit|author|photographer)=["']([^"']+)["']/i)
    if (creditMatch) {
      img.credit = creditMatch[1].trim()
    }

    results.push(img)
  }
  return results
}

// Extract enclosure tags with metadata
function extractEnclosureImagesWithMeta(xml: string): ImageWithMeta[] {
  const results: ImageWithMeta[] = []
  // Match full enclosure tags
  const enclosurePattern = /<enclosure([^>]*)(?:\/>|>[^<]*<\/enclosure>)/gi
  let match
  while ((match = enclosurePattern.exec(xml)) !== null) {
    const attributes = match[1] || ''

    // Check if image type
    const typeMatch = attributes.match(/type=["']([^"']+)["']/i)
    const urlMatch = attributes.match(/url=["']([^"']+)["']/i)

    if (typeMatch && urlMatch && typeMatch[1].startsWith('image/')) {
      const img: ImageWithMeta = { url: urlMatch[1] }

      // Extract title if present
      const titleMatch = attributes.match(/title=["']([^"']+)["']/i)
      if (titleMatch) {
        img.title = titleMatch[1].trim()
      }

      results.push(img)
    }
  }
  return results
}

// Extract media:group with credits and descriptions (common in news RSS)
function extractMediaGroupWithMeta(xml: string): ImageWithMeta[] {
  const results: ImageWithMeta[] = []
  // Find media:group blocks
  const groupPattern = /<media:group>([\s\S]*?)<\/media:group>/gi
  let match
  while ((match = groupPattern.exec(xml)) !== null) {
    const groupContent = match[1]

    // Get credit from group (applies to all images in group)
    let groupCredit: string | undefined
    const creditMatch = groupContent.match(/<media:credit[^>]*>([^<]*)<\/media:credit>/i)
    if (creditMatch) {
      groupCredit = decodeHTMLEntities(creditMatch[1]).trim()
    }

    // Get description from group
    let groupCaption: string | undefined
    const descMatch = groupContent.match(/<media:description[^>]*>([^<]*)<\/media:description>/i)
    if (descMatch) {
      groupCaption = decodeHTMLEntities(descMatch[1]).trim()
    }

    // Get images from group
    const imagesInGroup = extractMediaTagsWithMeta(groupContent, 'media:content')
    for (const img of imagesInGroup) {
      if (!img.credit && groupCredit) img.credit = groupCredit
      if (!img.caption && groupCaption) img.caption = groupCaption
      results.push(img)
    }

    const thumbsInGroup = extractMediaTagsWithMeta(groupContent, 'media:thumbnail')
    for (const img of thumbsInGroup) {
      if (!img.credit && groupCredit) img.credit = groupCredit
      if (!img.caption && groupCaption) img.caption = groupCaption
      results.push(img)
    }
  }
  return results
}

// Extract dc:creator or author info from item for image attribution
function extractItemAuthor(xml: string): string | null {
  // Try various author patterns
  const patterns = [
    /<dc:creator[^>]*>([^<]+)<\/dc:creator>/i,
    /<author[^>]*>([^<]+)<\/author>/i,
    /<itunes:author[^>]*>([^<]+)<\/itunes:author>/i,
  ]
  for (const pattern of patterns) {
    const match = xml.match(pattern)
    if (match) {
      return decodeHTMLEntities(match[1]).trim()
    }
  }
  return null
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

          // Extract ALL images with metadata for copyright compliance
          const imagesWithMeta: ImageWithMeta[] = []
          const imageUrls: string[] = []

          // Get item author for default credit
          const itemAuthor = extractItemAuthor(entryXml)

          // Extract from media:group
          const mediaGroupImages = extractMediaGroupWithMeta(entryXml)
          for (const img of mediaGroupImages) {
            if (!imageUrls.includes(img.url) && isImageUrl(img.url)) {
              if (!img.credit && itemAuthor) img.credit = itemAuthor
              img.source = url
              imagesWithMeta.push(img)
              imageUrls.push(img.url)
            }
          }

          // Extract media:thumbnail with metadata
          const thumbnailsWithMeta = extractMediaTagsWithMeta(entryXml, 'media:thumbnail')
          for (const img of thumbnailsWithMeta) {
            if (!imageUrls.includes(img.url)) {
              if (!img.credit && itemAuthor) img.credit = itemAuthor
              img.source = url
              imagesWithMeta.push(img)
              imageUrls.push(img.url)
            }
          }

          // Extract media:content with metadata
          const mediaContentWithMeta = extractMediaTagsWithMeta(entryXml, 'media:content')
          for (const img of mediaContentWithMeta) {
            if (!imageUrls.includes(img.url) && isImageUrl(img.url)) {
              if (!img.credit && itemAuthor) img.credit = itemAuthor
              img.source = url
              imagesWithMeta.push(img)
              imageUrls.push(img.url)
            }
          }

          // Extract img tags from content/summary with alt/title
          const rawContent = extractTagContent(entryXml, 'content') ||
                            extractTagContent(entryXml, 'summary') || ''
          if (rawContent) {
            const contentImagesWithMeta = extractImgTagsWithMeta(rawContent)
            for (const img of contentImagesWithMeta) {
              if (!imageUrls.includes(img.url)) {
                if (!img.credit && itemAuthor) img.credit = itemAuthor
                img.source = url
                imagesWithMeta.push(img)
                imageUrls.push(img.url)
              }
            }
          }

          // First image for backwards compatibility
          const imageUrl = imageUrls[0] || null

          if (!title || !url) continue

          articles.push({
            id: generateId(url, sourceUrl),
            title,
            url,
            description: description.substring(0, 500),
            pubDate,
            imageUrl,
            images: imageUrls,
            imagesWithMeta,
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

          // Extract ALL images with metadata for copyright compliance
          const imagesWithMeta: ImageWithMeta[] = []
          const imageUrls: string[] = []

          // Get item author for default credit
          const itemAuthor = extractItemAuthor(itemXml)

          // Extract from media:group (common in news RSS, has credit info)
          const mediaGroupImages = extractMediaGroupWithMeta(itemXml)
          for (const img of mediaGroupImages) {
            if (!imageUrls.includes(img.url) && isImageUrl(img.url)) {
              if (!img.credit && itemAuthor) img.credit = itemAuthor
              img.source = url // Original article as source
              imagesWithMeta.push(img)
              imageUrls.push(img.url)
            }
          }

          // Extract media:thumbnail with metadata
          const thumbnailsWithMeta = extractMediaTagsWithMeta(itemXml, 'media:thumbnail')
          for (const img of thumbnailsWithMeta) {
            if (!imageUrls.includes(img.url)) {
              if (!img.credit && itemAuthor) img.credit = itemAuthor
              img.source = url
              imagesWithMeta.push(img)
              imageUrls.push(img.url)
            }
          }

          // Extract enclosure images with metadata
          const enclosureImagesWithMeta = extractEnclosureImagesWithMeta(itemXml)
          for (const img of enclosureImagesWithMeta) {
            if (!imageUrls.includes(img.url)) {
              if (!img.credit && itemAuthor) img.credit = itemAuthor
              img.source = url
              imagesWithMeta.push(img)
              imageUrls.push(img.url)
            }
          }

          // Extract media:content with metadata
          const mediaContentWithMeta = extractMediaTagsWithMeta(itemXml, 'media:content')
          for (const img of mediaContentWithMeta) {
            if (!imageUrls.includes(img.url) && isImageUrl(img.url)) {
              if (!img.credit && itemAuthor) img.credit = itemAuthor
              img.source = url
              imagesWithMeta.push(img)
              imageUrls.push(img.url)
            }
          }

          // Extract img tags from description with alt/title
          if (rawDescription) {
            const descImagesWithMeta = extractImgTagsWithMeta(rawDescription)
            for (const img of descImagesWithMeta) {
              if (!imageUrls.includes(img.url)) {
                if (!img.credit && itemAuthor) img.credit = itemAuthor
                img.source = url
                imagesWithMeta.push(img)
                imageUrls.push(img.url)
              }
            }
          }

          // First image for backwards compatibility
          const imageUrl = imageUrls[0] || null

          if (!title || !url) continue

          articles.push({
            id: generateId(url, sourceUrl),
            title,
            url,
            description: description.substring(0, 500),
            pubDate,
            imageUrl,
            images: imageUrls,
            imagesWithMeta,
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
