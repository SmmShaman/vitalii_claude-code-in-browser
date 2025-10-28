import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const AZURE_OPENAI_ENDPOINT = Deno.env.get('AZURE_OPENAI_ENDPOINT')
const AZURE_OPENAI_API_KEY = Deno.env.get('AZURE_OPENAI_API_KEY')

interface PreModerationResult {
  approved: boolean
  reason: string
  is_advertisement: boolean
  is_duplicate: boolean
  quality_score: number
}

/**
 * Pre-moderate news post using AI before sending to Telegram bot
 * This filters out spam, advertisements, duplicates, and low-quality content
 */
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { title, content, url } = await req.json()

    console.log('🤖 AI Pre-moderation started for:', title?.substring(0, 50))

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    // Get active pre-moderation prompt
    const { data: prompts, error: promptError } = await supabase
      .from('ai_prompts')
      .select('*')
      .eq('is_active', true)
      .eq('prompt_type', 'pre_moderation')
      .limit(1)

    if (promptError) {
      console.error('Error fetching prompt:', promptError)
      throw promptError
    }

    if (!prompts || prompts.length === 0) {
      console.warn('⚠️ No active pre-moderation prompt found. Approving by default.')
      return new Response(
        JSON.stringify({
          approved: true,
          reason: 'No pre-moderation prompt configured',
          is_advertisement: false,
          is_duplicate: false,
          quality_score: 5
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check for duplicates in database
    const isDuplicate = await checkDuplicates(supabase, title)

    // If it's a duplicate, reject immediately without calling AI
    if (isDuplicate) {
      console.log('❌ Duplicate detected, rejecting without AI call')
      return new Response(
        JSON.stringify({
          approved: false,
          reason: 'Duplicate content detected in database',
          is_advertisement: false,
          is_duplicate: true,
          quality_score: 0
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Prepare AI prompt
    const prompt = prompts[0].prompt_text
      .replace('{title}', title || '')
      .replace('{content}', content || '')
      .replace('{url}', url || '')

    console.log('Using pre-moderation prompt:', prompts[0].name)

    // Call Azure OpenAI
    if (!AZURE_OPENAI_ENDPOINT || !AZURE_OPENAI_API_KEY) {
      console.warn('⚠️ Azure OpenAI not configured. Approving by default.')
      return new Response(
        JSON.stringify({
          approved: true,
          reason: 'AI not configured',
          is_advertisement: false,
          is_duplicate: false,
          quality_score: 5
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const azureUrl = `${AZURE_OPENAI_ENDPOINT}/openai/deployments/gpt-4/chat/completions?api-version=2024-02-15-preview`

    console.log('🤖 Calling Azure OpenAI for pre-moderation...')

    const openaiResponse = await fetch(azureUrl, {
      method: 'POST',
      headers: {
        'api-key': AZURE_OPENAI_API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        messages: [
          {
            role: 'system',
            content: 'You are a content moderator. Analyze posts and respond ONLY with valid JSON.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3, // Lower temperature for more consistent moderation
        max_tokens: 300
      })
    })

    if (!openaiResponse.ok) {
      const errorText = await openaiResponse.text()
      console.error('Azure OpenAI error:', errorText)
      // If AI fails, approve by default (fail-open strategy)
      return new Response(
        JSON.stringify({
          approved: true,
          reason: 'AI error, approved by default',
          is_advertisement: false,
          is_duplicate: false,
          quality_score: 5
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const aiResult = await openaiResponse.json()
    const aiContent = aiResult.choices[0].message.content

    console.log('AI response:', aiContent)

    // Parse AI response
    let moderationResult: PreModerationResult
    try {
      // Extract JSON from AI response (sometimes it adds markdown)
      const jsonMatch = aiContent.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        moderationResult = JSON.parse(jsonMatch[0])
      } else {
        moderationResult = JSON.parse(aiContent)
      }
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError)
      // If parsing fails, approve by default
      return new Response(
        JSON.stringify({
          approved: true,
          reason: 'AI response parsing error, approved by default',
          is_advertisement: false,
          is_duplicate: false,
          quality_score: 5
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(moderationResult.approved ? '✅ Approved' : '❌ Rejected:', moderationResult.reason)

    // Update AI prompt usage count
    await supabase
      .from('ai_prompts')
      .update({ usage_count: prompts[0].usage_count + 1 })
      .eq('id', prompts[0].id)

    return new Response(
      JSON.stringify(moderationResult),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error: any) {
    console.error('❌ Error in pre-moderation:', error)
    // Fail-open: if there's an error, approve by default
    return new Response(
      JSON.stringify({
        approved: true,
        reason: `Error: ${error.message}, approved by default`,
        is_advertisement: false,
        is_duplicate: false,
        quality_score: 5
      }),
      {
        status: 200, // Return 200 even on error to not break the pipeline
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
})

/**
 * Check if similar content exists in database
 */
async function checkDuplicates(supabase: any, title: string): Promise<boolean> {
  if (!title || title.length < 10) return false

  try {
    // Extract key words from title (words longer than 3 characters)
    const keywords = title
      .toLowerCase()
      .split(/\s+/)
      .filter(word => word.length > 3 && /^[a-zA-Zа-яА-ЯіїєґІЇЄҐ]+$/.test(word))
      .slice(0, 3) // Take first 3 significant words

    if (keywords.length === 0) return false

    // Search for posts with similar titles in last 30 days
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const { data, error } = await supabase
      .from('news')
      .select('id, title_en, original_title')
      .gte('created_at', thirtyDaysAgo.toISOString())
      .limit(100)

    if (error) {
      console.error('Error checking duplicates:', error)
      return false
    }

    if (!data || data.length === 0) return false

    // Check if any existing post has similar keywords
    for (const post of data) {
      const existingTitle = (post.title_en || post.original_title || '').toLowerCase()

      // Count matching keywords
      const matchCount = keywords.filter(keyword => existingTitle.includes(keyword)).length

      // If 2 or more keywords match, consider it a duplicate
      if (matchCount >= 2) {
        console.log(`Duplicate found: "${title}" similar to "${post.title_en || post.original_title}"`)
        return true
      }
    }

    return false
  } catch (error) {
    console.error('Error in checkDuplicates:', error)
    return false
  }
}
