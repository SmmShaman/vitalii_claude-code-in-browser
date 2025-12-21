import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const AZURE_OPENAI_ENDPOINT = Deno.env.get('AZURE_OPENAI_ENDPOINT')
const AZURE_OPENAI_API_KEY = Deno.env.get('AZURE_OPENAI_API_KEY')

interface GeneratePromptRequest {
  newsId: string
  title: string
  content: string
}

interface GeneratePromptResponse {
  success: boolean
  prompt?: string
  error?: string
}

/**
 * Generate image generation prompt for Google AI Studio (Gemini 3 Banana)
 * Creates a concise prompt that describes the essence of the news article
 * User will copy this prompt to Google AI Studio to generate custom images
 */
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const requestData: GeneratePromptRequest = await req.json()
    console.log('🎨 Generating image prompt for news:', requestData.newsId)

    if (!requestData.newsId || !requestData.title || !requestData.content) {
      throw new Error('Missing required fields: newsId, title, content')
    }

    if (!AZURE_OPENAI_ENDPOINT || !AZURE_OPENAI_API_KEY) {
      throw new Error('Azure OpenAI not configured')
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    // Generate image prompt using Azure OpenAI
    const imagePrompt = await generateImagePromptWithAI(requestData.title, requestData.content)

    if (!imagePrompt) {
      throw new Error('Failed to generate image prompt')
    }

    console.log('✅ Image prompt generated:', imagePrompt.substring(0, 100) + '...')

    // Save prompt to database
    const { error: updateError } = await supabase
      .from('news')
      .update({
        image_generation_prompt: imagePrompt,
        prompt_generated_at: new Date().toISOString()
      })
      .eq('id', requestData.newsId)

    if (updateError) {
      console.error('Failed to save prompt to database:', updateError)
      throw new Error('Failed to save prompt')
    }

    return new Response(
      JSON.stringify({
        success: true,
        prompt: imagePrompt
      } as GeneratePromptResponse),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error: any) {
    console.error('❌ Error generating image prompt:', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Unknown error'
      } as GeneratePromptResponse),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
})

/**
 * Generate image prompt using Azure OpenAI
 * Creates a concise, visual description of the article for image generation
 */
async function generateImagePromptWithAI(title: string, content: string): Promise<string | null> {
  try {
    // Azure OpenAI endpoint
    const azureUrl = `${AZURE_OPENAI_ENDPOINT}/openai/deployments/Jobbot-gpt-4.1-mini/chat/completions?api-version=2024-02-15-preview`

    const systemPrompt = `You are an expert at creating image generation prompts for AI art tools like Google Gemini, Midjourney, and DALL-E.

Your task is to create a SHORT, CONCISE image generation prompt that captures the ESSENCE of a news article. The prompt should:

1. Be 1-3 sentences maximum (max 200 characters)
2. Describe the KEY VISUAL CONCEPT of the article
3. Use descriptive, visual language
4. Be suitable for creating a professional illustration/image
5. Include style hints (e.g., "modern illustration", "professional graphic", "minimalist design")
6. NO text overlays - describe the visual content only

Example inputs and outputs:

Input: "Meta Unveils SAM Audio: A Breakthrough in AI-Powered Sound Recognition"
Output: "Professional illustration of audio waveforms transforming into colorful AI neural networks, modern tech style, vibrant blues and purples"

Input: "Scientists Discover New Exoplanet Similar to Earth"
Output: "Artistic rendering of a blue-green Earth-like planet with two suns in the background, space illustration style"

Input: "New AI Tool Helps Doctors Diagnose Diseases Faster"
Output: "Clean medical illustration showing AI brain analyzing patient data on futuristic holographic displays, professional healthcare aesthetic"`

    const userPrompt = `Article Title: ${title}

Article Content (first 500 chars): ${content.substring(0, 500)}

Generate a concise image generation prompt (1-3 sentences, max 200 characters):`

    const response = await fetch(azureUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': AZURE_OPENAI_API_KEY!
      },
      body: JSON.stringify({
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.7,
        max_tokens: 150
      })
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('❌ Azure OpenAI API error:', response.status, errorText)
      return null
    }

    const data = await response.json()
    const generatedPrompt = data.choices[0]?.message?.content?.trim()

    if (!generatedPrompt) {
      console.error('❌ No prompt in AI response')
      return null
    }

    // Ensure prompt is not too long (max 300 chars for safety)
    const finalPrompt = generatedPrompt.substring(0, 300)
    console.log('🎨 Generated prompt:', finalPrompt)

    return finalPrompt

  } catch (error: any) {
    console.error('❌ Error calling Azure OpenAI:', error)
    return null
  }
}
