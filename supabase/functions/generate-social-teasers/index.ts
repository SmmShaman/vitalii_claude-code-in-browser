import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'
import { getRandomOpeningStyle } from '../_shared/opening-styles.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const AZURE_OPENAI_ENDPOINT = Deno.env.get('AZURE_OPENAI_ENDPOINT')
const AZURE_OPENAI_API_KEY = Deno.env.get('AZURE_OPENAI_API_KEY')

interface TeaserRequest {
  newsId?: string
  blogPostId?: string
  title: string
  content: string
  contentType?: 'news' | 'blog'  // Default: 'news'
  platform: 'linkedin' | 'facebook' | 'instagram' | 'twitter'
  language: 'en' | 'no' | 'ua'
}

type Platform = 'linkedin' | 'facebook' | 'instagram' | 'twitter'
type Language = 'en' | 'no' | 'ua'

const LANGUAGE_NAMES: Record<string, string> = {
  en: 'English',
  no: 'Norwegian (Bokmål)',
  ua: 'Ukrainian'
}

/**
 * Generate a unique social media teaser for a specific platform and language
 * Called ON-DEMAND when user clicks the social share button
 */
serve(async (req) => {
  // Version: 2025-01-18-02 - On-demand single teaser generation
  console.log('🎯 Generate Social Teaser v2025-01-18-02 started')
  console.log('📦 Features: On-demand, single platform/language, cached in DB')

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const requestData: TeaserRequest = await req.json()
    const {
      newsId,
      blogPostId,
      title,
      content,
      contentType = 'news',
      platform,
      language
    } = requestData

    const recordId = contentType === 'blog' ? blogPostId : newsId
    console.log(`🚀 Generating ${platform} teaser (${language}) for ${contentType} ID:`, recordId)
    console.log(`📰 Title: ${title.substring(0, 50)}...`)

    if (!AZURE_OPENAI_ENDPOINT || !AZURE_OPENAI_API_KEY) {
      throw new Error('Azure OpenAI not configured')
    }

    if (!platform || !language) {
      throw new Error('Platform and language are required')
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    // Check if teaser already exists in DB (cached)
    const tableName = contentType === 'blog' ? 'blog_posts' : 'news'
    const teaserField = `social_teaser_${platform}_${language}`

    const { data: existingRecord, error: fetchError } = await supabase
      .from(tableName)
      .select(teaserField)
      .eq('id', recordId)
      .single()

    if (fetchError) {
      console.error('Failed to fetch record:', fetchError)
      throw new Error(`Record not found: ${recordId}`)
    }

    // Return cached teaser if exists
    const cachedTeaser = existingRecord?.[teaserField]
    if (cachedTeaser) {
      console.log(`✅ Returning cached teaser for ${platform}_${language}`)
      return new Response(
        JSON.stringify({
          success: true,
          teaser: cachedTeaser,
          cached: true
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Fetch the prompt for this platform
    const promptType = `social_teaser_${platform}`
    const { data: prompts, error: promptError } = await supabase
      .from('ai_prompts')
      .select('*')
      .eq('prompt_type', promptType)
      .eq('is_active', true)
      .order('updated_at', { ascending: false })
      .limit(1)

    if (promptError || !prompts || prompts.length === 0) {
      console.error(`No prompt found for ${promptType}`)
      throw new Error(`No active prompt configured for ${platform}`)
    }

    const prompt = prompts[0]
    console.log(`📝 Using prompt: ${prompt.name}`)

    // Generate the teaser
    const teaser = await generateTeaser(
      prompt.prompt_text,
      title,
      content,
      language,
      platform
    )

    console.log(`✅ Generated ${platform}_${language}: ${teaser.substring(0, 50)}...`)

    // Save to database for caching
    const updateData: Record<string, any> = {
      [teaserField]: teaser
    }

    // Update teasers_generated_at only on first teaser
    const { data: currentRecord } = await supabase
      .from(tableName)
      .select('teasers_generated_at')
      .eq('id', recordId)
      .single()

    if (!currentRecord?.teasers_generated_at) {
      updateData.teasers_generated_at = new Date().toISOString()
    }

    const { error: updateError } = await supabase
      .from(tableName)
      .update(updateData)
      .eq('id', recordId)

    if (updateError) {
      console.error('Failed to save teaser:', updateError)
      // Don't fail the request - return teaser anyway
    } else {
      console.log(`💾 Teaser saved to ${tableName}.${teaserField}`)
    }

    // Update prompt usage count
    await supabase
      .from('ai_prompts')
      .update({ usage_count: (prompt.usage_count || 0) + 1 })
      .eq('id', prompt.id)

    return new Response(
      JSON.stringify({
        success: true,
        teaser,
        cached: false
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error: any) {
    console.error('❌ Error generating teaser:', error)
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

/**
 * Generate a teaser for a specific platform and language
 */
async function generateTeaser(
  promptTemplate: string,
  title: string,
  content: string,
  language: Language,
  platform: Platform
): Promise<string> {
  // Build the prompt
  const openingStyle = getRandomOpeningStyle('social')
  const prompt = promptTemplate
    .replace(/{title}/g, title)
    .replace(/{content}/g, content.substring(0, 3000)) // Limit content for context
    .replace(/{language}/g, LANGUAGE_NAMES[language] || language)
    + `\n\nOPENING STYLE DIRECTIVE (ОБОВ'ЯЗКОВО ДОТРИМУЙСЯ): ${openingStyle}`

  console.log(`🎲 Opening style for ${platform}: ${openingStyle}`)

  const azureUrl = `${AZURE_OPENAI_ENDPOINT}/openai/deployments/Jobbot-gpt-4.1-mini/chat/completions?api-version=2024-02-15-preview`

  const response = await fetch(azureUrl, {
    method: 'POST',
    headers: {
      'api-key': AZURE_OPENAI_API_KEY!,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      messages: [
        {
          role: 'system',
          content: `You are a social media copywriter specializing in ${platform}.
Write engaging, platform-appropriate teasers that make people want to click and read more.

CRITICAL RULES:
1. Write ONLY the teaser text. No JSON, no metadata, no explanations.
2. MINIMUM 2 paragraphs - this is mandatory!
3. Include emojis as specified in the prompt.
4. Output language: ${LANGUAGE_NAMES[language]}
5. Do NOT copy the article text - create intrigue!`
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.7, // More creative for social media
      max_tokens: 500   // Teasers should be short
    })
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Azure OpenAI error: ${response.status} - ${errorText}`)
  }

  const data = await response.json()
  const teaser = data.choices[0]?.message?.content?.trim()

  if (!teaser) {
    throw new Error('Empty response from AI')
  }

  return teaser
}
