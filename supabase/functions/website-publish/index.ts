import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'
import { generateLocalizedSlug } from '../_shared/slug-helpers.ts'
import { getRandomOpeningStyle } from '../_shared/opening-styles.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const AZURE_OPENAI_ENDPOINT = Deno.env.get('AZURE_OPENAI_ENDPOINT')
const AZURE_OPENAI_API_KEY = Deno.env.get('AZURE_OPENAI_API_KEY')

const VERSION = '2026-03-14-v2-stream1'

interface WebsitePublishRequest {
  newsId: string
}

/**
 * Stream 1: Website Auto-Publish
 * Single-language rewrite → publish to website
 * No image generation, no social media posting
 */
serve(async (req) => {
  console.log(`📰 Website Publish ${VERSION} started`)

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { newsId }: WebsitePublishRequest = await req.json()
    if (!newsId) throw new Error('newsId is required')

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    // Load rewrite language setting
    const { data: langSetting } = await supabase
      .from('api_settings')
      .select('key_value')
      .eq('key_name', 'STREAM1_REWRITE_LANGUAGE')
      .maybeSingle()

    const rewriteLang = langSetting?.key_value || 'en'

    // Load news record
    const { data: news, error: fetchError } = await supabase
      .from('news')
      .select('*')
      .eq('id', newsId)
      .single()

    if (fetchError || !news) throw new Error(`News not found: ${newsId}`)

    // Skip if already published
    if (news.is_published) {
      console.log('⏭️ Already published, skipping')
      return new Response(
        JSON.stringify({ success: true, newsId, skipped: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const title = news.original_title || ''
    const content = news.original_content || ''
    const sourceUrl = news.rss_source_url || news.original_url || ''

    // Determine language: 'smart' mode uses Norwegian for Norway articles
    let targetLang = rewriteLang
    if (rewriteLang === 'smart') {
      targetLang = detectNorwayArticle(news) ? 'no' : 'en'
    }
    console.log(`🌐 Rewriting in: ${targetLang}`)

    // Load AI prompt
    const { data: prompts } = await supabase
      .from('ai_prompts')
      .select('*')
      .eq('is_active', true)
      .eq('prompt_type', 'news_rewrite')
      .order('updated_at', { ascending: false })
      .limit(1)

    if (!prompts || prompts.length === 0) {
      throw new Error('No news_rewrite prompt configured')
    }

    const prompt = prompts[0]
    const openingStyle = getRandomOpeningStyle('news')

    if (!AZURE_OPENAI_ENDPOINT || !AZURE_OPENAI_API_KEY) {
      throw new Error('Azure OpenAI not configured')
    }

    // Build single-language prompt
    const langName = targetLang === 'no' ? 'Norwegian (Bokmål)' : 'English'
    const readMoreText = targetLang === 'no' ? 'Les mer' : 'Read more'

    const systemPrompt = prompt.prompt_text
      .replace('{title}', title)
      .replace('{content}', content.substring(0, 6000))
      .replace('{url}', sourceUrl)
      + `\n\nOPENING STYLE DIRECTIVE: ${openingStyle}`

    console.log('📝 Rewriting with AI (single language)...')

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
            content: `You are a professional content writer. Rewrite the article in ${langName} ONLY. Return ONLY valid JSON:
{
  "title": "...",
  "content": "...",
  "description": "...",
  "tags": ["tag1", "tag2", "tag3"]
}

Write a concise, informative summary. The "description" should be 1-2 sentences for SEO meta description.`
          },
          { role: 'user', content: systemPrompt }
        ],
        temperature: 0.5,
        max_tokens: 3000
      })
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`AI rewrite failed: ${response.status} ${errorText.substring(0, 200)}`)
    }

    const data = await response.json()
    const aiContent = data.choices[0]?.message?.content?.trim()

    const jsonMatch = aiContent.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error('Failed to parse AI response')

    const rewritten = JSON.parse(jsonMatch[0])
    if (!rewritten.title || !rewritten.content) {
      throw new Error('AI response missing title or content')
    }

    // Append source link
    if (sourceUrl) {
      try {
        const hostname = new URL(sourceUrl).hostname.replace('www.', '')
        rewritten.content += `\n\n**${readMoreText}:** [${hostname}](${sourceUrl})`
      } catch {
        rewritten.content += `\n\n**${readMoreText}:** [Source](${sourceUrl})`
      }
    }

    const tags = rewritten.tags || []
    const uniqueSuffix = newsId.substring(0, 8)

    // Generate slugs for all 3 languages from the single title (for SEO/routing)
    const slug = generateLocalizedSlug(rewritten.title, targetLang, uniqueSuffix)

    // Build update object: fill target language, generate slugs for all
    const update: Record<string, any> = {
      // Primary language content
      [`title_${targetLang}`]: rewritten.title,
      [`content_${targetLang}`]: rewritten.content,
      [`description_${targetLang}`]: rewritten.description || '',
      [`slug_${targetLang}`]: slug,
      // Tags & status
      tags: tags.length > 0 ? tags : null,
      is_rewritten: true,
      is_published: true,
      published_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      pre_moderation_status: 'approved',
    }

    // Generate slugs for other languages too (for routing/SEO)
    const otherLangs = ['en', 'no', 'ua'].filter(l => l !== targetLang)
    for (const lang of otherLangs) {
      update[`slug_${lang}`] = generateLocalizedSlug(rewritten.title, lang, uniqueSuffix)
    }

    const { error: updateError } = await supabase
      .from('news')
      .update(update)
      .eq('id', newsId)

    if (updateError) throw updateError

    console.log(`✅ Published to website: ${newsId} (${targetLang})`)

    // Cross-link enrichment (non-blocking)
    fetch(`${SUPABASE_URL}/functions/v1/enrich-article-links`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ articleId: newsId, type: 'news' })
    }).catch(e => console.warn('⚠️ Cross-link enrichment failed:', e))

    // Update prompt usage
    await supabase
      .from('ai_prompts')
      .update({ usage_count: (prompt.usage_count || 0) + 1 })
      .eq('id', prompt.id)

    return new Response(
      JSON.stringify({ success: true, newsId, language: targetLang }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error: any) {
    console.error('❌ Website publish failed:', error)
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

/**
 * Detect Norway-related articles (copied from auto-publish-news)
 */
function detectNorwayArticle(news: any): boolean {
  if (news.is_norway_related === true) return true
  if (news.rss_analysis?.is_norway_related === true) return true

  const urls = [
    news.original_url, news.rss_source_url, news.source_link,
    ...(Array.isArray(news.source_links) ? news.source_links : [])
  ].filter(Boolean)

  for (const url of urls) {
    if (/\.no(?:[/?#]|$)/.test(url.toLowerCase())) return true
    if (url.toLowerCase().includes('lifeinnorway.net')) return true
  }

  const text = `${news.original_title || ''} ${news.original_content || ''}`.toLowerCase()
  const norwayKeywords = [
    'norway', 'norwegian', 'norge', 'norsk',
    'oslo', 'bergen', 'trondheim', 'stavanger', 'tromsø', 'tromsoe', 'tromso',
    'equinor', 'telenor', 'dnb bank', 'kongsberg', 'yara',
    'stortinget', 'regjeringen', 'norges bank',
  ]

  for (const kw of norwayKeywords) {
    if (text.includes(kw)) return true
  }

  return false
}
