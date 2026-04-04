import { azureFetch } from '../_shared/azure-to-gemini-shim.ts'
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

const VERSION = '2026-04-04-trilingual'

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

    // Build trilingual prompt
    const systemPrompt = prompt.prompt_text
      .replace('{title}', title)
      .replace('{content}', content.substring(0, 6000))
      .replace('{url}', sourceUrl)
      + `\n\nOPENING STYLE DIRECTIVE: ${openingStyle}`

    console.log('📝 Rewriting with AI (trilingual EN/NO/UA)...')

    const response = await azureFetch('gemini', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        messages: [
          {
            role: 'system',
            content: `You are a professional news journalist. Rewrite the article in THREE languages: English, Norwegian (Bokmål), and Ukrainian. Return ONLY valid JSON:
{
  "en": { "title": "...", "content": "...", "description": "..." },
  "no": { "title": "...", "content": "...", "description": "..." },
  "ua": { "title": "...", "content": "...", "description": "..." },
  "tags": ["tag1", "tag2", "tag3"]
}

CRITICAL FORMATTING RULES:
- NEVER use markdown: no **, no *, no #, no [], no ()
- NEVER use bold, italic, or any formatting markers
- Write PLAIN TEXT only — no special characters for emphasis
- Do NOT highlight names, terms, or keywords with any symbols
- Paragraphs separated by double newline only
- Do NOT add "Read more" or source links — they are added automatically

CONTENT RULES:
- Each language must be REAL (not transliterated English)
- Norwegian must be proper Bokmål
- Ukrainian must use Cyrillic script
- "description" = 1-2 sentences for SEO meta, plain text
- "content" = concise, informative article (300-600 words per language)
- All 3 versions must cover the same facts but written naturally for each language
- Write like a human journalist, not like AI — avoid generic filler phrases`
          },
          { role: 'user', content: systemPrompt }
        ],
        temperature: 0.5,
        max_tokens: 8000
      })
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`AI rewrite failed: ${response.status} ${errorText.substring(0, 200)}`)
    }

    const data = await response.json()
    const aiContent = data.choices[0]?.message?.content?.trim()

    // Strip markdown fences
    let cleaned = aiContent
    if (cleaned.startsWith('```')) {
      cleaned = cleaned.replace(/^```(?:json)?\s*\n?/, '').replace(/\n?```\s*$/, '')
    }

    const jsonMatch = cleaned.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error('Failed to parse AI response')

    const rewritten = JSON.parse(jsonMatch[0])

    // Validate all 3 languages present
    for (const lang of ['en', 'no', 'ua']) {
      if (!rewritten[lang]?.title || !rewritten[lang]?.content) {
        throw new Error(`AI response missing ${lang} title or content`)
      }
    }

    // Append source links per language (plain HTML, no markdown)
    let hostname = 'Source'
    try { hostname = new URL(sourceUrl).hostname.replace('www.', '') } catch {}
    const readMore: Record<string, string> = { en: 'Source', no: 'Kilde', ua: 'Джерело' }
    for (const lang of ['en', 'no', 'ua']) {
      if (sourceUrl) {
        rewritten[lang].content += `\n\n${readMore[lang]}: ${hostname}`
      }
    }

    const tags = rewritten.tags || []
    const uniqueSuffix = newsId.substring(0, 8)

    // Build update object with all 3 languages
    const update: Record<string, any> = {
      title_en: rewritten.en.title,
      content_en: rewritten.en.content,
      description_en: rewritten.en.description || '',
      slug_en: generateLocalizedSlug(rewritten.en.title, 'en', uniqueSuffix),
      title_no: rewritten.no.title,
      content_no: rewritten.no.content,
      description_no: rewritten.no.description || '',
      slug_no: generateLocalizedSlug(rewritten.no.title, 'no', uniqueSuffix),
      title_ua: rewritten.ua.title,
      content_ua: rewritten.ua.content,
      description_ua: rewritten.ua.description || '',
      slug_ua: generateLocalizedSlug(rewritten.ua.title, 'ua', uniqueSuffix),
      tags: tags.length > 0 ? tags : null,
      is_rewritten: true,
      is_published: true,
      published_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      pre_moderation_status: 'approved',
    }

    // Preserve original image from RSS source
    if (news.image_url && !news.processed_image_url) {
      update.processed_image_url = news.image_url
    }

    const { error: updateError } = await supabase
      .from('news')
      .update(update)
      .eq('id', newsId)

    if (updateError) throw updateError

    console.log(`✅ Published to website: ${newsId} (EN/NO/UA trilingual)`)

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
      JSON.stringify({ success: true, newsId, languages: ['en', 'no', 'ua'] }),
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
