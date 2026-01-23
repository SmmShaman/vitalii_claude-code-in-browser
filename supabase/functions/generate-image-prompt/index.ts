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

// Version for deployment verification
const VERSION = '2026-01-23-v3-no-text-prompts'

interface GeneratePromptRequest {
  newsId: string
  title: string
  content: string
}

interface GeneratePromptResponse {
  success: boolean
  prompt?: string
  classifierData?: ClassifierOutput
  templateUsed?: string
  error?: string
}

// Structured output from classifier
interface ClassifierOutput {
  company_name: string
  company_domain: string
  category: 'tech_product' | 'marketing_campaign' | 'ai_research' | 'business_news' | 'science' | 'lifestyle' | 'general'
  product_type: string
  key_features: string[]
  visual_elements: string[]
  visual_concept: string
  color_scheme: string
  style_hint: string
}

// Map category to template prompt_type
const CATEGORY_TO_TEMPLATE: Record<string, string> = {
  'tech_product': 'image_template_tech_product',
  'marketing_campaign': 'image_template_marketing_campaign',
  'ai_research': 'image_template_ai_research',
  'business_news': 'image_template_business_news',
  'science': 'image_template_science',
  'lifestyle': 'image_template_lifestyle',
  'general': 'image_template_general',
}

// Default colors for categories
const CATEGORY_COLORS: Record<string, { primary: string; secondary: string }> = {
  'tech_product': { primary: '#00E5FF', secondary: '#FF2D92' },
  'marketing_campaign': { primary: '#FF6B35', secondary: '#004E89' },
  'ai_research': { primary: '#7C3AED', secondary: '#00E5FF' },
  'business_news': { primary: '#0066CC', secondary: '#00AA55' },
  'science': { primary: '#10B981', secondary: '#3B82F6' },
  'lifestyle': { primary: '#F59E0B', secondary: '#EC4899' },
  'general': { primary: '#6366F1', secondary: '#8B5CF6' },
}

/**
 * Generate professional image prompt using two-step process:
 * 1. Classifier extracts structured data from article
 * 2. Template is filled with extracted data
 *
 * Based on awesome-nanobanana-pro methodology
 * https://github.com/ZeroLu/awesome-nanobanana-pro
 */
serve(async (req) => {
  console.log(`🎨 Generate Image Prompt ${VERSION} started`)

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const requestData: GeneratePromptRequest = await req.json()
    console.log('📝 Processing article:', requestData.title?.substring(0, 50) + '...')

    if (!requestData.newsId || !requestData.title || !requestData.content) {
      throw new Error('Missing required fields: newsId, title, content')
    }

    if (!AZURE_OPENAI_ENDPOINT || !AZURE_OPENAI_API_KEY) {
      throw new Error('Azure OpenAI not configured')
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    // STEP 1: Run classifier to extract structured data
    console.log('🔍 Step 1: Running classifier...')
    const classifierData = await runClassifier(supabase, requestData.title, requestData.content)

    if (!classifierData) {
      throw new Error('Classifier failed to extract data')
    }
    console.log('✅ Classifier result:', JSON.stringify(classifierData, null, 2))

    // STEP 2: Select template based on category
    console.log(`🎯 Step 2: Selecting template for category: ${classifierData.category}`)
    const templateType = CATEGORY_TO_TEMPLATE[classifierData.category] || 'image_template_general'
    const template = await getTemplate(supabase, templateType)

    if (!template) {
      console.warn(`⚠️ Template ${templateType} not found, using fallback`)
    }

    // STEP 3: Fill template with extracted data
    console.log('🔧 Step 3: Filling template with data...')
    const finalPrompt = fillTemplate(template || getDefaultTemplate(), classifierData)

    console.log('✅ Final prompt generated:', finalPrompt.substring(0, 200) + '...')

    // Save to database
    const { error: updateError } = await supabase
      .from('news')
      .update({
        image_generation_prompt: finalPrompt,
        prompt_generated_at: new Date().toISOString()
      })
      .eq('id', requestData.newsId)

    if (updateError) {
      console.error('Failed to save prompt to database:', updateError)
      throw new Error('Failed to save prompt')
    }

    // Increment usage count for classifier prompt
    await supabase.rpc('increment_prompt_usage', { prompt_type_param: 'image_classifier' }).catch(() => {})

    return new Response(
      JSON.stringify({
        success: true,
        prompt: finalPrompt,
        classifierData,
        templateUsed: templateType
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
 * Run AI classifier to extract structured data from article
 */
async function runClassifier(supabase: any, title: string, content: string): Promise<ClassifierOutput | null> {
  try {
    // Get classifier prompt from database
    const { data: promptData } = await supabase
      .from('ai_prompts')
      .select('prompt_text')
      .eq('prompt_type', 'image_classifier')
      .eq('is_active', true)
      .order('updated_at', { ascending: false })
      .limit(1)
      .single()

    if (!promptData?.prompt_text) {
      console.error('❌ Classifier prompt not found in database')
      return null
    }

    // Fill placeholders
    let classifierPrompt = promptData.prompt_text
    classifierPrompt = classifierPrompt.replace(/{title}/g, title)
    classifierPrompt = classifierPrompt.replace(/{content}/g, content.substring(0, 5000))

    // Call Azure OpenAI
    const azureUrl = `${AZURE_OPENAI_ENDPOINT}/openai/deployments/Jobbot-gpt-4.1-mini/chat/completions?api-version=2024-02-15-preview`

    const response = await fetch(azureUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': AZURE_OPENAI_API_KEY!
      },
      body: JSON.stringify({
        messages: [
          {
            role: 'system',
            content: 'You are a precise data extractor. Always respond with valid JSON only, no markdown formatting, no explanations.'
          },
          { role: 'user', content: classifierPrompt }
        ],
        temperature: 0.3, // Lower temperature for more consistent extraction
        max_tokens: 800
      })
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('❌ Azure OpenAI API error:', response.status, errorText)
      return null
    }

    const data = await response.json()
    let jsonString = data.choices[0]?.message?.content?.trim()

    if (!jsonString) {
      console.error('❌ No content in AI response')
      return null
    }

    // Clean up JSON if wrapped in markdown code blocks
    jsonString = jsonString.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()

    try {
      const parsed = JSON.parse(jsonString) as ClassifierOutput

      // Validate required fields
      if (!parsed.company_name || !parsed.category || !parsed.visual_concept) {
        console.error('❌ Missing required fields in classifier output')
        return null
      }

      // Normalize category
      if (!CATEGORY_TO_TEMPLATE[parsed.category]) {
        console.warn(`⚠️ Unknown category "${parsed.category}", defaulting to "general"`)
        parsed.category = 'general'
      }

      return parsed
    } catch (parseError) {
      console.error('❌ Failed to parse classifier JSON:', parseError, jsonString)
      return null
    }

  } catch (error: any) {
    console.error('❌ Error running classifier:', error)
    return null
  }
}

/**
 * Get template from database by prompt_type
 */
async function getTemplate(supabase: any, templateType: string): Promise<string | null> {
  try {
    const { data } = await supabase
      .from('ai_prompts')
      .select('prompt_text')
      .eq('prompt_type', templateType)
      .eq('is_active', true)
      .order('updated_at', { ascending: false })
      .limit(1)
      .single()

    return data?.prompt_text || null
  } catch {
    return null
  }
}

/**
 * Fill template with classifier data
 */
function fillTemplate(template: string, data: ClassifierOutput): string {
  let result = template

  // Get colors for category
  const colors = CATEGORY_COLORS[data.category] || CATEGORY_COLORS['general']

  // Basic replacements
  result = result.replace(/{company_name}/g, data.company_name || 'Brand')
  result = result.replace(/{company_domain}/g, data.company_domain || '')
  result = result.replace(/{product_type}/g, data.product_type || '')
  result = result.replace(/{visual_concept}/g, data.visual_concept || '')
  result = result.replace(/{color_scheme}/g, data.color_scheme || '')
  result = result.replace(/{style_hint}/g, data.style_hint || '')
  result = result.replace(/{color_primary}/g, colors.primary)
  result = result.replace(/{color_secondary}/g, colors.secondary)

  // Format visual elements as comma-separated list
  const visualElementsList = (data.visual_elements || []).join(', ')
  result = result.replace(/{visual_elements}/g, visualElementsList)

  // Format key features as bullet points for info blocks
  const keyFeaturesFormatted = (data.key_features || [])
    .map((f, i) => `□ "${f.toUpperCase()}"`)
    .join('\n')
  result = result.replace(/{key_features_formatted}/g, keyFeaturesFormatted)

  // Generic CTA
  result = result.replace(/{cta_text}/g, 'Learn More')

  return result
}

/**
 * Default fallback template if database is unavailable
 * NOTE: Gemini 2.5 Flash Image cannot render specific text reliably.
 * This template focuses on VISUAL CONCEPTS only, no exact text requests.
 */
function getDefaultTemplate(): string {
  return `Professional technology news illustration.

MAIN SUBJECT:
{visual_concept}

VISUAL ELEMENTS to include:
{visual_elements}

COMPOSITION:
- Central focus on the main visual concept
- Professional, editorial quality suitable for tech news
- Clean, modern aesthetic with balanced composition
- 4:5 aspect ratio (portrait orientation)

COLOR PALETTE:
- Primary accent: {color_primary}
- Secondary accent: {color_secondary}
- Professional gradient backgrounds

STYLE GUIDE:
- Photorealistic 3D rendering with soft lighting
- Subtle depth of field effect
- Abstract geometric elements in background
- High-end product photography aesthetic
- NO text, logos, or written words in the image
- Focus purely on visual storytelling

MOOD: Professional, innovative, forward-thinking technology`
}
