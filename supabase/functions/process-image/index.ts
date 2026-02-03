import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const VERSION = '2026-02-03-v5-image-other-fallback'

// Get Google API key from env or database
async function getGoogleApiKey(supabase: any): Promise<string | null> {
  // First try environment variable
  const envKey = Deno.env.get('GOOGLE_API_KEY')
  console.log('🔑 GOOGLE_API_KEY from env:', envKey ? `found (${envKey.substring(0, 10)}...)` : 'NOT FOUND')

  if (envKey) {
    console.log('📍 Using GOOGLE_API_KEY from environment')
    return envKey
  }

  // Fallback to database
  try {
    const { data, error } = await supabase
      .from('api_settings')
      .select('key_value')
      .eq('key_name', 'GOOGLE_API_KEY')
      .eq('is_active', true)
      .single()

    if (!error && data?.key_value) {
      console.log('📍 Using GOOGLE_API_KEY from database')
      return data.key_value
    }
  } catch (e) {
    console.log('⚠️ Could not read API key from database:', e)
  }

  return null
}

interface ProcessImageRequest {
  imageUrl?: string  // Now optional - not needed for text-to-image
  newsId?: string
  promptType?: 'enhance' | 'linkedin_optimize' | 'generate' | 'custom'
  customPrompt?: string
  // News context for AI image generation
  newsTitle?: string
  newsDescription?: string
  newsUrl?: string
  // NEW: Generate image from prompt only (text-to-image mode)
  generateFromPrompt?: boolean
  // Language for text on the image (ua, no, en)
  language?: 'en' | 'no' | 'ua'
}

interface ProcessImageResponse {
  success: boolean
  processedImageUrl?: string
  originalImageUrl?: string
  error?: string
  message?: string
  debug?: {
    version: string
    timestamp: string
    lastApiError: string | null
  }
}

/**
 * Process and enhance images for LinkedIn using AI
 * Supports Google Imagen API for image enhancement
 */
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const requestData: ProcessImageRequest = await req.json()
    console.log('🖼️ Image processing request:', {
      imageUrl: requestData.imageUrl?.substring(0, 50) + '...',
      newsId: requestData.newsId,
      promptType: requestData.promptType,
      generateFromPrompt: requestData.generateFromPrompt,
      hasNewsContext: !!(requestData.newsTitle || requestData.newsDescription)
    })

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    // TEXT-TO-IMAGE MODE: Generate image from prompt stored in DB
    if (requestData.generateFromPrompt && requestData.newsId) {
      console.log('🎨 Text-to-image mode: generating from stored prompt', requestData.language ? `(language: ${requestData.language})` : '')
      return await handleTextToImageGeneration(supabase, requestData.newsId, requestData.language)
    }

    // STANDARD MODE: Process existing image
    if (!requestData.imageUrl) {
      throw new Error('Image URL is required (or use generateFromPrompt=true with newsId)')
    }

    // Get the prompt from database or use default
    let prompt = await getImagePrompt(supabase, requestData.promptType || 'linkedin_optimize')

    if (requestData.customPrompt) {
      prompt = requestData.customPrompt
    }

    // If we have news context, inject it into the prompt
    if (requestData.newsTitle || requestData.newsDescription) {
      prompt = buildContextualPrompt(prompt, {
        title: requestData.newsTitle,
        description: requestData.newsDescription,
        url: requestData.newsUrl
      })
    }

    console.log('📝 Using prompt:', prompt.substring(0, 200) + '...')

    // Download the original image
    const imageData = await downloadImage(requestData.imageUrl)
    console.log('📥 Downloaded image, size:', imageData.length, 'bytes')

    // Get Google API key
    const googleApiKey = await getGoogleApiKey(supabase)
    if (!googleApiKey) {
      console.log('⚠️ GOOGLE_API_KEY not configured (neither in env nor database)')
      return new Response(
        JSON.stringify({
          success: true,
          processedImageUrl: requestData.imageUrl,
          originalImageUrl: requestData.imageUrl,
          error: 'GOOGLE_API_KEY not configured. Please add it in Admin → Settings → API Keys'
        } as ProcessImageResponse),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Process image with AI
    const processedImageUrl = await processImageWithAI(imageData, prompt, googleApiKey)

    if (!processedImageUrl) {
      // If AI processing fails, return original image
      console.log('⚠️ AI processing failed, using original image')
      return new Response(
        JSON.stringify({
          success: true,
          processedImageUrl: requestData.imageUrl,
          originalImageUrl: requestData.imageUrl,
          error: 'AI processing unavailable, using original image'
        } as ProcessImageResponse),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // If newsId provided, update the news record with processed image
    if (requestData.newsId) {
      await supabase
        .from('news')
        .update({
          processed_image_url: processedImageUrl,
          image_processed_at: new Date().toISOString()
        })
        .eq('id', requestData.newsId)
    }

    console.log('✅ Image processed successfully')

    return new Response(
      JSON.stringify({
        success: true,
        processedImageUrl,
        originalImageUrl: requestData.imageUrl
      } as ProcessImageResponse),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error: any) {
    console.error('❌ Error processing image:', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Unknown error'
      } as ProcessImageResponse),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
})

/**
 * Handle text-to-image generation mode
 * Gets prompt from DB and generates image using Gemini 3 Pro Image
 * Includes Critic Agent validation with auto-retry (max 3 attempts)
 */
async function handleTextToImageGeneration(
  supabase: any,
  newsId: string,
  language?: 'en' | 'no' | 'ua',
  retryCount: number = 0,
  previousIssues: string[] = []
): Promise<Response> {
  const MAX_RETRIES = 3
  console.log(`🎨 Starting text-to-image generation for news: ${newsId}${language ? ` (language: ${language})` : ''} [attempt ${retryCount + 1}/${MAX_RETRIES}]`)

  // 1. Get news record with the stored prompt
  const { data: news, error: newsError } = await supabase
    .from('news')
    .select('id, image_generation_prompt, title_en, description_en, processed_image_url, image_retry_count, category')
    .eq('id', newsId)
    .single()

  if (newsError || !news) {
    console.error('❌ News not found:', newsError)
    return new Response(
      JSON.stringify({
        success: false,
        error: `News not found: ${newsId}`
      } as ProcessImageResponse),
      { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  // Check if we already have a processed image (only on first attempt)
  if (news.processed_image_url && retryCount === 0) {
    console.log('✅ Image already generated:', news.processed_image_url)
    return new Response(
      JSON.stringify({
        success: true,
        processedImageUrl: news.processed_image_url,
        message: 'Image already exists'
      } as ProcessImageResponse),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  // 2. Get the prompt - prefer stored prompt, fallback to generating one
  let imagePrompt = news.image_generation_prompt

  if (!imagePrompt) {
    console.log('⚠️ No stored prompt, generating a default one from title')
    imagePrompt = `Create a professional, modern illustration for a LinkedIn article about: ${news.title_en || 'technology news'}.
Style: Clean, professional, tech-focused.
Aspect ratio: 1:1 square.
No text on the image.
Colors: Vibrant but professional.`
  }

  // If retrying, add improvement feedback from previous validation
  if (retryCount > 0 && previousIssues.length > 0) {
    const feedbackSection = `

IMPORTANT - Fix these issues from previous attempt:
${previousIssues.map(issue => `- ${issue}`).join('\n')}

Generate a BETTER image addressing all these issues.`
    imagePrompt = imagePrompt + feedbackSection
    console.log('🔄 Added improvement feedback to prompt')
  }

  console.log('📝 Using prompt:', imagePrompt.substring(0, 200) + '...')

  // 3. Get Google API key
  const googleApiKey = await getGoogleApiKey(supabase)
  if (!googleApiKey) {
    console.log('⚠️ GOOGLE_API_KEY not configured')
    return new Response(
      JSON.stringify({
        success: false,
        error: 'GOOGLE_API_KEY not configured. Please add it in Admin → Settings → API Keys'
      } as ProcessImageResponse),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  // 4. Generate image using Gemini 3 Pro Image (text-to-image)
  // Extract category for potential content policy fallback
  const newsCategory = news.category || 'general'
  console.log('🖼️ Calling Gemini 3 Pro Image for text-to-image generation... (version:', VERSION, ')')
  console.log('📂 News category:', newsCategory)
  const processedImageUrl = await generateImageFromText(imagePrompt, googleApiKey, language, newsCategory, false)

  if (!processedImageUrl) {
    console.log('❌ Image generation failed')
    return new Response(
      JSON.stringify({
        success: false,
        error: `Image generation failed: ${lastApiError || 'Unknown error'}`,
        debug: {
          version: VERSION,
          timestamp: new Date().toISOString(),
          lastApiError: lastApiError,
          retryCount
        }
      } as ProcessImageResponse),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  // 5. Run Critic Agent validation
  console.log('🔍 Running Critic Agent validation...')
  const validation = await validateGeneratedImage(
    processedImageUrl,
    imagePrompt,
    {
      title: news.title_en || 'News Article',
      category: newsCategory,
      language: language || 'en'
    },
    googleApiKey
  )

  console.log(`📊 Validation result: score=${validation.score}, isValid=${validation.isValid}, issues=${validation.issues.length}`)

  // 6. Check if we need to retry
  if (!validation.isValid && validation.shouldRetry && retryCount < MAX_RETRIES - 1) {
    console.log(`🔄 Image failed validation (score: ${validation.score}), retrying... (${retryCount + 1}/${MAX_RETRIES})`)

    // Update retry count in database
    await supabase
      .from('news')
      .update({
        image_retry_count: retryCount + 1
      })
      .eq('id', newsId)

    // Recursively retry with improvement suggestions
    return handleTextToImageGeneration(
      supabase,
      newsId,
      language,
      retryCount + 1,
      [...validation.issues, ...(validation.details?.improvementSuggestions || [])]
    )
  }

  // 7. Save final result to database
  const { error: updateError } = await supabase
    .from('news')
    .update({
      processed_image_url: processedImageUrl,
      image_processed_at: new Date().toISOString(),
      image_quality_score: validation.score,
      image_validation_issues: validation.issues,
      image_retry_count: retryCount
    })
    .eq('id', newsId)

  if (updateError) {
    console.error('⚠️ Failed to update news record:', updateError)
  }

  const statusEmoji = validation.isValid ? '✅' : '⚠️'
  console.log(`${statusEmoji} Image ${validation.isValid ? 'generated and validated' : 'generated (validation issues noted)'}: ${processedImageUrl}`)

  return new Response(
    JSON.stringify({
      success: true,
      processedImageUrl,
      message: validation.isValid
        ? 'Image generated and validated successfully'
        : `Image generated with score ${validation.score}/10 (${validation.issues.length} issues)`,
      debug: {
        version: VERSION,
        timestamp: new Date().toISOString(),
        lastApiError: null,
        validation: {
          score: validation.score,
          isValid: validation.isValid,
          issues: validation.issues,
          retryCount
        }
      }
    } as ProcessImageResponse),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

/**
 * Validation result interface for Critic Agent
 */
interface ValidationResult {
  isValid: boolean
  score: number
  issues: string[]
  shouldRetry: boolean
  details?: {
    relevance?: number
    quality?: number
    branding?: boolean
    improvementSuggestions?: string[]
  }
}

/**
 * Validate generated image using Critic Agent (inline implementation)
 * Uses Gemini to analyze the image and provide structured feedback
 */
async function validateGeneratedImage(
  imageUrl: string,
  originalPrompt: string,
  newsContext: { title: string; category: string; language: string },
  apiKey: string
): Promise<ValidationResult> {
  try {
    // Download image
    const response = await fetch(imageUrl)
    if (!response.ok) {
      console.error('❌ Failed to download image for validation')
      return getDefaultValidation(true)
    }

    const arrayBuffer = await response.arrayBuffer()
    const imageBase64 = btoa(
      new Uint8Array(arrayBuffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
    )

    // Use Gemini for validation
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent`

    const criticPrompt = `You are an expert image quality critic for a professional news website.
Analyze this generated image and evaluate it.

NEWS CONTEXT:
Title: ${newsContext.title}
Category: ${newsContext.category}
Language: ${newsContext.language}

ORIGINAL IMAGE PROMPT:
${originalPrompt.substring(0, 1000)}

Evaluate:
1. RELEVANCE (1-10): Does image match the news topic?
2. QUALITY (1-10): Sharpness, colors, professional appearance
3. BRANDING: Is "vitalii.no" watermark visible?
4. ARTIFACTS: Any visual problems?
5. TEXT_ISSUES: Problems with text on image?

Respond with ONLY valid JSON:
{
  "relevance": <1-10>,
  "quality": <1-10>,
  "branding": <true/false>,
  "artifacts": ["list"],
  "text_issues": ["list"],
  "overall_score": <1-10>,
  "should_retry": <true/false>,
  "improvement_suggestions": ["list"]
}`

    const requestBody = {
      contents: [{
        parts: [
          { text: criticPrompt },
          {
            inline_data: {
              mime_type: 'image/jpeg',
              data: imageBase64
            }
          }
        ]
      }],
      generationConfig: {
        temperature: 0.2,
        maxOutputTokens: 800
      }
    }

    const apiResponse = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey
      },
      body: JSON.stringify(requestBody)
    })

    if (!apiResponse.ok) {
      console.error('❌ Validation API error:', apiResponse.status)
      return getDefaultValidation(true)
    }

    const result = await apiResponse.json()
    const textContent = result.candidates?.[0]?.content?.parts?.[0]?.text

    if (!textContent) {
      return getDefaultValidation(true)
    }

    // Parse JSON response
    let jsonString = textContent.trim()
      .replace(/```json\n?/g, '')
      .replace(/```\n?/g, '')
      .trim()

    try {
      const parsed = JSON.parse(jsonString)
      const overallScore = parsed.overall_score || Math.round((parsed.relevance + parsed.quality) / 2)
      const issues: string[] = [...(parsed.artifacts || []), ...(parsed.text_issues || [])]

      if (!parsed.branding) {
        issues.push('Missing vitalii.no branding')
      }

      const isValid = overallScore >= 6 && issues.length <= 2
      const shouldRetry = !isValid && overallScore >= 4

      return {
        isValid,
        score: overallScore,
        issues,
        shouldRetry: parsed.should_retry ?? shouldRetry,
        details: {
          relevance: parsed.relevance || 5,
          quality: parsed.quality || 5,
          branding: parsed.branding ?? false,
          improvementSuggestions: parsed.improvement_suggestions || []
        }
      }
    } catch (parseError) {
      console.error('❌ Failed to parse validation JSON:', parseError)
      return getDefaultValidation(true)
    }

  } catch (error) {
    console.error('❌ Error in image validation:', error)
    return getDefaultValidation(true)
  }
}

/**
 * Get default validation result (pass-through to not block workflow)
 */
function getDefaultValidation(isValid: boolean): ValidationResult {
  return {
    isValid,
    score: isValid ? 7 : 4,
    issues: isValid ? [] : ['Validation unavailable'],
    shouldRetry: !isValid,
    details: {
      relevance: 7,
      quality: 7,
      branding: true,
      improvementSuggestions: []
    }
  }
}

/**
 * Generate image from text prompt using Gemini 3 Pro Image
 * This is the pure text-to-image generation (no reference image needed)
 */
// Store last API error for debugging
let lastApiError: string | null = null

// Abstract fallback prompts for content policy bypass (IMAGE_OTHER errors)
// Used when Gemini blocks generation due to sensitive topics (politics, famous people, brands, etc.)
const FALLBACK_ABSTRACT_PROMPTS: Record<string, string> = {
  'business_news': 'Professional abstract illustration representing business analytics, financial growth charts, and corporate success with modern geometric design elements, data visualization graphs, upward trending arrows, and clean corporate aesthetics',
  'tech_product': 'Futuristic technology visualization with glowing digital elements, circuit patterns, microchip details, and innovation symbolism in vibrant blue and purple tones, abstract tech landscape with holographic interfaces',
  'ai_research': 'Abstract neural network concept with interconnected glowing nodes, data streams, artificial intelligence symbolism, digital brain visualization with flowing data particles and modern gradient colors',
  'science': 'Scientific discovery concept with abstract molecular structures, laboratory symbolism, DNA helix patterns, research innovation elements, beakers and scientific equipment in modern minimalist style',
  'marketing_campaign': 'Dynamic marketing concept with abstract growth arrows, engagement symbols, social media icons floating in digital space, modern promotional design elements with vibrant gradient backgrounds',
  'lifestyle': 'Contemporary lifestyle illustration with modern design aesthetics, vibrant colors, positive energy symbolism, abstract geometric patterns representing wellbeing and modern living',
  'general': 'Professional abstract business illustration with geometric shapes, modern gradients, corporate aesthetics, interconnected nodes and flowing lines representing innovation and progress'
}

async function generateImageFromText(
  prompt: string,
  apiKey: string,
  language?: 'en' | 'no' | 'ua',
  category?: string,
  useAbstractFallback?: boolean
): Promise<string | null> {
  lastApiError = null

  try {
    // If using abstract fallback due to content policy, use pre-defined safe prompt
    const effectivePrompt = useAbstractFallback
      ? (FALLBACK_ABSTRACT_PROMPTS[category || 'general'] || FALLBACK_ABSTRACT_PROMPTS['general'])
      : prompt

    console.log('📤 Generating image with Gemini 3 Pro Image (text-to-image)...')
    if (useAbstractFallback) {
      console.log('🔄 Using ABSTRACT FALLBACK prompt due to content policy')
      console.log('📂 Category:', category || 'general')
    }
    console.log('📝 Prompt length:', effectivePrompt.length, 'chars')
    if (language) {
      console.log('🌐 Language for text on image:', language)
    }

    // Date formatting based on language
    const now = new Date()
    const dateFormats: Record<string, string> = {
      'ua': now.toLocaleDateString('uk-UA', { day: 'numeric', month: 'long', year: 'numeric' }),
      'no': now.toLocaleDateString('nb-NO', { day: 'numeric', month: 'long', year: 'numeric' }),
      'en': now.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    }

    // Language instructions for Gemini with MANDATORY date and vitalii.no branding
    const languageInstructions: Record<string, string> = {
      'ua': `MANDATORY VISUAL REQUIREMENTS:
1. All text MUST be in Ukrainian (Cyrillic script)
2. Display this date prominently on the image: "${dateFormats['ua']}"
3. Add small "vitalii.no" watermark at bottom corner

DO NOT use any other date. The date "${dateFormats['ua']}" is TODAY's date and MUST appear on the image.`,
      'no': `MANDATORY VISUAL REQUIREMENTS:
1. All text MUST be in Norwegian (Latin script)
2. Display this date prominently on the image: "${dateFormats['no']}"
3. Add small "vitalii.no" watermark at bottom corner

DO NOT use any other date. The date "${dateFormats['no']}" is TODAY's date and MUST appear on the image.`,
      'en': `MANDATORY VISUAL REQUIREMENTS:
1. All text MUST be in English
2. Display this date prominently on the image: "${dateFormats['en']}"
3. Add small "vitalii.no" watermark at bottom corner

DO NOT use any other date. The date "${dateFormats['en']}" is TODAY's date and MUST appear on the image.`
    }

    console.log('📅 Date being sent to AI:', dateFormats[language || 'en'])

    const langInstruction = language
      ? `\n\n${languageInstructions[language]}`
      : `\n\nNo text on the image except "vitalii.no" at the bottom.`

    // Gemini 3 Pro Image endpoint for text-to-image generation
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-pro-image-preview:generateContent`

    // Quality boost instructions for better image generation
    const qualityBoost = `CRITICAL QUALITY REQUIREMENTS:
- Generate in highest possible resolution (8K quality)
- Use vibrant, saturated colors with strong contrast
- Ensure all details are sharp and crisp, no blur or artifacts
- Apply professional studio lighting with soft shadows
- Create rich textures and depth with photorealistic materials
- Use dynamic color range for visual impact`

    const requestBody = {
      contents: [{
        parts: [{
          text: `${qualityBoost}

Generate a professional news illustration for LinkedIn/Instagram.

TODAY'S DATE (must appear on image): ${dateFormats[language || 'en']}
${langInstruction}

Visual concept: ${effectivePrompt}

Style: Modern, professional, 1:1 square aspect ratio.`
        }]
      }],
      generationConfig: {
        responseModalities: ['TEXT', 'IMAGE']
      }
    }

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey
      },
      body: JSON.stringify(requestBody)
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('❌ Gemini 3 Pro Image API error:', response.status)

      try {
        const errorJson = JSON.parse(errorText)
        const errorMessage = errorJson.error?.message || JSON.stringify(errorJson)
        console.error('Error details:', errorMessage)
        lastApiError = `Status ${response.status}: ${errorMessage}`

        // Log specific error hints
        if (response.status === 400) {
          console.error('💡 Hint: Check if API key has Gemini API enabled in Google Cloud Console')
        } else if (response.status === 403) {
          console.error('💡 Hint: API key may not have permission for image generation')
        } else if (response.status === 429) {
          console.error('💡 Hint: Rate limit exceeded, try again later')
        }
      } catch {
        console.error('Raw error:', errorText.substring(0, 500))
        lastApiError = `Status ${response.status}: ${errorText.substring(0, 200)}`
      }
      return null
    }

    const result = await response.json()
    console.log('📥 Gemini response received, checking for image...')

    // Check for content policy block (IMAGE_OTHER) FIRST before looking for image
    const candidate = result.candidates?.[0]
    if (candidate?.finishReason === 'IMAGE_OTHER') {
      const finishMsg = candidate.finishMessage || 'Content policy violation - unable to generate image'
      console.warn('⚠️ Content policy blocked (IMAGE_OTHER):', finishMsg)

      // If not already using abstract fallback, retry with safe abstract prompt
      if (!useAbstractFallback) {
        console.log('🔄 Retrying with abstract fallback prompt to bypass content policy...')
        console.log('📂 Using category:', category || 'general')
        return generateImageFromText(prompt, apiKey, language, category, true)
      }

      // Already tried fallback and still blocked - give up gracefully
      lastApiError = `Content policy blocked even abstract prompt: ${finishMsg}`
      console.error('❌ Content policy blocked even with abstract fallback prompt')
      return null
    }

    // Extract image from Gemini response
    if (result.candidates && result.candidates[0]?.content?.parts) {
      console.log('📦 Found', result.candidates[0].content.parts.length, 'parts in response')
      console.log('📋 Parts structure:', JSON.stringify(result.candidates[0].content.parts.map((p: any) => Object.keys(p)), null, 2))
      for (const part of result.candidates[0].content.parts) {
        // Check both snake_case (inline_data) and camelCase (inlineData) formats
        const imageData = part.inline_data || part.inlineData
        if (imageData && imageData.data) {
          console.log('✅ Gemini 3 Pro Image generated image successfully')
          console.log('📊 Image format:', part.inline_data ? 'snake_case' : 'camelCase')
          // Upload to Supabase Storage (logo/branding via Gemini prompt)
          const processedImageUrl = await uploadProcessedImage(imageData.data)
          return processedImageUrl
        }
        if (part.text) {
          console.log('📝 Text part found:', part.text.substring(0, 100))
          lastApiError = `No image generated. Model returned text: ${part.text.substring(0, 200)}`
        }
      }
      // If we got here, no image was found in parts
      if (!lastApiError) {
        lastApiError = `No image found in ${result.candidates[0].content.parts.length} parts. Keys: ${JSON.stringify(result.candidates[0].content.parts.map((p: any) => Object.keys(p)))}`
      }
    } else {
      // Log what we got instead
      lastApiError = `Unexpected response structure: ${JSON.stringify(result).substring(0, 300)}`
      console.log('⚠️ Unexpected response:', lastApiError)
    }

    console.log('⚠️ No image in Gemini 3 Pro Image response')
    return null

  } catch (error: any) {
    console.error('❌ Error in text-to-image generation:', error)
    lastApiError = error.message || String(error)
    return null
  }
}

/**
 * Get image processing prompt from database
 */
async function getImagePrompt(supabase: any, promptType: string): Promise<string> {
  const { data: prompt, error } = await supabase
    .from('ai_prompts')
    .select('prompt_text')
    .eq('prompt_type', `image_${promptType}`)
    .eq('is_active', true)
    .single()

  if (error || !prompt) {
    // Return default prompt
    return getDefaultPrompt(promptType)
  }

  return prompt.prompt_text
}

/**
 * Default prompts for different use cases
 */
function getDefaultPrompt(promptType: string): string {
  const prompts: Record<string, string> = {
    enhance: 'Enhance this image: improve clarity, adjust brightness and contrast for better visibility, sharpen details while maintaining natural look.',
    linkedin_optimize: `Based on this reference image and the article context below, create a NEW professional illustration for LinkedIn.

ARTICLE CONTEXT:
{title}
{description}

INSTRUCTIONS:
1. Analyze the reference image and understand the article topic
2. Create a completely NEW, eye-catching illustration that represents the article theme
3. Style: Modern, professional, suitable for LinkedIn audience
4. Include visual metaphors or symbols related to the topic
5. Use vibrant but professional colors
6. Make it visually engaging to encourage clicks
7. Aspect ratio: Square (1:1)
8. No text on the image - the visual should speak for itself

Generate a high-quality, professional illustration that will stand out in LinkedIn feed.`,
    generate: `Create a NEW professional illustration based on this article:

TITLE: {title}

DESCRIPTION: {description}

REFERENCE: Use the provided image as style/context reference only.

REQUIREMENTS:
- Modern, clean design suitable for LinkedIn
- Visually represent the key theme of the article
- Professional color palette
- Eye-catching but not clickbait
- No text overlays
- Square orientation (1:1)

Generate the illustration now.`,
    custom: 'Process this image to improve its quality.'
  }
  return prompts[promptType] || prompts.custom
}

/**
 * Build prompt with news context placeholders replaced
 */
function buildContextualPrompt(
  basePrompt: string,
  context: { title?: string; description?: string; url?: string }
): string {
  let prompt = basePrompt

  // Replace placeholders with actual content
  if (context.title) {
    prompt = prompt.replace(/\{title\}/g, context.title)
  } else {
    prompt = prompt.replace(/\{title\}/g, '[No title provided]')
  }

  if (context.description) {
    // Truncate description if too long
    const shortDesc = context.description.substring(0, 500)
    prompt = prompt.replace(/\{description\}/g, shortDesc)
  } else {
    prompt = prompt.replace(/\{description\}/g, '[No description provided]')
  }

  if (context.url) {
    prompt = prompt.replace(/\{url\}/g, context.url)
  } else {
    prompt = prompt.replace(/\{url\}/g, '')
  }

  return prompt
}

/**
 * Download image from URL and return as base64
 */
async function downloadImage(url: string): Promise<string> {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Failed to download image: ${response.status}`)
  }

  const arrayBuffer = await response.arrayBuffer()
  const base64 = btoa(
    new Uint8Array(arrayBuffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
  )

  return base64
}

/**
 * Process image with Google Gemini 3 Pro Image
 * Native image generation model from Google with advanced text rendering
 * See: https://ai.google.dev/gemini-api/docs/image-generation
 */
async function processImageWithAI(imageBase64: string, prompt: string, apiKey: string): Promise<string | null> {
  try {
    // Try Gemini 3 Pro Image - native image generation with advanced text rendering
    console.log('📤 Generating image with Gemini 3 Pro Image...')

    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-pro-image-preview:generateContent`

    // Request body with image config (1:1 square)
    const requestBody = {
      contents: [{
        parts: [
          { text: prompt },
          {
            inline_data: {
              mime_type: 'image/jpeg',
              data: imageBase64
            }
          }
        ]
      }],
      generationConfig: {
        responseModalities: ['TEXT', 'IMAGE']
      }
    }

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey
      },
      body: JSON.stringify(requestBody)
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Gemini API error:', response.status, errorText)

      // Log detailed error for debugging
      try {
        const errorJson = JSON.parse(errorText)
        console.error('Error details:', errorJson.error?.message || errorJson)
      } catch {
        console.error('Raw error:', errorText.substring(0, 500))
      }
      return null
    }

    const result = await response.json()
    console.log('📥 Gemini API response received')
    console.log('Response structure:', JSON.stringify(result, null, 2).substring(0, 1000))

    // Extract processed image from response
    // Gemini returns images in candidates[0].content.parts[].inline_data or inlineData
    if (result.candidates && result.candidates[0]?.content?.parts) {
      console.log('📦 Found', result.candidates[0].content.parts.length, 'parts in response')
      console.log('📋 Parts structure:', JSON.stringify(result.candidates[0].content.parts.map((p: any) => Object.keys(p)), null, 2))
      for (const part of result.candidates[0].content.parts) {
        // Check both snake_case (inline_data) and camelCase (inlineData) formats
        const imageData = part.inline_data || part.inlineData
        if (imageData && imageData.data) {
          console.log('✅ Found generated image in response')
          console.log('📊 Image format:', part.inline_data ? 'snake_case' : 'camelCase')
          // Upload processed image to Supabase Storage (logo/branding via Gemini prompt)
          const processedImageUrl = await uploadProcessedImage(imageData.data)
          return processedImageUrl
        }
        if (part.text) {
          console.log('📝 Text response from Gemini:', part.text.substring(0, 200))
        }
      }
    }

    console.log('⚠️ No image in Gemini 3 Pro Image response, trying fallback...')

    // Fallback: Try Imagen 3 (requires Vertex AI access)
    const imagenResult = await tryImagenGeneration(prompt, apiKey)
    if (imagenResult) {
      return imagenResult
    }

    console.log('❌ All image generation methods failed (Gemini 3 Pro Image + Imagen 3 fallback)')
    return null

  } catch (error: any) {
    console.error('Error in image generation:', error)
    return null
  }
}

/**
 * Fallback: Try to generate image using Google Imagen 3 API
 * Note: Imagen 3 requires Vertex AI access, may not work with standard Gemini API key
 */
async function tryImagenGeneration(prompt: string, apiKey: string): Promise<string | null> {
  try {
    console.log('📤 Trying Imagen 3 as fallback (requires Vertex AI access)...')

    // Imagen 3 endpoint - note: may require Vertex AI, not standard Gemini API
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-002:predict`

    const requestBody = {
      instances: [{
        prompt: prompt
      }],
      parameters: {
        sampleCount: 1,
        aspectRatio: '1:1',
        personGeneration: 'allow_adult',
        safetySetting: 'block_few'
      }
    }

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey
      },
      body: JSON.stringify(requestBody)
    })

    if (!response.ok) {
      console.log('⚠️ Imagen 3 not available:', response.status, '(requires Vertex AI access)')
      // Don't log as error - Imagen typically requires Vertex AI, not standard Gemini API key
      return null
    }

    const result = await response.json()

    if (result.predictions && result.predictions[0]?.bytesBase64Encoded) {
      console.log('✅ Imagen 3 generated image successfully')
      // Upload to Supabase Storage (logo/branding via Gemini prompt)
      const processedImageUrl = await uploadProcessedImage(result.predictions[0].bytesBase64Encoded)
      return processedImageUrl
    }

    return null
  } catch (error) {
    console.log('⚠️ Imagen 3 generation failed:', error)
    return null
  }
}

/**
 * Upload processed image to Supabase Storage
 */
async function uploadProcessedImage(base64Image: string): Promise<string> {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

  // Convert base64 to Uint8Array
  const binaryString = atob(base64Image)
  const bytes = new Uint8Array(binaryString.length)
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i)
  }

  const fileName = `processed/${Date.now()}_${Math.random().toString(36).substring(7)}.jpg`

  const { data, error } = await supabase.storage
    .from('news-images')
    .upload(fileName, bytes, {
      contentType: 'image/jpeg',
      upsert: false
    })

  if (error) {
    console.error('Failed to upload processed image:', error.message, JSON.stringify(error))
    throw new Error('Failed to upload processed image')
  }

  // Get public URL
  const { data: urlData } = supabase.storage
    .from('news-images')
    .getPublicUrl(fileName)

  return urlData.publicUrl
}
