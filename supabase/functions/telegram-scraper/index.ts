import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { DOMParser } from 'https://deno.land/x/deno_dom@v0.1.38/deno-dom-wasm.ts'
import {
  getYouTubeAccessToken,
  uploadVideoToYouTube,
  downloadTelegramVideo,
  downloadTelegramVideoMTKruto
} from '../_shared/youtube-helpers.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const TELEGRAM_BOT_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN')
const TELEGRAM_CHAT_ID = Deno.env.get('TELEGRAM_CHAT_ID')
const AZURE_OPENAI_ENDPOINT = Deno.env.get('AZURE_OPENAI_ENDPOINT')
const AZURE_OPENAI_API_KEY = Deno.env.get('AZURE_OPENAI_API_KEY')
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')

// YouTube API credentials
const YOUTUBE_CLIENT_ID = Deno.env.get('YOUTUBE_CLIENT_ID')
const YOUTUBE_CLIENT_SECRET = Deno.env.get('YOUTUBE_CLIENT_SECRET')
const YOUTUBE_REFRESH_TOKEN = Deno.env.get('YOUTUBE_REFRESH_TOKEN')

interface TelegramSource {
  id: string
  name: string
  url: string
  is_active: boolean
  last_fetched_at: string | null
  fetch_interval: number // in seconds
}

interface ScrapedPost {
  channelUsername: string
  messageId: string
  text: string
  photoUrl: string | null      // Main/first image (backwards compatibility)
  images: string[]             // All images from post
  videoUrl: string | null
  videoType: string | null
  date: Date
  originalUrl: string
  sourceLink: string | null  // External source link extracted from text
}

/**
 * Extract external source links from text content
 * Returns the first non-Telegram URL found in the text
 */
function extractSourceLink(text: string): string | null {
  if (!text) return null

  // Regular expression to match URLs
  const urlRegex = /https?:\/\/[^\s<>"{}|\\^`\[\]]+/gi
  const matches = text.match(urlRegex)

  if (!matches) return null

  // Filter out Telegram URLs and return the first external source
  for (const url of matches) {
    // Skip Telegram URLs
    if (url.includes('t.me/') || url.includes('telegram.me/') || url.includes('telegram.org/')) {
      continue
    }
    // Skip common social media share URLs
    if (url.includes('twitter.com/intent/') || url.includes('facebook.com/sharer/')) {
      continue
    }
    // Clean up URL (remove trailing punctuation)
    const cleanUrl = url.replace(/[.,;:!?)]+$/, '')
    return cleanUrl
  }

  return null
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('🕷️  Telegram Scraper started')

    // Parse request body for optional parameters
    let requestBody: any = {}
    try {
      const text = await req.text()
      if (text) {
        requestBody = JSON.parse(text)
      }
    } catch (e) {
      console.log('No request body or invalid JSON, using defaults')
    }

    const {
      source_id,  // Optional: target specific source
      from_date,  // Optional: start date for historical load (ISO string)
      to_date,    // Optional: end date for historical load (ISO string)
    } = requestBody

    console.log('Request parameters:', {
      source_id: source_id || 'all',
      from_date: from_date || 'auto',
      to_date: to_date || 'now',
    })

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

    // Get active Telegram sources from database
    let sourcesQuery = supabase
      .from('news_sources')
      .select('id, name, url, is_active, last_fetched_at, fetch_interval')
      .eq('source_type', 'telegram')
      .eq('is_active', true)

    // Filter by specific source if provided
    if (source_id) {
      sourcesQuery = sourcesQuery.eq('id', source_id)
    }

    const { data: sources, error: sourcesError } = await sourcesQuery

    if (sourcesError) {
      throw new Error(`Failed to fetch sources: ${sourcesError.message}`)
    }

    if (!sources || sources.length === 0) {
      console.log('ℹ️  No active Telegram sources found')
      return new Response(
        JSON.stringify({ ok: true, message: 'No active sources', processed: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`📋 Found ${sources.length} active Telegram source(s)`)

    // Filter sources based on their individual fetch_interval
    // Only process sources where it's time to fetch according to their schedule
    const now = Date.now()
    const sourcesToProcess = sources.filter(source => {
      // If source_id is specified, always process (manual trigger)
      if (source_id) {
        console.log(`✅ Processing ${source.name} (manual trigger)`)
        return true
      }

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
    const results: { channel: string; processed: number; approved?: number; rejected?: number; sentToBot?: number; error?: string }[] = []

    // Process each channel (only those ready to fetch)
    for (const source of sourcesToProcess) {
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

        // Determine date filter based on parameters
        let filterFromDate: Date
        let filterToDate: Date | null = null

        if (from_date) {
          // Use custom date range for historical load
          filterFromDate = new Date(from_date)
          filterToDate = to_date ? new Date(to_date) : new Date()
          console.log(`🕒 Historical load: filtering posts from ${filterFromDate.toISOString()} to ${filterToDate.toISOString()}`)
        } else {
          // Use last_fetched_at for incremental scraping (default behavior)
          filterFromDate = source.last_fetched_at
            ? new Date(source.last_fetched_at)
            : new Date(Date.now() - 24 * 60 * 60 * 1000) // Default: last 24 hours
          console.log(`🕒 Incremental scraping: filtering posts since ${filterFromDate.toISOString()}`)
        }

        // Filter posts by date range
        const newPosts = posts.filter(post => {
          if (filterToDate) {
            // Historical load: posts within date range
            return post.date >= filterFromDate && post.date <= filterToDate
          } else {
            // Incremental: posts newer than last fetch
            return post.date > filterFromDate
          }
        })
        console.log(`✅ Found ${newPosts.length} post(s) matching date filter`)

        // Process new posts
        let processedCount = 0
        let approvedCount = 0
        let rejectedCount = 0
        let sentToBotCount = 0

        for (const post of newPosts) {
          try {
            console.log(`🔄 Processing post ${post.messageId}...`)

            // Check for duplicate by URL (both with and without /s/ prefix)
            // This prevents false duplicates when URL format varies
            // Only check non-rejected posts (allow re-scanning of previously rejected posts)
            const urlVariant1 = `https://t.me/${channelUsername}/${post.messageId}`;
            const urlVariant2 = `https://t.me/s/${channelUsername}/${post.messageId}`;

            const { data: existingPost } = await supabase
              .from('news')
              .select('id, original_url, pre_moderation_status, video_type, video_url')
              .in('original_url', [urlVariant1, urlVariant2])
              .neq('pre_moderation_status', 'rejected')  // Ignore rejected posts
              .maybeSingle()

            if (existingPost) {
              console.log(`🔍 Duplicate check: existing.video_type='${existingPost.video_type}', post.videoType='${post.videoType}', post.videoUrl='${post.videoUrl}'`)

              // If post exists with telegram_embed and we have YouTube URL, update it
              if (existingPost.video_type === 'telegram_embed' && post.videoType === 'youtube') {
                console.log(`🔄 Updating existing post with YouTube video: ${existingPost.id}`)
                const { error: updateError } = await supabase
                  .from('news')
                  .update({
                    video_url: post.videoUrl,
                    video_type: post.videoType
                  })
                  .eq('id', existingPost.id)

                if (updateError) {
                  console.error(`❌ Failed to update post: ${updateError.message}`)
                } else {
                  console.log(`✅ Updated post ${existingPost.id} with YouTube URL: ${post.videoUrl}`)
                }
              } else {
                console.log(`⏭️  Skipping duplicate post: ${post.originalUrl} (found in DB as ${existingPost.original_url}, status: ${existingPost.pre_moderation_status})`)
              }
              continue
            }

            // Download and upload ALL photos (multiple images support)
            let photoUrl = post.photoUrl
            const uploadedImages: string[] = []

            if (post.images && post.images.length > 0) {
              console.log(`📸 Processing ${post.images.length} image(s)...`)

              for (let i = 0; i < post.images.length; i++) {
                const imageUrl = post.images[i]
                try {
                  // Download photo
                  const photoResponse = await fetch(imageUrl)
                  if (photoResponse.ok) {
                    const photoBuffer = await photoResponse.arrayBuffer()

                    // Upload to Supabase Storage with index for multiple images
                    const fileName = post.images.length === 1
                      ? `telegram/${channelUsername}/${post.messageId}.jpg`
                      : `telegram/${channelUsername}/${post.messageId}_${i + 1}.jpg`

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
                      const publicUrl = urlData.publicUrl
                      uploadedImages.push(publicUrl)

                      // Set first image as main photoUrl for backwards compatibility
                      if (i === 0) {
                        photoUrl = publicUrl
                      }
                      console.log(`📸 Photo ${i + 1}/${post.images.length} uploaded: ${publicUrl}`)
                    }
                  }
                } catch (photoError) {
                  console.error(`❌ Failed to process photo ${i + 1}: ${photoError}`)
                }
              }
            }

            // Fallback: if no images uploaded, keep original photoUrl as null
            if (uploadedImages.length === 0) {
              photoUrl = null
            }

            // Log source link if found (already extracted in parseChannelPosts)
            if (post.sourceLink) {
              console.log(`📎 Source link: ${post.sourceLink}`)
            }

            // Save to database with pending status (waiting for moderation)
            const { data: newsEntry, error: insertError} = await supabase
              .from('news')
              .insert({
                original_title: post.text.substring(0, 200), // First 200 chars as title
                original_content: post.text,
                original_url: post.originalUrl,
                source_link: post.sourceLink, // External source link from text
                image_url: photoUrl,
                images: uploadedImages.length > 0 ? uploadedImages : null, // All images array
                video_url: post.videoUrl,
                video_type: post.videoType,
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

            // 🤖 AI PRE-MODERATION
            console.log(`🤖 Running AI pre-moderation for post ${post.messageId}...`)

            const moderationResult = await preModerate(
              post.text.substring(0, 200),
              post.text,
              post.originalUrl
            )

            console.log(`Pre-moderation result: ${moderationResult.approved ? '✅ Approved' : '❌ Rejected'} - ${moderationResult.reason}`)

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

              // 🎨 Generate image prompt for Google AI Studio
              console.log(`🎨 Generating image prompt for post ${post.messageId}...`)
              let imagePrompt: string | null = null

              try {
                const promptResponse = await fetch(
                  `${SUPABASE_URL}/functions/v1/generate-image-prompt`,
                  {
                    method: 'POST',
                    headers: {
                      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                      'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                      newsId: newsEntry.id,
                      title: post.text.substring(0, 200),
                      content: post.text
                    })
                  }
                )

                if (promptResponse.ok) {
                  const promptResult = await promptResponse.json()
                  imagePrompt = promptResult.prompt
                  console.log(`✅ Image prompt generated: ${imagePrompt?.substring(0, 100)}...`)
                } else {
                  console.warn(`⚠️  Failed to generate image prompt for post ${post.messageId}`)
                }
              } catch (promptError) {
                console.error(`❌ Error generating image prompt:`, promptError)
              }

              if (TELEGRAM_BOT_TOKEN && TELEGRAM_CHAT_ID) {
                const sent = await sendToTelegramBot(
                  newsEntry.id,
                  post,
                  channelUsername,
                  imagePrompt,
                  post.videoUrl || null,
                  post.videoType || null,
                  photoUrl || null // Pass updated photoUrl from Supabase Storage
                )
                if (sent) {
                  sentToBotCount++
                  totalSentToBot++
                  console.log(`✅ Post ${post.messageId} sent to Telegram bot for moderation`)
                } else {
                  console.warn(`⚠️  Failed to send post ${post.messageId} to Telegram bot (saved in DB anyway)`)
                }
              } else {
                console.log(`ℹ️  Telegram bot not configured - post saved to DB without moderation`)
              }
            } else {
              rejectedCount++
              totalRejected++
              console.log(`🚫 Post ${post.messageId} rejected by AI: ${moderationResult.reason}`)
            }

            // Count as processed (saved to DB)
            processedCount++
            totalProcessed++
          } catch (processError) {
            console.error(`❌ Error processing post ${post.messageId}:`, processError)
          }
        }

        // Update last_fetched_at only for incremental scraping (not historical loads)
        if (!from_date) {
          const { error: updateError } = await supabase
            .from('news_sources')
            .update({ last_fetched_at: new Date().toISOString() })
            .eq('id', source.id)

          if (updateError) {
            console.error(`❌ Failed to update last_fetched_at for ${source.name}:`, updateError)
          } else {
            console.log(`✅ Updated last_fetched_at for ${source.name}`)
          }
        } else {
          console.log(`ℹ️  Historical load - NOT updating last_fetched_at`)
        }

        results.push({
          channel: channelUsername,
          processed: processedCount,
          approved: approvedCount,
          rejected: rejectedCount,
          sentToBot: sentToBotCount
        })

        // Rate limiting: wait 3 seconds between channels
        if (sourcesToProcess.indexOf(source) < sourcesToProcess.length - 1) {
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
    console.log(`🤖 AI Moderation: ${totalApproved} approved, ${totalRejected} rejected`)
    console.log(`📤 Sent to Telegram bot: ${totalSentToBot}`)

    return new Response(
      JSON.stringify({
        ok: true,
        message: 'Scraping complete',
        totalProcessed,
        totalApproved,
        totalRejected,
        totalSentToBot,
        results,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
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
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
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

        // Extract ALL photo URLs (multiple images support)
        const images: string[] = []
        let photoUrl: string | null = null
        const photoElements = message.querySelectorAll('.tgme_widget_message_photo_wrap')

        for (const photoElement of photoElements) {
          const style = photoElement.getAttribute('style') || ''
          const match = style.match(/background-image:url\('([^']+)'\)/)
          if (match && match[1]) {
            images.push(match[1])
            // Set first image as main photoUrl for backwards compatibility
            if (!photoUrl) {
              photoUrl = match[1]
            }
          }
        }

        if (images.length > 0) {
          console.log(`📸 Found ${images.length} image(s) in post`)
        }

        // Extract video URL and type
        let videoUrl: string | null = null
        let videoType: string | null = null

        // Check if YouTube upload is configured
        const youtubeConfigured = !!(YOUTUBE_CLIENT_ID && YOUTUBE_CLIENT_SECRET && YOUTUBE_REFRESH_TOKEN && TELEGRAM_BOT_TOKEN)

        const videoElement = message.querySelector('video')
        // Updated selectors to match current Telegram HTML structure
        // - tgme_widget_message_video: main video class
        // - tgme_widget_message_roundvideo: round video messages
        // - message_media_not_supported: placeholder when video can't load in browser
        const videoWrap = message.querySelector('.tgme_widget_message_video_wrap, .tgme_widget_message_video_player, .tgme_widget_message_video, .tgme_widget_message_roundvideo, .message_media_not_supported')

        if (videoElement || videoWrap) {
          console.log(`🎥 [VIDEO DEBUG] Found video in post`)
          console.log(`🎥 [VIDEO DEBUG] videoElement exists: ${!!videoElement}`)
          console.log(`🎥 [VIDEO DEBUG] videoWrap exists: ${!!videoWrap}`)

          if (youtubeConfigured) {
            // OPTION 1: Upload to YouTube using MTKruto for download (preferred)
            try {
              console.log('🚀 [VIDEO] YouTube configured - will upload video to YouTube')
              console.log('🔌 [VIDEO] Using MTKruto (MTProto) for download - no 20MB limit!')

              const msgId = parseInt(dataPost.split('/')[1])
              console.log(`📥 [VIDEO] Downloading video via MTKruto: @${channelUsername} message ${msgId}`)

              // Download video using MTKruto (supports files up to 2GB)
              const videoBuffer = await downloadTelegramVideoMTKruto(channelUsername, msgId)

              if (videoBuffer) {
                const videoSizeMB = (videoBuffer.length / (1024 * 1024)).toFixed(2)
                console.log(`✅ [VIDEO] Video downloaded successfully via MTKruto: ${videoSizeMB} MB`)

                // Translate title to English for YouTube
                console.log('🌐 [VIDEO] Translating title...')
                const englishTitle = await translateTitleToEnglish(text)
                console.log(`✅ [VIDEO] Title translated: "${englishTitle}"`)

                // Get YouTube access token
                console.log('🔑 [VIDEO] Getting YouTube access token...')
                const accessToken = await getYouTubeAccessToken({
                  clientId: YOUTUBE_CLIENT_ID!,
                  clientSecret: YOUTUBE_CLIENT_SECRET!,
                  refreshToken: YOUTUBE_REFRESH_TOKEN!
                })
                console.log(`✅ [VIDEO] Access token obtained`)

                // Upload to YouTube
                console.log('📤 [VIDEO] Uploading to YouTube...')
                const uploadResult = await uploadVideoToYouTube(accessToken, {
                  videoBuffer,
                  title: englishTitle || 'News Video',
                  description: `Source: https://t.me/${channelUsername}/${msgId}\n\n${text.substring(0, 500)}`,
                  tags: ['news', 'ai', 'technology'],
                  categoryId: '25'
                })

                if (uploadResult.success && uploadResult.embedUrl) {
                  videoUrl = uploadResult.embedUrl
                  videoType = 'youtube'
                  console.log(`✅ [VIDEO] SUCCESS! Video uploaded to YouTube: ${videoUrl}`)
                } else {
                  console.error(`❌ [VIDEO] YouTube upload failed: ${uploadResult.error}`)
                  // Fallback to Telegram embed
                  videoUrl = `https://t.me/${channelUsername}/${msgId}?embed=1&mode=tme`
                  videoType = 'telegram_embed'
                  console.log(`⚠️ [VIDEO] Falling back to Telegram embed`)
                }
              } else {
                console.error('❌ [VIDEO] MTKruto download failed - video too large or not accessible')
                // Fallback to Telegram embed
                const msgId = dataPost.split('/')[1]
                videoUrl = `https://t.me/${channelUsername}/${msgId}?embed=1&mode=tme`
                videoType = 'telegram_embed'
                console.log(`⚠️ [VIDEO] Falling back to Telegram embed`)
              }
            } catch (error: any) {
              console.error('❌ [VIDEO] Error processing video:', error?.message)
              // Fallback to Telegram embed
              const msgId = dataPost.split('/')[1]
              videoUrl = `https://t.me/${channelUsername}/${msgId}?embed=1&mode=tme`
              videoType = 'telegram_embed'
              console.log(`⚠️ [VIDEO] Falling back to Telegram embed`)
            }
          } else {
            // OPTION 2: Use Telegram embed (fallback if YouTube not configured)
            console.log('⚠️ [VIDEO DEBUG] YouTube NOT configured, using Telegram embed')
            console.log(`⚠️ [VIDEO DEBUG] YOUTUBE_CLIENT_ID: ${YOUTUBE_CLIENT_ID ? 'SET' : 'MISSING'}`)
            console.log(`⚠️ [VIDEO DEBUG] YOUTUBE_CLIENT_SECRET: ${YOUTUBE_CLIENT_SECRET ? 'SET' : 'MISSING'}`)
            console.log(`⚠️ [VIDEO DEBUG] YOUTUBE_REFRESH_TOKEN: ${YOUTUBE_REFRESH_TOKEN ? 'SET' : 'MISSING'}`)
            console.log(`⚠️ [VIDEO DEBUG] TELEGRAM_BOT_TOKEN: ${TELEGRAM_BOT_TOKEN ? 'SET' : 'MISSING'}`)
            const messageId = dataPost.split('/')[1]
            videoUrl = `https://t.me/${channelUsername}/${messageId}?embed=1&mode=tme`
            videoType = 'telegram_embed'
            console.log(`🎥 [VIDEO DEBUG] Using Telegram embed: ${videoUrl}`)
          }
        }

        // Extract date
        const dateElement = message.querySelector('.tgme_widget_message_date time')
        const datetime = dateElement?.getAttribute('datetime')
        const date = datetime ? new Date(datetime) : new Date()

        // Skip if no content
        if (!text && !photoUrl && !videoUrl) {
          continue
        }

        // Extract source link from text
        const sourceLink = extractSourceLink(text)

        posts.push({
          channelUsername,
          messageId,
          text,
          photoUrl,
          images,
          videoUrl,
          videoType,
          date,
          originalUrl: `https://t.me/${channelUsername}/${messageId}`,
          sourceLink,
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
 * Translate title to English using Azure OpenAI (for YouTube upload)
 */
async function translateTitleToEnglish(text: string): Promise<string> {
  if (!AZURE_OPENAI_ENDPOINT || !AZURE_OPENAI_API_KEY) {
    console.warn('⚠️ Azure OpenAI not configured, using original text')
    return text.substring(0, 100)
  }

  try {
    const titleText = text.substring(0, 200) // Take first 200 chars

    // Azure OpenAI endpoint format: {endpoint}/openai/deployments/{deployment-name}/chat/completions?api-version=YYYY-MM-DD
    // Using actual deployment name from Azure Portal: Jobbot-gpt-4.1-mini
    const azureUrl = `${AZURE_OPENAI_ENDPOINT}/openai/deployments/Jobbot-gpt-4.1-mini/chat/completions?api-version=2024-02-15-preview`

    const response = await fetch(azureUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': AZURE_OPENAI_API_KEY
      },
      body: JSON.stringify({
        messages: [
          {
            role: 'system',
            content: 'Translate the following text to English. Return ONLY the translation, no explanations. Keep it concise (max 100 characters).'
          },
          {
            role: 'user',
            content: titleText
          }
        ],
        temperature: 0.3,
        max_tokens: 50
      })
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('❌ Azure OpenAI API error:', response.status, errorText)
      return text.substring(0, 100)
    }

    const data = await response.json()
    const translatedTitle = data.choices[0]?.message?.content?.trim() || text.substring(0, 100)
    console.log(`📝 Translated title: "${translatedTitle}"`)
    return translatedTitle.substring(0, 100)
  } catch (error) {
    console.error('❌ Translation error:', error)
    return text.substring(0, 100)
  }
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

/**
 * Send post to Telegram bot for moderation
 */
async function sendToTelegramBot(
  newsId: string,
  post: ScrapedPost,
  channelUsername: string,
  imagePrompt: string | null = null,
  videoUrl: string | null = null,
  videoType: string | null = null,
  uploadedPhotoUrl: string | null = null // Updated photoUrl from Supabase Storage
): Promise<boolean> {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
    console.error('❌ Telegram bot credentials not configured')
    return false
  }

  try {
    let message = `🆕 <b>New Post from Telegram Channel</b>

<b>Channel:</b> @${channelUsername}
<b>Message ID:</b> ${post.messageId}

<b>Content:</b>
${post.text.substring(0, 500)}${post.text.length > 500 ? '...' : ''}

<b>Original URL:</b> ${post.originalUrl}

<i>Posted:</i> ${post.date.toISOString()}`

    // Add image prompt if available
    if (imagePrompt) {
      message += `

🎨 <b>Image Generation Prompt (копіюй в Google AI Studio):</b>
<code>${imagePrompt}</code>

💡 <i>Скопіюй промпт вище та використай в Google AI Studio (Gemini 3 Banana) для генерації зображення</i>`
    }

    message += `

⏳ <i>Waiting for moderation...</i>`

    // 🎬 SEQUENTIAL WORKFLOW: Start with image selection OR go straight to publish if video
    // Step 1: Image workflow (if no video)
    // Step 2: Publish buttons (В новини / В блог)
    // Step 3: LinkedIn buttons (shown after publish)
    // Step 4: Final links (shown after LinkedIn post)

    const hasVideo = videoUrl && videoType
    const hasImage = uploadedPhotoUrl // Use uploaded photoUrl, not original post.photoUrl
    let keyboard: { inline_keyboard: any[] }

    if (hasVideo) {
      // 🎥 Video exists → Skip image workflow, go straight to publish
      keyboard = {
        inline_keyboard: [
          [
            { text: '📰 В новини', callback_data: `publish_news_${newsId}` },
            { text: '📝 В блог', callback_data: `publish_blog_${newsId}` }
          ],
          [
            { text: '❌ Reject', callback_data: `reject_${newsId}` }
          ]
        ]
      }
    } else {
      // 🖼️ No video → Show image workflow first
      if (hasImage) {
        // Has image → Confirm or upload custom
        keyboard = {
          inline_keyboard: [
            [
              { text: '✅ Залишити зображення', callback_data: `confirm_image_${newsId}` }
            ],
            [
              { text: '📸 Згенерувати своє', callback_data: `create_custom_${newsId}` }
            ],
            [
              { text: '❌ Reject', callback_data: `reject_${newsId}` }
            ]
          ]
        }
      } else {
        // No image → Upload required or continue without
        keyboard = {
          inline_keyboard: [
            [
              { text: '📸 Завантажити зображення', callback_data: `create_custom_${newsId}` }
            ],
            [
              { text: '➡️ Продовжити без зображення', callback_data: `confirm_image_${newsId}` }
            ],
            [
              { text: '❌ Reject', callback_data: `reject_${newsId}` }
            ]
          ]
        }
      }
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
 * AI Pre-moderation: Check post quality before sending to Telegram bot
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

/**
 * Process image for LinkedIn using AI enhancement
 */
async function processImageForLinkedIn(imageUrl: string): Promise<string | null> {
  try {
    console.log('🖼️ Processing image for LinkedIn...')

    const response = await fetch(
      `${SUPABASE_URL}/functions/v1/process-image`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          imageUrl,
          promptType: 'linkedin_optimize'
        })
      }
    )

    if (!response.ok) {
      console.warn('⚠️ Image processing failed, using original')
      return null
    }

    const result = await response.json()

    if (result.success && result.processedImageUrl) {
      return result.processedImageUrl
    }

    return null
  } catch (error) {
    console.error('Error in processImageForLinkedIn:', error)
    return null
  }
}
