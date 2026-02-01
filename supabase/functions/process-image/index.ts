import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const VERSION = '2026-02-01-v1-date-logo'

// Logo URL for overlay
const LOGO_URL = 'https://vitalii.no/logo.png'

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
 */
async function handleTextToImageGeneration(supabase: any, newsId: string, language?: 'en' | 'no' | 'ua'): Promise<Response> {
  console.log('🎨 Starting text-to-image generation for news:', newsId, language ? `(language: ${language})` : '')

  // 1. Get news record with the stored prompt
  const { data: news, error: newsError } = await supabase
    .from('news')
    .select('id, image_generation_prompt, title_en, description_en, processed_image_url')
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

  // Check if we already have a processed image
  if (news.processed_image_url) {
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
    // Create a simple prompt from title if no stored prompt
    imagePrompt = `Create a professional, modern illustration for a LinkedIn article about: ${news.title_en || 'technology news'}.
Style: Clean, professional, tech-focused.
Aspect ratio: 1:1 square.
No text on the image.
Colors: Vibrant but professional.`
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
  console.log('🖼️ Calling Gemini 3 Pro Image for text-to-image generation... (version:', VERSION, ')', language ? `(language: ${language})` : '')
  const processedImageUrl = await generateImageFromText(imagePrompt, googleApiKey, language)

  if (!processedImageUrl) {
    console.log('❌ Image generation failed')
    return new Response(
      JSON.stringify({
        success: false,
        error: `Image generation failed: ${lastApiError || 'Unknown error'}`,
        debug: {
          version: VERSION,
          timestamp: new Date().toISOString(),
          lastApiError: lastApiError
        }
      } as ProcessImageResponse),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  // 5. Save to database
  const { error: updateError } = await supabase
    .from('news')
    .update({
      processed_image_url: processedImageUrl,
      image_processed_at: new Date().toISOString()
    })
    .eq('id', newsId)

  if (updateError) {
    console.error('⚠️ Failed to update news record:', updateError)
    // Still return success since image was generated
  }

  console.log('✅ Image generated and saved:', processedImageUrl)

  return new Response(
    JSON.stringify({
      success: true,
      processedImageUrl
    } as ProcessImageResponse),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

/**
 * Overlay logo on generated image using canvas
 * Places logo in bottom-right corner
 */
async function overlayLogo(imageBase64: string): Promise<string> {
  try {
    console.log('🖼️ Overlaying logo on image...')

    // Import canvas dynamically
    const { createCanvas, loadImage } = await import('https://deno.land/x/canvas@v1.4.2/mod.ts')

    // 1. Load generated image from base64
    const imageBuffer = Uint8Array.from(atob(imageBase64), c => c.charCodeAt(0))
    const generatedImage = await loadImage(imageBuffer)

    // 2. Load logo from URL (production site)
    console.log('📥 Loading logo from:', LOGO_URL)
    const logoResponse = await fetch(LOGO_URL)
    if (!logoResponse.ok) {
      console.log('⚠️ Failed to load logo, returning original image')
      return imageBase64
    }
    const logoBuffer = await logoResponse.arrayBuffer()
    const logo = await loadImage(new Uint8Array(logoBuffer))

    // 3. Create canvas and draw
    const canvas = createCanvas(generatedImage.width(), generatedImage.height())
    const ctx = canvas.getContext('2d')

    // Draw generated image
    ctx.drawImage(generatedImage, 0, 0)

    // Draw logo in bottom-right corner (small, ~50px)
    const logoSize = 50
    const padding = 15
    ctx.drawImage(
      logo,
      canvas.width - logoSize - padding,
      canvas.height - logoSize - padding,
      logoSize,
      logoSize
    )

    // 4. Export as base64 JPEG
    const dataUrl = canvas.toDataURL('image/jpeg', 0.95)
    const base64Result = dataUrl.replace('data:image/jpeg;base64,', '')

    console.log('✅ Logo overlay completed successfully')
    return base64Result

  } catch (error: any) {
    console.error('⚠️ Logo overlay failed:', error.message || error)
    console.log('📌 Returning original image without logo')
    // Return original if overlay fails
    return imageBase64
  }
}

/**
 * Generate image from text prompt using Gemini 3 Pro Image
 * This is the pure text-to-image generation (no reference image needed)
 */
// Store last API error for debugging
let lastApiError: string | null = null

async function generateImageFromText(prompt: string, apiKey: string, language?: 'en' | 'no' | 'ua'): Promise<string | null> {
  lastApiError = null

  try {
    console.log('📤 Generating image with Gemini 3 Pro Image (text-to-image)...')
    console.log('📝 Prompt length:', prompt.length, 'chars')
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

    // Language instructions for Gemini with correct date and vitalii.no branding
    const languageInstructions: Record<string, string> = {
      'ua': `IMPORTANT: All text on the image MUST be in Ukrainian language (Cyrillic script).
If you show a date, use ONLY this date: ${dateFormats['ua']}.
At the bottom of the image, add small text: "vitalii.no"`,
      'no': `IMPORTANT: All text on the image MUST be in Norwegian language (Latin script).
If you show a date, use ONLY this date: ${dateFormats['no']}.
At the bottom of the image, add small text: "vitalii.no"`,
      'en': `IMPORTANT: All text on the image MUST be in English language.
If you show a date, use ONLY this date: ${dateFormats['en']}.
At the bottom of the image, add small text: "vitalii.no"`
    }

    const langInstruction = language
      ? `\n\n${languageInstructions[language]}`
      : `\n\nNo text on the image except "vitalii.no" at the bottom.`

    // Gemini 3 Pro Image endpoint for text-to-image generation
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-pro-image-preview:generateContent`

    const requestBody = {
      contents: [{
        parts: [{
          text: `Generate an image based on this description. Make it professional, suitable for LinkedIn/Instagram. Aspect ratio: 1:1 square.${langInstruction}\n\nDescription: ${prompt}`
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
          // Overlay logo on the generated image
          const imageWithLogo = await overlayLogo(imageData.data)
          // Upload to Supabase Storage
          const processedImageUrl = await uploadProcessedImage(imageWithLogo)
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
          // Overlay logo on the generated image
          const imageWithLogo = await overlayLogo(imageData.data)
          // Upload processed image to Supabase Storage
          const processedImageUrl = await uploadProcessedImage(imageWithLogo)
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
      // Overlay logo on the generated image
      const imageWithLogo = await overlayLogo(result.predictions[0].bytesBase64Encoded)
      const processedImageUrl = await uploadProcessedImage(imageWithLogo)
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
