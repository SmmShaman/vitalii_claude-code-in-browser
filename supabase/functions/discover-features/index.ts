import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'
import { callLLM, extractJSON } from '../_shared/gemini-llm.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const TELEGRAM_BOT_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN')
const TELEGRAM_CHAT_ID = Deno.env.get('TELEGRAM_CHAT_ID')

const VERSION = '2026-03-31-v3-auto-publish'

// Color pool for auto-registered projects (cycle through these)
const COLOR_POOL = [
  { bg: 'bg-emerald-500/20', text: 'text-emerald-400' },
  { bg: 'bg-amber-500/20', text: 'text-amber-400' },
  { bg: 'bg-blue-500/20', text: 'text-blue-400' },
  { bg: 'bg-cyan-500/20', text: 'text-cyan-400' },
  { bg: 'bg-purple-500/20', text: 'text-purple-400' },
  { bg: 'bg-rose-500/20', text: 'text-rose-400' },
  { bg: 'bg-red-500/20', text: 'text-red-400' },
  { bg: 'bg-yellow-500/20', text: 'text-yellow-400' },
  { bg: 'bg-indigo-500/20', text: 'text-indigo-400' },
  { bg: 'bg-teal-500/20', text: 'text-teal-400' },
]

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

async function callAI(systemPrompt: string, userPrompt: string, maxTokens = 6000): Promise<string> {
  return await callLLM(systemPrompt, userPrompt, { temperature: 0.4, maxTokens })
}

const SYSTEM_PROMPT = `You are a senior developer writing case studies for your personal portfolio website. Your job is to identify significant NEW features from git commit data and turn them into compelling, specific mini-case studies.

You write like a practitioner sharing war stories — not a marketing copywriter. Think "here's the real problem I faced, here's exactly how I solved it, here's the measurable impact."

FEATURE IDENTIFICATION RULES:
- Only genuinely NEW capabilities (not bugfixes, typos, dependency updates, style changes, refactors)
- Max 3 features per analysis
- If no significant features found, return empty array
- Categories: ai_automation, media_production, bot_scraping, frontend_ux, devops_infra, other

WRITING STYLE (CRITICAL — this is what makes your portfolio stand out):

Title: Catchy, specific, conversational. Include a dash with a hook.
  GOOD: "AI Pre-Moderation — killing spam before it reaches my eyes"
  GOOD: "Free AI — Gemini analyzes errors instead of $2.50/1M GPT-4"
  BAD: "Implemented Pre-Moderation System" (generic, boring)
  BAD: "AI-Powered Content Filtering" (sounds like a press release)

short_description: One punchy sentence that makes someone want to read more. Include a number or specific detail.
  GOOD: "6 Telegram channels pump 80 articles/day — AI filters 70% spam before I see it"
  BAD: "Automated content filtering system for news articles"

problem (min 120 chars): Start with the PAIN. Use real numbers, real frustration. First person encouraged.
  GOOD: "6 Telegram channels + RSS feeds pump 50-80 articles per day. 70% is spam, ads, or irrelevant noise. Manual review was eating 2+ hours daily."
  BAD: "Previously, all users needed to log in to access the calendar." (too short, too vague)

solution (min 200 chars): Be TECHNICAL and SPECIFIC. Name actual functions, files, APIs, deployment names. Show the architecture.
  GOOD: "Stage 1 (Classifier) uses Azure OpenAI to extract JSON: {company, category, visual_concept}. Seven categories: tech_product, marketing_campaign... Stage 2 selects a template by category and fills {placeholder} values. Both prompts live in the ai_prompts table — editable without code changes."
  BAD: "Implemented a PIN protection mechanism for admin tabs." (one sentence, no details)

result (min 120 chars): MEASURABLE impact. Numbers, percentages, time savings. Before/after comparison.
  GOOD: "Review time dropped from 2 hours to 15 minutes. The pre-moderation prompt has been refined 12+ times through the admin panel."
  BAD: "Improved user experience by enabling easy calendar access." (generic fluff)

TRILINGUAL CONTENT (en, no, ua):
- English: technical, specific, with personality
- Norwegian (Bokmål): natural Norwegian, NOT transliterated English. Use Norwegian tech terminology where it exists.
- Ukrainian: conversational dev tone, technical terms can stay in English (як "API", "Edge Function", "deploy")
- All three languages must have EQUAL depth and detail — ua/no are NOT shorter summaries of en

Return ONLY valid JSON (no markdown fences):
{
  "features": [
    {
      "reasoning": "Why this is significant (2-3 sentences)",
      "feature": {
        "project_id": "portfolio",
        "category": "frontend_ux",
        "title_en": "Catchy Title — with a hook", "title_no": "...", "title_ua": "...",
        "short_description_en": "One punchy line with a number", "short_description_no": "...", "short_description_ua": "...",
        "problem_en": "Real pain, real numbers, min 120 chars", "problem_no": "...", "problem_ua": "...",
        "solution_en": "Technical details, function names, architecture, min 200 chars", "solution_no": "...", "solution_ua": "...",
        "result_en": "Measurable impact, before/after, min 120 chars", "result_no": "...", "result_ua": "...",
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
    const { commits, project_id = 'portfolio', repo_name = 'unknown', project_context = '' } = body as {
      commits?: string; project_id?: string; repo_name?: string; project_context?: string
    }

    if (!commits || commits.trim().length < 10) {
      return json({ ok: false, error: 'Missing or empty commits data' }, 400)
    }

    // Auto-register project if it doesn't exist in feature_projects
    const { data: existingProject } = await supabase
      .from('feature_projects')
      .select('id')
      .eq('id', project_id)
      .single()

    if (!existingProject) {
      // Derive display name from repo name: "my-cool-repo" → "My Cool Repo"
      const shortName = repo_name.split('/').pop() || project_id
      const displayName = shortName
        .replace(/[-_]/g, ' ')
        .replace(/\b\w/g, (c: string) => c.toUpperCase())

      // Pick color from pool based on existing project count
      const { count: projectCount } = await supabase
        .from('feature_projects')
        .select('id', { count: 'exact', head: true })
      const colorIdx = (projectCount || 0) % COLOR_POOL.length
      const color = COLOR_POOL[colorIdx]

      const { error: regErr } = await supabase.from('feature_projects').insert({
        id: project_id,
        name_en: displayName,
        name_no: displayName,
        name_ua: displayName,
        description_en: `Auto-discovered from ${repo_name}`,
        description_no: `Auto-oppdaget fra ${repo_name}`,
        description_ua: `Автовиявлено з ${repo_name}`,
        repo_url: `https://github.com/${repo_name}`,
        badge: displayName.charAt(0).toUpperCase(),
        color_bg: color.bg,
        color_text: color.text,
        is_active: true,
      })

      if (regErr) {
        console.error(`Auto-register project failed:`, regErr)
      } else {
        console.log(`Auto-registered new project: ${project_id} (${displayName})`)
        await sendTelegram(`🆕 <b>New Project Registered</b>\n\n📦 ${displayName}\n🔗 ${repo_name}\n🏷 project_id: ${project_id}`)
      }
    }

    // Extract commit hashes from the text (lines starting with hash)
    const commitHashes = commits.match(/^[a-f0-9]{7,40}/gm) || []

    // Load existing features with full context for deduplication
    const { data: existing } = await supabase
      .from('features')
      .select('feature_id, title_en, short_description_en, category, tech_stack')

    const existingContext = (existing || []).map(f =>
      `[${f.feature_id}] ${f.title_en} | ${f.short_description_en || ''} | cat:${f.category} | tech:${(f.tech_stack || []).join(',')}`
    ).join('\n')
    const projectFeatures = (existing || []).filter(f => f.feature_id.startsWith(project_id.charAt(0)))
    const nextIdNum = projectFeatures.length + 1

    const contextBlock = project_context
      ? `\nPROJECT DOCUMENTATION (from CLAUDE.md / README.md — use this to understand what the project does, its tech stack, architecture):\n${project_context.slice(0, 2000)}\n`
      : ''

    const userPrompt = `Project: ${repo_name} (project_id: ${project_id})
${contextBlock}
EXISTING FEATURES ACROSS ALL PROJECTS (do NOT duplicate these):
${existingContext || '(none)'}

RECENT COMMITS TO ANALYZE (includes commit messages + code diffs):
${commits.slice(0, 6000)}

Identify significant new features from these commits. Use the project documentation and actual code diffs to write SPECIFIC, TECHNICAL descriptions with real function names, file paths, and architecture details. Remember: only genuinely new capabilities, max 3.`

    console.log(`Analyzing commits for ${project_id}, ${(existing || []).length} total features, ${projectFeatures.length} for this project, context: ${project_context ? project_context.length + ' chars' : 'none'}`)

    // === STEP 1: Discovery ===
    const aiResponse = await callAI(SYSTEM_PROMPT, userPrompt, 8000)
    console.log('Discovery response length:', aiResponse.length)

    let parsed: { features: Array<{ reasoning: string; feature: Record<string, unknown> }>; skipped_reason?: string }
    try {
      const cleaned = extractJSON(aiResponse)
      parsed = JSON.parse(cleaned)
    } catch {
      console.error('Failed to parse discovery response:', aiResponse.slice(0, 500))
      return json({ ok: false, error: 'AI returned invalid JSON', raw: aiResponse.slice(0, 500) })
    }

    if (!parsed.features?.length) {
      await sendTelegram(`🔍 <b>Feature Discovery</b>\n\n📦 ${repo_name}\nНових фіч не знайдено.\n${parsed.skipped_reason || ''}`)
      return json({ ok: true, discovered: 0, skipped_reason: parsed.skipped_reason })
    }

    console.log(`Discovery found ${parsed.features.length} candidates, running validation...`)

    // === STEP 2: Validation — second LLM call to filter garbage ===
    const candidatesWithLengths = parsed.features.map((f, i) => {
      const feat = f.feature
      return {
        index: i,
        title_en: feat.title_en,
        title_ua: feat.title_ua,
        title_no: feat.title_no,
        short_description_en: feat.short_description_en,
        problem_en: feat.problem_en,
        solution_en: feat.solution_en,
        result_en: feat.result_en,
        problem_ua: feat.problem_ua,
        solution_ua: feat.solution_ua,
        result_ua: feat.result_ua,
        category: feat.category,
        tech_stack: feat.tech_stack,
        reasoning: f.reasoning,
        lengths: {
          problem_en: String(feat.problem_en || '').length,
          solution_en: String(feat.solution_en || '').length,
          result_en: String(feat.result_en || '').length,
        },
      }
    })

    const validationPrompt = `You are a strict quality gate for a developer portfolio website. Review feature candidates and decide which to AUTO-PUBLISH on the live site.

REJECT if ANY of these are true:
1. DUPLICATE: semantically same as an existing feature (even if worded differently — check descriptions, not just titles)
2. NOT A FEATURE: it's a bugfix, refactor, dependency update, style tweak, or config change
3. TRIVIAL: too small for a portfolio (e.g. "added a button", "changed color")
4. TOO SHORT: problem_en < 100 chars, solution_en < 180 chars, or result_en < 100 chars (check the "lengths" field)
5. GENERIC TEXT: uses filler phrases like "improved user experience", "implemented mechanism", "enhanced functionality" without specifics
6. BAD TRANSLATION: Ukrainian (ua) or Norwegian (no) text is clearly wrong, mixed languages, or just English transliterated. Norwegian must be natural Bokmål, Ukrainian must be natural conversational dev tone.
7. WRONG CATEGORY: the assigned category doesn't match the actual feature content
8. MISSING SPECIFICS: no real numbers, no function names, no technical details — reads like a press release instead of a developer case study

EXISTING FEATURES IN DATABASE:
${existingContext || '(none)'}

CANDIDATES TO REVIEW:
${JSON.stringify(candidatesWithLengths, null, 2)}

For each candidate, return a verdict. Return ONLY valid JSON (no markdown fences):
{
  "verdicts": [
    {
      "index": 0,
      "decision": "publish" or "reject",
      "reason": "Short explanation why"
    }
  ]
}`

    let verdicts: Array<{ index: number; decision: string; reason: string }> = []
    try {
      const validationResponse = await callAI('You are a strict quality reviewer. Return only valid JSON.', validationPrompt, 2000)
      console.log('Validation response length:', validationResponse.length)
      const cleanedValidation = extractJSON(validationResponse)
      const parsedValidation = JSON.parse(cleanedValidation)
      verdicts = parsedValidation.verdicts || []
    } catch (e) {
      // If validation fails, fall back to pending status (safe default)
      console.error('Validation LLM failed, falling back to pending:', e)
      verdicts = parsed.features.map((_, i) => ({ index: i, decision: 'pending', reason: 'Validation LLM failed' }))
    }

    // Build verdict map
    const verdictMap = new Map(verdicts.map(v => [v.index, v]))

    // === STEP 3: Insert features with appropriate status ===
    const published: string[] = []
    const rejected: string[] = []
    const pendingItems: string[] = []

    for (let i = 0; i < parsed.features.length; i++) {
      const { feature, reasoning } = parsed.features[i]
      const verdict = verdictMap.get(i)
      const decision = verdict?.decision || 'pending'
      const featureId = `${project_id.charAt(0)}${String(nextIdNum + i).padStart(2, '0')}`

      // Skip rejected features entirely — don't pollute the database
      if (decision === 'reject') {
        rejected.push(`❌ ${feature.title_en}\n  📝 ${verdict?.reason || 'No reason'}`)
        console.log(`Rejected ${featureId}: ${feature.title_en} — ${verdict?.reason}`)
        continue
      }

      const status = decision === 'publish' ? 'published' : 'pending'

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
        status,
        source_commits: commitHashes.slice(0, 10),
        discovered_at: new Date().toISOString(),
      })

      if (insertErr) {
        console.error(`Insert failed for ${featureId}:`, insertErr)
        continue
      }

      if (status === 'published') {
        published.push(`✅ ${featureId}: ${feature.title_en}`)
      } else {
        pendingItems.push(`⏳ ${featureId}: ${feature.title_en}\n  📝 ${verdict?.reason || 'Validation fallback'}`)
      }
    }

    // Telegram notification with full report
    const parts = [`🔍 <b>Feature Discovery</b>\n\n📦 ${repo_name}`]
    if (published.length) parts.push(`\n✅ <b>Auto-published (${published.length}):</b>\n${published.join('\n')}`)
    if (pendingItems.length) parts.push(`\n⏳ <b>Pending review (${pendingItems.length}):</b>\n${pendingItems.join('\n')}`)
    if (rejected.length) parts.push(`\n❌ <b>Rejected (${rejected.length}):</b>\n${rejected.join('\n')}`)
    if (!published.length && !pendingItems.length && !rejected.length) parts.push('\nНічого не додано.')

    await sendTelegram(parts.join('\n'))

    return json({
      ok: true,
      published: published.length,
      pending: pendingItems.length,
      rejected: rejected.length,
      details: { published, pending: pendingItems, rejected },
    })
  } catch (err) {
    console.error('Fatal error:', err)
    await sendTelegram(`🔍 <b>Feature Discovery</b>\n\n❌ Error: ${String(err).slice(0, 200)}`)
    return json({ ok: false, error: String(err) }, 500)
  }
})
