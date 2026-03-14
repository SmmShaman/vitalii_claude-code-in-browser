import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'
import { escapeHtml } from '../_shared/social-media-helpers.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const TELEGRAM_BOT_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN')
const TELEGRAM_CHAT_ID = Deno.env.get('TELEGRAM_CHAT_ID')

const VERSION = '2026-03-14-v2-top-social'
const SOCIAL_SLOTS = ['09:00', '13:00', '18:00']

/**
 * Stream 3: Send Top N articles to Telegram bot for social media posting
 * Runs daily at 08:00 Oslo after daily video digest (07:00)
 *
 * Flow:
 * 1. Check STREAM_MODE — skip if not 'streams'
 * 2. Select top N articles from yesterday by linkedin_score
 * 3. Send to Telegram bot with social media buttons (no heavy processing here)
 *
 * Image generation and 3-language rewrite happen ON DEMAND when moderator
 * clicks a social button in the bot (handled by telegram-webhook).
 */
serve(async (req) => {
  console.log(`🔥 Send Top Social ${VERSION} started`)

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    // Check stream mode — graceful handling if setting doesn't exist
    const { data: modeSetting, error: modeError } = await supabase
      .from('api_settings')
      .select('key_value')
      .eq('key_name', 'STREAM_MODE')
      .maybeSingle()

    const streamMode = modeSetting?.key_value || 'legacy'
    console.log(`📋 STREAM_MODE: ${streamMode}${modeError ? ` (error: ${modeError.message})` : ''}`)

    if (streamMode !== 'streams') {
      console.log('⏭️ Not in streams mode, skipping')
      return new Response(
        JSON.stringify({ success: true, skipped: true, reason: 'not_streams_mode', mode: streamMode }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Load top N setting
    const { data: topNSetting } = await supabase
      .from('api_settings')
      .select('key_value')
      .eq('key_name', 'STREAM3_TOP_N')
      .maybeSingle()

    const topN = parseInt(topNSetting?.key_value || '3', 10)

    // Get yesterday's date range
    const now = new Date()
    const yesterday = new Date(now)
    yesterday.setDate(yesterday.getDate() - 1)
    const dayStart = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate()).toISOString()
    const dayEnd = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate(), 23, 59, 59, 999).toISOString()

    console.log(`📅 Fetching articles from ${dayStart} to ${dayEnd}`)

    // Fetch yesterday's published articles with linkedin_score
    const { data: articles, error: fetchError } = await supabase
      .from('news')
      .select('id, original_title, title_en, rss_analysis, image_url, processed_image_url, source_id, original_url, rss_source_url')
      .eq('is_published', true)
      .gte('published_at', dayStart)
      .lte('published_at', dayEnd)
      .order('published_at', { ascending: false })

    if (fetchError) throw new Error(`Failed to fetch articles: ${fetchError.message}`)

    if (!articles || articles.length === 0) {
      console.log('📭 No articles published yesterday')
      return new Response(
        JSON.stringify({ success: true, count: 0, message: 'No articles yesterday' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Sort by linkedin_score descending, take top N
    const sorted = articles
      .map(a => ({
        ...a,
        linkedinScore: (a.rss_analysis as any)?.linkedin_score || 0,
        trendingBonus: (a.rss_analysis as any)?.trending_data?.total_bonus || 0,
        hnPosts: (a.rss_analysis as any)?.trending_data?.hn?.hnPosts || 0,
        hnTopScore: (a.rss_analysis as any)?.trending_data?.hn?.topScore || 0,
        matchedTrends: (a.rss_analysis as any)?.trending_data?.google_trends?.matchedTrends || [],
      }))
      .sort((a, b) => b.linkedinScore - a.linkedinScore)
      .slice(0, topN)

    console.log(`🏆 Top ${sorted.length} articles selected:`)
    sorted.forEach((a, i) => console.log(`  ${i + 1}. LI:${a.linkedinScore} — ${(a.original_title || '').substring(0, 60)}`))

    // Send each article to Telegram bot (lightweight — no image gen or rewrite here)
    const results: Array<{ newsId: string; title: string; slot: string; success: boolean; error?: string }> = []

    for (let i = 0; i < sorted.length; i++) {
      const article = sorted[i]
      const slot = SOCIAL_SLOTS[i] || SOCIAL_SLOTS[SOCIAL_SLOTS.length - 1]

      try {
        const title = article.title_en || article.original_title || 'Untitled'

        // Lookup source name
        let sourceName = ''
        if (article.source_id) {
          const { data: srcData } = await supabase
            .from('news_sources').select('name').eq('id', article.source_id).maybeSingle()
          if (srcData?.name) sourceName = srcData.name
        }
        if (!sourceName) {
          const fallbackUrl = article.original_url || article.rss_source_url || ''
          try { sourceName = new URL(fallbackUrl).hostname.replace('www.', '') } catch { sourceName = 'RSS' }
        }

        // Build trending info
        let trendingInfo = ''
        if (article.trendingBonus > 0) {
          const parts: string[] = []
          if (article.hnPosts > 0) parts.push(`HN: ${article.hnPosts} posts (${article.hnTopScore} pts)`)
          if (article.matchedTrends.length > 0) parts.push(`Trends: ${article.matchedTrends.join(', ')}`)
          trendingInfo = `\n📈 ${parts.join(' | ')}`
        }

        const hasImage = article.processed_image_url ? '✅' : '⚠️ no image'

        const messageText = `🔥 <b>Топ-${i + 1} для соцмереж</b> (${yesterday.toLocaleDateString('uk-UA')})
⏰ Слот: ${slot} Oslo
🖼️ Image: ${hasImage}

📰 ${escapeHtml(title.substring(0, 150))}
📌 ${escapeHtml(sourceName)} · 🔗 LI:${article.linkedinScore}/10${article.trendingBonus > 0 ? ` (+${article.trendingBonus})` : ''}${trendingInfo}

newsId:${article.id}`

        // Social media buttons (reuse existing callback patterns from telegram-webhook)
        const nid = article.id
        const keyboard = {
          inline_keyboard: [
            // All platforms per language
            [
              { text: '🌐 All EN', callback_data: `all_en_${nid}` },
              { text: '🌐 All NO', callback_data: `all_no_${nid}` },
            ],
            // LinkedIn
            [
              { text: '🔗 LinkedIn EN', callback_data: `linkedin_en_${nid}` },
              { text: '🔗 LinkedIn NO', callback_data: `linkedin_no_${nid}` },
              { text: '🔗 LinkedIn UA', callback_data: `linkedin_ua_${nid}` },
            ],
            // Facebook + Instagram
            [
              { text: '📘 Facebook EN', callback_data: `facebook_en_${nid}` },
              { text: '📸 Instagram EN', callback_data: `instagram_en_${nid}` },
            ],
            // Skip
            [
              { text: '⏭️ Skip', callback_data: `skip_social_${nid}` },
            ],
          ]
        }

        if (TELEGRAM_BOT_TOKEN && TELEGRAM_CHAT_ID) {
          const tgResp = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: TELEGRAM_CHAT_ID,
              text: messageText,
              parse_mode: 'HTML',
              reply_markup: keyboard,
            })
          })
          if (!tgResp.ok) {
            const body = await tgResp.text()
            console.warn(`⚠️ Telegram send failed: ${tgResp.status} ${body}`)
          }
        }

        results.push({ newsId: article.id, title: title.substring(0, 60), slot, success: true })
        console.log(`✅ Sent to bot: ${title.substring(0, 50)} → slot ${slot}`)

      } catch (e: any) {
        console.error(`❌ Failed for article ${i + 1}:`, e.message)
        results.push({ newsId: article.id, title: (article.original_title || '').substring(0, 60), slot, success: false, error: e.message })
      }
    }

    const successCount = results.filter(r => r.success).length
    console.log(`🏁 Done: ${successCount}/${results.length} articles sent to bot`)

    return new Response(
      JSON.stringify({ success: true, results, totalArticles: articles.length, selected: sorted.length }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error: any) {
    console.error('❌ Send Top Social failed:', error)
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
