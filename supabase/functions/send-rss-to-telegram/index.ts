import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const TELEGRAM_BOT_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN')
const TELEGRAM_CHAT_ID = Deno.env.get('TELEGRAM_CHAT_ID')

interface SendRSSRequest {
  newsId: string
}

interface AIAnalysisResult {
  summary: string
  relevance_score: number
  category: string
  key_points: string[]
  recommended_action: 'publish' | 'skip' | 'needs_review'
  skip_reason?: string
}

/**
 * Send RSS article to Telegram Bot for moderation
 * Used in batch mode after all articles are analyzed
 */
serve(async (req) => {
  console.log('📤 Send RSS to Telegram v2026-02-15-01-autopublish')

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
      throw new Error('Telegram credentials not configured')
    }

    const requestData: SendRSSRequest = await req.json()

    if (!requestData.newsId) {
      throw new Error('newsId is required')
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    // Fetch the news record with analysis data
    const { data: news, error: fetchError } = await supabase
      .from('news')
      .select('*')
      .eq('id', requestData.newsId)
      .single()

    if (fetchError || !news) {
      throw new Error(`News record not found: ${fetchError?.message || 'not found'}`)
    }

    // Check if already sent to Telegram (has telegram_message_id)
    if (news.telegram_message_id) {
      console.log(`⚠️ Article already sent to Telegram: ${news.telegram_message_id}`)
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Already sent to Telegram',
          telegramMessageId: news.telegram_message_id
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const analysis = news.rss_analysis as AIAnalysisResult | null
    if (!analysis) {
      throw new Error('No RSS analysis found for this news record')
    }

    // Check if auto-publish is enabled — skip Telegram bot and fire auto-publish pipeline
    const { data: autoPublishSetting } = await supabase
      .from('api_settings')
      .select('key_value')
      .eq('key_name', 'ENABLE_AUTO_PUBLISH')
      .single()

    const isAutoPublishEnabled = autoPublishSetting?.key_value === 'true'

    if (isAutoPublishEnabled) {
      console.log(`🤖 Auto-publish enabled — firing auto-publish pipeline for RSS article ${news.id}`)

      fetch(`${SUPABASE_URL}/functions/v1/auto-publish-news`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          newsId: news.id,
          source: 'rss'
        })
      }).catch(e => console.warn('⚠️ Auto-publish fire-and-forget error:', e))

      if (TELEGRAM_BOT_TOKEN && TELEGRAM_CHAT_ID) {
        await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: TELEGRAM_CHAT_ID,
            text: `🤖 <b>Auto-publishing RSS article...</b>\n\n📰 ${escapeHtml((news.original_title || 'Untitled').substring(0, 150))}\n📊 Score: ${analysis.relevance_score}/10\n\n⏳ <i>AI обирає зображення та публікує автоматично</i>`,
            parse_mode: 'HTML'
          })
        })
      }

      return new Response(
        JSON.stringify({ success: true, newsId: news.id, autoPublish: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const title = news.original_title || 'No title'
    const url = news.original_url || news.rss_source_url
    const imageUrl = news.image_url
    const imagePrompt = news.image_generation_prompt
    const variants = news.image_prompt_variants as Array<{label: string, description: string}> | null

    // Lookup real source name from news_sources table
    let sourceName = 'RSS Feed'
    if (news.rss_source_url) {
      const { data: sourceData } = await supabase
        .from('news_sources')
        .select('name')
        .eq('rss_url', news.rss_source_url)
        .single()
      if (sourceData?.name) {
        sourceName = sourceData.name
      }
    }

    // Send to Telegram
    const messageId = await sendTelegramNotification(
      news.id,
      title,
      url,
      analysis,
      sourceName,
      imageUrl,
      imagePrompt,
      variants
    )

    // Update news record with telegram_message_id
    if (messageId) {
      await supabase
        .from('news')
        .update({ telegram_message_id: messageId })
        .eq('id', news.id)
    }

    return new Response(
      JSON.stringify({
        success: true,
        newsId: news.id,
        telegramMessageId: messageId
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error: any) {
    console.error('❌ Error sending RSS to Telegram:', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Unknown error'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
})

/**
 * Send notification to Telegram Bot with image workflow buttons
 */
async function sendTelegramNotification(
  newsId: string,
  title: string,
  url: string,
  analysis: AIAnalysisResult,
  sourceName: string,
  imageUrl: string | null = null,
  imagePrompt: string | null = null,
  variants: Array<{label: string, description: string}> | null = null
): Promise<number | null> {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
    console.warn('⚠️ Telegram credentials not configured')
    return null
  }

  // Format key points as bullet list
  const keyPointsList = analysis.key_points
    .map(point => `• ${point}`)
    .join('\n')

  // Build message text
  const relevanceEmoji = analysis.relevance_score >= 7 ? '🟢' :
                         analysis.relevance_score >= 5 ? '🟡' : '🔴'

  const categoryLabels: Record<string, string> = {
    'tech_product': '💻 Tech Product',
    'marketing_campaign': '📢 Marketing',
    'ai_research': '🤖 AI Research',
    'business_news': '💼 Business',
    'science': '🔬 Science',
    'lifestyle': '🌟 Lifestyle',
    'other': '📰 Other'
  }

  const hasVariants = variants && variants.length > 0

  // Build image status section
  let imageStatusText = ''
  if (hasVariants) {
    const variantEmojis = ['1️⃣', '2️⃣', '3️⃣', '4️⃣']
    imageStatusText = '\n\n🎨 <b>Оберіть концепцію зображення:</b>\n'
    variants!.forEach((v, i) => {
      imageStatusText += `\n${variantEmojis[i] || `${i+1}.`} <b>${escapeHtml(v.label)}</b>\n<i>${escapeHtml(v.description)}</i>\n`
    })
  } else if (imageUrl) {
    imageStatusText = `

🖼️ <b>Зображення:</b> ✅ Готове
${escapeHtml(imageUrl)}`
  } else {
    imageStatusText = `

⚠️ <b>Зображення:</b> Не знайдено`
  }

  const messageText = `📰 <b>RSS Article Analysis</b>

📌 <b>Source:</b> ${sourceName}
🔗 <a href="${url}">${escapeHtml(title.substring(0, 100))}</a>

📋 <b>Summary:</b>
${escapeHtml(analysis.summary)}

${relevanceEmoji} <b>Relevance:</b> ${analysis.relevance_score}/10
📁 <b>Category:</b> ${categoryLabels[analysis.category] || analysis.category}

<b>Key Points:</b>
${escapeHtml(keyPointsList)}

🎯 <b>Recommendation:</b> ${analysis.recommended_action.toUpperCase()}
${analysis.skip_reason ? `ℹ️ ${escapeHtml(analysis.skip_reason)}` : ''}${imageStatusText}

newsId:${newsId}`

  // Build keyboard
  let keyboard: { inline_keyboard: any[] }

  if (hasVariants) {
    // Has variants → Show variant selection buttons + Creative Builder
    keyboard = {
      inline_keyboard: [
        [
          { text: '1️⃣', callback_data: `select_variant_1_${newsId}` },
          { text: '2️⃣', callback_data: `select_variant_2_${newsId}` },
          { text: '3️⃣', callback_data: `select_variant_3_${newsId}` },
          { text: '4️⃣', callback_data: `select_variant_4_${newsId}` }
        ],
        [
          { text: '🔄 Нові варіанти', callback_data: `new_variants_${newsId}` },
          { text: '🎨 Creative Builder', callback_data: `cb_hub_${newsId}` }
        ],
        [
          { text: '📸 Завантажити своє', callback_data: `upload_rss_image_${newsId}` },
          { text: '❌ Skip', callback_data: `reject_${newsId}` }
        ]
      ]
    }
  } else if (imageUrl) {
    // Has image from RSS → Confirm, regenerate, or upload custom
    keyboard = {
      inline_keyboard: [
        [
          { text: '✅ Використати фото', callback_data: `confirm_rss_image_${newsId}` },
          { text: '🔄 Згенерувати AI', callback_data: `regenerate_rss_image_${newsId}` }
        ],
        [
          { text: '📸 Завантажити своє', callback_data: `upload_rss_image_${newsId}` }
        ],
        [
          { text: '❌ Skip', callback_data: `reject_${newsId}` }
        ]
      ]
    }
  } else {
    // No image, no variants → Generate variants or upload custom + Creative Builder
    keyboard = {
      inline_keyboard: [
        [
          { text: '🎲 Random Variants', callback_data: `new_variants_${newsId}` },
          { text: '🎨 Creative Builder', callback_data: `cb_hub_${newsId}` }
        ],
        [
          { text: '📸 Завантажити своє', callback_data: `upload_rss_image_${newsId}` }
        ],
        [
          { text: '❌ Skip', callback_data: `reject_${newsId}` }
        ]
      ]
    }
  }

  try {
    const response = await fetch(
      `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: TELEGRAM_CHAT_ID,
          text: messageText,
          parse_mode: 'HTML',
          disable_web_page_preview: true,
          reply_markup: keyboard
        })
      }
    )

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Telegram API error:', errorText)
      return null
    }

    const result = await response.json()
    const messageId = result.result?.message_id || null
    console.log(`✅ Telegram notification sent (message_id: ${messageId})`)
    return messageId
  } catch (error) {
    console.error('Failed to send Telegram notification:', error)
    return null
  }
}

/**
 * Escape HTML special characters for Telegram
 */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}
