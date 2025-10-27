import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { DOMParser } from "https://deno.land/x/deno_dom@v0.1.38/deno-dom-wasm.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('Starting news monitoring...')

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get active news sources
    const { data: sources, error } = await supabase
      .from('news_sources')
      .select('*')
      .eq('is_active', true)

    if (error) {
      console.error('Error fetching sources:', error)
      throw error
    }

    console.log(`Found ${sources?.length || 0} active sources`)

    const results = []
    let totalProcessed = 0

    // Process each source
    for (const source of sources || []) {
      console.log(`Processing source: ${source.name}`)

      try {
        if (source.source_type === 'rss' && source.rss_url) {
          const articles = await fetchRSS(source)

          // Send articles to Telegram
          let sentCount = 0
          for (const article of articles) {
            await sendToTelegram(article, source.name)
            sentCount++
          }

          totalProcessed += sentCount

          results.push({
            source: source.name,
            new_articles: articles.length,
            sent_to_telegram: sentCount,
            success: true
          })

          // Update last_fetched_at
          await supabase
            .from('news_sources')
            .update({ last_fetched_at: new Date().toISOString() })
            .eq('id', source.id)
        }
      } catch (sourceError) {
        console.error(`Error processing ${source.name}:`, sourceError)
        results.push({
          source: source.name,
          success: false,
          error: sourceError.message
        })
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        checked: sources?.length || 0,
        processed: totalProcessed,
        results
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Monitor news error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})

async function fetchRSS(source: any) {
  console.log(`Fetching RSS from: ${source.rss_url}`)

  const response = await fetch(source.rss_url)
  const xml = await response.text()

  // Parse XML as HTML (deno_dom text/xml is not implemented)
  const doc = new DOMParser().parseFromString(xml, 'text/html')

  if (!doc) {
    throw new Error('Failed to parse RSS feed')
  }

  const articles = []
  const items = doc.querySelectorAll('item')

  console.log(`Found ${items.length} items in RSS feed`)

  // Get only the latest 5 articles
  const latestItems = Array.from(items).slice(0, 5)

  // Check which articles are already in database
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  )

  for (const item of latestItems) {
    const title = item.querySelector('title')?.textContent || 'No title'

    // Try multiple ways to get the link
    let link = item.querySelector('link')?.textContent?.trim() || ''
    if (!link) {
      link = item.querySelector('link')?.innerHTML?.trim() || ''
    }
    if (!link) {
      link = item.querySelector('guid')?.textContent?.trim() || ''
    }

    const description = item.querySelector('description')?.textContent || ''
    const pubDate = item.querySelector('pubDate')?.textContent || ''

    if (!link) {
      console.log(`Skipping article without link: ${title}`)
      continue
    }

    console.log(`Processing article: ${title} - ${link}`)

    // Check if article already exists in news table
    const { data: existing, error: checkError } = await supabase
      .from('news')
      .select('id')
      .eq('original_url', link)
      .limit(1)

    if (checkError) {
      console.error('Error checking for existing article:', checkError)
      continue
    }

    // Skip if article already exists
    if (existing && existing.length > 0) {
      console.log(`Article already exists: ${title}`)
      continue
    }

    // Clean HTML from description
    const cleanDescription = description.replace(/<[^>]*>/g, '').trim()

    articles.push({
      title,
      url: link,
      description: cleanDescription.substring(0, 500), // Limit description
      pubDate
    })
  }

  console.log(`Found ${articles.length} NEW articles (not in database yet)`)

  return articles
}

async function extractImageFromArticle(articleUrl: string): Promise<string | null> {
  try {
    console.log(`Extracting image from: ${articleUrl}`)

    const response = await fetch(articleUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    })

    if (!response.ok) {
      console.log(`Failed to fetch article page: ${response.status}`)
      return null
    }

    const html = await response.text()
    const doc = new DOMParser().parseFromString(html, 'text/html')

    if (!doc) return null

    // Try og:image meta tag first (most reliable)
    const ogImage = doc.querySelector('meta[property="og:image"]')?.getAttribute('content')
    if (ogImage) {
      console.log(`Found og:image: ${ogImage}`)
      return ogImage
    }

    // Try twitter:image
    const twitterImage = doc.querySelector('meta[name="twitter:image"]')?.getAttribute('content')
    if (twitterImage) {
      console.log(`Found twitter:image: ${twitterImage}`)
      return twitterImage
    }

    // Try first large img tag
    const images = doc.querySelectorAll('img')
    for (const img of images) {
      const src = img.getAttribute('src')
      if (src && !src.includes('logo') && !src.includes('icon')) {
        console.log(`Found img src: ${src}`)
        return src
      }
    }

    console.log('No image found in article')
    return null
  } catch (error) {
    console.error('Error extracting image:', error)
    return null
  }
}

async function downloadAndUploadImage(imageUrl: string, newsId: string): Promise<string | null> {
  try {
    console.log(`Downloading image: ${imageUrl}`)

    // Download image
    const response = await fetch(imageUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    })

    if (!response.ok) {
      console.log(`Failed to download image: ${response.status}`)
      return null
    }

    const imageBlob = await response.blob()
    const arrayBuffer = await imageBlob.arrayBuffer()
    const imageBuffer = new Uint8Array(arrayBuffer)

    // Determine file extension from content type
    const contentType = response.headers.get('content-type') || 'image/jpeg'
    const ext = contentType.split('/')[1]?.split(';')[0] || 'jpg'

    // Upload to Supabase Storage
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const fileName = `${newsId}.${ext}`
    const { data, error } = await supabase.storage
      .from('news-images')
      .upload(fileName, imageBuffer, {
        contentType,
        upsert: true
      })

    if (error) {
      console.error('Error uploading to storage:', error)
      return null
    }

    // Get public URL
    const { data: publicUrlData } = supabase.storage
      .from('news-images')
      .getPublicUrl(fileName)

    console.log(`Image uploaded successfully: ${publicUrlData.publicUrl}`)
    return publicUrlData.publicUrl
  } catch (error) {
    console.error('Error downloading/uploading image:', error)
    return null
  }
}

async function sendToTelegram(article: any, sourceName: string) {
  const TELEGRAM_BOT_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN')
  const TELEGRAM_CHAT_ID = Deno.env.get('TELEGRAM_CHAT_ID')

  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
    console.error('Telegram credentials not configured')
    return
  }

  // Store article in database temporarily with pending status
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  )

  // Create pending news entry
  const { data: newsEntry, error: insertError } = await supabase
    .from('news')
    .insert({
      original_title: article.title,
      original_content: article.description,
      original_url: article.url,
      is_published: false,
      is_rewritten: false
    })
    .select('id')
    .single()

  if (insertError || !newsEntry) {
    console.error('Failed to create news entry:', insertError)
    return
  }

  // Extract and upload image
  const imageUrl = await extractImageFromArticle(article.url)
  if (imageUrl) {
    const uploadedImageUrl = await downloadAndUploadImage(imageUrl, newsEntry.id)
    if (uploadedImageUrl) {
      // Update news entry with image URL
      await supabase
        .from('news')
        .update({ image_url: uploadedImageUrl })
        .eq('id', newsEntry.id)

      console.log(`Image saved for article: ${article.title}`)
    }
  }

  const message = `🆕 <b>New Article Found!</b>

<b>Source:</b> ${sourceName}
<b>Title:</b> ${article.title}

<b>Description:</b>
${article.description.substring(0, 300)}...

<b>URL:</b> ${article.url}

<i>Published:</i> ${article.pubDate || 'Unknown'}`

  const keyboard = {
    inline_keyboard: [[
      { text: '✅ Publish', callback_data: `publish_${newsEntry.id}` },
      { text: '❌ Reject', callback_data: `reject_${newsEntry.id}` }
    ]]
  }

  try {
    const response = await fetch(
      `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: TELEGRAM_CHAT_ID,
          text: message,
          reply_markup: keyboard,
          parse_mode: 'HTML'
        })
      }
    )

    const result = await response.json()

    if (!result.ok) {
      console.error('Telegram API error:', result)
    } else {
      console.log(`Sent article to Telegram: ${article.title}`)
    }
  } catch (error) {
    console.error('Error sending to Telegram:', error)
  }
}
