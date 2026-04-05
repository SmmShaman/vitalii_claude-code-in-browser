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

const VERSION = '2026-03-27-v4-gemini-social'
const PLATFORMS = ['linkedin', 'facebook'] as const

// deno-lint-ignore no-explicit-any
type DbFeature = any

function json(data: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(data), {
    status, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
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
  } catch (e) { console.error('Telegram failed:', e) }
}

function getTodayLanguage(): 'en' | 'no' {
  const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000)
  return dayOfYear % 2 === 0 ? 'en' : 'no'
}

// ── Master Prompt for Gemini ──
const MASTER_PROMPT = `You are an expert social media copywriter for a developer's personal brand.

AUTHOR CONTEXT:
The author is a full-stack developer who set himself a public challenge: document and publish EVERY production feature from his real projects. These are REAL production systems running 24/7, NOT tutorials or demos.

The series creates a narrative: each post is one step in this journey. Readers should want to follow along and not miss the next one.

ANTI-AI WRITING RULES (CRITICAL — apply to ALL platforms):
Your output must read like a real person wrote it, not an AI. Scan your draft for these patterns and eliminate every one:

1. NO inflated significance: never use "testament to", "pivotal moment", "evolving landscape", "vital role", "indelible mark", "setting the stage", "key turning point", "at its core".
2. NO promotional fluff: never use "groundbreaking", "vibrant", "stunning", "breathtaking", "nestled", "in the heart of", "renowned", "showcasing".
3. NO -ing tacking: do not end clauses with "highlighting...", "underscoring...", "ensuring...", "reflecting...", "contributing to...", "fostering...".
4. NO copula avoidance: use "is/are/has" instead of "serves as", "stands as", "represents", "marks", "boasts", "features".
5. NO negative parallelisms: never write "It's not just X; it's Y" or "Not only X but also Y".
6. NO rule of three: do not force ideas into groups of three for rhetorical effect.
7. NO em dash overuse: use commas or periods instead of — dashes. Maximum one em dash per post.
8. NO bold headers in body text: write flowing prose, not "**Speed:** faster" formatted lists.
9. NO AI vocabulary: avoid "delve", "crucial", "enhance", "foster", "garner", "intricate", "tapestry", "underscore", "pivotal", "landscape" (abstract), "interplay", "additionally".
10. NO false ranges: do not use "from X to Y" constructions where X and Y are not on a real scale.
11. NO generic conclusions: never end with "the future looks bright", "exciting times lie ahead", "continues to thrive".
12. NO sycophantic artifacts: never write "Great question!", "I hope this helps", "Let me know if...".
13. NO signposting: never write "Let's dive in", "Here's what you need to know", "Let's break this down".
14. NO excessive hedging: do not write "could potentially", "it might be argued that", "it is important to note".
15. NO persuasive authority tropes: avoid "The real question is", "What really matters", "fundamentally", "the heart of the matter".

VOICE GUIDELINES:
- Write like a real dev talking to peers, not a press release.
- Vary sentence length: short punchy ones mixed with longer ones. Not all the same rhythm.
- Have opinions. React to your own work. "I genuinely didn't expect this to work" is better than neutral reporting.
- Use "I" naturally. First person is honest, not unprofessional.
- Be specific: real function names, real numbers, real file paths. Not "improved performance" but "cut response time from 12s to 0.8s".
- Let some imperfection in. Perfect structure feels algorithmic.
- Acknowledge complexity: "This works but I'm still not 100% happy with the retry logic" is human.

CONTENT RULES:
- Rotate hook styles: curiosity gap, contrarian, data-first, transformation, story-driven, problem-first. Each platform gets a DIFFERENT hook.
- Show don't tell — use real metrics from the case data.
- Mention the feature number naturally (e.g., "Feature #N in my journey through M production features").
- End with warm invitation: welcome questions, comments, feedback.
- Include a soft follow CTA so they don't miss the next feature.

LINKEDIN (1200-1800 chars):
- Hook under 210 characters (before "see more" cutoff). Must grab attention immediately.
- Use STAR/BAB/PAS framework — choose the best fit for this specific case.
- Translate tech jargon into business benefits and real-world impact.
- NO external links in post body (LinkedIn penalizes -60% reach).
- 3-5 hashtags at the very end.
- Discussion question CTA + follow invitation.
- Short paragraphs with line breaks for readability.

INSTAGRAM (max 2200 chars caption):
- First 125 characters are critical (visible before "more" button). Make them count.
- PAS (Problem-Agitate-Solution) framework.
- Casual, educational tone. No corporate voice.
- Emojis: use sparingly but effectively.
- 3-5 niche hashtags.
- CTA: "Save this" + "Send to a dev friend" + "Follow for the next feature".

FACEBOOK (under 280 chars total):
- Hook under 80 characters, result-focused.
- 1-2 hashtags maximum.
- Conversational question CTA.
- Mention the series briefly.
- Friendly, direct tone.

FINAL CHECK: Before outputting, re-read each post and ask yourself "What makes this obviously AI-generated?" Fix any remaining tells.

Return ONLY valid JSON without markdown code fences:
{"linkedin_post": "...", "instagram_caption": "...", "facebook_post": "..."}`

async function generatePostsWithGemini(
  feature: DbFeature,
  featureNum: number,
  totalFeatures: number,
  lang: 'en' | 'no',
  googleApiKey: string,
): Promise<{ linkedin_post: string; instagram_caption: string; facebook_post: string } | null> {
  const featureData = {
    title: lang === 'en' ? feature.title_en : feature.title_no,
    short_description: lang === 'en' ? feature.short_description_en : feature.short_description_no,
    problem: lang === 'en' ? feature.problem_en : feature.problem_no,
    solution: lang === 'en' ? feature.solution_en : feature.solution_no,
    result: lang === 'en' ? feature.result_en : feature.result_no,
    tech_stack: feature.tech_stack || [],
    hashtags: feature.hashtags || [],
    project_id: feature.project_id,
    language: lang,
    feature_number: featureNum,
    total_features: totalFeatures,
  }

  const userMsg = MASTER_PROMPT + '\n\nGenerate posts for this feature:\n' + JSON.stringify(featureData, null, 2)

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${googleApiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: userMsg }] }],
        generationConfig: { temperature: 0.5, maxOutputTokens: 4000 },
      }),
    },
  )

  if (!res.ok) {
    console.error('Gemini API error:', res.status, await res.text())
    return null
  }

  const data = await res.json()
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || ''
  const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()

  try {
    return JSON.parse(cleaned)
  } catch {
    console.error('Failed to parse Gemini response:', cleaned.slice(0, 500))
    return null
  }
}

// Fallback templates if Gemini fails
function fallbackLinkedIn(feature: DbFeature, num: number, total: number, lang: 'en' | 'no'): string {
  const t = lang === 'en' ? feature.title_en : feature.title_no
  const d = lang === 'en' ? feature.short_description_en : feature.short_description_no
  const tags = (feature.hashtags || []).join(' ')
  return `Feature #${num}/${total} from my production portfolio:\n\n${t}\n\n${d}\n\n${tags}`
}

function fallbackFacebook(feature: DbFeature, num: number, total: number, lang: 'en' | 'no'): string {
  const t = lang === 'en' ? feature.title_en : feature.title_no
  return `#${num}/${total}: ${t}\n\n${(feature.hashtags || []).slice(0, 2).join(' ')}`
}

async function postToLinkedIn(text: string, supabase: ReturnType<typeof createClient>): Promise<{ id?: string; url?: string; error?: string }> {
  let token = Deno.env.get('LINKEDIN_ACCESS_TOKEN') || ''
  let urn = Deno.env.get('LINKEDIN_PERSON_URN') || ''
  if (!token || !urn) {
    const { data: tokenRow } = await supabase.from('api_settings').select('key_value').eq('key_name', 'LINKEDIN_ACCESS_TOKEN').single()
    const { data: urnRow } = await supabase.from('api_settings').select('key_value').eq('key_name', 'LINKEDIN_PERSON_URN').single()
    token = tokenRow?.key_value || token
    urn = urnRow?.key_value || urn
  }
  if (!token || !urn) return { error: 'LinkedIn credentials not configured' }

  const res = await fetch('https://api.linkedin.com/v2/ugcPosts', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', 'X-Restli-Protocol-Version': '2.0.0' },
    body: JSON.stringify({
      author: urn, lifecycleState: 'PUBLISHED',
      specificContent: { 'com.linkedin.ugc.ShareContent': { shareCommentary: { text }, shareMediaCategory: 'NONE' } },
      visibility: { 'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC' },
    }),
  })

  if (!res.ok) return { error: `LinkedIn ${res.status}: ${(await res.text()).slice(0, 200)}` }
  const postId = res.headers.get('x-restli-id') || ''
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

  if (!res.ok) return { error: `Facebook ${res.status}: ${(await res.text()).slice(0, 200)}` }
  const data = await res.json()
  return { id: data.id, url: data.id ? `https://facebook.com/${data.id}` : undefined }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  console.log(`${VERSION} started`)
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

  try {
    const body = await req.json().catch(() => ({}))
    const lang: 'en' | 'no' = (body as { lang?: string }).lang === 'no' ? 'no' : (body as { lang?: string }).lang === 'en' ? 'en' : getTodayLanguage()
    console.log(`Language: ${lang}`)

    // Get Google API key for Gemini
    const { data: googleKeyRow } = await supabase.from('api_settings').select('key_value').eq('key_name', 'GOOGLE_API_KEY').single()
    const googleApiKey = googleKeyRow?.key_value || ''

    // Load published features from DB
    const { data: allFeatures, error: featErr } = await supabase
      .from('features').select('*').eq('status', 'published')
      .order('project_id', { ascending: false }).order('feature_id', { ascending: true })

    if (featErr || !allFeatures?.length) {
      return json({ ok: false, error: `No features in DB: ${featErr?.message}` }, 500)
    }

    const featureOrder = allFeatures.map((f: DbFeature) => f.feature_id as string)

    // Find posted features for this language
    const { data: posted } = await supabase
      .from('feature_social_posts').select('feature_id').eq('language', lang).eq('status', 'posted')

    const postedIds = new Set((posted || []).map(p => p.feature_id))
    console.log(`Posted in ${lang}: ${postedIds.size}/${featureOrder.length}`)

    // Next unpublished feature
    const nextId = featureOrder.find((id: string) => !postedIds.has(id))
    if (!nextId) {
      await supabase.from('feature_social_posts').delete().eq('language', lang).eq('status', 'posted')
      await sendTelegram(`📋 <b>Feature Social</b>\n\n✅ Повний цикл ${featureOrder.length} фіч для ${lang.toUpperCase()} завершено! Починаю спочатку.`)
      return json({ ok: true, message: `Cycle completed for ${lang}` })
    }

    const feature = allFeatures.find((f: DbFeature) => f.feature_id === nextId)!
    const featureNum = featureOrder.indexOf(nextId) + 1
    const titleField = lang === 'en' ? 'title_en' : 'title_no'
    console.log(`Feature ${featureNum}/${featureOrder.length}: ${nextId} — ${feature[titleField]}`)

    // Generate posts with Gemini AI
    let aiPosts = googleApiKey
      ? await generatePostsWithGemini(feature, featureNum, featureOrder.length, lang, googleApiKey)
      : null

    if (aiPosts) {
      console.log('Gemini generated posts successfully')
    } else {
      console.log('Gemini failed or no key, using fallback templates')
    }

    const results: Record<string, { ok: boolean; url?: string; error?: string }> = {}

    for (const platform of PLATFORMS) {
      // Duplicate check
      const { data: existing } = await supabase
        .from('feature_social_posts').select('id')
        .eq('feature_id', nextId).eq('platform', platform).eq('language', lang)
        .in('status', ['posted', 'pending']).maybeSingle()

      if (existing) {
        results[platform] = { ok: true, url: 'already posted' }
        continue
      }

      // Pending record
      const { data: record } = await supabase
        .from('feature_social_posts')
        .insert({ feature_id: nextId, platform, language: lang, status: 'pending' })
        .select('id').single()

      // Get content: AI or fallback
      let content: string
      if (platform === 'linkedin') {
        content = aiPosts?.linkedin_post || fallbackLinkedIn(feature, featureNum, featureOrder.length, lang)
      } else {
        content = aiPosts?.facebook_post || fallbackFacebook(feature, featureNum, featureOrder.length, lang)
      }

      const postResult = platform === 'linkedin'
        ? await postToLinkedIn(content, supabase)
        : await postToFacebook(content, supabase)

      if (postResult.error) {
        await supabase.from('feature_social_posts').update({
          status: 'failed', error_message: postResult.error, post_content: content,
        }).eq('id', record?.id)
        results[platform] = { ok: false, error: postResult.error }
      } else {
        await supabase.from('feature_social_posts').update({
          status: 'posted', platform_post_id: postResult.id,
          platform_post_url: postResult.url, post_content: content,
          posted_at: new Date().toISOString(),
        }).eq('id', record?.id)
        results[platform] = { ok: true, url: postResult.url }
      }
    }

    // Telegram summary
    const statusLines = Object.entries(results).map(([p, r]) =>
      r.ok ? `✅ ${p}: ${r.url || 'ok'}` : `❌ ${p}: ${r.error?.slice(0, 80)}`
    ).join('\n')
    const aiLabel = aiPosts ? '🤖 Gemini' : '📝 Fallback'

    await sendTelegram(
      `📋 <b>Feature Social [${featureNum}/${featureOrder.length}]</b>\n\n` +
      `🔧 ${feature[titleField]}\n` +
      `🌐 ${lang.toUpperCase()} | ${aiLabel}\n\n${statusLines}`
    )

    return json({ ok: true, feature: nextId, lang, ai: !!aiPosts, results })
  } catch (err) {
    console.error('Fatal:', err)
    await sendTelegram(`📋 <b>Feature Social</b>\n\n❌ Error: ${String(err).slice(0, 200)}`)
    return json({ ok: false, error: String(err) }, 500)
  }
})
