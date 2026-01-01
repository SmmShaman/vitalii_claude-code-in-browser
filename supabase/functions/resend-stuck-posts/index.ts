import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const TELEGRAM_BOT_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN')!
const TELEGRAM_CHAT_ID = Deno.env.get('TELEGRAM_CHAT_ID')!

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

interface StuckPost {
  id: string
  original_title: string
  original_content: string
  original_url: string
  image_url: string | null
  video_url: string | null
  video_type: string | null
  image_generation_prompt: string | null
  source_id: string
}

async function sendToBot(post: StuckPost, channelName: string): Promise<boolean> {
  try {
    const hasVideo = post.video_url && post.video_type
    const hasImage = post.image_url

    let message = `🆕 <b>New Post (Resent)</b>

<b>Channel:</b> ${channelName}

<b>Content:</b>
${(post.original_content || post.original_title || '').substring(0, 500)}...

<b>Original URL:</b> ${post.original_url || 'N/A'}`

    if (post.image_generation_prompt) {
      message += `

🎨 <b>Image Prompt:</b>
<code>${post.image_generation_prompt}</code>`
    }

    message += `

⏳ <i>Waiting for moderation...</i>`

    // Build keyboard based on content type
    let keyboard: { inline_keyboard: any[][] }

    if (hasVideo) {
      // Video exists - go straight to publish
      keyboard = {
        inline_keyboard: [
          [
            { text: '📰 В новини', callback_data: `publish_news_${post.id}` },
            { text: '📝 В блог', callback_data: `publish_blog_${post.id}` }
          ],
          [{ text: '❌ Reject', callback_data: `reject_${post.id}` }]
        ]
      }
    } else if (hasImage) {
      // Has image - show image workflow
      keyboard = {
        inline_keyboard: [
          [
            { text: '✅ Залишити зображення', callback_data: `confirm_image_${post.id}` },
            { text: '📸 Згенерувати своє', callback_data: `create_custom_${post.id}` }
          ],
          [{ text: '❌ Reject', callback_data: `reject_${post.id}` }]
        ]
      }
    } else {
      // No image, no video - go to publish
      keyboard = {
        inline_keyboard: [
          [
            { text: '📰 В новини', callback_data: `publish_news_${post.id}` },
            { text: '📝 В блог', callback_data: `publish_blog_${post.id}` }
          ],
          [{ text: '❌ Reject', callback_data: `reject_${post.id}` }]
        ]
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
          parse_mode: 'HTML',
          reply_markup: keyboard
        })
      }
    )

    const result = await response.json()

    if (!result.ok) {
      console.error(`❌ Failed to send to bot: ${result.description}`)
      return false
    }

    console.log(`✅ Sent to bot: ${post.id}`)
    return true

  } catch (error) {
    console.error(`❌ Error sending to bot: ${error.message}`)
    return false
  }
}

serve(async (req) => {
  console.log('🔄 Resend Stuck Posts started')

  try {
    const { limit = 10, hoursAgo = 48 } = await req.json().catch(() => ({}))

    const cutoffDate = new Date()
    cutoffDate.setHours(cutoffDate.getHours() - hoursAgo)

    // Get stuck posts: approved but not published/rewritten
    const { data: stuckPosts, error } = await supabase
      .from('news')
      .select(`
        id,
        original_title,
        original_content,
        original_url,
        image_url,
        video_url,
        video_type,
        image_generation_prompt,
        source_id,
        news_sources!inner(name)
      `)
      .eq('pre_moderation_status', 'approved')
      .eq('is_published', false)
      .eq('is_rewritten', false)
      .gte('created_at', cutoffDate.toISOString())
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) {
      throw new Error(`Failed to fetch stuck posts: ${error.message}`)
    }

    console.log(`📋 Found ${stuckPosts?.length || 0} stuck posts`)

    const results = {
      total: stuckPosts?.length || 0,
      sent: 0,
      failed: 0,
      posts: [] as { id: string; title: string; status: string }[]
    }

    for (const post of stuckPosts || []) {
      const channelName = (post as any).news_sources?.name || 'Unknown'
      const success = await sendToBot(post as StuckPost, channelName)

      results.posts.push({
        id: post.id,
        title: (post.original_title || '').substring(0, 50),
        status: success ? 'sent' : 'failed'
      })

      if (success) {
        results.sent++
      } else {
        results.failed++
      }

      // Small delay to avoid rate limits
      await new Promise(r => setTimeout(r, 500))
    }

    console.log(`✅ Finished: ${results.sent} sent, ${results.failed} failed`)

    return new Response(JSON.stringify({
      ok: true,
      message: `Resent ${results.sent}/${results.total} stuck posts`,
      ...results
    }), {
      headers: { 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('❌ Error:', error.message)
    return new Response(JSON.stringify({
      ok: false,
      error: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
})
