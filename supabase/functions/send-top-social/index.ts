import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'
import { escapeHtml } from '../_shared/social-media-helpers.ts'
import { loadScheduleConfig, computeScheduledTime, classifyContentWeight, formatScheduledTime } from '../_shared/schedule-helpers.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const TELEGRAM_BOT_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN')
const TELEGRAM_CHAT_ID = Deno.env.get('TELEGRAM_CHAT_ID')

const VERSION = '2026-04-03-v5-schedule-pipeline'

async function sendTelegram(text: string) {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) return
  try {
    await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: TELEGRAM_CHAT_ID, text, parse_mode: 'HTML', disable_web_page_preview: true }),
    })
  } catch (e) { console.error('Telegram failed:', e) }
}

serve(async (req) => {
  console.log(`🔥 Send Top Social ${VERSION} started`)

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    // Check stream mode
    const { data: modeSetting } = await supabase
      .from('api_settings').select('key_value').eq('key_name', 'STREAM_MODE').maybeSingle()

    const streamMode = modeSetting?.key_value || 'legacy'
    if (streamMode !== 'streams') {
      console.log('⏭️ Not in streams mode, skipping')
      return new Response(JSON.stringify({ success: true, skipped: true, reason: 'not_streams_mode' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // Top N setting
    const { data: topNSetting } = await supabase
      .from('api_settings').select('key_value').eq('key_name', 'STREAM3_TOP_N').maybeSingle()
    const topN = parseInt(topNSetting?.key_value || '3', 10)

    // Accept optional targetDate from request body
    const body = await req.json().catch(() => ({}))

    // Target date: from request or yesterday
    let targetDay: Date
    if (body.targetDate) {
      targetDay = new Date(body.targetDate + 'T00:00:00Z')
      console.log(`📅 Manual target date: ${body.targetDate}`)
    } else {
      targetDay = new Date()
      targetDay.setDate(targetDay.getDate() - 1)
    }
    const dayStart = new Date(targetDay.getFullYear(), targetDay.getMonth(), targetDay.getDate()).toISOString()
    const dayEnd = new Date(targetDay.getFullYear(), targetDay.getMonth(), targetDay.getDate(), 23, 59, 59, 999).toISOString()

    console.log(`📅 Articles from ${dayStart.slice(0, 10)}`)

    // Fetch articles with fields needed for scheduling
    const { data: articles, error: fetchError } = await supabase
      .from('news')
      .select('id, original_title, title_en, slug_en, rss_analysis, image_url, processed_image_url, source_id, original_url, rss_source_url, source_type, auto_publish_status, original_content, video_url, original_video_url')
      .eq('is_published', true)
      .gte('published_at', dayStart)
      .lte('published_at', dayEnd)
      .order('published_at', { ascending: false })

    if (fetchError) throw new Error(`Fetch failed: ${fetchError.message}`)

    if (!articles?.length) {
      console.log('📭 No articles yesterday')
      await sendTelegram(`📊 <b>Auto Social</b>\n\n📭 Немає статей за вчора. Пропускаю.`)
      return new Response(JSON.stringify({ success: true, count: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // Sort by linkedin_score, take top N
    const sorted = articles
      .map(a => ({
        ...a,
        linkedinScore: (a.rss_analysis as Record<string, unknown>)?.linkedin_score as number || 0,
      }))
      .sort((a, b) => b.linkedinScore - a.linkedinScore)
      .slice(0, topN)

    // Filter out articles already scheduled/in-progress/completed
    const eligible = sorted.filter(a => !a.auto_publish_status)
    const skippedCount = sorted.length - eligible.length

    console.log(`🏆 Top ${sorted.length} selected, ${eligible.length} eligible, ${skippedCount} already scheduled`)

    if (!eligible.length) {
      const msg = `📊 <b>Auto Social [${targetDay.toLocaleDateString('uk-UA')}]</b>\n\n⏭️ Усі топ-${sorted.length} вже заплановано або оброблено.`
      await sendTelegram(msg)
      return new Response(JSON.stringify({ success: true, scheduled: 0, skipped: skippedCount }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // Load schedule config
    const schedConfig = await loadScheduleConfig(supabase)

    // Default preset for auto-published articles
    const presetConfig = {
      variantIndex: null,
      imageLanguage: 'en',
      publicationType: 'news',
      socialPlatforms: ['linkedin', 'facebook', 'instagram'],
      skipQueue: false,
    }

    // Schedule each article sequentially (computeScheduledTime reads occupied slots)
    const scheduledArticles: Array<{ title: string; score: number; time: string; window: string }> = []

    for (const article of eligible) {
      const weight = classifyContentWeight(article)
      const { scheduledAt, window: winId, windowLabel } = await computeScheduledTime(weight, schedConfig, supabase)

      const { error: updateError } = await supabase.from('news').update({
        auto_publish_status: 'scheduled',
        scheduled_publish_at: scheduledAt.toISOString(),
        content_weight: weight,
        schedule_window: winId,
        preset_config: presetConfig,
      }).eq('id', article.id)

      if (updateError) {
        console.error(`Failed to schedule ${article.id}: ${updateError.message}`)
        continue
      }

      const title = (article.title_en || article.original_title || 'Untitled').substring(0, 80)
      scheduledArticles.push({
        title,
        score: article.linkedinScore,
        time: formatScheduledTime(scheduledAt),
        window: windowLabel,
      })
      console.log(`📅 Scheduled: ${title} → ${formatScheduledTime(scheduledAt)} (${windowLabel})`)
    }

    // Telegram summary
    const dateStr = targetDay.toLocaleDateString('uk-UA')
    const summaryLines = scheduledArticles.map((a, i) =>
      `<b>${i + 1}. ${escapeHtml(a.title)}</b>\n⏰ ${a.time} (${a.window}) | LI:${a.score}/10`
    )

    const skippedNote = skippedCount > 0
      ? `\n⏭️ ${skippedCount} вже заплановано/оброблено`
      : ''

    const scheduleNote = !schedConfig.enabled
      ? '\n⚠️ Schedule publisher вимкнений — статті чекають увімкнення'
      : ''

    await sendTelegram(
      `📊 <b>Auto Social [${dateStr}]</b>\n📅 Заплановано: ${scheduledArticles.length} статей${skippedNote}${scheduleNote}\n\n` +
      summaryLines.join('\n\n')
    )

    return new Response(
      JSON.stringify({ success: true, scheduled: scheduledArticles.length, skipped: skippedCount, articles: scheduledArticles }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error)
    console.error('❌ Fatal:', msg)
    await sendTelegram(`📊 <b>Auto Social</b>\n\n❌ ${msg.slice(0, 200)}`)
    return new Response(
      JSON.stringify({ success: false, error: msg }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
