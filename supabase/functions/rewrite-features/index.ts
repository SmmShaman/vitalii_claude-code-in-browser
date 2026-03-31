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

const VERSION = '2026-03-31-v1'

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

const REWRITE_PROMPT = `You are a senior developer rewriting feature case studies for your personal portfolio website. You have the existing text and need to make it COMPELLING, SPECIFIC, and DETAILED.

You write like a practitioner sharing war stories — not a marketing copywriter.

REWRITE RULES:

title: Make it catchy and specific. Add a dash with a hook if missing.
  GOOD: "AI Pre-Moderation — killing spam before it reaches my eyes"
  BAD: "Implemented Pre-Moderation System"

short_description: One punchy sentence with a number or specific detail.
  GOOD: "6 Telegram channels pump 80 articles/day — AI filters 70% spam before I see it"
  BAD: "Automated content filtering system"

problem (min 120 chars): Start with the PAIN. Real numbers, real frustration. First person encouraged.
  GOOD: "6 Telegram channels + RSS feeds pump 50-80 articles per day. 70% is spam. Manual review was eating 2+ hours daily."
  BAD: "Previously, all users needed to log in."

solution (min 200 chars): TECHNICAL and SPECIFIC. Name functions, files, APIs, architecture decisions.
  GOOD: "Stage 1 (Classifier) extracts JSON: {company, category, visual_concept}. Seven categories. Stage 2 selects template by category and fills {placeholder} values. Both prompts in ai_prompts table — editable without code changes."
  BAD: "Implemented a protection mechanism."

result (min 120 chars): MEASURABLE impact. Numbers, percentages, before/after.
  GOOD: "Review time dropped from 2 hours to 15 minutes. Prompt refined 12+ times through admin panel."
  BAD: "Improved user experience."

TRILINGUAL:
- English: technical, specific, personality
- Norwegian (Bokmål): natural Norwegian, NOT transliterated English
- Ukrainian: conversational dev tone, tech terms stay English (API, Edge Function, deploy)
- All three EQUAL depth — ua/no are NOT shorter summaries of en

IMPORTANT: Preserve any real technical details, function names, numbers from the original. Only ADD detail, don't remove existing specifics. If the original is already good (problem >120, solution >200, result >120 chars), keep it mostly unchanged — just polish.

Return ONLY valid JSON (no markdown fences):
{
  "title_en": "...", "title_no": "...", "title_ua": "...",
  "short_description_en": "...", "short_description_no": "...", "short_description_ua": "...",
  "problem_en": "...", "problem_no": "...", "problem_ua": "...",
  "solution_en": "...", "solution_no": "...", "solution_ua": "...",
  "result_en": "...", "result_no": "...", "result_ua": "..."
}`

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  console.log(`${VERSION} started`)
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

  try {
    const body = await req.json().catch(() => ({}))
    const { batch_size = 5, min_problem = 120, min_solution = 200, min_result = 120, dry_run = false, feature_ids } = body as {
      batch_size?: number; min_problem?: number; min_solution?: number; min_result?: number; dry_run?: boolean; feature_ids?: string[]
    }

    // Load project descriptions for context
    const { data: projectsData } = await supabase
      .from('feature_projects')
      .select('id, name_en, description_en, repo_url')

    const projectContextMap = new Map(
      (projectsData || []).map(p => [p.id, `${p.name_en}: ${p.description_en}${p.repo_url ? ` (${p.repo_url})` : ''}`])
    )

    // Find features that need rewriting
    let query = supabase
      .from('features')
      .select('*')
      .eq('status', 'published')
      .order('feature_id', { ascending: true })

    if (feature_ids?.length) {
      query = query.in('feature_id', feature_ids)
    }

    const { data: allFeatures, error: fetchErr } = await query

    if (fetchErr) throw fetchErr

    // Filter to only those with short text
    const needsRewrite = (allFeatures || []).filter(f => {
      if (feature_ids?.length) return true // If specific IDs requested, rewrite all
      return (
        (f.problem_en || '').length < min_problem ||
        (f.solution_en || '').length < min_solution ||
        (f.result_en || '').length < min_result
      )
    })

    console.log(`Found ${needsRewrite.length} features needing rewrite (batch: ${batch_size})`)

    if (!needsRewrite.length) {
      return json({ ok: true, message: 'All features meet quality standards', total_checked: (allFeatures || []).length })
    }

    // Process in batch
    const batch = needsRewrite.slice(0, batch_size)
    const results: Array<{ id: string; status: string; old_lengths: Record<string, number>; new_lengths?: Record<string, number> }> = []

    for (const feature of batch) {
      console.log(`Rewriting ${feature.feature_id}: ${feature.title_en}`)

      const projectDesc = projectContextMap.get(feature.project_id) || feature.project_id

      const userPrompt = `Rewrite this feature case study. Keep the same meaning but make it DETAILED, SPECIFIC, and COMPELLING.

PROJECT CONTEXT: ${projectDesc}

CURRENT CONTENT:
Feature ID: ${feature.feature_id}
Project: ${feature.project_id}
Category: ${feature.category}
Tech Stack: ${(feature.tech_stack || []).join(', ')}

Title EN: ${feature.title_en}
Title NO: ${feature.title_no}
Title UA: ${feature.title_ua}

Short Description EN: ${feature.short_description_en}
Short Description NO: ${feature.short_description_no}
Short Description UA: ${feature.short_description_ua}

Problem EN: ${feature.problem_en}
Problem NO: ${feature.problem_no}
Problem UA: ${feature.problem_ua}

Solution EN: ${feature.solution_en}
Solution NO: ${feature.solution_no}
Solution UA: ${feature.solution_ua}

Result EN: ${feature.result_en}
Result NO: ${feature.result_no}
Result UA: ${feature.result_ua}

LENGTHS: problem_en=${(feature.problem_en || '').length}, solution_en=${(feature.solution_en || '').length}, result_en=${(feature.result_en || '').length}
TARGETS: problem≥120, solution≥200, result≥120

Rewrite to meet targets. Be specific, add technical details, real numbers, function names where possible.`

      try {
        const response = await callLLM(REWRITE_PROMPT, userPrompt, { temperature: 0.4, maxTokens: 4000 })
        const cleaned = extractJSON(response)
        const rewritten = JSON.parse(cleaned)

        const oldLengths = {
          problem_en: (feature.problem_en || '').length,
          solution_en: (feature.solution_en || '').length,
          result_en: (feature.result_en || '').length,
        }

        const newLengths = {
          problem_en: (rewritten.problem_en || '').length,
          solution_en: (rewritten.solution_en || '').length,
          result_en: (rewritten.result_en || '').length,
        }

        if (dry_run) {
          results.push({ id: feature.feature_id, status: 'dry_run', old_lengths: oldLengths, new_lengths: newLengths })
          console.log(`[DRY RUN] ${feature.feature_id}: problem ${oldLengths.problem_en}→${newLengths.problem_en}, solution ${oldLengths.solution_en}→${newLengths.solution_en}, result ${oldLengths.result_en}→${newLengths.result_en}`)
          continue
        }

        const { error: updateErr } = await supabase
          .from('features')
          .update({
            title_en: rewritten.title_en || feature.title_en,
            title_no: rewritten.title_no || feature.title_no,
            title_ua: rewritten.title_ua || feature.title_ua,
            short_description_en: rewritten.short_description_en || feature.short_description_en,
            short_description_no: rewritten.short_description_no || feature.short_description_no,
            short_description_ua: rewritten.short_description_ua || feature.short_description_ua,
            problem_en: rewritten.problem_en || feature.problem_en,
            problem_no: rewritten.problem_no || feature.problem_no,
            problem_ua: rewritten.problem_ua || feature.problem_ua,
            solution_en: rewritten.solution_en || feature.solution_en,
            solution_no: rewritten.solution_no || feature.solution_no,
            solution_ua: rewritten.solution_ua || feature.solution_ua,
            result_en: rewritten.result_en || feature.result_en,
            result_no: rewritten.result_no || feature.result_no,
            result_ua: rewritten.result_ua || feature.result_ua,
          })
          .eq('feature_id', feature.feature_id)

        if (updateErr) {
          console.error(`Update failed for ${feature.feature_id}:`, updateErr)
          results.push({ id: feature.feature_id, status: 'error', old_lengths: oldLengths })
          continue
        }

        results.push({ id: feature.feature_id, status: 'rewritten', old_lengths: oldLengths, new_lengths: newLengths })
        console.log(`Rewritten ${feature.feature_id}: problem ${oldLengths.problem_en}→${newLengths.problem_en}, solution ${oldLengths.solution_en}→${newLengths.solution_en}, result ${oldLengths.result_en}→${newLengths.result_en}`)
      } catch (e) {
        console.error(`LLM failed for ${feature.feature_id}:`, e)
        results.push({ id: feature.feature_id, status: 'llm_error', old_lengths: { problem_en: 0, solution_en: 0, result_en: 0 } })
      }
    }

    // Telegram report
    const rewritten = results.filter(r => r.status === 'rewritten')
    const dryRuns = results.filter(r => r.status === 'dry_run')
    const errors = results.filter(r => r.status === 'error' || r.status === 'llm_error')

    const reportLines = [`✏️ <b>Feature Rewrite</b>\n\nProcessed: ${results.length}/${needsRewrite.length}`]
    if (rewritten.length) reportLines.push(`✅ Rewritten: ${rewritten.length}`)
    if (dryRuns.length) reportLines.push(`🔍 Dry run: ${dryRuns.length}`)
    if (errors.length) reportLines.push(`❌ Errors: ${errors.length}`)
    reportLines.push(`\n📊 Remaining: ${needsRewrite.length - batch.length} features still need rewrite`)

    await sendTelegram(reportLines.join('\n'))

    return json({
      ok: true,
      processed: results.length,
      remaining: needsRewrite.length - batch.length,
      results,
    })
  } catch (err) {
    console.error('Fatal error:', err)
    return json({ ok: false, error: String(err) }, 500)
  }
})
