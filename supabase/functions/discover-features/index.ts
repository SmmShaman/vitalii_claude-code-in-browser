import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const AZURE_OPENAI_ENDPOINT = Deno.env.get('AZURE_OPENAI_ENDPOINT')!
const AZURE_OPENAI_API_KEY = Deno.env.get('AZURE_OPENAI_API_KEY')!
const TELEGRAM_BOT_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN')
const TELEGRAM_CHAT_ID = Deno.env.get('TELEGRAM_CHAT_ID')

const VERSION = '2026-03-23-v1-discover-features'
const DEPLOYMENT = 'Jobbot-gpt-4.1-mini'
const API_VERSION = '2024-02-15-preview'

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

async function callAzureOpenAI(systemPrompt: string, userPrompt: string): Promise<string> {
  const url = `${AZURE_OPENAI_ENDPOINT}/openai/deployments/${DEPLOYMENT}/chat/completions?api-version=${API_VERSION}`
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'api-key': AZURE_OPENAI_API_KEY },
    body: JSON.stringify({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.4,
      max_tokens: 4000,
    }),
  })
  if (!res.ok) throw new Error(`Azure OpenAI ${res.status}: ${await res.text()}`)
  const data = await res.json()
  return data.choices?.[0]?.message?.content || ''
}

const SYSTEM_PROMPT = `You are a product analyst. Your job is to identify significant NEW features from git commit data and generate mini-case studies in JSON format.

Rules:
- Only identify genuinely NEW capabilities (not bugfixes, typos, dependency updates, style changes)
- Each feature must have a clear Problem → Solution → Result structure
- Generate trilingual content: English (en), Norwegian Bokmål (no), Ukrainian (ua)
- Max 3 features per analysis
- If no significant features found, return empty array
- Categories: ai_automation, media_production, bot_scraping, frontend_ux, devops_infra, other

Return ONLY valid JSON (no markdown fences):
{
  "features": [
    {
      "reasoning": "Why this is significant",
      "feature": {
        "project_id": "portfolio",
        "category": "frontend_ux",
        "title_en": "...", "title_no": "...", "title_ua": "...",
        "short_description_en": "...", "short_description_no": "...", "short_description_ua": "...",
        "problem_en": "...", "problem_no": "...", "problem_ua": "...",
        "solution_en": "...", "solution_no": "...", "solution_ua": "...",
        "result_en": "...", "result_no": "...", "result_ua": "...",
        "tech_stack": ["Tech1", "Tech2"],
        "hashtags": ["#Tag1", "#Tag2"]
      }
    }
  ],
  "skipped_reason": "Why some commits were not features"
}`

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  console.log(`${VERSION} started`)
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

  try {
    const body = await req.json().catch(() => ({}))
    const { commits, project_id = 'portfolio', repo_name = 'unknown' } = body as {
      commits?: string; project_id?: string; repo_name?: string
    }

    if (!commits || commits.trim().length < 10) {
      return json({ ok: false, error: 'Missing or empty commits data' }, 400)
    }

    // Extract commit hashes from the text (lines starting with hash)
    const commitHashes = commits.match(/^[a-f0-9]{7,40}/gm) || []

    // Load existing feature titles for deduplication
    const { data: existing } = await supabase
      .from('features')
      .select('feature_id, title_en')
      .eq('project_id', project_id)

    const existingTitles = (existing || []).map(f => `${f.feature_id}: ${f.title_en}`).join('\n')
    const nextIdNum = (existing || []).length + 1

    const userPrompt = `Project: ${repo_name} (project_id: ${project_id})

EXISTING FEATURES (do NOT duplicate these):
${existingTitles || '(none)'}

RECENT COMMITS TO ANALYZE:
${commits.slice(0, 5000)}

Identify significant new features from these commits. Remember: only genuinely new capabilities, max 3.`

    console.log(`Analyzing commits for ${project_id}, ${(existing || []).length} existing features`)

    const aiResponse = await callAzureOpenAI(SYSTEM_PROMPT, userPrompt)
    console.log('AI response length:', aiResponse.length)

    // Parse JSON from response
    let parsed: { features: Array<{ reasoning: string; feature: Record<string, unknown> }>; skipped_reason?: string }
    try {
      const cleaned = aiResponse.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
      parsed = JSON.parse(cleaned)
    } catch {
      console.error('Failed to parse AI response:', aiResponse.slice(0, 500))
      return json({ ok: false, error: 'AI returned invalid JSON', raw: aiResponse.slice(0, 500) })
    }

    if (!parsed.features?.length) {
      await sendTelegram(`🔍 <b>Feature Discovery</b>\n\n📦 ${repo_name}\nНових фіч не знайдено.\n${parsed.skipped_reason || ''}`)
      return json({ ok: true, discovered: 0, skipped_reason: parsed.skipped_reason })
    }

    // Insert discovered features as pending
    const inserted: string[] = []
    for (let i = 0; i < parsed.features.length; i++) {
      const { feature, reasoning } = parsed.features[i]
      const featureId = `${project_id.charAt(0)}${String(nextIdNum + i).padStart(2, '0')}`

      const { error: insertErr } = await supabase.from('features').insert({
        feature_id: featureId,
        project_id,
        category: feature.category || 'other',
        title_en: feature.title_en,
        title_no: feature.title_no,
        title_ua: feature.title_ua,
        short_description_en: feature.short_description_en,
        short_description_no: feature.short_description_no,
        short_description_ua: feature.short_description_ua,
        problem_en: feature.problem_en,
        problem_no: feature.problem_no,
        problem_ua: feature.problem_ua,
        solution_en: feature.solution_en,
        solution_no: feature.solution_no,
        solution_ua: feature.solution_ua,
        result_en: feature.result_en,
        result_no: feature.result_no,
        result_ua: feature.result_ua,
        tech_stack: feature.tech_stack || [],
        hashtags: feature.hashtags || [],
        status: 'pending',
        source_commits: commitHashes.slice(0, 10),
        discovered_at: new Date().toISOString(),
      })

      if (insertErr) {
        console.error(`Insert failed for ${featureId}:`, insertErr)
        continue
      }

      inserted.push(`${featureId}: ${feature.title_en}\n  💡 ${reasoning}`)
    }

    // Telegram notification with approve/reject hint
    const featureList = inserted.join('\n\n')
    await sendTelegram(
      `🔍 <b>Feature Discovery</b>\n\n` +
      `📦 ${repo_name}\n` +
      `✨ Знайдено ${inserted.length} нових фіч (pending):\n\n${featureList}\n\n` +
      `👉 Змініть status на "published" в адмінці щоб опублікувати.`
    )

    return json({ ok: true, discovered: inserted.length, features: inserted })
  } catch (err) {
    console.error('Fatal error:', err)
    await sendTelegram(`🔍 <b>Feature Discovery</b>\n\n❌ Error: ${String(err).slice(0, 200)}`)
    return json({ ok: false, error: String(err) }, 500)
  }
})
