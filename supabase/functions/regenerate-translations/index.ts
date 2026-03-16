// Regenerate translations using alternative LLM providers (Gemini, Claude, etc.)
// Experiment: compare quality vs Azure OpenAI
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

// Provider configs
const PROVIDERS: Record<string, { call: (system: string, user: string) => Promise<string> }> = {
  gemini: {
    call: async (system: string, user: string) => {
      const apiKey = Deno.env.get('GOOGLE_API_KEY')
      if (!apiKey) throw new Error('GOOGLE_API_KEY not set')
      const resp = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: system }] },
            contents: [{ role: 'user', parts: [{ text: user }] }],
            generationConfig: { temperature: 0.5, maxOutputTokens: 4000 },
          }),
        }
      )
      if (!resp.ok) {
        const err = await resp.text()
        throw new Error(`Gemini error ${resp.status}: ${err.substring(0, 300)}`)
      }
      const data = await resp.json()
      return data.candidates?.[0]?.content?.parts?.[0]?.text || ''
    },
  },
  azure: {
    call: async (system: string, user: string) => {
      const endpoint = Deno.env.get('AZURE_OPENAI_ENDPOINT')
      const apiKey = Deno.env.get('AZURE_OPENAI_API_KEY')
      if (!endpoint || !apiKey) throw new Error('Azure OpenAI not configured')
      const resp = await fetch(
        `${endpoint}/openai/deployments/Jobbot-gpt-4.1-mini/chat/completions?api-version=2024-02-15-preview`,
        {
          method: 'POST',
          headers: { 'api-key': apiKey, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: [
              { role: 'system', content: system },
              { role: 'user', content: user },
            ],
            temperature: 0.5,
            max_tokens: 4000,
          }),
        }
      )
      if (!resp.ok) {
        const err = await resp.text()
        throw new Error(`Azure error ${resp.status}: ${err.substring(0, 300)}`)
      }
      const data = await resp.json()
      return data.choices?.[0]?.message?.content?.trim() || ''
    },
  },
}

serve(async (req) => {
  console.log('🔄 Regenerate Translations v2026-03-16-v1')
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const url = new URL(req.url)
    const targetDate = url.searchParams.get('target_date') || ''
    const lang = url.searchParams.get('lang') || 'ua'  // ua, en, no, all
    const provider = url.searchParams.get('provider') || 'gemini'
    const dryRun = url.searchParams.get('dry_run') === 'true'
    const limitN = parseInt(url.searchParams.get('limit') || '100')
    const offsetN = parseInt(url.searchParams.get('offset') || '0')

    if (!targetDate) return new Response(JSON.stringify({ error: 'target_date required' }), { status: 400, headers: corsHeaders })
    if (!PROVIDERS[provider]) return new Response(JSON.stringify({ error: `Unknown provider: ${provider}. Available: ${Object.keys(PROVIDERS).join(', ')}` }), { status: 400, headers: corsHeaders })

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    const callLLM = PROVIDERS[provider].call

    // Fetch articles for date
    const start = `${targetDate}T00:00:00Z`
    const end = `${targetDate}T23:59:59.999Z`
    const { data: articles, error } = await supabase
      .from('news')
      .select('id, title_en, title_no, title_ua, content_en, content_no, content_ua, description_en, description_no, description_ua, original_title, original_content, source_link, is_published, is_rewritten')
      .eq('is_published', true)
      .eq('is_rewritten', true)
      .gte('published_at', start)
      .lte('published_at', end)
      .order('published_at', { ascending: true })
      .range(offsetN, offsetN + limitN - 1)

    if (error) throw new Error(`DB error: ${error.message}`)
    if (!articles || articles.length === 0) {
      return new Response(JSON.stringify({ ok: true, message: 'No articles found', count: 0 }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    console.log(`📰 Found ${articles.length} articles for ${targetDate}`)
    console.log(`🔧 Provider: ${provider}, Language: ${lang}, DryRun: ${dryRun}`)

    const langNames: Record<string, string> = { ua: 'Ukrainian', en: 'English', no: 'Norwegian Bokmål' }
    const results: any[] = []
    let successCount = 0
    let errorCount = 0

    for (let i = 0; i < articles.length; i++) {
      const article = articles[i]
      console.log(`\n📝 [${i + 1}/${articles.length}] ${article.original_title?.substring(0, 60) || article.title_en?.substring(0, 60)}...`)

      try {
        // Build prompt for single-language regeneration
        const sourceContent = article.original_content || article.content_en || article.content_no || ''
        const sourceTitle = article.original_title || article.title_en || article.title_no || ''

        const systemPrompt = `You are a professional news translator and rewriter. Translate the following news article into ${langNames[lang] || lang}.

RULES:
- Write in professional journalistic style
- Keep the meaning accurate but make it natural in ${langNames[lang] || lang}
- Title should be compelling and clear
- Content should be 2-4 paragraphs, well-structured
- Description should be 1-2 sentences summary
- Return ONLY valid JSON, no markdown wrapping

Return JSON:
{
  "title": "translated title",
  "content": "translated content (2-4 paragraphs)",
  "description": "short description (1-2 sentences)"
}`

        const userPrompt = `Title: ${sourceTitle}\n\nContent: ${sourceContent.substring(0, 3000)}\n\nSource: ${article.source_link || 'N/A'}`

        const aiResponse = await callLLM(systemPrompt, userPrompt)

        // Parse JSON
        const jsonMatch = aiResponse.match(/\{[\s\S]*\}/)
        if (!jsonMatch) throw new Error('No JSON in response')

        const parsed = JSON.parse(jsonMatch[0])
        if (!parsed.title || !parsed.content) throw new Error('Missing title or content')

        const result: any = {
          id: article.id,
          provider,
          lang,
          original_title: sourceTitle.substring(0, 80),
          new_title: parsed.title,
          old_title: (article as any)[`title_${lang}`] || '',
          status: 'ok',
        }

        if (!dryRun) {
          // Update only the target language fields
          const updateData: any = {
            [`title_${lang}`]: parsed.title,
            [`content_${lang}`]: parsed.content,
            [`description_${lang}`]: parsed.description || parsed.content.substring(0, 200),
            updated_at: new Date().toISOString(),
          }

          const { error: updateError } = await supabase
            .from('news')
            .update(updateData)
            .eq('id', article.id)

          if (updateError) throw new Error(`Update failed: ${updateError.message}`)
          result.saved = true
        } else {
          result.saved = false
          result.preview_content = parsed.content.substring(0, 200) + '...'
        }

        results.push(result)
        successCount++
        console.log(`  ✅ ${parsed.title.substring(0, 60)}`)

        // Rate limit: 100ms delay between calls
        await new Promise(r => setTimeout(r, 100))

      } catch (err: any) {
        console.error(`  ❌ Error: ${err.message}`)
        results.push({ id: article.id, status: 'error', error: err.message })
        errorCount++
      }
    }

    const summary = {
      ok: true,
      provider,
      lang,
      target_date: targetDate,
      dry_run: dryRun,
      total: articles.length,
      success: successCount,
      errors: errorCount,
      results,
    }

    console.log(`\n✅ Done: ${successCount} success, ${errorCount} errors`)

    return new Response(JSON.stringify(summary), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (error: any) {
    console.error('❌ Fatal error:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
