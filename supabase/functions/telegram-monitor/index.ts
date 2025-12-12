import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { TelegramClient } from 'npm:telegram@2.22.2'
import { StringSession } from 'npm:telegram@2.22.2/sessions'
import { Api } from 'npm:telegram@2.22.2/tl'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const TELEGRAM_API_ID = parseInt(Deno.env.get('TELEGRAM_API_ID') || '0')
const TELEGRAM_API_HASH = Deno.env.get('TELEGRAM_API_HASH') || ''
const TELEGRAM_SESSION = Deno.env.get('TELEGRAM_SESSION') || ''

interface TelegramSource {
  id: string
  name: string
  url: string
  is_active: boolean
  last_fetched_at: string | null
}

interface ProcessedMessage {
  channelUsername: string
  messageId: number
  text: string
  photoUrl: string | null
  date: Date
}

serve(async (req) => {
  try {
    console.log('🚀 Telegram Monitor started')

    // Validate environment variables
    if (!TELEGRAM_API_ID || !TELEGRAM_API_HASH || !TELEGRAM_SESSION) {
      throw new Error('Missing Telegram API credentials. Set TELEGRAM_API_ID, TELEGRAM_API_HASH, and TELEGRAM_SESSION')
    }

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

    // Initialize Telegram Client
    console.log('🔐 Connecting to Telegram...')
    const client = new TelegramClient(
      new StringSession(TELEGRAM_SESSION),
      TELEGRAM_API_ID,
      TELEGRAM_API_HASH,
      {
        connectionRetries: 5,
        autoReconnect: true,
      }
    )

    await client.connect()
    console.log('✅ Connected to Telegram')

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

        console.log(`\n📡 Processing channel: @${channelUsername}`)

        // Resolve channel
        const entity = await client.getEntity(channelUsername)

        // Get last_fetched_at to only fetch new messages
        const lastFetchedAt = source.last_fetched_at
          ? new Date(source.last_fetched_at)
          : new Date(Date.now() - 24 * 60 * 60 * 1000) // Default: last 24 hours

        console.log(`🕒 Fetching messages since: ${lastFetchedAt.toISOString()}`)

        // Get recent messages
        const messages = await client.getMessages(entity, {
          limit: 20, // Check last 20 messages
        })

        let processedCount = 0
        const newMessages: ProcessedMessage[] = []

        for (const message of messages) {
          // Skip if message is older than last fetch
          if (message.date < lastFetchedAt.getTime() / 1000) {
            continue
          }

          // Skip if message has no content
          if (!message.message && !message.media) {
            continue
          }

          console.log(`📨 New message ${message.id} from ${new Date(message.date * 1000).toISOString()}`)

          // Extract text
          const text = message.message || ''

          // Extract photo URL if exists
          let photoUrl: string | null = null
          if (message.media) {
            if ('photo' in message.media) {
              // Download photo and upload to Supabase Storage
              try {
                const buffer = await client.downloadMedia(message.media, {})
                if (buffer && buffer.length > 0) {
                  // Upload to Supabase Storage
                  const fileName = `telegram/${channelUsername}/${message.id}.jpg`
                  const { data: uploadData, error: uploadError } = await supabase.storage
                    .from('news-images')
                    .upload(fileName, buffer, {
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
                console.error(`❌ Failed to download photo: ${photoError}`)
              }
            }
          }

          newMessages.push({
            channelUsername,
            messageId: message.id,
            text,
            photoUrl,
            date: new Date(message.date * 1000),
          })

          processedCount++
        }

        console.log(`✅ Found ${processedCount} new message(s) for @${channelUsername}`)

        // Send new messages to process-news
        for (const msg of newMessages) {
          try {
            console.log(`🔄 Processing message ${msg.messageId}...`)

            const response = await fetch(`${SUPABASE_URL}/functions/v1/process-news`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
              },
              body: JSON.stringify({
                content: msg.text,
                imageUrl: msg.photoUrl,
                sourceType: 'telegram_monitor',
                channelUsername: msg.channelUsername,
                originalUrl: `https://t.me/${msg.channelUsername}/${msg.messageId}`,
              }),
            })

            if (response.ok) {
              console.log(`✅ Message ${msg.messageId} processed successfully`)
              totalProcessed++
            } else {
              const errorText = await response.text()
              console.error(`❌ Failed to process message ${msg.messageId}: ${errorText}`)
            }
          } catch (processError) {
            console.error(`❌ Error processing message ${msg.messageId}:`, processError)
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

        // Rate limiting: wait 2 seconds between channels
        if (sources.indexOf(source) < sources.length - 1) {
          console.log('⏳ Waiting 2s before next channel...')
          await new Promise((resolve) => setTimeout(resolve, 2000))
        }
      } catch (channelError: any) {
        console.error(`❌ Error processing channel ${source.name}:`, channelError)
        results.push({
          channel: source.name,
          processed: 0,
          error: channelError.message || 'Unknown error',
        })
      }
    }

    // Disconnect from Telegram
    await client.disconnect()
    console.log('👋 Disconnected from Telegram')

    console.log(`\n🎉 Monitoring complete! Total processed: ${totalProcessed}`)

    return new Response(
      JSON.stringify({
        ok: true,
        message: 'Monitoring complete',
        totalProcessed,
        results,
      }),
      { headers: { 'Content-Type': 'application/json' } }
    )
  } catch (error: any) {
    console.error('❌ Error in telegram-monitor:', error)
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
 * Extract username from Telegram URL
 * Supports:
 * - https://t.me/geekneural
 * - t.me/geekneural
 * - @geekneural
 * - geekneural
 */
function extractUsername(url: string): string | null {
  if (url.includes('t.me/')) {
    const match = url.match(/t\.me\/([^/]+)/)
    return match ? match[1] : null
  }
  if (url.startsWith('@')) {
    return url.substring(1)
  }
  // Assume it's just the username
  return url
}
