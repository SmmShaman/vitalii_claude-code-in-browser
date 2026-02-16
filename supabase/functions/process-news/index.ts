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

interface NewsRewriteRequest {
  newsId: string
  title: string
  content: string
  url?: string
  imageUrl?: string | null
  videoUrl?: string | null
  videoType?: string | null
  sourceLink?: string | null    // First external source link (backwards compatibility)
  sourceLinks?: string[]        // ALL external source links extracted from Telegram post
}

/**
 * Process and publish news article
 * Rewrites content in objective journalistic style
 */
serve(async (req) => {
  // Version: 2025-01-28-01 - Use separate telegram_news_rewrite prompt for Telegram donors
  console.log('🚀 Process News v2025-01-28-01 started')
  console.log('📦 Features: Separate prompt for Telegram (telegram_news_rewrite), explicit JSON structure')

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const requestData: NewsRewriteRequest = await req.json()
    console.log('🚀 Processing news for newsId:', requestData.newsId)
    console.log('📎 Received sourceLink:', requestData.sourceLink || 'NULL')

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    // Get Telegram news rewrite prompt from database (separate from RSS)
    const { data: prompts, error: promptError } = await supabase
      .from('ai_prompts')
      .select('*')
      .eq('is_active', true)
      .eq('prompt_type', 'telegram_news_rewrite')
      .order('updated_at', { ascending: false })
      .limit(1)

    if (promptError || !prompts || prompts.length === 0) {
      throw new Error('No telegram_news_rewrite prompt configured. Please add a prompt with type "telegram_news_rewrite" in the admin panel.')
    }

    const newsPrompt = prompts[0]
    console.log('Using Telegram news rewrite prompt:', newsPrompt.name)

    return await processWithPrompt(newsPrompt, requestData, supabase, 'news')

  } catch (error: any) {
    console.error('❌ Error processing news:', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Unknown error'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
})

async function processWithPrompt(
  prompt: any,
  requestData: NewsRewriteRequest,
  supabase: any,
  type: 'news' | 'blog'
) {
  if (!AZURE_OPENAI_ENDPOINT || !AZURE_OPENAI_API_KEY) {
    throw new Error('Azure OpenAI not configured')
  }

  // Build prompt with placeholders
  // Use sourceLink (real source) instead of Telegram URL when available
  const sourceUrl = requestData.sourceLink || requestData.url || ''
  console.log(`📎 Source URL for AI prompt: ${sourceUrl}`)

  const openingStyle = getRandomOpeningStyle('news')
  const systemPrompt = prompt.prompt_text
    .replace('{title}', requestData.title)
    .replace('{content}', requestData.content)
    .replace('{url}', sourceUrl)
    + `\n\nOPENING STYLE DIRECTIVE (ОБОВ'ЯЗКОВО ДОТРИМУЙСЯ): ${openingStyle}`

  console.log('📝 Rewriting with AI...')
  console.log(`🎲 Opening style: ${openingStyle}`)

  // Call Azure OpenAI - ONE REQUEST for all languages
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
          content: `You are a professional content rewriter and translator. You MUST return ONLY valid JSON with this EXACT structure:
{
  "en": { "title": "...", "content": "...", "description": "..." },
  "no": { "title": "...", "content": "...", "description": "..." },
  "ua": { "title": "...", "content": "...", "description": "..." },
  "tags": ["tag1", "tag2", "tag3"]
}

CRITICAL: The JSON MUST have "en", "no", and "ua" keys at the top level. Each must contain "title", "content", and "description".`
        },
        {
          role: 'user',
          content: systemPrompt
        }
      ],
      temperature: 0.5,
      max_tokens: 8000
    })
  })

  if (!response.ok) {
    const errorText = await response.text()
    console.error('Azure OpenAI error:', errorText)
    throw new Error(`AI rewrite failed: ${response.status}`)
  }

  const data = await response.json()
  const aiContent = data.choices[0]?.message?.content?.trim()

  console.log('AI response received, parsing JSON...')

  // Parse JSON response
  const jsonMatch = aiContent.match(/\{[\s\S]*\}/)
  if (!jsonMatch) {
    console.error('Failed to parse AI response:', aiContent.substring(0, 500))
    throw new Error('Failed to parse AI response')
  }

  let rewrittenContent
  try {
    rewrittenContent = JSON.parse(jsonMatch[0])
    console.log('Parsed JSON keys:', Object.keys(rewrittenContent))
  } catch (parseError: any) {
    console.error('JSON parse error:', parseError.message)
    console.error('Raw JSON string (first 1000 chars):', jsonMatch[0].substring(0, 1000))
    throw new Error(`Failed to parse JSON: ${parseError.message}`)
  }

  // Validate structure - check both language objects AND required fields
  if (!rewrittenContent.en || !rewrittenContent.no || !rewrittenContent.ua) {
    console.error('Missing language fields. Got keys:', Object.keys(rewrittenContent))
    console.error('en:', !!rewrittenContent.en, 'no:', !!rewrittenContent.no, 'ua:', !!rewrittenContent.ua)
    console.error('Raw response (first 500 chars):', aiContent.substring(0, 500))
    throw new Error(`AI response missing required language fields. Got keys: ${Object.keys(rewrittenContent).join(', ')}. Raw: ${aiContent.substring(0, 300)}`)
  }

  // Validate that each language has required title field
  const missingTitles: string[] = []
  if (!rewrittenContent.en?.title) missingTitles.push('en')
  if (!rewrittenContent.no?.title) missingTitles.push('no')
  if (!rewrittenContent.ua?.title) missingTitles.push('ua')

  if (missingTitles.length > 0) {
    console.error('Missing titles for languages:', missingTitles)
    console.error('EN title:', rewrittenContent.en?.title || 'MISSING')
    console.error('NO title:', rewrittenContent.no?.title || 'MISSING')
    console.error('UA title:', rewrittenContent.ua?.title || 'MISSING')
    console.error('Raw response (first 500 chars):', aiContent.substring(0, 500))
    throw new Error(`AI response missing titles for: ${missingTitles.join(', ')}. Check AI prompt configuration.`)
  }

  // Extract tags from AI response (if available)
  const tags = rewrittenContent.tags || rewrittenContent.en?.tags || []
  console.log(`✅ Content rewritten for all languages, tags: ${tags.length > 0 ? tags.join(', ') : 'none'}`)

  // Append source links to content if available (for each language)
  // Priority: sourceLinks array (all links) > sourceLink (single, backwards compat)
  const sourceLinks = requestData.sourceLinks?.length ? requestData.sourceLinks : (requestData.sourceLink ? [requestData.sourceLink] : [])

  if (sourceLinks.length > 0) {
    console.log(`📎 Appending ${sourceLinks.length} source link(s) to content`)
    sourceLinks.forEach((link, i) => console.log(`   ${i + 1}. ${link}`))

    // Format as Resources section with multiple links
    const formatLinks = (links: string[], headerText: string): string => {
      if (links.length === 1) {
        // Single link - use simple format
        return `\n\n**${headerText}:** [${new URL(links[0]).hostname}](${links[0]})`
      }
      // Multiple links - use bullet list
      const linksList = links.map(link => {
        try {
          const hostname = new URL(link).hostname.replace('www.', '')
          return `- [${hostname}](${link})`
        } catch {
          return `- [Link](${link})`
        }
      }).join('\n')
      return `\n\n**${headerText}:**\n${linksList}`
    }

    rewrittenContent.en.content = rewrittenContent.en.content + formatLinks(sourceLinks, 'Resources')
    rewrittenContent.no.content = rewrittenContent.no.content + formatLinks(sourceLinks, 'Ressurser')
    rewrittenContent.ua.content = rewrittenContent.ua.content + formatLinks(sourceLinks, 'Ресурси')
  }

  // Generate slugs with transliteration and unique suffix
  const uniqueSuffix = requestData.newsId.substring(0, 8)

  // Update news item with rewritten content
  const { error: updateError } = await supabase
    .from('news')
    .update({
      title_en: rewrittenContent.en.title,
      content_en: rewrittenContent.en.content,
      description_en: rewrittenContent.en.description,
      slug_en: generateLocalizedSlug(rewrittenContent.en.title, 'en', uniqueSuffix),
      title_ua: rewrittenContent.ua.title,
      content_ua: rewrittenContent.ua.content,
      description_ua: rewrittenContent.ua.description,
      slug_ua: generateLocalizedSlug(rewrittenContent.ua.title, 'ua', uniqueSuffix),
      title_no: rewrittenContent.no.title,
      content_no: rewrittenContent.no.content,
      description_no: rewrittenContent.no.description,
      slug_no: generateLocalizedSlug(rewrittenContent.no.title, 'no', uniqueSuffix),
      tags: tags.length > 0 ? tags : null, // Save tags if available
      is_rewritten: true,
      is_published: true,
      published_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .eq('id', requestData.newsId)

  if (updateError) {
    console.error('Failed to update news:', updateError)
    throw updateError
  }

  console.log('✅ News published:', requestData.newsId)

  // Cross-link enrichment (non-blocking, best-effort)
  try {
    console.log('🔗 Triggering cross-link enrichment...')
    await fetch(`${SUPABASE_URL}/functions/v1/enrich-article-links`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ articleId: requestData.newsId, type: 'news' })
    })
    console.log('✅ Cross-link enrichment completed')
  } catch (e) {
    console.error('⚠️ Cross-link enrichment failed (non-critical):', e)
  }

  // Update AI prompt usage count
  await supabase
    .from('ai_prompts')
    .update({ usage_count: prompt.usage_count + 1 })
    .eq('id', prompt.id)

  return new Response(
    JSON.stringify({
      success: true,
      newsId: requestData.newsId,
      message: 'News published successfully'
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}
