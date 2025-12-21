import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const AZURE_OPENAI_ENDPOINT = Deno.env.get('AZURE_OPENAI_ENDPOINT')
const AZURE_OPENAI_API_KEY = Deno.env.get('AZURE_OPENAI_API_KEY')

interface FindSourceRequest {
  title: string
  content: string
  existingUrl?: string  // URL from Telegram post if any
}

interface FindSourceResponse {
  success: boolean
  sourceUrl: string | null
  sourceName: string | null
  confidence: 'high' | 'medium' | 'low'
  reason: string
}

/**
 * Find original source URL for news article using AI
 * Analyzes content and searches for the primary source
 */
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { title, content, existingUrl }: FindSourceRequest = await req.json()
    console.log('🔍 Finding source for:', title?.substring(0, 50))

    if (!AZURE_OPENAI_ENDPOINT || !AZURE_OPENAI_API_KEY) {
      throw new Error('Azure OpenAI not configured')
    }

    const azureUrl = `${AZURE_OPENAI_ENDPOINT}/openai/deployments/Jobbot-gpt-4.1-mini/chat/completions?api-version=2024-02-15-preview`

    const systemPrompt = `You are a research assistant that finds original sources for news articles.

Your task:
1. Analyze the article title and content
2. Identify the PRIMARY original source (company announcement, research paper, official blog, news agency)
3. Return the most likely original source URL

Rules:
- Prefer official sources: company blogs, press releases, research institutions
- If content mentions a specific company/product launch → find their official announcement
- If content is about research → find the paper or institution
- If content is general news → identify the original news agency
- DO NOT return social media links (Twitter, Facebook, Telegram, etc.)
- DO NOT return aggregator sites
- If you cannot determine the source with confidence, return null

Return JSON only:
{
  "sourceUrl": "https://...",
  "sourceName": "Company Blog / Research Paper / News Agency",
  "confidence": "high" | "medium" | "low",
  "reason": "Brief explanation"
}`

    const userPrompt = `Find the original source for this article:

TITLE: ${title}

CONTENT: ${content?.substring(0, 1500)}

${existingUrl ? `EXISTING URL (from Telegram): ${existingUrl}` : ''}

Return JSON with sourceUrl, sourceName, confidence, reason.`

    const response = await fetch(azureUrl, {
      method: 'POST',
      headers: {
        'api-key': AZURE_OPENAI_API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.3,
        max_tokens: 500
      })
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Azure OpenAI error:', errorText)
      throw new Error(`AI request failed: ${response.status}`)
    }

    const data = await response.json()
    const aiContent = data.choices[0]?.message?.content?.trim()

    console.log('AI response:', aiContent)

    // Parse JSON response
    const jsonMatch = aiContent.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      return new Response(
        JSON.stringify({
          success: true,
          sourceUrl: null,
          sourceName: null,
          confidence: 'low',
          reason: 'Could not parse AI response'
        } as FindSourceResponse),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const result = JSON.parse(jsonMatch[0])

    console.log(`✅ Source found: ${result.sourceUrl} (${result.confidence})`)

    return new Response(
      JSON.stringify({
        success: true,
        sourceUrl: result.sourceUrl || null,
        sourceName: result.sourceName || null,
        confidence: result.confidence || 'low',
        reason: result.reason || ''
      } as FindSourceResponse),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error: any) {
    console.error('❌ Error finding source:', error)
    return new Response(
      JSON.stringify({
        success: false,
        sourceUrl: null,
        sourceName: null,
        confidence: 'low',
        reason: error.message || 'Unknown error'
      } as FindSourceResponse),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
})
