import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const GOOGLE_API_KEY = Deno.env.get('GOOGLE_API_KEY')

interface ProcessImageRequest {
  imageUrl: string
  newsId?: string
  promptType?: 'enhance' | 'linkedin_optimize' | 'custom'
  customPrompt?: string
}

interface ProcessImageResponse {
  success: boolean
  processedImageUrl?: string
  originalImageUrl?: string
  error?: string
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
      promptType: requestData.promptType
    })

    if (!requestData.imageUrl) {
      throw new Error('Image URL is required')
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    // Get the prompt from database or use default
    let prompt = await getImagePrompt(supabase, requestData.promptType || 'linkedin_optimize')

    if (requestData.customPrompt) {
      prompt = requestData.customPrompt
    }

    console.log('📝 Using prompt:', prompt.substring(0, 100) + '...')

    // Download the original image
    const imageData = await downloadImage(requestData.imageUrl)
    console.log('📥 Downloaded image, size:', imageData.length, 'bytes')

    // Process image with AI
    const processedImageUrl = await processImageWithAI(imageData, prompt)

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
    linkedin_optimize: 'Optimize this image for LinkedIn: ensure professional appearance, good contrast, proper lighting, make colors vibrant but professional. The image should look great as a LinkedIn post thumbnail.',
    custom: 'Process this image to improve its quality.'
  }
  return prompts[promptType] || prompts.custom
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
 * Process image with Google Imagen API (or alternative)
 * This function can be adapted for different AI services
 */
async function processImageWithAI(imageBase64: string, prompt: string): Promise<string | null> {
  if (!GOOGLE_API_KEY) {
    console.log('⚠️ GOOGLE_API_KEY not configured')
    return null
  }

  try {
    // Google Imagen API endpoint
    // Note: Replace with actual Imagen/Vertex AI endpoint when available
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-001:predict`

    const requestBody = {
      instances: [
        {
          prompt: prompt,
          image: {
            bytesBase64Encoded: imageBase64
          }
        }
      ],
      parameters: {
        sampleCount: 1,
        aspectRatio: '16:9', // LinkedIn optimal ratio
        safetyFilterLevel: 'block_some',
        personGeneration: 'allow_adult'
      }
    }

    console.log('📤 Sending to Google Imagen API...')

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GOOGLE_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Google API error:', response.status, errorText)
      return null
    }

    const result = await response.json()
    console.log('📥 Google API response received')

    // Extract processed image from response
    if (result.predictions && result.predictions[0]?.bytesBase64Encoded) {
      // Upload processed image to Supabase Storage
      const processedImageUrl = await uploadProcessedImage(result.predictions[0].bytesBase64Encoded)
      return processedImageUrl
    }

    return null

  } catch (error: any) {
    console.error('Error calling Google API:', error)
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
    .from('images')
    .upload(fileName, bytes, {
      contentType: 'image/jpeg',
      upsert: false
    })

  if (error) {
    console.error('Failed to upload processed image:', error)
    throw new Error('Failed to upload processed image')
  }

  // Get public URL
  const { data: urlData } = supabase.storage
    .from('images')
    .getPublicUrl(fileName)

  return urlData.publicUrl
}
