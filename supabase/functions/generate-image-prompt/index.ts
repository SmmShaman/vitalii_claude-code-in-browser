import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'
import { getRandomStylePrompt } from './style-prompts.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const AZURE_OPENAI_ENDPOINT = Deno.env.get('AZURE_OPENAI_ENDPOINT')
const AZURE_OPENAI_API_KEY = Deno.env.get('AZURE_OPENAI_API_KEY')

// Version for deployment verification
const VERSION = '2026-02-08-v11-surreal-style-first'

interface PromptVariant {
  label: string
  description: string
  stylePrompt?: string  // Random style used for this variant set
}

interface GeneratePromptRequest {
  newsId: string
  title: string
  content: string
  mode?: 'variants' | 'full'
  selectedVariant?: PromptVariant
}

interface GeneratePromptResponse {
  success: boolean
  prompt?: string
  variants?: PromptVariant[]
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
  core_idea: string
  visual_metaphor: string
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
    const mode = requestData.mode || 'full'
    console.log(`📝 Processing article (mode=${mode}):`, requestData.title?.substring(0, 50) + '...')

    if (!requestData.newsId || !requestData.title || !requestData.content) {
      throw new Error('Missing required fields: newsId, title, content')
    }

    if (!AZURE_OPENAI_ENDPOINT || !AZURE_OPENAI_API_KEY) {
      throw new Error('Azure OpenAI not configured')
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    // ═══════════════════════════════════════════════════════════════════
    // MODE: VARIANTS - Generate 4 visual concept options
    // ═══════════════════════════════════════════════════════════════════
    if (mode === 'variants') {
      console.log('🎨 Generating 4 visual concept variants...')
      const variants = await generateVariants(supabase, requestData.title, requestData.content)

      if (!variants || variants.length === 0) {
        throw new Error('Failed to generate visual concept variants')
      }

      // Save variants to database
      const { error: updateError } = await supabase
        .from('news')
        .update({
          image_prompt_variants: variants,
        })
        .eq('id', requestData.newsId)

      if (updateError) {
        console.error('Failed to save variants to database:', updateError)
        throw new Error('Failed to save variants')
      }

      console.log(`✅ ${variants.length} variants generated and saved`)

      return new Response(
        JSON.stringify({
          success: true,
          variants,
        } as GeneratePromptResponse),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // ═══════════════════════════════════════════════════════════════════
    // MODE: FULL - Generate complete image prompt (original flow)
    // ═══════════════════════════════════════════════════════════════════

    // ═══════════════════════════════════════════════════════════════════
    // LEVEL 1: Pre-Analyzer - Decide which approach to use
    // ═══════════════════════════════════════════════════════════════════
    console.log('🔮 Level 1: Running Pre-Analyzer to decide approach...')
    const preAnalysis = await runPreAnalyzer(supabase, requestData.title, requestData.content, requestData.selectedVariant)

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
        preAnalysis!,
        requestData.selectedVariant
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
async function runPreAnalyzer(supabase: any, title: string, content: string, selectedVariant?: PromptVariant): Promise<PreAnalyzerOutput | null> {
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

    // Add selected variant guidance if provided
    if (selectedVariant) {
      filledPrompt += `\n\n═══════════════════════════════════════
ОБРАНИЙ ВІЗУАЛЬНИЙ НАПРЯМОК (ОБОВ'ЯЗКОВО використай як основу):
═══════════════════════════════════════
Концепція: ${selectedVariant.label}
Опис: ${selectedVariant.description}

Базуй свій аналіз на цьому візуальному напрямку. visual_metaphor та core_idea мають відповідати обраній концепції.`
    }

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

═══════════════════════════════════════
РЕДАКТОРСЬКИЙ АНАЛІЗ (ОБОВ'ЯЗКОВО):
═══════════════════════════════════════

Визнач КЛЮЧОВУ ІДЕЮ статті:
- Це НЕ тема і НЕ факти. Це СУТЬ — що змінюється, що з чим конфліктує, що народжується.
- Формат: "X → Y" (трансформація), "X vs Y" (конфлікт), "X = Y" (несподіване порівняння)
- Приклади:
  * "Норвезький стартап виграв контракт" → "маленька риба перемагає океан"
  * "AI замінює програмістів" → "інструмент з'їдає свого творця"
  * "Highsoft отримав $40M" → "невидимий фундамент стає видимим"

Визнач ФІЗИЧНУ МЕТАФОРУ для ідеї:
- Категорії метафор:
  * АРХІТЕКТУРНА: мости, фундаменти, вежі, арки, руїни
  * ПРИРОДНА: коріння, ріки, кристали, вулкани, льодовики
  * КОНФЛІКТ: зіткнення, баланс, тиск, розрив, злам
  * СИСТЕМНА: механізми, потоки, мережі, ланцюги, орбіти
- Метафора має бути ФІЗИЧНОЮ (те що можна побачити і намалювати)
- НЕ абстрактна ("інновація"), а конкретна ("кристал що росте з тріщини в скелі")

Поверни JSON:
{
  "approach": "structured" | "creative" | "hero_image" | "artistic",
  "mood": "опис настрою (excited, serious, hopeful, dramatic...)",
  "complexity": "simple" | "medium" | "complex",
  "reason": "чому обрав цей підхід (1 речення)",
  "suggested_style": "конкретний стиль (cinematic, minimalist, vibrant...)",
  "color_mood": "теплі/холодні/нейтральні + головний колір",
  "key_emotion": "головна емоція яку має викликати зображення",
  "core_idea": "ключова ідея у форматі X → Y / X vs Y / X = Y",
  "visual_metaphor": "конкретна фізична метафора (1 речення)"
}`
}

/**
 * CREATIVE APPROACH: Generate unique prompt without templates
 */
async function generateCreativePrompt(
  supabase: any,
  title: string,
  content: string,
  preAnalysis: PreAnalyzerOutput,
  selectedVariant?: PromptVariant
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
    filledPrompt = filledPrompt.replace(/{core_idea}/g, preAnalysis.core_idea || 'Not provided')
    filledPrompt = filledPrompt.replace(/{visual_metaphor}/g, preAnalysis.visual_metaphor || 'Not provided')

    // Add selected variant guidance if provided
    if (selectedVariant) {
      filledPrompt += `\n\n═══════════════════════════════════════
SELECTED VISUAL CONCEPT (expand this into a detailed image prompt):
═══════════════════════════════════════
Concept: ${selectedVariant.label}
Description: ${selectedVariant.description}

Expand this surreal concept into a rich, detailed prompt. Keep the style scene as the dominant visual. Enrich with specific details, lighting, textures, and composition.`
      // No separate style section needed - style IS the description
    }

    // Call Azure OpenAI
    const azureUrl = `${AZURE_OPENAI_ENDPOINT}/openai/deployments/Jobbot-gpt-4.1-mini/chat/completions?api-version=2024-02-15-preview`

    const systemContent = selectedVariant
      ? `You are a surrealist image prompt writer. You receive a visual concept that combines a random style scene with an article keyword.

Your job: Expand this concept into a rich, detailed image generation prompt (150-250 words).

RULES:
- The concept IS the scene. Do NOT replace it with something "professional" or "editorial"
- PRESERVE the surreal, unexpected, scroll-stopping nature
- ADD: specific lighting, camera angle, lens, color palette, atmosphere details
- ADD: textures, materials, depth of field, composition
- KEEP the article keyword element prominent but natural
- Write in English
- Do NOT add people sitting at desks, office scenes, or stock-photo clichés`
      : `You are an editorial art director who thinks in METAPHORS, not scenes.
Your method: Idea → Metaphor → Tension → Style.

RULES:
- NEVER describe literal scenes (people in offices, meetings, screens, handshakes)
- NEVER use generic stock-photo compositions (group of people, person at laptop, city skyline)
- ALWAYS build on the provided core_idea and visual_metaphor from the pre-analysis
- Think architecturally: structures, mechanisms, forces, contrasts
- Add TENSION or MOVEMENT: growth, collision, balance, transformation, scale shift
- Give CONSTRAINTS not details: limit the palette, force asymmetry, demand one focal point
- Write in English. Be specific and visual.`

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
            content: systemContent
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
  return `You are creating an image prompt for a news article. Follow the EDITORIAL METHOD strictly.

ARTICLE:
{title}

{content}

PRE-ANALYSIS:
- Approach: {approach}
- Mood: {mood}
- Style: {suggested_style}
- Colors: {color_mood}
- Emotion: {key_emotion}
- Complexity: {complexity}
- Core Idea: {core_idea}
- Visual Metaphor: {visual_metaphor}

═══════════════════════════════════════
EDITORIAL METHOD — Follow these 4 steps:
═══════════════════════════════════════

STEP 1 — IDEA:
Take the core_idea from pre-analysis. If it's weak or missing, extract the ESSENCE yourself:
What is TRANSFORMING? What is in CONFLICT? What SURPRISING connection exists?
Format: "X → Y" or "X vs Y" or "X = Y"

STEP 2 — METAPHOR:
Take the visual_metaphor from pre-analysis and develop it into a CONCRETE visual image.
Make it PHYSICAL — something you can photograph or sculpt:
- Architecture: bridges, foundations, towers, arches, ruins, scaffolding
- Nature: roots, rivers, crystals, volcanoes, glaciers, tectonic plates
- Mechanisms: gears, pendulums, pressure valves, chain reactions
- Forces: collision, erosion, crystallization, magnetism, gravity

STEP 3 — TENSION / MOVEMENT:
Add ONE dynamic force to the metaphor:
- GROWTH: something emerging, sprouting, rising, expanding
- COLLISION: two forces meeting, friction, impact
- BALANCE: precarious equilibrium, tipping point
- TRANSFORMATION: melting, crystallizing, metamorphosis
- SCALE SHIFT: microscopic vs cosmic, detail vs panorama

STEP 4 — STYLE & CONSTRAINTS:
- Limit palette to 2-3 colors maximum
- Force ONE focal point (not a busy scene)
- Choose rendering: cinematic photography, architectural visualization, macro photography, or editorial illustration
- Add lighting direction and atmosphere

═══════════════════════════════════════
FORBIDDEN (never include):
═══════════════════════════════════════
- People sitting at desks, tables, or meetings
- Office scenes, conference rooms, coworking spaces
- Generic cityscapes or skylines
- Hands shaking, thumbs up, people pointing at screens
- Laptops, phones, or screens showing content
- Groups of smiling professionals
- Any stock-photo cliché composition

═══════════════════════════════════════
EXAMPLE:
═══════════════════════════════════════
Article: "Highsoft from Vik raises $40M for data visualization"
Core idea: "invisible infrastructure becomes visible"
Metaphor: "crystalline data structure rising from a fjord village"
Result: "A massive translucent crystalline structure emerges from between traditional Norwegian wooden houses in a narrow fjord valley. The crystal facets refract morning light into data-like patterns on the mountain walls. Fog rolls through the valley at the crystal's base. Cinematic wide shot, cool Nordic blue palette with warm amber refractions. Architectural visualization style, dramatic scale contrast between tiny village and towering crystal formation."

Write the image prompt in English (150-250 words):`
}

/**
 * Generate 4 visual concept variants for moderator to choose from
 */
async function generateVariants(supabase: any, title: string, content: string): Promise<PromptVariant[] | null> {
  try {
    // Pick a random style prompt to add unique visual direction
    const stylePrompt = getRandomStylePrompt()
    console.log(`🎨 Selected style prompt: ${stylePrompt.substring(0, 100)}...`)

    // Build prompt with style as PRIMARY and article for keyword extraction
    const filledPrompt = `STYLE SCENE (this is the PRIMARY visual, 70-80% of the image):
${stylePrompt}

ARTICLE (extract ONE keyword/concept to integrate):
Title: ${title}
Content: ${content.substring(0, 2000)}

Create 4 variants where the STYLE SCENE is the base, and one keyword from the article is naturally woven in as a recognizable element.

For each variant provide:
- label: short title (3-5 words, mentions both the style and article topic)
- description: scene description where style IS the base and article element is woven in naturally (2-3 sentences)

JSON array:`

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
            content: `You are a surrealist art director creating scroll-stopping viral images.
You receive TWO inputs:
1. STYLE SCENE — this is the PRIMARY visual (70-80% of the image). This IS the scene.
2. ARTICLE KEYWORD — ONE word/concept extracted from the article. This is the easter egg (20-30%).

Your job: Create 4 variants where the STYLE SCENE is the dominant visual, and the ARTICLE KEYWORD is naturally woven in as a recognizable element.

EXAMPLE:
Style: "baby yoda eating cheeseburger from McDonald's, hyper realistic..."
Article keyword: "Router" (from article about OpenRouter)
Result: "Hyperrealistic baby Yoda at McDonald's eating a cheeseburger. On the table next to him sits a glowing futuristic WiFi router projecting holographic AI model names into the air above. Same hyper-detailed style, same McDonald's setting, but with this one tech element that ties it to the article."

RULES:
- The style scene IS the image. Don't replace it.
- The article keyword should feel like a natural part of the scene, not forced
- Each variant should integrate the keyword DIFFERENTLY (as an object, background element, reflection, texture, etc.)
- Keep all technical quality parameters from the style prompt
- Respond ONLY with valid JSON array, no markdown formatting`
          },
          { role: 'user', content: filledPrompt }
        ],
        temperature: 0.8,
        max_tokens: 1500
      })
    })

    if (!response.ok) {
      console.error('❌ Variants API error:', response.status)
      return null
    }

    const data = await response.json()
    let jsonString = data.choices[0]?.message?.content?.trim()

    if (!jsonString) return null

    // Clean up JSON
    jsonString = jsonString.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()

    try {
      const parsed = JSON.parse(jsonString)

      // Validate it's an array of variants
      if (!Array.isArray(parsed) || parsed.length === 0) {
        console.error('❌ Variants response is not a valid array')
        return null
      }

      // Ensure exactly 4 variants, validate structure, store stylePrompt for reference
      const variants: PromptVariant[] = parsed
        .filter((v: any) => v.label && v.description)
        .slice(0, 4)
        .map((v: any) => ({
          label: String(v.label).substring(0, 50),
          description: String(v.description),
          stylePrompt: stylePrompt,
        }))

      if (variants.length < 2) {
        console.error('❌ Too few valid variants:', variants.length)
        return null
      }

      return variants
    } catch (parseError) {
      console.error('❌ Failed to parse variants JSON:', parseError)
      return null
    }
  } catch (error: any) {
    console.error('❌ Error generating variants:', error)
    return null
  }
}

/**
 * Default prompt for generating 4 visual concept variants
 */
function getDefaultVariantsPrompt(): string {
  return `Ти — арт-директор преміального новинного видання. Прочитай статтю та запропонуй 4 РІЗНИХ ФОТОРЕАЛІСТИЧНИХ 4K візуальних концепцій для ілюстрації.

СТАТТЯ:
Заголовок: {title}
Зміст: {content}

═══════════════════════════════════════
ОБОВ'ЯЗКОВІ ПРАВИЛА:
═══════════════════════════════════════
1. Кожна концепція ОБОВ'ЯЗКОВО має згадувати конкретні назви, компанії, продукти або технології зі статті
2. Всі 4 концепції — ФОТОРЕАЛІСТИЧНІ 4K сцени (кінематографічна якість, як зняте професійним фотографом)
3. ЗАБОРОНЕНО: абстрактні символи, прості ілюстрації, загальні образи без прив'язки до статті
4. Кожен опис має малювати конкретну візуальну сцену з освітленням, композицією та атмосферою

═══════════════════════════════════════
4 КАТЕГОРІЇ КОНЦЕПЦІЙ:
═══════════════════════════════════════
1. ФОТОРЕАЛІСТИЧНА МЕТАФОРА з продуктом/технологією — кінематографічна сцена де тема статті показана через потужну візуальну метафору. Обов'язково включити конкретну назву продукту/компанії.
2. ТЕХНОЛОГІЧНА/ІНДУСТРІАЛЬНА візуалізація — показати технологію, обладнання, інфраструктуру чи систему описану в статті. Фотореалістичний рендер реального продукту/технології.
3. КІНЕМАТОГРАФІЧНА ДРАМАТИЧНА сцена — editorial фотографія що передає ВПЛИВ чи НАСЛІДКИ описаного в статті. Людський масштаб, драматичне освітлення.
4. МАКРОЗЙОМКА ДЕТАЛІ — екстремальний крупний план ключового елементу зі статті. Мала глибина різкості, текстура та деталі предмета.

Для кожної концепції дай:
- label: короткий заголовок (3-5 слів, ОБОВ'ЯЗКОВО згадує тему статті)
- description: опис фотореалістичної сцени (2-3 речення з конкретними деталями, освітленням, ракурсом камери)

═══════════════════════════════════════
ПРИКЛАД (стаття про "OpenAI Trusted Access for Cyber"):
═══════════════════════════════════════
[
  {"label": "Кіберщит OpenAI метафора", "description": "Світний напівпрозорий захисний щит з логотипом OpenAI ширяє над величезною серверною кімнатою. Біло-блакитне світло заломлюється через щит, створюючи геометричні візерунки на темних серверних стійках. Кінематографічний широкий кут, холодна блакитна палітра з теплими бурштиновими акцентами від індикаторів."},
  {"label": "Центр кіберзахисту AI", "description": "Сучасний центр кібербезпеки з вигнутими дисплеями що показують карти загроз в реальному часі та візуалізації нейромережі OpenAI. Драматичне приглушене освітлення з екранами що відкидають блакитне сяйво на поліровані поверхні. Зйомка через плече оператора, 4K editorial фотографія."},
  {"label": "Архітектура цифрової фортеці", "description": "Фотореалістична архітектурна візуалізація масивного входу до дата-центру у вигляді футуристичних дверей сейфа з вигравіруваним написом OpenAI на матовій сталі. Ранковий туман оточує конструкцію. Кінематографічний ракурс з дрона, освітлення золотої години."},
  {"label": "Макрозйомка нейрочіпа", "description": "Екстремальна макрозйомка спеціалізованого AI чіпа безпеки з видимими нейронними шляхами що світяться блакитним. Мініатюрне лого OpenAI вигравіруване лазером на кремнієвому кристалі. Мала глибина різкості, темний фон, студійне освітлення."}
]

Повертай ТІЛЬКИ JSON масив:
[
  {"label": "...", "description": "..."},
  {"label": "...", "description": "..."},
  {"label": "...", "description": "..."},
  {"label": "...", "description": "..."}
]`
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
