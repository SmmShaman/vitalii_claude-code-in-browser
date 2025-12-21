import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!
const AZURE_OPENAI_ENDPOINT = Deno.env.get('AZURE_OPENAI_ENDPOINT')
const AZURE_OPENAI_API_KEY = Deno.env.get('AZURE_OPENAI_API_KEY')

/**
 * Find original source URL using AI
 */
async function findSourceLink(title: string, content: string, existingUrl?: string): Promise<string | null> {
  try {
    console.log('🔍 Finding original source...')
    const response = await fetch(
      `${SUPABASE_URL}/functions/v1/find-source-link`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ title, content, existingUrl })
      }
    )

    if (!response.ok) {
      console.warn('⚠️ Find source failed, using existing URL')
      return null
    }

    const result = await response.json()
    if (result.success && result.sourceUrl && result.confidence !== 'low') {
      console.log(`✅ Source found: ${result.sourceUrl} (${result.confidence})`)
      return result.sourceUrl
    }
    return null
  } catch (error) {
    console.error('❌ Error finding source:', error)
    return null
  }
}

/**
 * Generate new image using AI
 */
async function generateImage(imageUrl: string | null, title: string, description: string): Promise<string | null> {
  try {
    if (!imageUrl) {
      console.log('⚠️ No image URL provided, skipping generation')
      return null
    }

    console.log('🖼️ Generating new image with AI...')
    const response = await fetch(
      `${SUPABASE_URL}/functions/v1/process-image`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          imageUrl,
          promptType: 'linkedin_optimize',
          newsTitle: title,
          newsDescription: description
        })
      }
    )

    if (!response.ok) {
      console.warn('⚠️ Image generation failed, using original')
      return null
    }

    const result = await response.json()
    if (result.success && result.processedImageUrl && result.processedImageUrl !== imageUrl) {
      console.log(`✅ New image generated: ${result.processedImageUrl}`)
      return result.processedImageUrl
    }
    return null
  } catch (error) {
    console.error('❌ Error generating image:', error)
    return null
  }
}

interface BlogRewriteRequest {
  newsId: string
  title: string
  content: string
  url?: string
  imageUrl?: string | null
  videoUrl?: string | null
  videoType?: string | null
  sourceLink?: string | null  // External source link from Telegram post content
}

/**
 * Process and publish blog post from news item
 * Rewrites content from author's first-person perspective
 */
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const requestData: BlogRewriteRequest = await req.json()
    console.log('🚀 Processing blog post for newsId:', requestData.newsId)

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    // Get blog rewrite prompt from database
    // Sort by updated_at DESC to get the most recently edited prompt
    const { data: prompts, error: promptError } = await supabase
      .from('ai_prompts')
      .select('*')
      .eq('is_active', true)
      .eq('prompt_type', 'blog_rewrite')
      .order('updated_at', { ascending: false })
      .limit(1)

    if (promptError || !prompts || prompts.length === 0) {
      console.error('No active blog rewrite prompt found')
      throw new Error('Blog rewrite prompt not configured. Please add a prompt with type "blog_rewrite" in the admin panel.')
    }

    const blogPrompt = prompts[0]
    console.log('Using blog rewrite prompt:', blogPrompt.name)

    if (!AZURE_OPENAI_ENDPOINT || !AZURE_OPENAI_API_KEY) {
      throw new Error('Azure OpenAI not configured')
    }

    // Build prompt with placeholders
    const systemPrompt = blogPrompt.prompt_text
      .replace('{title}', requestData.title)
      .replace('{content}', requestData.content)
      .replace('{url}', requestData.url || '')

    console.log('📝 Rewriting blog post with AI...')

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
            content: 'You are a professional blog writer. Rewrite content from first-person perspective, as if you are sharing personal insights and experiences. Make it engaging and authentic. Return ONLY valid JSON.'
          },
          {
            role: 'user',
            content: systemPrompt
          }
        ],
        temperature: 0.7,
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
      throw new Error('AI response missing required language fields (en, no, ua)')
    }

    console.log('✅ Blog post rewritten for all languages')

    // 🔍 Find original source URL (parallel with image generation)
    // 🖼️ Generate new image with AI
    const [foundSourceUrl, generatedImageUrl] = await Promise.all([
      findSourceLink(requestData.title, requestData.content, requestData.sourceLink || requestData.url),
      generateImage(requestData.imageUrl, rewrittenContent.en.title, rewrittenContent.en.description)
    ])

    // Use AI-found source or fallback to existing
    const finalSourceUrl = foundSourceUrl || requestData.sourceLink || requestData.url
    console.log(`📎 Final source URL: ${finalSourceUrl}`)

    // Use generated image or fallback to original
    const finalImageUrl = generatedImageUrl || requestData.imageUrl
    console.log(`🖼️ Final image URL: ${finalImageUrl}`)

    // Generate slugs with unique suffix to prevent duplicates
    const uniqueSuffix = Date.now().toString(36).substring(-6)
    const generateSlug = (text: string): string => {
      const baseSlug = text
        .toLowerCase()
        .replace(/[^\w\s-]/g, '')
        .replace(/\s+/g, '-')
        .substring(0, 80)
      return `${baseSlug}-${uniqueSuffix}`
    }

    // Calculate reading time (words per minute = 200)
    const wordCount = rewrittenContent.en.content.split(/\s+/).length
    const readingTime = Math.ceil(wordCount / 200)

    // Extract tags from AI response or use defaults
    const extractedTags = rewrittenContent.tags || rewrittenContent.en.tags || ['ai', 'technology']
    const category = rewrittenContent.category || rewrittenContent.en.category || 'Tech'

    // Create blog post with all fields
    const { data: blogPost, error: insertError } = await supabase
      .from('blog_posts')
      .insert({
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
        image_url: finalImageUrl,
        video_url: requestData.videoUrl,
        video_type: requestData.videoType,
        original_url: finalSourceUrl, // AI-found source or fallback
        source_news_id: requestData.newsId, // Reference to original news
        reading_time: readingTime,
        is_published: true,
        published_at: new Date().toISOString(),
        tags: extractedTags,
        category: category
      })
      .select()
      .single()

    if (insertError) {
      console.error('Failed to create blog post:', insertError)
      throw insertError
    }

    console.log('✅ Blog post created:', blogPost.id)

    // Update AI prompt usage count
    await supabase
      .from('ai_prompts')
      .update({ usage_count: blogPrompt.usage_count + 1 })
      .eq('id', blogPrompt.id)

    // Optionally: Mark original news item as processed
    await supabase
      .from('news')
      .update({
        is_rewritten: true,
        updated_at: new Date().toISOString()
      })
      .eq('id', requestData.newsId)

    return new Response(
      JSON.stringify({
        success: true,
        blogPostId: blogPost.id,
        message: 'Blog post published successfully'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error: any) {
    console.error('❌ Error processing blog post:', error)
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
