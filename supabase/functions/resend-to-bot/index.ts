import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const TELEGRAM_BOT_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN')
const TELEGRAM_CHAT_ID = Deno.env.get('TELEGRAM_CHAT_ID')

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
      throw new Error('Telegram credentials not configured')
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    // Parse optional date filter from request
    let fromDate = '2025-12-19 17:50:00'
    try {
      const body = await req.json()
      if (body.from_date) fromDate = body.from_date
    } catch (e) {
      // Use default date
    }

    console.log(`📤 Resending approved posts since ${fromDate}`)

    // Get approved posts that weren't sent to bot (not published, not rewritten, no telegram_message_id)
    const { data: posts, error } = await supabase
      .from('news')
      .select('id, original_title, original_content, original_url, created_at')
      .eq('pre_moderation_status', 'approved')
      .eq('is_published', false)
      .eq('is_rewritten', false)
      .is('telegram_message_id', null)  // Only posts that were never sent to bot
      .gte('created_at', fromDate)
      .order('created_at', { ascending: true })

    if (error) {
      throw new Error(`Failed to fetch posts: ${error.message}`)
    }

    if (!posts || posts.length === 0) {
      return new Response(
        JSON.stringify({ ok: true, message: 'No posts to resend', sent: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`📋 Found ${posts.length} posts to resend`)

    let sentCount = 0
    const results: { id: string; title: string; sent: boolean; error?: string }[] = []

    for (const post of posts) {
      try {
        // Extract channel from URL
        const urlMatch = post.original_url?.match(/t\.me\/([^/]+)\/(\d+)/)
        const channelUsername = urlMatch ? urlMatch[1] : 'unknown'
        const messageId = urlMatch ? urlMatch[2] : 'unknown'

        const message = `🆕 <b>New Post from Telegram Channel</b>

<b>Channel:</b> @${channelUsername}
<b>Message ID:</b> ${messageId}

<b>Content:</b>
${post.original_content?.substring(0, 500)}${(post.original_content?.length || 0) > 500 ? '...' : ''}

<b>Original URL:</b> ${post.original_url}

<i>Created:</i> ${post.created_at}

⏳ <i>Waiting for moderation...</i>`

        const keyboard = {
          inline_keyboard: [
            [
              { text: '📰 В новини', callback_data: `publish_news_${post.id}` },
              { text: '📝 В блог', callback_data: `publish_blog_${post.id}` }
            ],
            [
              { text: '🔗 LinkedIn EN', callback_data: `linkedin_en_${post.id}` },
              { text: '🔗 LinkedIn NO', callback_data: `linkedin_no_${post.id}` },
              { text: '🔗 LinkedIn UA', callback_data: `linkedin_ua_${post.id}` }
            ],
            [
              { text: '❌ Reject', callback_data: `reject_${post.id}` }
            ]
          ]
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

        if (response.ok) {
          sentCount++
          results.push({ id: post.id, title: post.original_title?.substring(0, 50) || '', sent: true })
          console.log(`✅ Sent: ${post.original_title?.substring(0, 50)}`)
        } else {
          const errorText = await response.text()
          results.push({ id: post.id, title: post.original_title?.substring(0, 50) || '', sent: false, error: errorText })
          console.error(`❌ Failed: ${errorText}`)
        }

        // Rate limiting - wait 100ms between messages
        await new Promise(resolve => setTimeout(resolve, 100))

      } catch (postError: any) {
        results.push({ id: post.id, title: post.original_title?.substring(0, 50) || '', sent: false, error: postError.message })
        console.error(`❌ Error sending post ${post.id}:`, postError)
      }
    }

    console.log(`🎉 Done! Sent ${sentCount}/${posts.length} posts`)

    return new Response(
      JSON.stringify({
        ok: true,
        message: `Resent ${sentCount}/${posts.length} posts to Telegram bot`,
        sent: sentCount,
        total: posts.length,
        results
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error: any) {
    console.error('❌ Error:', error)
    return new Response(
      JSON.stringify({ ok: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
