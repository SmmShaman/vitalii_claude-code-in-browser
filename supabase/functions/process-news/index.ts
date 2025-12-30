import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

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
  sourceLink?: string | null  // External source link extracted from Telegram post
}

/**
 * Process and publish news article
 * Rewrites content in objective journalistic style
 */
serve(async (req) => {
  // Version: 2024-12-30-02 - Source link appending
  console.log('🚀 Process News v2024-12-30-02 started')
  console.log('📦 Features: Source link appending to rewritten content')

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const requestData: NewsRewriteRequest = await req.json()
    console.log('🚀 Processing news for newsId:', requestData.newsId)
    console.log('📎 Received sourceLink:', requestData.sourceLink || 'NULL')

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    // Get news rewrite prompt from database (most recently updated)
    const { data: prompts, error: promptError } = await supabase
      .from('ai_prompts')
      .select('*')
      .eq('is_active', true)
      .eq('prompt_type', 'news_rewrite')
      .order('updated_at', { ascending: false })
      .limit(1)

    if (promptError || !prompts || prompts.length === 0) {
      console.warn('⚠️ No active news_rewrite prompt found, trying fallback to "rewrite" type')

      // Fallback to existing "rewrite" prompt (most recently updated)
      const { data: fallbackPrompts } = await supabase
        .from('ai_prompts')
        .select('*')
        .eq('is_active', true)
        .eq('prompt_type', 'rewrite')
        .order('updated_at', { ascending: false })
        .limit(1)

      if (!fallbackPrompts || fallbackPrompts.length === 0) {
        throw new Error('No rewrite prompt configured')
      }

      console.log('Using fallback rewrite prompt:', fallbackPrompts[0].name)
      return await processWithPrompt(fallbackPrompts[0], requestData, supabase, 'news')
    }

    const newsPrompt = prompts[0]
    console.log('Using news rewrite prompt:', newsPrompt.name)

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

  const systemPrompt = prompt.prompt_text
    .replace('{title}', requestData.title)
    .replace('{content}', requestData.content)
    .replace('{url}', sourceUrl)

  console.log('📝 Rewriting with AI...')

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
          content: 'You are a professional content rewriter and translator. Return ONLY valid JSON.'
        },
        {
          role: 'user',
          content: systemPrompt
        }
      ],
      temperature: 0.5,
      max_tokens: 3000
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

  const rewrittenContent = JSON.parse(jsonMatch[0])

  // Validate structure
  if (!rewrittenContent.en || !rewrittenContent.no || !rewrittenContent.ua) {
    throw new Error('AI response missing required language fields')
  }

  // Extract tags from AI response (if available)
  const tags = rewrittenContent.tags || rewrittenContent.en?.tags || []
  console.log(`✅ Content rewritten for all languages, tags: ${tags.length > 0 ? tags.join(', ') : 'none'}`)

  // Append source link to content if available (for each language)
  const sourceLink = requestData.sourceLink
  if (sourceLink) {
    console.log(`📎 Appending source link to content: ${sourceLink}`)
    const sourceSuffix = {
      en: `\n\n**Source:** [Original Article](${sourceLink})`,
      no: `\n\n**Kilde:** [Original artikkel](${sourceLink})`,
      ua: `\n\n**Джерело:** [Оригінальна стаття](${sourceLink})`
    }
    rewrittenContent.en.content = rewrittenContent.en.content + sourceSuffix.en
    rewrittenContent.no.content = rewrittenContent.no.content + sourceSuffix.no
    rewrittenContent.ua.content = rewrittenContent.ua.content + sourceSuffix.ua
  }

  // Generate slugs with unique suffix to prevent duplicates
  const uniqueSuffix = requestData.newsId.substring(0, 8)
  const generateSlug = (text: string): string => {
    const baseSlug = text
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-')
      .substring(0, 80)
    return `${baseSlug}-${uniqueSuffix}`
  }

  // Update news item with rewritten content
  const { error: updateError } = await supabase
    .from('news')
    .update({
      title_en: rewrittenContent.en.title,
      content_en: rewrittenContent.en.content,
      description_en: rewrittenContent.en.description,
      slug_en: generateSlug(rewrittenContent.en.title),
      title_ua: rewrittenContent.ua.title,
      content_ua: rewrittenContent.ua.content,
      description_ua: rewrittenContent.ua.description,
      slug_ua: generateSlug(rewrittenContent.ua.title),
      title_no: rewrittenContent.no.title,
      content_no: rewrittenContent.no.content,
      description_no: rewrittenContent.no.description,
      slug_no: generateSlug(rewrittenContent.no.title),
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
