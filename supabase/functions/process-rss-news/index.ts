import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const AZURE_OPENAI_ENDPOINT = Deno.env.get('AZURE_OPENAI_ENDPOINT')
const AZURE_OPENAI_API_KEY = Deno.env.get('AZURE_OPENAI_API_KEY')

interface ImageWithMeta {
  url: string
  alt?: string
  title?: string
  credit?: string
  caption?: string
  source?: string
}

interface RSSNewsRewriteRequest {
  newsId: string
  title?: string
  content?: string
  url?: string
  imageUrl?: string | null
  images?: string[] | null  // Array of all image URLs
  imagesWithMeta?: ImageWithMeta[] | null  // Images with copyright metadata
}

/**
 * Process RSS news article with summary-style rewrite
 * Creates a short informational overview with link to original source
 */
serve(async (req) => {
  // Version: 2025-01-28-01 - Fix: save image_url to database
  console.log('🚀 Process RSS News v2025-01-28-01 started')
  console.log('📦 Features: Summary-style rewrite, auto source link append, image_url preservation')

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const requestData: RSSNewsRewriteRequest = await req.json()
    console.log('🚀 Processing RSS news for newsId:', requestData.newsId)

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    // Fetch news record to get RSS source URL and content
    const { data: news, error: fetchError } = await supabase
      .from('news')
      .select('*')
      .eq('id', requestData.newsId)
      .single()

    if (fetchError || !news) {
      console.error('Failed to fetch news:', fetchError)
      throw new Error('News record not found')
    }

    // Use data from request or from database
    const title = requestData.title || news.original_title || ''
    const content = requestData.content || news.original_content || ''
    const sourceUrl = news.rss_source_url || requestData.url || ''

    console.log(`📎 RSS Source URL: ${sourceUrl}`)

    // Get news rewrite prompt from database (single prompt for all news sources)
    const { data: prompts, error: promptError } = await supabase
      .from('ai_prompts')
      .select('*')
      .eq('is_active', true)
      .eq('prompt_type', 'news_rewrite')
      .order('updated_at', { ascending: false })
      .limit(1)

    if (promptError || !prompts || prompts.length === 0) {
      throw new Error('No news_rewrite prompt configured. Please add a prompt with type "news_rewrite" in the admin panel.')
    }

    const rssPrompt = prompts[0]
    console.log('Using news rewrite prompt:', rssPrompt.name)

    // Get images array from request or database
    const images = requestData.images || news.images || []
    const imagesWithMeta = requestData.imagesWithMeta || news.images_with_meta || []

    return await processWithPrompt(rssPrompt, requestData.newsId, title, content, sourceUrl, supabase, requestData.imageUrl || news.image_url, images, imagesWithMeta)

  } catch (error: any) {
    console.error('❌ Error processing RSS news:', error)
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
  newsId: string,
  title: string,
  content: string,
  sourceUrl: string,
  supabase: any,
  imageUrl: string | null,
  images: string[],
  imagesWithMeta: ImageWithMeta[]
) {
  if (!AZURE_OPENAI_ENDPOINT || !AZURE_OPENAI_API_KEY) {
    throw new Error('Azure OpenAI not configured')
  }

  // Build prompt with placeholders
  const systemPrompt = prompt.prompt_text
    .replace('{title}', title)
    .replace('{content}', content.substring(0, 6000)) // Limit content
    .replace('{url}', sourceUrl)

  console.log('📝 Rewriting with AI (summary style)...')

  // Call Azure OpenAI
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
          content: `You are a professional content writer and translator. You MUST return ONLY valid JSON with this EXACT structure:
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
      max_tokens: 6000
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
    throw new Error(`Failed to parse JSON: ${parseError.message}`)
  }

  // Validate structure
  if (!rewrittenContent.en || !rewrittenContent.no || !rewrittenContent.ua) {
    console.error('Missing language fields. Got keys:', Object.keys(rewrittenContent))
    throw new Error(`AI response missing required language fields`)
  }

  // Validate titles
  const missingTitles: string[] = []
  if (!rewrittenContent.en?.title) missingTitles.push('en')
  if (!rewrittenContent.no?.title) missingTitles.push('no')
  if (!rewrittenContent.ua?.title) missingTitles.push('ua')

  if (missingTitles.length > 0) {
    throw new Error(`AI response missing titles for: ${missingTitles.join(', ')}`)
  }

  // Extract tags
  const tags = rewrittenContent.tags || rewrittenContent.en?.tags || []
  console.log(`✅ Content rewritten for all languages, tags: ${tags.length > 0 ? tags.join(', ') : 'none'}`)

  // Append source link to content (RSS-specific feature)
  if (sourceUrl) {
    console.log(`📎 Appending source link to content: ${sourceUrl}`)

    const formatSourceLink = (content: string, headerText: string, url: string): string => {
      try {
        const hostname = new URL(url).hostname.replace('www.', '')
        return `${content}\n\n**${headerText}:** [${hostname}](${url})`
      } catch {
        return `${content}\n\n**${headerText}:** [Source](${url})`
      }
    }

    rewrittenContent.en.content = formatSourceLink(rewrittenContent.en.content, 'Read more', sourceUrl)
    rewrittenContent.no.content = formatSourceLink(rewrittenContent.no.content, 'Les mer', sourceUrl)
    rewrittenContent.ua.content = formatSourceLink(rewrittenContent.ua.content, 'Детальніше', sourceUrl)
  }

  // Generate slugs with unique suffix
  const uniqueSuffix = newsId.substring(0, 8)
  const generateSlug = (text: string): string => {
    const baseSlug = text
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-')
      .substring(0, 80)
    return `${baseSlug}-${uniqueSuffix}`
  }

  // Update news item with rewritten content
  console.log(`📷 Saving image_url: ${imageUrl || 'none'}`)
  console.log(`📷 Saving images array: ${images.length} images`)
  console.log(`📷 Saving images_with_meta: ${imagesWithMeta.length} images with copyright info`)
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
      tags: tags.length > 0 ? tags : null,
      image_url: imageUrl,
      images: images.length > 0 ? images : null,
      images_with_meta: imagesWithMeta.length > 0 ? imagesWithMeta : null,
      is_rewritten: true,
      is_published: true,
      published_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      pre_moderation_status: 'approved'
    })
    .eq('id', newsId)

  if (updateError) {
    console.error('Failed to update news:', updateError)
    throw updateError
  }

  console.log('✅ RSS News published:', newsId)

  // Update AI prompt usage count
  await supabase
    .from('ai_prompts')
    .update({ usage_count: prompt.usage_count + 1 })
    .eq('id', prompt.id)

  return new Response(
    JSON.stringify({
      success: true,
      newsId: newsId,
      message: 'RSS News published successfully'
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}
