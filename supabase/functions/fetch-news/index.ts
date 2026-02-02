import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'
import { DOMParser } from "https://deno.land/x/deno_dom@v0.1.38/deno-dom-wasm.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const TELEGRAM_BOT_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN')
const TELEGRAM_CHAT_ID = Deno.env.get('TELEGRAM_CHAT_ID')

interface RSSArticle {
  title: string
  url: string
  description: string
  pubDate: string
  imageUrl: string | null
  videoUrl: string | null
  videoType: string | null
}

/**
 * Decode HTML/XML entities in URLs
 * RSS feeds often contain XML-escaped URLs where & is encoded as &amp;
 */
function decodeHTMLEntities(text: string | null): string | null {
  if (!text) return null
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('🗞️  RSS News Fetcher started')

    // Log configuration status
    console.log('Config check:', {
      hasSupabaseUrl: !!SUPABASE_URL,
      hasSupabaseKey: !!SUPABASE_SERVICE_ROLE_KEY,
      hasTelegramToken: !!TELEGRAM_BOT_TOKEN,
      hasTelegramChatId: !!TELEGRAM_CHAT_ID
    })

    if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
      console.warn('⚠️  Telegram bot credentials not configured. Posts will be saved to DB but NOT sent to Telegram bot for moderation.')
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    // Check if pre-moderation is enabled (global toggle)
    const { data: preModerationSetting } = await supabase
      .from('api_settings')
      .select('key_value')
      .eq('key_name', 'ENABLE_PRE_MODERATION')
      .single()

    const isPreModerationEnabled = preModerationSetting?.key_value !== 'false'
    console.log(`🤖 Pre-moderation enabled: ${isPreModerationEnabled}`)

    // Get active RSS sources from database
    const { data: sources, error: sourcesError } = await supabase
      .from('news_sources')
      .select('id, name, url, rss_url, is_active, last_fetched_at, fetch_interval')
      .eq('source_type', 'rss')
      .eq('is_active', true)

    if (sourcesError) {
      throw new Error(`Failed to fetch sources: ${sourcesError.message}`)
    }

    if (!sources || sources.length === 0) {
      console.log('ℹ️  No active RSS sources found')
      return new Response(
        JSON.stringify({ ok: true, message: 'No active RSS sources', processed: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`📋 Found ${sources.length} active RSS source(s)`)

    // Filter sources based on their individual fetch_interval
    // Only process sources where it's time to fetch according to their schedule
    const now = Date.now()
    const sourcesToProcess = sources.filter(source => {
      // If never fetched, process it
      if (!source.last_fetched_at) {
        console.log(`✅ Processing ${source.name} (never fetched before)`)
        return true
      }

      // Check if enough time has passed based on fetch_interval
      const lastFetchTime = new Date(source.last_fetched_at).getTime()
      const intervalMs = source.fetch_interval * 1000
      const nextFetchTime = lastFetchTime + intervalMs
      const shouldFetch = now >= nextFetchTime

      if (shouldFetch) {
        const minutesSinceLastFetch = Math.floor((now - lastFetchTime) / 60000)
        console.log(`✅ Processing ${source.name} (last fetched ${minutesSinceLastFetch} minutes ago, interval: ${source.fetch_interval / 60} minutes)`)
        return true
      } else {
        const minutesUntilNextFetch = Math.ceil((nextFetchTime - now) / 60000)
        console.log(`⏭️  Skipping ${source.name} (next fetch in ${minutesUntilNextFetch} minutes)`)
        return false
      }
    })

    if (sourcesToProcess.length === 0) {
      console.log('ℹ️  No sources ready to fetch at this time')
      return new Response(
        JSON.stringify({
          ok: true,
          message: 'No sources ready to fetch',
          totalSources: sources.length,
          sourcesProcessed: 0,
          sourcesSkipped: sources.length
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`🎯 Processing ${sourcesToProcess.length} / ${sources.length} source(s)`)

    let totalProcessed = 0
    let totalApproved = 0
    let totalRejected = 0
    let totalSentToBot = 0
    const results: { source: string; processed: number; approved?: number; rejected?: number; sentToBot?: number; error?: string }[] = []

    // Process each RSS source (only those ready to fetch)
    for (const source of sourcesToProcess) {
      try {
        if (!source.rss_url) {
          console.log(`⚠️  Source ${source.name} has no RSS URL`)
          results.push({ source: source.name, processed: 0, error: 'No RSS URL' })
          continue
        }

        console.log(`\n🕷️  Fetching RSS: ${source.name}`)
        console.log(`📡 URL: ${source.rss_url}`)

        // Fetch RSS feed
        const response = await fetch(source.rss_url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          },
        })

        if (!response.ok) {
          throw new Error(`Failed to fetch RSS: ${response.status} ${response.statusText}`)
        }

        const xml = await response.text()
        console.log(`✅ Fetched RSS (${xml.length} bytes)`)

        // Parse RSS
        const articles = await parseRSS(xml)
        console.log(`📨 Found ${articles.length} articles`)

        // Get last_fetched_at to filter only new articles
        const lastFetchedAt = source.last_fetched_at
          ? new Date(source.last_fetched_at)
          : new Date(Date.now() - 24 * 60 * 60 * 1000) // Default: last 24 hours

        console.log(`🕒 Filtering articles since: ${lastFetchedAt.toISOString()}`)

        const newArticles = articles.filter(article => {
          if (!article.pubDate) return true // Include if no date
          const articleDate = new Date(article.pubDate)
          return articleDate > lastFetchedAt
        })
        console.log(`✅ Found ${newArticles.length} new article(s)`)

        // Process new articles
        let processedCount = 0
        let approvedCount = 0
        let rejectedCount = 0
        let sentToBotCount = 0

        for (const article of newArticles) {
          try {
            console.log(`🔄 Processing article: ${article.title.substring(0, 50)}...`)

            // Check for duplicate by URL
            // Note: RSS URLs are usually stable, but we log the check for debugging
            // Only check non-rejected articles (allow re-scanning of previously rejected articles)
            const { data: existingArticle } = await supabase
              .from('news')
              .select('id, original_url, created_at, pre_moderation_status')
              .eq('original_url', article.url)
              .neq('pre_moderation_status', 'rejected')  // Ignore rejected articles
              .maybeSingle()

            if (existingArticle) {
              console.log(`⏭️  Skipping duplicate article: ${article.url} (found in DB from ${existingArticle.created_at}, status: ${existingArticle.pre_moderation_status})`)
              continue
            }

            // Save to database with pending status (waiting for moderation)
            const { data: newsEntry, error: insertError } = await supabase
              .from('news')
              .insert({
                original_title: article.title,
                original_content: article.description,
                original_url: article.url,
                image_url: article.imageUrl,
                video_url: article.videoUrl,
                video_type: article.videoType,
                source_id: source.id,
                is_published: false,
                is_rewritten: false,
                pre_moderation_status: 'pending'
              })
              .select('id')
              .single()

            if (insertError || !newsEntry) {
              console.error(`❌ Failed to create news entry: ${insertError}`)
              continue
            }

            console.log(`💾 News entry created with ID: ${newsEntry.id}`)

            // 🤖 AI PRE-MODERATION (check global toggle)
            let moderationResult = {
              approved: true,
              reason: 'Pre-moderation disabled',
              is_advertisement: false,
              is_duplicate: false,
              quality_score: 5
            }

            if (isPreModerationEnabled) {
              console.log(`🤖 Running AI pre-moderation for article...`)
              moderationResult = await preModerate(
                article.title,
                article.description,
                article.url
              )
              console.log(`Pre-moderation result: ${moderationResult.approved ? '✅ Approved' : '❌ Rejected'} - ${moderationResult.reason}`)
            } else {
              console.log(`⏭️ Pre-moderation disabled, auto-approving article`)
            }

            // Update pre-moderation status in DB
            await supabase
              .from('news')
              .update({
                pre_moderation_status: moderationResult.approved ? 'approved' : 'rejected',
                rejection_reason: moderationResult.approved ? null : moderationResult.reason,
                moderation_checked_at: new Date().toISOString()
              })
              .eq('id', newsEntry.id)

            // Send to Telegram bot ONLY if approved by AI
            if (moderationResult.approved) {
              approvedCount++
              totalApproved++

              if (TELEGRAM_BOT_TOKEN && TELEGRAM_CHAT_ID) {
                const sent = await sendToTelegramBot(newsEntry.id, article, source.name)
                if (sent) {
                  sentToBotCount++
                  totalSentToBot++
                  console.log(`✅ Article sent to Telegram bot for moderation`)
                } else {
                  console.warn(`⚠️  Failed to send article to Telegram bot (saved in DB anyway)`)
                }
              } else {
                console.log(`ℹ️  Telegram bot not configured - article saved to DB without moderation`)
              }
            } else {
              rejectedCount++
              totalRejected++
              console.log(`🚫 Article rejected by AI: ${moderationResult.reason}`)
            }

            // Count as processed (saved to DB)
            processedCount++
            totalProcessed++
          } catch (articleError) {
            console.error(`❌ Error processing article:`, articleError)
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

        results.push({
          source: source.name,
          processed: processedCount,
          approved: approvedCount,
          rejected: rejectedCount,
          sentToBot: sentToBotCount
        })

        // Rate limiting: wait 2 seconds between sources
        if (sourcesToProcess.indexOf(source) < sourcesToProcess.length - 1) {
          console.log('⏳ Waiting 2s before next source...')
          await new Promise((resolve) => setTimeout(resolve, 2000))
        }
      } catch (sourceError: any) {
        console.error(`❌ Error processing source ${source.name}:`, sourceError)
        results.push({
          source: source.name,
          processed: 0,
          error: sourceError.message || 'Unknown error',
        })
      }
    }

    console.log(`\n🎉 RSS Fetch complete! Total processed: ${totalProcessed}`)
    console.log(`🤖 AI Moderation: ${totalApproved} approved, ${totalRejected} rejected`)
    console.log(`📤 Sent to Telegram bot: ${totalSentToBot}`)

    return new Response(
      JSON.stringify({
        ok: true,
        message: 'RSS fetch complete',
        totalProcessed,
        totalApproved,
        totalRejected,
        totalSentToBot,
        results,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error: any) {
    console.error('❌ Error in fetch-news:', error)
    return new Response(
      JSON.stringify({
        ok: false,
        error: error.message || 'Unknown error',
        stack: error.stack,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
})

/**
 * Parse RSS feed XML
 */
async function parseRSS(xml: string): Promise<RSSArticle[]> {
  const articles: RSSArticle[] = []

  try {
    const doc = new DOMParser().parseFromString(xml, 'text/xml')
    if (!doc) {
      console.error('Failed to parse RSS XML')
      return articles
    }

    // Find all item elements
    const items = doc.querySelectorAll('item')
    console.log(`🔍 Found ${items.length} item elements`)

    for (const item of items) {
      try {
        // Extract title
        const title = item.querySelector('title')?.textContent?.trim() || ''

        // Extract link
        let url = item.querySelector('link')?.textContent?.trim() || ''
        if (!url) {
          // Try alternative link formats
          const linkEl = item.querySelector('link')
          url = linkEl?.getAttribute('href') || ''
        }

        // Extract description
        let description = item.querySelector('description')?.textContent?.trim() || ''
        // Clean HTML tags from description
        description = description.replace(/<[^>]*>/g, '').trim()

        // Extract pubDate
        const pubDate = item.querySelector('pubDate')?.textContent?.trim() || ''

        // Extract image URL (try multiple common formats)
        let imageUrl: string | null = null

        // Try media:thumbnail
        const mediaThumbnail = item.querySelector('thumbnail')
        if (mediaThumbnail) {
          imageUrl = decodeHTMLEntities(mediaThumbnail.getAttribute('url'))
        }

        // Try enclosure
        if (!imageUrl) {
          const enclosure = item.querySelector('enclosure')
          if (enclosure && enclosure.getAttribute('type')?.startsWith('image/')) {
            imageUrl = decodeHTMLEntities(enclosure.getAttribute('url'))
          }
        }

        // Try media:content
        if (!imageUrl) {
          const mediaContent = item.querySelector('content')
          if (mediaContent && mediaContent.getAttribute('medium') === 'image') {
            imageUrl = decodeHTMLEntities(mediaContent.getAttribute('url'))
          }
        }

        // Extract video URL (try multiple common formats)
        let videoUrl: string | null = null
        let videoType: string | null = null

        // Try enclosure with video type
        const videoEnclosure = item.querySelector('enclosure')
        if (videoEnclosure && videoEnclosure.getAttribute('type')?.startsWith('video/')) {
          videoUrl = decodeHTMLEntities(videoEnclosure.getAttribute('url'))
          videoType = 'direct_url'
          console.log(`🎥 Found RSS video: ${videoUrl}`)
        }

        // Try media:content with video medium
        if (!videoUrl) {
          const videoContent = item.querySelector('content')
          if (videoContent && videoContent.getAttribute('medium') === 'video') {
            videoUrl = decodeHTMLEntities(videoContent.getAttribute('url'))
            videoType = 'direct_url'
            console.log(`🎥 Found media:content video: ${videoUrl}`)
          }
        }

        // Try to detect YouTube links in description or content
        if (!videoUrl) {
          const youtubeMatch = (description + url).match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]+)/)
          if (youtubeMatch) {
            videoUrl = `https://www.youtube.com/embed/${youtubeMatch[1]}`
            videoType = 'youtube'
            console.log(`🎥 Found YouTube video: ${videoUrl}`)
          }
        }

        // Skip if no title or URL
        if (!title || !url) {
          continue
        }

        articles.push({
          title,
          url,
          description: description.substring(0, 1000), // Limit length
          pubDate,
          imageUrl,
          videoUrl,
          videoType,
        })
      } catch (itemError) {
        console.error('Error parsing RSS item:', itemError)
        continue
      }
    }
  } catch (parseError) {
    console.error('Error in parseRSS:', parseError)
  }

  return articles
}

/**
 * Send article to Telegram bot for moderation
 */
async function sendToTelegramBot(
  newsId: string,
  article: RSSArticle,
  sourceName: string
): Promise<boolean> {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
    console.error('❌ Telegram bot credentials not configured')
    return false
  }

  try {
    const message = `🆕 <b>New Article from RSS Feed</b>

<b>Source:</b> ${sourceName}
<b>Title:</b> ${article.title}

<b>Description:</b>
${article.description.substring(0, 500)}${article.description.length > 500 ? '...' : ''}

<b>URL:</b> ${article.url}

<i>Published:</i> ${article.pubDate || 'Unknown'}

⏳ <i>Waiting for moderation...</i>`

    const keyboard = {
      inline_keyboard: [[
        { text: '✅ Publish', callback_data: `publish_${newsId}` },
        { text: '❌ Reject', callback_data: `reject_${newsId}` }
      ]]
    }

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

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`❌ Telegram API error: ${errorText}`)
      return false
    }

    return true
  } catch (error) {
    console.error('❌ Error sending to Telegram bot:', error)
    return false
  }
}

/**
 * AI Pre-moderation: Check article quality before sending to Telegram bot
 * Filters spam, advertisements, duplicates, and low-quality content
 */
async function preModerate(
  title: string,
  content: string,
  url: string
): Promise<{ approved: boolean; reason: string; is_advertisement: boolean; is_duplicate: boolean; quality_score: number }> {
  try {
    const response = await fetch(
      `${SUPABASE_URL}/functions/v1/pre-moderate-news`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ title, content, url })
      }
    )

    if (!response.ok) {
      console.warn('⚠️ Pre-moderation failed, approving by default')
      return {
        approved: true,
        reason: 'Pre-moderation service unavailable',
        is_advertisement: false,
        is_duplicate: false,
        quality_score: 5
      }
    }

    const result = await response.json()
    return result
  } catch (error) {
    console.error('Error in preModerate:', error)
    // Fail-open: if error, approve by default
    return {
      approved: true,
      reason: 'Pre-moderation error',
      is_advertisement: false,
      is_duplicate: false,
      quality_score: 5
    }
  }
}
