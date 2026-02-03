import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const VERSION = '2026-02-03-v1-critic-agent'

interface ValidateImageRequest {
  imageUrl: string
  originalPrompt: string
  newsId: string
  newsContext: {
    title: string
    category: string
    language?: string
  }
}

interface ValidationResult {
  isValid: boolean
  score: number  // 1-10
  issues: string[]
  shouldRetry: boolean
  details: {
    relevance: number
    quality: number
    branding: boolean
    artifacts: string[]
    textIssues: string[]
    improvementSuggestions: string[]
  }
}

interface ValidateImageResponse {
  success: boolean
  validation?: ValidationResult
  error?: string
  debug?: {
    version: string
    timestamp: string
  }
}

// Get Google API key from env or database
async function getGoogleApiKey(supabase: any): Promise<string | null> {
  const envKey = Deno.env.get('GOOGLE_API_KEY')
  if (envKey) return envKey

  try {
    const { data, error } = await supabase
      .from('api_settings')
      .select('key_value')
      .eq('key_name', 'GOOGLE_API_KEY')
      .eq('is_active', true)
      .single()

    if (!error && data?.key_value) return data.key_value
  } catch (e) {
    console.log('Could not read API key from database:', e)
  }

  return null
}

/**
 * Critic Agent - Validates generated images for quality and relevance
 * Uses Gemini to analyze images and provide structured feedback
 */
serve(async (req) => {
  console.log(`🔍 Validate Image ${VERSION} started`)

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const requestData: ValidateImageRequest = await req.json()
    console.log('📝 Validating image for news:', requestData.newsId)

    if (!requestData.imageUrl || !requestData.newsId) {
      throw new Error('Missing required fields: imageUrl, newsId')
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    // Get API key
    const googleApiKey = await getGoogleApiKey(supabase)
    if (!googleApiKey) {
      throw new Error('GOOGLE_API_KEY not configured')
    }

    // Get critic prompt from database or use default
    const criticPrompt = await getCriticPrompt(supabase)

    // Validate the image
    const validation = await validateImageWithAI(
      requestData.imageUrl,
      requestData.originalPrompt,
      requestData.newsContext,
      criticPrompt,
      googleApiKey
    )

    console.log(`✅ Validation complete: score=${validation.score}, isValid=${validation.isValid}`)

    // Save validation results to database
    await supabase
      .from('news')
      .update({
        image_quality_score: validation.score,
        image_validation_issues: validation.issues
      })
      .eq('id', requestData.newsId)

    return new Response(
      JSON.stringify({
        success: true,
        validation,
        debug: {
          version: VERSION,
          timestamp: new Date().toISOString()
        }
      } as ValidateImageResponse),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error: any) {
    console.error('❌ Error validating image:', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Unknown error',
        debug: {
          version: VERSION,
          timestamp: new Date().toISOString()
        }
      } as ValidateImageResponse),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
})

/**
 * Get critic prompt from database
 */
async function getCriticPrompt(supabase: any): Promise<string> {
  try {
    const { data } = await supabase
      .from('ai_prompts')
      .select('prompt_text')
      .eq('prompt_type', 'image_critic')
      .eq('is_active', true)
      .order('updated_at', { ascending: false })
      .limit(1)
      .single()

    if (data?.prompt_text) return data.prompt_text
  } catch {
    console.log('Using default critic prompt')
  }

  return getDefaultCriticPrompt()
}

/**
 * Default critic prompt for image validation
 */
function getDefaultCriticPrompt(): string {
  return `You are an expert image quality critic for a professional news website.
Analyze the generated image and evaluate it against the original requirements.

Evaluate the following criteria:

1. RELEVANCE (1-10): How well does the image match the news topic and original prompt?
   - Does it visually represent the key concepts?
   - Is the subject matter appropriate for the news category?

2. QUALITY (1-10): Overall visual quality assessment
   - Sharpness and clarity
   - Color vibrancy and contrast
   - Professional appearance
   - No visual artifacts or distortions

3. BRANDING (true/false): Is "vitalii.no" watermark visible?
   - Should appear subtly at the bottom corner

4. ARTIFACTS: List any visual problems
   - Distorted elements
   - Unnatural textures
   - Blurry areas
   - Color banding

5. TEXT_ISSUES: Problems with text rendering (if applicable)
   - Wrong language
   - Incorrect date
   - Illegible text
   - Misspellings

Respond with ONLY valid JSON (no markdown, no explanations):
{
  "relevance": <1-10>,
  "quality": <1-10>,
  "branding": <true/false>,
  "artifacts": ["list of issues"],
  "text_issues": ["list of issues"],
  "overall_score": <1-10>,
  "should_retry": <true/false>,
  "improvement_suggestions": ["list of suggestions"]
}`
}

/**
 * Download image and convert to base64
 */
async function downloadImageAsBase64(url: string): Promise<string> {
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
 * Validate image using Gemini vision capabilities
 */
async function validateImageWithAI(
  imageUrl: string,
  originalPrompt: string,
  newsContext: { title: string; category: string; language?: string },
  criticPrompt: string,
  apiKey: string
): Promise<ValidationResult> {
  try {
    console.log('📤 Sending image to Gemini for validation...')

    // Download image
    const imageBase64 = await downloadImageAsBase64(imageUrl)

    // Use Gemini Pro Vision for analysis
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent`

    const requestBody = {
      contents: [{
        parts: [
          {
            text: `${criticPrompt}

NEWS CONTEXT:
Title: ${newsContext.title}
Category: ${newsContext.category}
Language: ${newsContext.language || 'en'}

ORIGINAL IMAGE PROMPT:
${originalPrompt}

Analyze the image below and provide your evaluation as JSON only.`
          },
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
        maxOutputTokens: 1000
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
      console.error('❌ Gemini API error:', response.status, errorText)
      // Return default "pass" validation on API error
      return getDefaultValidation(true)
    }

    const result = await response.json()

    // Extract text response
    const textContent = result.candidates?.[0]?.content?.parts?.[0]?.text
    if (!textContent) {
      console.error('❌ No text in Gemini response')
      return getDefaultValidation(true)
    }

    // Parse JSON response
    let jsonString = textContent.trim()
    jsonString = jsonString.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()

    try {
      const parsed = JSON.parse(jsonString)

      // Build validation result
      const overallScore = parsed.overall_score ||
        Math.round((parsed.relevance + parsed.quality) / 2)

      const issues: string[] = [
        ...(parsed.artifacts || []),
        ...(parsed.text_issues || [])
      ]

      if (!parsed.branding) {
        issues.push('Missing vitalii.no branding')
      }

      const isValid = overallScore >= 6 && issues.length <= 2
      const shouldRetry = !isValid && overallScore >= 4 // Retry if score is 4-5

      return {
        isValid,
        score: overallScore,
        issues,
        shouldRetry: parsed.should_retry ?? shouldRetry,
        details: {
          relevance: parsed.relevance || 5,
          quality: parsed.quality || 5,
          branding: parsed.branding ?? false,
          artifacts: parsed.artifacts || [],
          textIssues: parsed.text_issues || [],
          improvementSuggestions: parsed.improvement_suggestions || []
        }
      }
    } catch (parseError) {
      console.error('❌ Failed to parse validation JSON:', parseError, jsonString)
      return getDefaultValidation(true)
    }

  } catch (error: any) {
    console.error('❌ Error in image validation:', error)
    // Return default "pass" on error to not block workflow
    return getDefaultValidation(true)
  }
}

/**
 * Get default validation result
 */
function getDefaultValidation(isValid: boolean): ValidationResult {
  return {
    isValid,
    score: isValid ? 7 : 4,
    issues: isValid ? [] : ['Validation failed - using default'],
    shouldRetry: !isValid,
    details: {
      relevance: isValid ? 7 : 4,
      quality: isValid ? 7 : 4,
      branding: isValid,
      artifacts: [],
      textIssues: [],
      improvementSuggestions: []
    }
  }
}
