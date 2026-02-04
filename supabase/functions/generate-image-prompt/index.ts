import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const AZURE_OPENAI_ENDPOINT = Deno.env.get('AZURE_OPENAI_ENDPOINT')
const AZURE_OPENAI_API_KEY = Deno.env.get('AZURE_OPENAI_API_KEY')

// Version for deployment verification
const VERSION = '2026-02-04-v5-adaptive-style'

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
  approach?: string
  error?: string
}

// Pre-Analyzer output - decides which approach to use
interface PreAnalyzerOutput {
  approach: 'structured' | 'creative' | 'hero_image' | 'artistic'
  mood: string
  complexity: 'simple' | 'medium' | 'complex'
  reason: string
  suggested_style: string
  color_mood: string
  key_emotion: string
}

// Structured output from classifier (for structured approach)
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
 * Generate professional image prompt using ADAPTIVE two-level process:
 *
 * LEVEL 1: Pre-Analyzer decides WHICH approach to use
 * LEVEL 2: Either use structured templates OR generate creative unique prompt
 *
 * This provides variety - not all images will be infographics!
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

    // ═══════════════════════════════════════════════════════════════════
    // LEVEL 1: Pre-Analyzer - Decide which approach to use
    // ═══════════════════════════════════════════════════════════════════
    console.log('🔮 Level 1: Running Pre-Analyzer to decide approach...')
    const preAnalysis = await runPreAnalyzer(supabase, requestData.title, requestData.content)

    if (!preAnalysis) {
      console.warn('⚠️ Pre-Analyzer failed, defaulting to structured approach')
    }

    const approach = preAnalysis?.approach || 'structured'
    console.log(`✅ Pre-Analyzer decision: ${approach} (${preAnalysis?.reason || 'default'})`)

    let finalPrompt: string
    let classifierData: ClassifierOutput | null = null
    let templateUsed: string | null = null

    // ═══════════════════════════════════════════════════════════════════
    // LEVEL 2: Execute chosen approach
    // ═══════════════════════════════════════════════════════════════════
    if (approach === 'structured') {
      // STRUCTURED APPROACH: Use classifier + templates (for complex/data-heavy news)
      console.log('📊 Level 2: Using STRUCTURED approach (classifier + template)')

      classifierData = await runClassifier(supabase, requestData.title, requestData.content)
      if (!classifierData) {
        throw new Error('Classifier failed to extract data')
      }

      templateUsed = CATEGORY_TO_TEMPLATE[classifierData.category] || 'image_template_general'
      const template = await getTemplate(supabase, templateUsed)
      finalPrompt = fillTemplate(template || getDefaultTemplate(), classifierData)

    } else {
      // CREATIVE APPROACH: Generate unique prompt (for simple/emotional news)
      console.log(`🎨 Level 2: Using CREATIVE approach (${approach})`)

      finalPrompt = await generateCreativePrompt(
        supabase,
        requestData.title,
        requestData.content,
        preAnalysis!
      )

      if (!finalPrompt) {
        // Fallback to structured if creative fails
        console.warn('⚠️ Creative prompt generation failed, falling back to structured')
        classifierData = await runClassifier(supabase, requestData.title, requestData.content)
        if (classifierData) {
          templateUsed = CATEGORY_TO_TEMPLATE[classifierData.category] || 'image_template_general'
          const template = await getTemplate(supabase, templateUsed)
          finalPrompt = fillTemplate(template || getDefaultTemplate(), classifierData)
        } else {
          throw new Error('Both creative and structured approaches failed')
        }
      }
    }

    console.log('✅ Final prompt generated:', finalPrompt.substring(0, 200) + '...')

    // Save to database with approach metadata
    const { error: updateError } = await supabase
      .from('news')
      .update({
        image_generation_prompt: finalPrompt,
        prompt_generated_at: new Date().toISOString(),
        // Store approach for analytics (if column exists)
      })
      .eq('id', requestData.newsId)

    if (updateError) {
      console.error('Failed to save prompt to database:', updateError)
      throw new Error('Failed to save prompt')
    }

    // Increment usage count
    const promptTypeUsed = approach === 'structured' ? 'image_classifier' : 'image_creative_writer'
    try {
      await supabase.rpc('increment_prompt_usage', { prompt_type_param: promptTypeUsed })
    } catch (e) {
      // Ignore RPC errors
    }

    return new Response(
      JSON.stringify({
        success: true,
        prompt: finalPrompt,
        classifierData,
        templateUsed,
        approach
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
 * LEVEL 1: Pre-Analyzer
 * Analyzes the article and decides which image generation approach to use
 */
async function runPreAnalyzer(supabase: any, title: string, content: string): Promise<PreAnalyzerOutput | null> {
  try {
    // Get pre-analyzer prompt from database
    const { data: promptData } = await supabase
      .from('ai_prompts')
      .select('prompt_text')
      .eq('prompt_type', 'image_pre_analyzer')
      .eq('is_active', true)
      .order('updated_at', { ascending: false })
      .limit(1)
      .single()

    // Use default prompt if not found in database
    const preAnalyzerPrompt = promptData?.prompt_text || getDefaultPreAnalyzerPrompt()

    // Fill placeholders
    let filledPrompt = preAnalyzerPrompt
    filledPrompt = filledPrompt.replace(/{title}/g, title)
    filledPrompt = filledPrompt.replace(/{content}/g, content.substring(0, 3000))

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
            content: 'You are a visual content strategist. Analyze articles and decide the best image approach. Respond with valid JSON only.'
          },
          { role: 'user', content: filledPrompt }
        ],
        temperature: 0.4,
        max_tokens: 500
      })
    })

    if (!response.ok) {
      console.error('❌ Pre-Analyzer API error:', response.status)
      return null
    }

    const data = await response.json()
    let jsonString = data.choices[0]?.message?.content?.trim()

    if (!jsonString) return null

    // Clean up JSON
    jsonString = jsonString.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()

    try {
      const parsed = JSON.parse(jsonString) as PreAnalyzerOutput

      // Validate approach value
      const validApproaches = ['structured', 'creative', 'hero_image', 'artistic']
      if (!validApproaches.includes(parsed.approach)) {
        parsed.approach = 'creative' // Default to creative for variety
      }

      return parsed
    } catch (parseError) {
      console.error('❌ Failed to parse Pre-Analyzer JSON:', parseError)
      return null
    }

  } catch (error: any) {
    console.error('❌ Error running Pre-Analyzer:', error)
    return null
  }
}

/**
 * Default Pre-Analyzer prompt (used if not in database)
 */
function getDefaultPreAnalyzerPrompt(): string {
  return `Проаналізуй цю новину і визнач НАЙКРАЩИЙ підхід для створення зображення.

НОВИНА:
Заголовок: {title}
Зміст: {content}

ВИБЕРИ ОДИН ПІДХІД:

1. "structured" - ІНФОГРАФІКА (використовуй ТІЛЬКИ якщо):
   - Багато цифр, статистики, порівнянь, графіків
   - Складний технічний процес що потребує пояснення
   - Список 5+ функцій/особливостей продукту
   - Фінансові звіти, дослідження з даними

2. "creative" - УНІКАЛЬНЕ ЗОБРАЖЕННЯ (використовуй якщо):
   - Проста новина про анонс/подію
   - Емоційний контент без складних даних
   - Можна передати суть одним яскравим образом

3. "hero_image" - ФОТО-РЕАЛІСТИЧНЕ (використовуй якщо):
   - Подорожі, lifestyle, їжа
   - Фізичний продукт який можна показати
   - Реальні люди, місця, події

4. "artistic" - ХУДОЖНЯ ІЛЮСТРАЦІЯ (використовуй якщо):
   - Абстрактні концепції (AI, майбутнє, ідеї)
   - Філософські/культурні теми
   - Коли потрібна метафора

Поверни JSON:
{
  "approach": "structured" | "creative" | "hero_image" | "artistic",
  "mood": "опис настрою (excited, serious, hopeful, dramatic...)",
  "complexity": "simple" | "medium" | "complex",
  "reason": "чому обрав цей підхід (1 речення)",
  "suggested_style": "конкретний стиль (cinematic, minimalist, vibrant...)",
  "color_mood": "теплі/холодні/нейтральні + головний колір",
  "key_emotion": "головна емоція яку має викликати зображення"
}`
}

/**
 * CREATIVE APPROACH: Generate unique prompt without templates
 */
async function generateCreativePrompt(
  supabase: any,
  title: string,
  content: string,
  preAnalysis: PreAnalyzerOutput
): Promise<string | null> {
  try {
    // Get creative writer prompt from database
    const { data: promptData } = await supabase
      .from('ai_prompts')
      .select('prompt_text')
      .eq('prompt_type', 'image_creative_writer')
      .eq('is_active', true)
      .order('updated_at', { ascending: false })
      .limit(1)
      .single()

    // Use default prompt if not found
    const creativePrompt = promptData?.prompt_text || getDefaultCreativeWriterPrompt()

    // Fill placeholders
    let filledPrompt = creativePrompt
    filledPrompt = filledPrompt.replace(/{title}/g, title)
    filledPrompt = filledPrompt.replace(/{content}/g, content.substring(0, 2000))
    filledPrompt = filledPrompt.replace(/{approach}/g, preAnalysis.approach)
    filledPrompt = filledPrompt.replace(/{mood}/g, preAnalysis.mood)
    filledPrompt = filledPrompt.replace(/{suggested_style}/g, preAnalysis.suggested_style)
    filledPrompt = filledPrompt.replace(/{color_mood}/g, preAnalysis.color_mood)
    filledPrompt = filledPrompt.replace(/{key_emotion}/g, preAnalysis.key_emotion)
    filledPrompt = filledPrompt.replace(/{complexity}/g, preAnalysis.complexity)

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
            content: `You are a master visual storyteller and image prompt engineer.
Create vivid, specific, unique image descriptions that capture the essence and emotion of news articles.
Write in English. Be creative, avoid clichés and generic descriptions.
Focus on VISUAL STORYTELLING - describe what we SEE, not what we read.`
          },
          { role: 'user', content: filledPrompt }
        ],
        temperature: 0.7, // Higher temperature for creativity
        max_tokens: 800
      })
    })

    if (!response.ok) {
      console.error('❌ Creative Writer API error:', response.status)
      return null
    }

    const data = await response.json()
    const generatedPrompt = data.choices[0]?.message?.content?.trim()

    if (!generatedPrompt) return null

    // Add quality boost and branding to the creative prompt
    const qualityBoost = `

QUALITY REQUIREMENTS (MANDATORY):
- Ultra high resolution, 8K quality
- Vibrant colors with professional contrast
- Sharp details, no blur or artifacts
- Professional lighting with depth
- 1:1 square aspect ratio for social media

BRANDING (MANDATORY):
- Add small "vitalii.no" watermark text in the bottom right corner
- The watermark should be subtle but readable`

    return generatedPrompt + qualityBoost

  } catch (error: any) {
    console.error('❌ Error generating creative prompt:', error)
    return null
  }
}

/**
 * Default Creative Writer prompt (used if not in database)
 */
function getDefaultCreativeWriterPrompt(): string {
  return `Ти - експерт з візуального сторітелінгу. Створи УНІКАЛЬНИЙ промпт для генерації зображення.

НОВИНА:
{title}

{content}

АНАЛІЗ ВІД PRE-ANALYZER:
- Підхід: {approach}
- Настрій: {mood}
- Стиль: {suggested_style}
- Кольори: {color_mood}
- Емоція: {key_emotion}
- Складність: {complexity}

ТВОЄ ЗАВДАННЯ:
Напиши детальний промпт для генерації зображення (150-250 слів).

ОБОВ'ЯЗКОВІ ПРАВИЛА:
1. НЕ використовуй слова "infographic", "poster", "diagram" (якщо підхід не structured)
2. Опиши КОНКРЕТНУ сцену або образ, не абстрактні поняття
3. Включи деталі: освітлення, кут камери, текстури, атмосферу
4. Передай ЕМОЦІЮ новини через візуальні елементи
5. Будь специфічним: замість "красивий пейзаж" - "золотиста година на норвезьких фіордах з туманом над водою"
6. Уникай кліше та загальних фраз

СТРУКТУРА ПРОМПТУ:
- Головний об'єкт/сцена (що ми бачимо в центрі)
- Деталі та елементи (що оточує головний об'єкт)
- Атмосфера та освітлення
- Кольорова палітра
- Стиль рендерингу (photorealistic, 3D, illustration, cinematic)

Напиши промпт англійською мовою:`
}

/**
 * Run AI classifier to extract structured data from article
 * (Used only for STRUCTURED approach)
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
        temperature: 0.3,
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
- 1:1 aspect ratio (square)

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

QUALITY BOOST (MANDATORY):
- Ultra high resolution, 8K quality rendering
- Vibrant saturated colors with high contrast
- Sharp crisp details, absolutely no blur or artifacts
- Professional studio lighting with soft shadows
- Rich color depth and dynamic range
- Photorealistic textures and materials

MOOD: Professional, innovative, forward-thinking technology`
}
