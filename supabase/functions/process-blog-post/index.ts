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
  sourceLink?: string | null    // First external source link (backwards compatibility)
  sourceLinks?: string[]        // ALL external source links from Telegram post content
  sourceType?: 'news' | 'voice' // voice = dictated blog post, uses voice_blog_rewrite prompt
}

/**
 * Process and publish blog post from news item
 * Rewrites content from author's first-person perspective
 */
serve(async (req) => {
  // Version: 2025-01-02-01 - Fix AI response format with explicit structure
  console.log('🚀 Process Blog Post v2025-01-02-01 started')
  console.log('📦 Features: Fixed system prompt with explicit JSON structure, max_tokens 8000')

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const requestData: BlogRewriteRequest = await req.json()
    console.log('🚀 Processing blog post for newsId:', requestData.newsId)
    console.log('📎 Received sourceLink:', requestData.sourceLink || 'NULL')

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    // Get blog rewrite prompt — voice posts use voice_blog_rewrite, news uses blog_rewrite
    const promptType = requestData.sourceType === 'voice' ? 'voice_blog_rewrite' : 'blog_rewrite'
    console.log(`📝 Prompt type: ${promptType}`)

    const { data: prompts, error: promptError } = await supabase
      .from('ai_prompts')
      .select('*')
      .eq('is_active', true)
      .eq('prompt_type', promptType)
      .order('updated_at', { ascending: false })
      .limit(1)

    // Fallback to blog_rewrite if voice prompt not found
    if ((!prompts || prompts.length === 0) && promptType === 'voice_blog_rewrite') {
      const { data: fallback } = await supabase
        .from('ai_prompts').select('*').eq('is_active', true)
        .eq('prompt_type', 'blog_rewrite').order('updated_at', { ascending: false }).limit(1)
      if (fallback?.length) prompts?.push(...fallback) || (prompts as typeof fallback)
    }

    if (promptError || !prompts || prompts.length === 0) {
      console.error('No active blog rewrite prompt found')
      throw new Error('Blog rewrite prompt not configured.')
    }

    const blogPrompt = prompts[0]
    console.log('Using blog rewrite prompt:', blogPrompt.name)

    // ── Helper: call Gemini ──
    async function callGemini(prompt: string, maxTokens = 4000): Promise<string> {
      const { data: gKey } = await supabase.from('api_settings').select('key_value').eq('key_name', 'GOOGLE_API_KEY').single()
      const key = gKey?.key_value || Deno.env.get('GOOGLE_API_KEY') || ''
      if (!key) throw new Error('Google API key not configured')
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${key}`,
        { method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { temperature: 0.4, maxOutputTokens: maxTokens } }) }
      )
      if (!res.ok) throw new Error(`Gemini ${res.status}: ${(await res.text()).slice(0, 200)}`)
      const d = await res.json()
      return d?.candidates?.[0]?.content?.parts?.[0]?.text || ''
    }

    // ══════════════════════════════════════════════════════════════
    // VOICE: 3-stage processing via Gemini (preserves author's voice)
    // ══════════════════════════════════════════════════════════════
    let processedContent = requestData.content
    let processedTitle = requestData.title

    if (requestData.sourceType === 'voice') {
      console.log('🎙️ Voice mode: 3-stage Gemini processing...')
      const rawText = requestData.content

      // Stage 1: "What did Vitalii want to say?"
      console.log('  Stage 1: Identifying topic...')
      const stage1 = await callGemini(
        `Read this raw transcription from a voice message and describe in 1-2 sentences: what did the author want to say? What is the main idea?\n\nTranscription:\n${rawText}`,
        500
      )
      console.log(`  Stage 1 result: ${stage1.slice(0, 150)}`)

      // Stage 2: "Retell his words correctly"
      console.log('  Stage 2: Clean retelling...')
      const stage2 = await callGemini(
        `Below is a raw voice transcription and a summary of what the author meant.\n\nOriginal transcription:\n${rawText}\n\nTopic identified:\n${stage1}\n\nNow retell EXACTLY what the author said, but fix grammar, remove filler words, and make sentences complete. DO NOT add your own ideas, opinions, or expand the content. Keep ONLY the author's original thoughts, just written correctly. Preserve the original language. Return only the cleaned text, nothing else.`,
        2000
      )
      console.log(`  Stage 2 result: ${stage2.slice(0, 150)}`)

      processedContent = stage2
      processedTitle = stage1.slice(0, 100)
      console.log('  ✅ 3-stage voice processing complete')
    }

    // ══════════════════════════════════════════════════════════════
    // Stage 3 (voice) / Main stage (news): Generate trilingual blog post via Gemini
    // ══════════════════════════════════════════════════════════════
    const sourceUrl = requestData.sourceLink || requestData.url || ''
    const openingStyle = getRandomOpeningStyle('blog')

    const blogPromptText = blogPrompt.prompt_text
      .replace('{title}', processedTitle)
      .replace('{content}', processedContent)
      .replace('{url}', sourceUrl)
      + `\n\nOPENING STYLE DIRECTIVE: ${openingStyle}`

    console.log('📝 Generating trilingual blog post via Gemini...')

    const finalPrompt = `You are a professional blog writer. Write from first-person perspective, sharing personal insights authentically.

${requestData.sourceType === 'voice' ? 'IMPORTANT: The text below is the author\'s OWN words and thoughts (cleaned from voice dictation). Preserve his voice and ideas — do NOT replace them with generic content. Expand slightly if needed but stay true to what he said.' : 'Rewrite the article content engagingly.'}

You MUST return ONLY valid JSON (no markdown fences):
{
  "en": { "title": "...", "content": "...", "description": "..." },
  "no": { "title": "...", "content": "...", "description": "..." },
  "ua": { "title": "...", "content": "...", "description": "..." },
  "tags": ["tag1", "tag2", "tag3"],
  "category": "Tech"
}

CONTENT TO PROCESS:
${blogPromptText}`

    const aiContent = await callGemini(finalPrompt, 16000)
    const response = { ok: true } // compatibility marker

    console.log('Gemini response received, parsing JSON...')

    // Parse JSON from Gemini response
    const cleanedAi = aiContent.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
    const jsonMatch = cleanedAi.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      console.error('Failed to parse AI response:', cleanedAi.substring(0, 500))
      throw new Error('Failed to parse AI response')
    }

    const rewrittenContent = JSON.parse(jsonMatch[0])

    // Validate structure
    if (!rewrittenContent.en || !rewrittenContent.no || !rewrittenContent.ua) {
      throw new Error('AI response missing required language fields (en, no, ua)')
    }

    console.log('✅ Blog post rewritten for all languages')

    // Append source links to content if available (for each language)
    // Priority: sourceLinks array (all links) > sourceLink (single, backwards compat)
    const sourceLinks = requestData.sourceLinks?.length ? requestData.sourceLinks : (requestData.sourceLink ? [requestData.sourceLink] : [])

    if (sourceLinks.length > 0) {
      console.log(`📎 Appending ${sourceLinks.length} source link(s) to blog content`)
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

    // Generate slugs with transliteration and unique suffix
    const uniqueSuffix = Date.now().toString(36).substring(-6)

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
        slug_en: generateLocalizedSlug(rewrittenContent.en.title, 'en', uniqueSuffix),
        title_ua: rewrittenContent.ua.title,
        content_ua: rewrittenContent.ua.content,
        description_ua: rewrittenContent.ua.description,
        slug_ua: generateLocalizedSlug(rewrittenContent.ua.title, 'ua', uniqueSuffix),
        title_no: rewrittenContent.no.title,
        content_no: rewrittenContent.no.content,
        description_no: rewrittenContent.no.description,
        slug_no: generateLocalizedSlug(rewrittenContent.no.title, 'no', uniqueSuffix),
        image_url: finalImageUrl,
        video_url: requestData.videoUrl,
        video_type: requestData.videoType,
        original_url: finalSourceUrl, // AI-found source or fallback
        source_news_id: requestData.sourceType === 'voice' ? null : requestData.newsId,
        source_type: requestData.sourceType || 'news',
        original_voice_text: requestData.sourceType === 'voice' ? requestData.content : null,
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

    // Cross-link enrichment (non-blocking, best-effort)
    try {
      console.log('🔗 Triggering cross-link enrichment...')
      await fetch(`${SUPABASE_URL}/functions/v1/enrich-article-links`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ articleId: blogPost.id, type: 'blog' })
      })
      console.log('✅ Cross-link enrichment completed')
    } catch (e) {
      console.error('⚠️ Cross-link enrichment failed (non-critical):', e)
    }

    // Update AI prompt usage count
    await supabase
      .from('ai_prompts')
      .update({ usage_count: blogPrompt.usage_count + 1 })
      .eq('id', blogPrompt.id)

    // Mark original news item as processed (skip for voice posts)
    if (requestData.sourceType !== 'voice') {
      await supabase
        .from('news')
        .update({
          is_rewritten: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', requestData.newsId)
    }

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
