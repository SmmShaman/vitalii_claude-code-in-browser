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

const VERSION = '2026-03-27-v4-gemini'
const SOCIAL_SLOTS = ['09:00', '13:00', '15:00', '18:00']
const PLATFORMS = ['linkedin', 'facebook', 'instagram'] as const

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

async function callEdgeFunction(name: string, body: Record<string, unknown>): Promise<{ ok: boolean; data?: Record<string, unknown>; error?: string }> {
  try {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/${name}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })
    const data = await res.json().catch(() => ({}))
    return res.ok ? { ok: true, data } : { ok: false, error: `${res.status}: ${JSON.stringify(data).slice(0, 200)}` }
  } catch (e) {
    return { ok: false, error: String(e) }
  }
}

function getTodayLanguage(): 'en' | 'no' {
  const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000)
  return dayOfYear % 2 === 0 ? 'en' : 'no'
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

    // Language for today
    const lang = getTodayLanguage()
    console.log(`🌐 Auto-publish language: ${lang}`)

    // Yesterday's date range
    const now = new Date()
    const yesterday = new Date(now)
    yesterday.setDate(yesterday.getDate() - 1)
    const dayStart = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate()).toISOString()
    const dayEnd = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate(), 23, 59, 59, 999).toISOString()

    console.log(`📅 Articles from ${dayStart.slice(0, 10)}`)

    // Fetch articles
    const { data: articles, error: fetchError } = await supabase
      .from('news')
      .select('id, original_title, title_en, slug_en, rss_analysis, image_url, processed_image_url, source_id, original_url, rss_source_url')
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

    console.log(`🏆 Top ${sorted.length} selected`)

    // Auto-publish each article to all 3 platforms
    const allResults: string[] = []

    for (let i = 0; i < sorted.length; i++) {
      const article = sorted[i]
      const slot = SOCIAL_SLOTS[i] || SOCIAL_SLOTS[SOCIAL_SLOTS.length - 1]
      const title = (article.title_en || article.original_title || 'Untitled').substring(0, 80)
      const newsId = article.id

      console.log(`\n📰 ${i + 1}/${sorted.length}: ${title} (LI:${article.linkedinScore})`)

      const platformResults: string[] = []
      const articleTitle = article.title_en || article.original_title || 'Untitled'
      const articleSlug = (article as Record<string, unknown>).slug_en || ''
      const articleUrl = articleSlug ? `https://vitalii.no/news/${articleSlug}` : ''
      const imgUrl = article.processed_image_url || article.image_url || ''

      // LinkedIn — direct API
      try {
        const liToken = Deno.env.get('LINKEDIN_ACCESS_TOKEN') || ''
        const liUrn = Deno.env.get('LINKEDIN_PERSON_URN') || ''
        if (liToken && liUrn) {
          const liText = `${articleTitle}\n\n${articleUrl}`
          // deno-lint-ignore no-explicit-any
          let shareContent: any = { shareCommentary: { text: liText }, shareMediaCategory: 'NONE' }
          // Upload image if available
          if (imgUrl) {
            try {
              const regRes = await fetch('https://api.linkedin.com/v2/assets?action=registerUpload', {
                method: 'POST', headers: { 'Authorization': `Bearer ${liToken}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ registerUploadRequest: { recipes: ['urn:li:digitalmediaRecipe:feedshare-image'], owner: liUrn, serviceRelationships: [{ relationshipType: 'OWNER', identifier: 'urn:li:userGeneratedContent' }] } }),
              })
              if (regRes.ok) {
                const rd = await regRes.json()
                const upUrl = rd.value?.uploadMechanism?.['com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest']?.uploadUrl
                const asset = rd.value?.asset
                if (upUrl && asset) {
                  const ib = await fetch(imgUrl).then(r => r.arrayBuffer())
                  await fetch(upUrl, { method: 'PUT', headers: { 'Authorization': `Bearer ${liToken}` }, body: ib })
                  shareContent = { shareCommentary: { text: liText }, shareMediaCategory: 'IMAGE', media: [{ status: 'READY', media: asset }] }
                }
              }
            } catch { /* image upload failed, post without */ }
          }
          const liRes = await fetch('https://api.linkedin.com/v2/ugcPosts', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${liToken}`, 'Content-Type': 'application/json', 'X-Restli-Protocol-Version': '2.0.0' },
            body: JSON.stringify({ author: liUrn, lifecycleState: 'PUBLISHED', specificContent: { 'com.linkedin.ugc.ShareContent': shareContent }, visibility: { 'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC' } }),
          })
          platformResults.push(liRes.ok ? '✅ linkedin' : `❌ linkedin: ${liRes.status}`)
        } else { platformResults.push('⏭️ linkedin') }
      } catch (e: unknown) { platformResults.push(`❌ linkedin: ${e instanceof Error ? e.message.slice(0, 30) : 'err'}`) }

      // Facebook — direct API
      try {
        const fbToken = Deno.env.get('FACEBOOK_PAGE_ACCESS_TOKEN') || ''
        const fbPage = Deno.env.get('FACEBOOK_PAGE_ID') || ''
        if (fbToken && fbPage) {
          const fbRes = await fetch(`https://graph.facebook.com/v18.0/${fbPage}/feed`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: articleTitle, link: articleUrl || undefined, access_token: fbToken }),
          })
          platformResults.push(fbRes.ok ? '✅ facebook' : `❌ facebook: ${fbRes.status}`)
        } else { platformResults.push('⏭️ facebook') }
      } catch (e: unknown) { platformResults.push(`❌ facebook: ${e instanceof Error ? e.message.slice(0, 30) : 'err'}`) }

      // Instagram — skip (needs image + specific format)
      platformResults.push('⏭️ instagram')

      allResults.push(`<b>${i + 1}. ${escapeHtml(title)}</b>\n⏰ ${slot} | LI:${article.linkedinScore}/10\n${platformResults.join(' | ')}`)
    }

    // Telegram summary
    const dateStr = yesterday.toLocaleDateString('uk-UA')
    await sendTelegram(
      `📊 <b>Auto Social [${dateStr}]</b>\n🌐 ${lang.toUpperCase()} | ${sorted.length} статей\n\n` +
      allResults.join('\n\n')
    )

    return new Response(
      JSON.stringify({ success: true, lang, published: sorted.length }),
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
