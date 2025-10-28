import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { DOMParser } from 'https://deno.land/x/deno_dom@v0.1.38/deno-dom-wasm.ts'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

interface TelegramSource {
  id: string
  name: string
  url: string
  is_active: boolean
  last_fetched_at: string | null
}

interface ScrapedPost {
  channelUsername: string
  messageId: string
  text: string
  photoUrl: string | null
  date: Date
  originalUrl: string
}

serve(async (req) => {
  try {
    console.log('🕷️  Telegram Scraper started')

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    // Get active Telegram sources from database
    const { data: sources, error: sourcesError } = await supabase
      .from('news_sources')
      .select('id, name, url, is_active, last_fetched_at')
      .eq('source_type', 'telegram')
      .eq('is_active', true)

    if (sourcesError) {
      throw new Error(`Failed to fetch sources: ${sourcesError.message}`)
    }

    if (!sources || sources.length === 0) {
      console.log('ℹ️  No active Telegram sources found')
      return new Response(
        JSON.stringify({ ok: true, message: 'No active sources', processed: 0 }),
        { headers: { 'Content-Type': 'application/json' } }
      )
    }

    console.log(`📋 Found ${sources.length} active Telegram source(s)`)

    let totalProcessed = 0
    const results: { channel: string; processed: number; error?: string }[] = []

    // Process each channel
    for (const source of sources) {
      try {
        const channelUsername = extractUsername(source.url)
        if (!channelUsername) {
          console.log(`⚠️  Invalid URL for source ${source.name}: ${source.url}`)
          results.push({ channel: source.name, processed: 0, error: 'Invalid URL' })
          continue
        }

        console.log(`\n🕷️  Scraping channel: @${channelUsername}`)

        // Fetch public Telegram channel page
        const publicUrl = `https://t.me/s/${channelUsername}`
        console.log(`📡 Fetching: ${publicUrl}`)

        const response = await fetch(publicUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          },
        })

        if (!response.ok) {
          throw new Error(`Failed to fetch channel: ${response.status} ${response.statusText}`)
        }

        const html = await response.text()
        console.log(`✅ Fetched HTML (${html.length} bytes)`)

        // Parse HTML
        const posts = await parseChannelPosts(html, channelUsername)
        console.log(`📨 Found ${posts.length} posts`)

        // Get last_fetched_at to filter only new posts
        const lastFetchedAt = source.last_fetched_at
          ? new Date(source.last_fetched_at)
          : new Date(Date.now() - 24 * 60 * 60 * 1000) // Default: last 24 hours

        console.log(`🕒 Filtering posts since: ${lastFetchedAt.toISOString()}`)

        const newPosts = posts.filter(post => post.date > lastFetchedAt)
        console.log(`✅ Found ${newPosts.length} new post(s)`)

        // Process new posts
        let processedCount = 0
        for (const post of newPosts) {
          try {
            console.log(`🔄 Processing post ${post.messageId}...`)

            // Download and upload photo if exists
            let photoUrl = post.photoUrl
            if (photoUrl) {
              try {
                // Download photo
                const photoResponse = await fetch(photoUrl)
                if (photoResponse.ok) {
                  const photoBuffer = await photoResponse.arrayBuffer()

                  // Upload to Supabase Storage
                  const fileName = `telegram/${channelUsername}/${post.messageId}.jpg`
                  const { data: uploadData, error: uploadError } = await supabase.storage
                    .from('news-images')
                    .upload(fileName, photoBuffer, {
                      contentType: 'image/jpeg',
                      upsert: true,
                    })

                  if (!uploadError && uploadData) {
                    const { data: urlData } = supabase.storage
                      .from('news-images')
                      .getPublicUrl(fileName)
                    photoUrl = urlData.publicUrl
                    console.log(`📸 Photo uploaded: ${photoUrl}`)
                  }
                }
              } catch (photoError) {
                console.error(`❌ Failed to process photo: ${photoError}`)
                // Continue without photo
                photoUrl = null
              }
            }

            // Send to process-news
            const processResponse = await fetch(`${SUPABASE_URL}/functions/v1/process-news`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
              },
              body: JSON.stringify({
                content: post.text,
                imageUrl: photoUrl,
                sourceType: 'telegram_scraper',
                channelUsername: post.channelUsername,
                originalUrl: post.originalUrl,
              }),
            })

            if (processResponse.ok) {
              console.log(`✅ Post ${post.messageId} processed successfully`)
              processedCount++
              totalProcessed++
            } else {
              const errorText = await processResponse.text()
              console.error(`❌ Failed to process post ${post.messageId}: ${errorText}`)
            }
          } catch (processError) {
            console.error(`❌ Error processing post ${post.messageId}:`, processError)
          }
        }

        // Update last_fetched_at
        const { error: updateError } = await supabase
          .from('news_sources')
          .update({ last_fetched_at: new Date().toISOString() })
          .eq('id', source.id)

        if (updateError) {
          console.error(`❌ Failed to update last_fetched_at for ${source.name}:`, updateError)
        }

        results.push({ channel: channelUsername, processed: processedCount })

        // Rate limiting: wait 3 seconds between channels
        if (sources.indexOf(source) < sources.length - 1) {
          console.log('⏳ Waiting 3s before next channel...')
          await new Promise((resolve) => setTimeout(resolve, 3000))
        }
      } catch (channelError: any) {
        console.error(`❌ Error scraping channel ${source.name}:`, channelError)
        results.push({
          channel: source.name,
          processed: 0,
          error: channelError.message || 'Unknown error',
        })
      }
    }

    console.log(`\n🎉 Scraping complete! Total processed: ${totalProcessed}`)

    return new Response(
      JSON.stringify({
        ok: true,
        message: 'Scraping complete',
        totalProcessed,
        results,
      }),
      { headers: { 'Content-Type': 'application/json' } }
    )
  } catch (error: any) {
    console.error('❌ Error in telegram-scraper:', error)
    return new Response(
      JSON.stringify({
        ok: false,
        error: error.message || 'Unknown error',
        stack: error.stack,
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  }
})

/**
 * Parse Telegram channel posts from HTML
 */
async function parseChannelPosts(html: string, channelUsername: string): Promise<ScrapedPost[]> {
  const posts: ScrapedPost[] = []

  try {
    const doc = new DOMParser().parseFromString(html, 'text/html')
    if (!doc) {
      console.error('Failed to parse HTML')
      return posts
    }

    // Find all message divs
    const messages = doc.querySelectorAll('.tgme_widget_message')
    console.log(`🔍 Found ${messages.length} message elements`)

    for (const message of messages) {
      try {
        // Extract message ID from data-post attribute
        const dataPost = message.getAttribute('data-post')
        if (!dataPost) continue

        const messageId = dataPost.split('/')[1] // Format: "channel/123"
        if (!messageId) continue

        // Extract text
        const textElement = message.querySelector('.tgme_widget_message_text')
        const text = textElement?.textContent?.trim() || ''

        // Extract photo URL
        let photoUrl: string | null = null
        const photoElement = message.querySelector('.tgme_widget_message_photo_wrap')
        if (photoElement) {
          const style = photoElement.getAttribute('style') || ''
          const match = style.match(/background-image:url\('([^']+)'\)/)
          if (match && match[1]) {
            photoUrl = match[1]
          }
        }

        // Extract date
        const dateElement = message.querySelector('.tgme_widget_message_date time')
        const datetime = dateElement?.getAttribute('datetime')
        const date = datetime ? new Date(datetime) : new Date()

        // Skip if no content
        if (!text && !photoUrl) {
          continue
        }

        posts.push({
          channelUsername,
          messageId,
          text,
          photoUrl,
          date,
          originalUrl: `https://t.me/${channelUsername}/${messageId}`,
        })
      } catch (postError) {
        console.error('Error parsing post:', postError)
        continue
      }
    }
  } catch (parseError) {
    console.error('Error in parseChannelPosts:', parseError)
  }

  return posts
}

/**
 * Extract username from Telegram URL
 */
function extractUsername(url: string): string | null {
  if (url.includes('t.me/')) {
    const match = url.match(/t\.me\/(?:s\/)?([^/]+)/)
    return match ? match[1] : null
  }
  if (url.startsWith('@')) {
    return url.substring(1)
  }
  return url
}
