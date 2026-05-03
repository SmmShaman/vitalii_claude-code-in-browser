import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
const VERSION_STAMP = '2026-03-29-force-redeploy'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'
import { escapeHtml } from '../_shared/social-media-helpers.ts'
import { getShortSummary, formatCompactVariants, CATEGORY_SHORT, buildPresetKeyboard } from '../_shared/telegram-format-helpers.ts'
import { classifyContentWeight, loadScheduleConfig, computeScheduledTime, formatScheduledTime } from '../_shared/schedule-helpers.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const TELEGRAM_BOT_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN')
const TELEGRAM_CHAT_ID = Deno.env.get('TELEGRAM_CHAT_ID')

function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(parseInt(code, 10)))
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"')
}

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
  console.log('📤 Send RSS to Telegram v2026-02-17-01-sequential-queue')

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

    // Check stream mode and auto-publish settings
    const { data: modeSettings } = await supabase
      .from('api_settings')
      .select('key_name, key_value')
      .in('key_name', ['STREAM_MODE', 'ENABLE_AUTO_PUBLISH'])

    const streamMode = modeSettings?.find((s: any) => s.key_name === 'STREAM_MODE')?.key_value || 'legacy'
    const isAutoPublishEnabled = modeSettings?.find((s: any) => s.key_name === 'ENABLE_AUTO_PUBLISH')?.key_value === 'true'

    // ═══════════════════════════════════════════════════
    // STREAM MODE: website-publish only (no images, no social, 1 language)
    // ═══════════════════════════════════════════════════
    if (streamMode === 'streams') {
      console.log('🌊 Stream mode — publishing to website only')

      // Lookup source name
      let streamSourceName = ''
      if (news.source_id) {
        const { data: srcData } = await supabase
          .from('news_sources').select('name').eq('id', news.source_id).maybeSingle()
        if (srcData?.name) streamSourceName = srcData.name
      }
      if (!streamSourceName) {
        const fallbackUrl = news.original_url || news.rss_source_url || ''
        try { streamSourceName = new URL(fallbackUrl).hostname.replace('www.', '') } catch { streamSourceName = 'RSS' }
      }

      // Await website-publish to get the slug for article link
      let articleUrl = ''
      try {
        const wpResponse = await fetch(`${SUPABASE_URL}/functions/v1/website-publish`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ newsId: news.id })
        })
        if (wpResponse.ok) {
          // Fetch slug from DB
          const { data: published } = await supabase
            .from('news')
            .select('slug_en')
            .eq('id', news.id)
            .single()
          if (published?.slug_en) {
            articleUrl = `https://vitalii.no/news/${published.slug_en}`
          }
        } else {
          const errBody = await wpResponse.text().catch(() => 'no body')
          console.error(`❌ website-publish failed (${wpResponse.status}): ${errBody.substring(0, 300)}`)
        }
      } catch (e: any) {
        console.error('❌ website-publish network error:', e.message)
      }

      // Send compact Telegram notification (no moderation buttons)
      const linkedinScore = (analysis as any)?.linkedin_score || 0
      console.log(`📰 Published: ${(news.original_title || '').substring(0, 80)} | LI:${linkedinScore}/10${articleUrl ? ` → ${articleUrl}` : ''}`)

      if (TELEGRAM_BOT_TOKEN && TELEGRAM_CHAT_ID) {
        try {
          const origUrl = news.original_url || news.rss_source_url || ''
          let origDomain = 'RSS'
          try { origDomain = new URL(origUrl).hostname.replace('www.', '') } catch {}

          const cleanTitle = decodeHtmlEntities(news.original_title || 'Untitled').substring(0, 150)
          const statusPrefix = articleUrl ? '✅ Опубліковано' : '📰 Знайдено (не опубліковано)'
          const tgText = `${statusPrefix}: <a href="${origUrl}">${escapeHtml(cleanTitle)}</a>\n📌 ${escapeHtml(origDomain)} · ${analysis.relevance_score}/10 | 🔗 LI:${linkedinScore}/10${articleUrl ? `\n🌐 <a href="${articleUrl}">vitalii.no</a>` : ''}`

          const tgResp = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: TELEGRAM_CHAT_ID,
              text: tgText,
              parse_mode: 'HTML',
              disable_web_page_preview: true
            })
          })
          const tgData = await tgResp.json()
          if (tgData.ok && tgData.result?.message_id) {
            await supabase.from('news').update({ telegram_message_id: tgData.result.message_id }).eq('id', news.id)
          }
        } catch (tgErr: any) {
          console.warn('⚠️ Telegram notification failed:', tgErr.message)
        }
      }

      return new Response(
        JSON.stringify({ success: true, newsId: news.id, stream: 'website-publish' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // ═══════════════════════════════════════════════════
    // LEGACY MODE: auto-publish pipeline (images, 3 languages, social)
    // ═══════════════════════════════════════════════════
    if (isAutoPublishEnabled) {
      console.log(`🤖 Auto-publish enabled — firing auto-publish pipeline for RSS article ${news.id}`)

      // Lookup source name (source_id FK, fallback to domain)
      let autoSourceName = ''
      if (news.source_id) {
        const { data: srcData } = await supabase
          .from('news_sources')
          .select('name')
          .eq('id', news.source_id)
          .single()
        if (srcData?.name) autoSourceName = srcData.name
      }
      if (!autoSourceName) {
        const fallbackUrl = news.original_url || news.rss_source_url || ''
        try { autoSourceName = new URL(fallbackUrl).hostname.replace('www.', '') } catch { autoSourceName = 'RSS' }
      }

      // Send initial status message and capture message_id
      let telegramMessageId: number | null = null
      if (TELEGRAM_BOT_TOKEN && TELEGRAM_CHAT_ID) {
        const title = escapeHtml((news.original_title || 'Untitled').substring(0, 150))
        const summary = analysis.summary ? `\n💬 <i>${escapeHtml(analysis.summary.substring(0, 200))}</i>` : ''
        const msgResponse = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: TELEGRAM_CHAT_ID,
            text: `🤖 <b>Auto-publishing...</b>\n\n📰 ${title}\n📌 ${escapeHtml(autoSourceName)}\n📊 Score: ${analysis.relevance_score}/10${summary}\n\n⏳ <i>AI обирає зображення та публікує автоматично</i>`,
            parse_mode: 'HTML'
          })
        })
        try {
          const msgData = await msgResponse.json()
          if (msgData.ok && msgData.result?.message_id) {
            telegramMessageId = msgData.result.message_id
            // Store message_id for later editing
            await supabase
              .from('news')
              .update({ telegram_message_id: telegramMessageId })
              .eq('id', news.id)
          }
        } catch (e) {
          console.warn('⚠️ Failed to parse sendMessage response:', e)
        }
      }

      // Schedule via publishing queue
      const schedConfig = await loadScheduleConfig(supabase)
      const weight = classifyContentWeight(news)

      if (schedConfig.enabled) {
        const { scheduledAt, window: winId, windowLabel } = await computeScheduledTime(weight, schedConfig, supabase)
        const timeStr = formatScheduledTime(scheduledAt)
        console.log(`📅 Scheduled for ${timeStr} (${windowLabel}), weight=${weight}`)

        await supabase.from('news').update({
          auto_publish_status: 'scheduled',
          scheduled_publish_at: scheduledAt.toISOString(),
          content_weight: weight,
          schedule_window: winId,
          telegram_message_id: telegramMessageId,
        }).eq('id', news.id)

        // Edit Telegram message to show scheduled time
        if (telegramMessageId && TELEGRAM_BOT_TOKEN && TELEGRAM_CHAT_ID) {
          await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/editMessageText`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: TELEGRAM_CHAT_ID,
              message_id: telegramMessageId,
              text: `📅 <b>Auto-publish scheduled: ${timeStr}</b> (${windowLabel})\n\n📰 ${escapeHtml((news.original_title || 'Untitled').substring(0, 150))}\n📌 ${escapeHtml(autoSourceName)}\n📊 Score: ${analysis.relevance_score}/10`,
              parse_mode: 'HTML',
              reply_markup: {
                inline_keyboard: [
                  [
                    { text: '⚡ Негайно', callback_data: `imm_${news.id}` },
                    { text: '❌ Скасувати', callback_data: `cs_${news.id}` }
                  ]
                ]
              }
            })
          })
        }
      } else {
        // Schedule disabled — fire-and-forget (legacy)
        await supabase.from('news').update({
          auto_publish_status: 'queued',
          auto_publish_queued_at: new Date().toISOString(),
          telegram_message_id: telegramMessageId,
        }).eq('id', news.id)

        fetch(`${SUPABASE_URL}/functions/v1/auto-publish-news`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ newsId: news.id, source: 'rss', telegramMessageId })
        }).catch(e => console.warn('⚠️ Auto-publish fire error:', e))
      }

      return new Response(
        JSON.stringify({ success: true, newsId: news.id, autoPublish: true, scheduled: schedConfig.enabled }),
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

  const relevanceEmoji = analysis.relevance_score >= 7 ? '🟢' :
                         analysis.relevance_score >= 5 ? '🟡' : '🔴'

  const hasVariants = variants && variants.length > 0

  // Short summary (first sentence, max 9 words)
  const shortSummary = getShortSummary(analysis.summary)

  // Expandable details block
  const keyPointsList = analysis.key_points
    .map(point => `• ${point}`)
    .join('\n')

  const expandableContent = `<blockquote expandable>📋 ${escapeHtml(analysis.summary)}

${escapeHtml(keyPointsList)}

🎯 ${analysis.recommended_action.toUpperCase()}${analysis.skip_reason ? `\nℹ️ ${escapeHtml(analysis.skip_reason)}` : ''}</blockquote>`

  // Compact variant section
  let variantsSection = ''
  if (hasVariants) {
    variantsSection = '\n\n🎨 Оберіть концепцію:' + formatCompactVariants(variants!, escapeHtml)
  }

  const messageText = `📰 <b>RSS</b> | 📌 ${escapeHtml(sourceName)} | ${relevanceEmoji} ${analysis.relevance_score}/10 | ${CATEGORY_SHORT[analysis.category] || analysis.category}
🔗 <a href="${url}">${escapeHtml(title.substring(0, 100))}</a>

💬 ${escapeHtml(shortSummary)}

${expandableContent}${variantsSection}

newsId:${newsId}`

  // Build preset keyboard (one-click publishing)
  const variantCount = hasVariants ? variants!.length : 0
  const keyboard = buildPresetKeyboard(newsId, variantCount, false)

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

