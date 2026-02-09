import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'
import { generateLocalizedSlug } from '../_shared/slug-helpers.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const AZURE_OPENAI_ENDPOINT = Deno.env.get('AZURE_OPENAI_ENDPOINT')
const AZURE_OPENAI_API_KEY = Deno.env.get('AZURE_OPENAI_API_KEY')

interface BackfillRequest {
  table?: 'news' | 'blog' | 'all'
  limit?: number
  offset?: number
  dryRun?: boolean
  articleId?: string
  slugsOnly?: boolean
}

interface ArticleResult {
  id: string
  title: string
  status: 'translated' | 'slugs_only' | 'skipped' | 'failed'
  fieldsUpdated: string[]
  error?: string
}

serve(async (req) => {
  console.log('🔄 Backfill Translations v2026-02-09-01 started')

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const body: BackfillRequest = await req.json().catch(() => ({}))
    const table = body.table || 'all'
    const limit = Math.min(body.limit || 5, 20)
    const offset = body.offset || 0
    const dryRun = body.dryRun ?? false
    const articleId = body.articleId
    const slugsOnly = body.slugsOnly ?? false

    console.log(`📋 Config: table=${table}, limit=${limit}, offset=${offset}, dryRun=${dryRun}, slugsOnly=${slugsOnly}, articleId=${articleId || 'none'}`)

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    // Load AI prompt (only needed if not slugsOnly)
    let promptText = ''
    if (!slugsOnly) {
      const { data: prompts, error: promptError } = await supabase
        .from('ai_prompts')
        .select('*')
        .eq('is_active', true)
        .eq('prompt_type', 'translation_backfill')
        .order('updated_at', { ascending: false })
        .limit(1)

      if (promptError || !prompts || prompts.length === 0) {
        throw new Error('No translation_backfill prompt configured. Run the migration first.')
      }
      promptText = prompts[0].prompt_text
      console.log(`📝 Using prompt: ${prompts[0].name}`)
    }

    const results: ArticleResult[] = []
    let totalRemaining = 0

    // Process news table
    if (table === 'news' || table === 'all') {
      const { newsResults, remaining } = await processTable(
        supabase, 'news', promptText, limit, offset, dryRun, articleId, slugsOnly
      )
      results.push(...newsResults)
      totalRemaining += remaining
    }

    // Process blog_posts table
    if (table === 'blog' || table === 'all') {
      const blogLimit = table === 'all' ? Math.max(1, limit - results.length) : limit
      if (blogLimit > 0) {
        const { newsResults: blogResults, remaining } = await processTable(
          supabase, 'blog_posts', promptText, blogLimit, offset, dryRun, articleId, slugsOnly
        )
        results.push(...blogResults)
        totalRemaining += remaining
      }
    }

    const translated = results.filter(r => r.status === 'translated').length
    const slugsOnlyCount = results.filter(r => r.status === 'slugs_only').length
    const skipped = results.filter(r => r.status === 'skipped').length
    const failed = results.filter(r => r.status === 'failed').length

    console.log(`\n📊 Summary: ${translated} translated, ${slugsOnlyCount} slugs-only, ${skipped} skipped, ${failed} failed, ${totalRemaining} remaining`)

    return new Response(
      JSON.stringify({
        success: true,
        processed: results.length,
        translated,
        slugsOnly: slugsOnlyCount,
        skipped,
        failed,
        totalRemaining,
        dryRun,
        results,
        message: dryRun
          ? `Dry run: would process ${results.length} articles (${totalRemaining} remaining)`
          : `Processed ${results.length} articles: ${translated} translated, ${slugsOnlyCount} slugs-only, ${failed} failed`
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error: any) {
    console.error('❌ Backfill error:', error)
    return new Response(
      JSON.stringify({ success: false, error: error.message || 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

async function processTable(
  supabase: any,
  tableName: string,
  promptText: string,
  limit: number,
  offset: number,
  dryRun: boolean,
  articleId: string | undefined,
  slugsOnly: boolean
): Promise<{ newsResults: ArticleResult[], remaining: number }> {
  console.log(`\n📰 Processing ${tableName}...`)

  // Query articles with any missing translation or slug
  let query = supabase
    .from(tableName)
    .select('id, title_en, content_en, description_en, title_no, content_no, description_no, title_ua, content_ua, description_ua, slug_en, slug_no, slug_ua')
    .eq('is_published', true)
    .not('title_en', 'is', null)

  if (articleId) {
    query = query.eq('id', articleId)
  } else {
    // Find articles missing any translation/slug field
    query = query.or('title_no.is.null,title_ua.is.null,slug_en.is.null,slug_no.is.null,slug_ua.is.null')
  }

  const { data: articles, error: fetchError } = await query
    .range(offset, offset + limit - 1)
    .order('published_at', { ascending: false })

  if (fetchError) {
    console.error(`Error fetching ${tableName}:`, fetchError)
    throw fetchError
  }

  // Count total remaining
  let countQuery = supabase
    .from(tableName)
    .select('id', { count: 'exact', head: true })
    .eq('is_published', true)
    .not('title_en', 'is', null)
    .or('title_no.is.null,title_ua.is.null,slug_en.is.null,slug_no.is.null,slug_ua.is.null')

  const { count: totalCount } = await countQuery
  const remaining = Math.max(0, (totalCount || 0) - offset - limit)

  console.log(`Found ${articles?.length || 0} articles needing backfill (${totalCount || 0} total, ${remaining} remaining)`)

  const newsResults: ArticleResult[] = []

  if (!articles || articles.length === 0) {
    return { newsResults, remaining: 0 }
  }

  for (let i = 0; i < articles.length; i++) {
    const article = articles[i]
    const title = article.title_en || 'Untitled'
    console.log(`\n[${i + 1}/${articles.length}] Processing: ${title.substring(0, 60)}...`)

    try {
      const needsNoTranslation = !article.title_no && article.title_en
      const needsUaTranslation = !article.title_ua && article.title_en
      const needsSlugEn = !article.slug_en && article.title_en
      const needsSlugNo = !article.slug_no && (article.title_no || needsNoTranslation)
      const needsSlugUa = !article.slug_ua && (article.title_ua || needsUaTranslation)
      const needsTranslation = needsNoTranslation || needsUaTranslation

      if (!needsTranslation && !needsSlugEn && !needsSlugNo && !needsSlugUa) {
        console.log('  ⏭️ Nothing to do, skipping')
        newsResults.push({ id: article.id, title, status: 'skipped', fieldsUpdated: [] })
        continue
      }

      const fieldsUpdated: string[] = []
      const updateData: Record<string, any> = { updated_at: new Date().toISOString() }

      // AI translation (if needed and not slugsOnly mode)
      let translations: any = null
      if (needsTranslation && !slugsOnly) {
        if (dryRun) {
          const needed: string[] = []
          if (needsNoTranslation) needed.push('NO')
          if (needsUaTranslation) needed.push('UA')
          console.log(`  🔍 Would translate to: ${needed.join(', ')}`)
          newsResults.push({
            id: article.id, title, status: 'translated',
            fieldsUpdated: [
              ...(needsNoTranslation ? ['title_no', 'content_no', 'description_no'] : []),
              ...(needsUaTranslation ? ['title_ua', 'content_ua', 'description_ua'] : []),
              ...(needsSlugEn ? ['slug_en'] : []),
              ...(needsSlugNo ? ['slug_no'] : []),
              ...(needsSlugUa ? ['slug_ua'] : []),
            ]
          })
          continue
        }

        translations = await callTranslationAI(
          promptText,
          article.title_en,
          article.content_en || '',
          article.description_en || ''
        )

        if (!translations) {
          newsResults.push({ id: article.id, title, status: 'failed', fieldsUpdated: [], error: 'AI translation returned empty' })
          continue
        }

        // Only set NULL fields
        if (needsNoTranslation && translations.no) {
          if (translations.no.title) { updateData.title_no = translations.no.title; fieldsUpdated.push('title_no') }
          if (translations.no.content) { updateData.content_no = translations.no.content; fieldsUpdated.push('content_no') }
          if (translations.no.description) { updateData.description_no = translations.no.description; fieldsUpdated.push('description_no') }
        }
        if (needsUaTranslation && translations.ua) {
          if (translations.ua.title) { updateData.title_ua = translations.ua.title; fieldsUpdated.push('title_ua') }
          if (translations.ua.content) { updateData.content_ua = translations.ua.content; fieldsUpdated.push('content_ua') }
          if (translations.ua.description) { updateData.description_ua = translations.ua.description; fieldsUpdated.push('description_ua') }
        }

        // Rate limiting between AI calls
        if (i < articles.length - 1) {
          console.log('  ⏱️ Waiting 2s (rate limit)...')
          await new Promise(resolve => setTimeout(resolve, 2000))
        }
      }

      // Generate missing slugs with transliteration
      const uniqueSuffix = article.id.substring(0, 8)

      if (needsSlugEn && article.title_en) {
        updateData.slug_en = generateLocalizedSlug(article.title_en, 'en', uniqueSuffix)
        fieldsUpdated.push('slug_en')
      }

      // For NO/UA slugs, use translated title if we just got it, or existing title
      const noTitle = updateData.title_no || article.title_no
      if (needsSlugNo && noTitle) {
        updateData.slug_no = generateLocalizedSlug(noTitle, 'no', uniqueSuffix)
        fieldsUpdated.push('slug_no')
      }

      const uaTitle = updateData.title_ua || article.title_ua
      if (needsSlugUa && uaTitle) {
        updateData.slug_ua = generateLocalizedSlug(uaTitle, 'ua', uniqueSuffix)
        fieldsUpdated.push('slug_ua')
      }

      if (fieldsUpdated.length === 0) {
        console.log('  ⏭️ No fields to update')
        newsResults.push({ id: article.id, title, status: 'skipped', fieldsUpdated: [] })
        continue
      }

      if (dryRun) {
        console.log(`  🔍 Would update: ${fieldsUpdated.join(', ')}`)
        newsResults.push({
          id: article.id, title,
          status: needsTranslation && !slugsOnly ? 'translated' : 'slugs_only',
          fieldsUpdated
        })
        continue
      }

      // Apply update
      const { error: updateError } = await supabase
        .from(tableName)
        .update(updateData)
        .eq('id', article.id)

      if (updateError) {
        console.error(`  ❌ Update failed:`, updateError)
        newsResults.push({ id: article.id, title, status: 'failed', fieldsUpdated: [], error: updateError.message })
        continue
      }

      const status = needsTranslation && !slugsOnly ? 'translated' : 'slugs_only'
      console.log(`  ✅ ${status}: ${fieldsUpdated.join(', ')}`)
      newsResults.push({ id: article.id, title, status, fieldsUpdated })

    } catch (error: any) {
      console.error(`  ❌ Error processing ${article.id}:`, error)
      newsResults.push({ id: article.id, title, status: 'failed', fieldsUpdated: [], error: error.message })
    }
  }

  return { newsResults, remaining }
}

async function callTranslationAI(
  promptText: string,
  title: string,
  content: string,
  description: string
): Promise<{ no?: { title: string; content: string; description: string }; ua?: { title: string; content: string; description: string } } | null> {
  if (!AZURE_OPENAI_ENDPOINT || !AZURE_OPENAI_API_KEY) {
    throw new Error('Azure OpenAI not configured')
  }

  const systemPrompt = promptText
    .replace('{title}', title)
    .replace('{content}', content)
    .replace('{description}', description)

  console.log('  📝 Calling Azure OpenAI for translation...')

  const azureUrl = `${AZURE_OPENAI_ENDPOINT}/openai/deployments/Jobbot-gpt-4.1-mini/chat/completions?api-version=2024-02-15-preview`

  const response = await fetch(azureUrl, {
    method: 'POST',
    headers: {
      'api-key': AZURE_OPENAI_API_KEY,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      messages: [
        {
          role: 'system',
          content: 'You are a professional translator. Return ONLY valid JSON with "no" and "ua" keys. Each must contain "title", "content", and "description".'
        },
        {
          role: 'user',
          content: systemPrompt
        }
      ],
      temperature: 0.3,
      max_tokens: 8000
    })
  })

  if (!response.ok) {
    const errorText = await response.text()
    console.error('  Azure OpenAI error:', errorText)
    throw new Error(`AI translation failed: ${response.status}`)
  }

  const data = await response.json()
  const aiContent = data.choices[0]?.message?.content?.trim()

  // Parse JSON response
  const jsonMatch = aiContent.match(/\{[\s\S]*\}/)
  if (!jsonMatch) {
    console.error('  Failed to parse AI response:', aiContent.substring(0, 500))
    return null
  }

  try {
    const parsed = JSON.parse(jsonMatch[0])
    console.log('  ✅ AI translation parsed, keys:', Object.keys(parsed))

    if (!parsed.no && !parsed.ua) {
      console.error('  ❌ Response missing both no and ua keys')
      return null
    }

    return parsed
  } catch (parseError: any) {
    console.error('  JSON parse error:', parseError.message)
    console.error('  Raw (first 500 chars):', jsonMatch[0].substring(0, 500))
    return null
  }
}
