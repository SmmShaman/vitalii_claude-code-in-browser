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
 * Get image generation prompt from database
 * Falls back to default if not found
 */
async function getImageGenerationPrompt(supabase: any): Promise<string> {
  try {
    const { data: prompt, error } = await supabase
      .from('ai_prompts')
      .select('prompt_text')
      .eq('prompt_type', 'image_generation')
      .eq('is_active', true)
      .order('updated_at', { ascending: false })
      .limit(1)
      .single()

    if (error || !prompt) {
      console.warn('⚠️ No active image_generation prompt found, using default')
      return getDefaultPrompt()
    }

    return prompt.prompt_text
  } catch (error) {
    console.error('Error fetching prompt from database:', error)
    return getDefaultPrompt()
  }
}

/**
 * Default fallback prompt if database is unavailable
 */
function getDefaultPrompt(): string {
  return `Подивися на статтю очима людини якій далека тема але при цьому щось їй ну дуже цікаво. Як ти вважаєш що саме було б цікаво цій людині? Яка картинка постала перед очима цієї людини? Напиши одне коротке речення на основі якого я б передав би художнику реалісту твоє бачення! Це може бути ілюстрація, фото реалістична картинка, футуристична, і тд. Стиль повинен бути максимально наближений до духу статті. Сам опис картини повинен бути детальним та зрозумілим з першого погляду навіть без тексту.

Ось стаття:

Заголовок: {title}

Текст: {content}

Твоє бачення (одне речення, max 200 символів):`
}

/**
 * Generate image prompt using Azure OpenAI
 * Creates a concise, visual description of the article for image generation
 */
async function generateImagePromptWithAI(title: string, content: string): Promise<string | null> {
  try {
    // Get prompt template from database
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    let promptTemplate = await getImageGenerationPrompt(supabase)

    // Replace placeholders with actual content
    promptTemplate = promptTemplate.replace(/{title}/g, title)
    // Provide more context (5000 chars) for better AI understanding
    promptTemplate = promptTemplate.replace(/{content}/g, content.substring(0, 5000))

    // Azure OpenAI endpoint
    const azureUrl = `${AZURE_OPENAI_ENDPOINT}/openai/deployments/Jobbot-gpt-4.1-mini/chat/completions?api-version=2024-02-15-preview`

    const userPrompt = promptTemplate

    const response = await fetch(azureUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': AZURE_OPENAI_API_KEY!
      },
      body: JSON.stringify({
        messages: [
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
