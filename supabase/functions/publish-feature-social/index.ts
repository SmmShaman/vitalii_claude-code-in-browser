import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'
import { FEATURES, FEATURE_ORDER } from '../_shared/features-social-data.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const TELEGRAM_BOT_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN')
const TELEGRAM_CHAT_ID = Deno.env.get('TELEGRAM_CHAT_ID')

const VERSION = '2026-03-23-v1-feature-social'
const PLATFORMS = ['linkedin', 'facebook'] as const

function json(data: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

async function sendTelegram(text: string) {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) return
  try {
    await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: TELEGRAM_CHAT_ID, text, parse_mode: 'HTML' }),
    })
  } catch (e) {
    console.error('Telegram send failed:', e)
  }
}

function getTodayLanguage(): 'en' | 'no' {
  const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000)
  return dayOfYear % 2 === 0 ? 'en' : 'no'
}

function formatLinkedInPost(feature: typeof FEATURES[0], lang: 'en' | 'no'): string {
  const title = feature.t[lang]
  const desc = feature.sd[lang]
  const tech = feature.ts.join(' · ')
  const tags = feature.h.join(' ')
  const project = feature.pid === 'portfolio' ? 'vitalii.no' : 'JobBot Norway'
  const featureNum = FEATURE_ORDER.indexOf(feature.id) + 1

  if (lang === 'en') {
    return `🚀 Real Production Feature #${featureNum}/90\n\n` +
      `${title}\n\n` +
      `${desc}\n\n` +
      `This isn't a tutorial project — it's a production system handling real traffic every day.\n\n` +
      `🛠 Built with: ${tech}\n\n` +
      `👉 See all 90 features: ${project}\n\n` +
      `${tags} #FullStack #OpenSource #ProductionCode #WebDev`
  }
  return `🚀 Ekte Produksjonsfunksjon #${featureNum}/90\n\n` +
    `${title}\n\n` +
    `${desc}\n\n` +
    `Dette er ikke et tutorialprosjekt — det er et produksjonssystem som håndterer ekte trafikk hver dag.\n\n` +
    `🛠 Bygget med: ${tech}\n\n` +
    `👉 Se alle 90 funksjoner: ${project}\n\n` +
    `${tags} #FullStack #OpenSource #ProductionCode #WebDev`
}

function formatFacebookPost(feature: typeof FEATURES[0], lang: 'en' | 'no'): string {
  const title = feature.t[lang]
  const desc = feature.sd[lang]
  const tags = feature.h.slice(0, 4).join(' ')
  const featureNum = FEATURE_ORDER.indexOf(feature.id) + 1
  const project = feature.pid === 'portfolio' ? 'vitalii.no' : 'JobBot Norway'

  if (lang === 'en') {
    return `🚀 Feature #${featureNum}/90 from my production portfolio\n\n` +
      `${title}\n\n` +
      `${desc}\n\n` +
      `👉 ${project}\n\n` +
      `${tags} #FullStack #WebDev`
  }
  return `🚀 Funksjon #${featureNum}/90 fra min produksjonsportefølje\n\n` +
    `${title}\n\n` +
    `${desc}\n\n` +
    `👉 ${project}\n\n` +
    `${tags} #FullStack #WebDev`
}

async function postToLinkedIn(text: string, supabase: ReturnType<typeof createClient>): Promise<{ id?: string; url?: string; error?: string }> {
  // Try env vars first (Supabase secrets), fallback to api_settings table
  let token = Deno.env.get('LINKEDIN_ACCESS_TOKEN') || ''
  let urn = Deno.env.get('LINKEDIN_PERSON_URN') || ''
  if (!token || !urn) {
    const { data: tokenRow } = await supabase.from('api_settings').select('key_value').eq('key_name', 'LINKEDIN_ACCESS_TOKEN').single()
    const { data: urnRow } = await supabase.from('api_settings').select('key_value').eq('key_name', 'LINKEDIN_PERSON_URN').single()
    token = tokenRow?.key_value || token
    urn = urnRow?.key_value || urn
  }
  if (!token || !urn) return { error: 'LinkedIn credentials not configured' }

  const body = {
    author: urn,
    lifecycleState: 'PUBLISHED',
    specificContent: {
      'com.linkedin.ugc.ShareContent': {
        shareCommentary: { text },
        shareMediaCategory: 'NONE',
      },
    },
    visibility: { 'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC' },
  }

  const res = await fetch('https://api.linkedin.com/v2/ugcPosts', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', 'X-Restli-Protocol-Version': '2.0.0' },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const err = await res.text()
    return { error: `LinkedIn ${res.status}: ${err.slice(0, 200)}` }
  }

  const postId = res.headers.get('x-restli-id') || ''
  // Use share URN directly — activity URN is different and may not resolve
  return { id: postId, url: postId ? `https://www.linkedin.com/feed/update/${postId}` : undefined }
}

async function postToFacebook(text: string, supabase: ReturnType<typeof createClient>): Promise<{ id?: string; url?: string; error?: string }> {
  let fbToken = Deno.env.get('FACEBOOK_PAGE_ACCESS_TOKEN') || ''
  let fbPageId = Deno.env.get('FACEBOOK_PAGE_ID') || ''
  if (!fbToken || !fbPageId) {
    const { data: tokenRow } = await supabase.from('api_settings').select('key_value').eq('key_name', 'FACEBOOK_PAGE_ACCESS_TOKEN').single()
    const { data: pageRow } = await supabase.from('api_settings').select('key_value').eq('key_name', 'FACEBOOK_PAGE_ID').single()
    fbToken = tokenRow?.key_value || fbToken
    fbPageId = pageRow?.key_value || fbPageId
  }
  if (!fbToken || !fbPageId) return { error: 'Facebook credentials not configured' }

  const truncated = text.length > 2000 ? text.slice(0, 1997) + '...' : text

  const res = await fetch(`https://graph.facebook.com/v18.0/${fbPageId}/feed`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: truncated, access_token: fbToken }),
  })

  if (!res.ok) {
    const err = await res.text()
    return { error: `Facebook ${res.status}: ${err.slice(0, 200)}` }
  }

  const data = await res.json()
  return { id: data.id, url: data.id ? `https://facebook.com/${data.id}` : undefined }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  console.log(`${VERSION} started`)
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

  try {
    const lang = getTodayLanguage()
    console.log(`Today's language: ${lang}`)

    // Find all features already posted for this language
    const { data: posted } = await supabase
      .from('feature_social_posts')
      .select('feature_id')
      .eq('language', lang)
      .eq('status', 'posted')

    const postedIds = new Set((posted || []).map(p => p.feature_id))
    console.log(`Already posted in ${lang}: ${postedIds.size}/${FEATURE_ORDER.length}`)

    // Find next unpublished feature
    const nextId = FEATURE_ORDER.find(id => !postedIds.has(id))
    if (!nextId) {
      // Full cycle completed — restart
      console.log(`Full cycle completed for ${lang}! Resetting...`)
      await supabase.from('feature_social_posts').delete().eq('language', lang).eq('status', 'posted')
      await sendTelegram(`📋 <b>Feature Social</b>\n\n✅ Повний цикл ${FEATURE_ORDER.length} фіч завершено для ${lang.toUpperCase()}!\nПочинаю новий цикл.`)
      return json({ ok: true, message: `Cycle completed for ${lang}, reset done` })
    }

    const feature = FEATURES.find(f => f.id === nextId)!
    const featureNum = FEATURE_ORDER.indexOf(nextId) + 1
    console.log(`Publishing feature ${featureNum}/${FEATURE_ORDER.length}: ${nextId} — ${feature.t[lang]}`)

    const results: Record<string, { ok: boolean; url?: string; error?: string }> = {}

    for (const platform of PLATFORMS) {
      // Check duplicate
      const { data: existing } = await supabase
        .from('feature_social_posts')
        .select('id')
        .eq('feature_id', nextId)
        .eq('platform', platform)
        .eq('language', lang)
        .in('status', ['posted', 'pending'])
        .maybeSingle()

      if (existing) {
        console.log(`${platform}: already posted/pending, skip`)
        results[platform] = { ok: true, url: 'already posted' }
        continue
      }

      // Create pending record
      const { data: record } = await supabase
        .from('feature_social_posts')
        .insert({ feature_id: nextId, platform, language: lang, status: 'pending' })
        .select('id')
        .single()

      const content = platform === 'linkedin'
        ? formatLinkedInPost(feature, lang)
        : formatFacebookPost(feature, lang)

      let postResult: { id?: string; url?: string; error?: string }

      if (platform === 'linkedin') {
        postResult = await postToLinkedIn(content, supabase)
      } else {
        postResult = await postToFacebook(content, supabase)
      }

      if (postResult.error) {
        console.error(`${platform} error:`, postResult.error)
        await supabase.from('feature_social_posts').update({
          status: 'failed', error_message: postResult.error, post_content: content,
        }).eq('id', record?.id)
        results[platform] = { ok: false, error: postResult.error }
      } else {
        await supabase.from('feature_social_posts').update({
          status: 'posted',
          platform_post_id: postResult.id,
          platform_post_url: postResult.url,
          post_content: content,
          posted_at: new Date().toISOString(),
        }).eq('id', record?.id)
        results[platform] = { ok: true, url: postResult.url }
      }
    }

    // Telegram summary
    const statusLines = Object.entries(results).map(([p, r]) =>
      r.ok ? `✅ ${p}: ${r.url || 'ok'}` : `❌ ${p}: ${r.error?.slice(0, 80)}`
    ).join('\n')

    await sendTelegram(
      `📋 <b>Feature Social [${featureNum}/${FEATURE_ORDER.length}]</b>\n\n` +
      `🔧 ${feature.t[lang]}\n` +
      `🌐 ${lang.toUpperCase()}\n\n${statusLines}`
    )

    return json({ ok: true, feature: nextId, lang, results })
  } catch (err) {
    console.error('Fatal error:', err)
    await sendTelegram(`📋 <b>Feature Social</b>\n\n❌ Error: ${String(err).slice(0, 200)}`)
    return json({ ok: false, error: String(err) }, 500)
  }
})
