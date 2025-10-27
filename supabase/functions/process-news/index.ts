import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { newsId, title, content, url } = await req.json()

    console.log('Processing news:', { newsId, title })

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get active AI prompt
    const { data: prompts, error: promptError } = await supabase
      .from('ai_prompts')
      .select('*')
      .eq('is_active', true)
      .eq('prompt_type', 'rewrite')
      .limit(1)

    if (promptError) throw promptError

    if (!prompts || prompts.length === 0) {
      throw new Error('No active AI prompt found. Please create one in Admin Panel → Settings → AI Prompts')
    }

    const prompt = prompts[0].prompt_text
      .replace('{title}', title || '')
      .replace('{content}', content || '')
      .replace('{url}', url || '')

    console.log('Using prompt:', prompts[0].name)

    // Azure OpenAI configuration
    const azureEndpoint = Deno.env.get('AZURE_OPENAI_ENDPOINT') ?? ''
    const azureApiKey = Deno.env.get('AZURE_OPENAI_API_KEY') ?? ''
    const deploymentName = 'gpt-4' // or your deployment name

    // Call Azure OpenAI API
    const azureUrl = `${azureEndpoint}/openai/deployments/${deploymentName}/chat/completions?api-version=2024-02-15-preview`

    console.log('Calling Azure OpenAI...')

    const openaiResponse = await fetch(azureUrl, {
      method: 'POST',
      headers: {
        'api-key': azureApiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        messages: [
          {
            role: 'system',
            content: 'You are a professional content rewriter and translator. Always respond with valid JSON only.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 2000
      })
    })

    if (!openaiResponse.ok) {
      const errorText = await openaiResponse.text()
      console.error('Azure OpenAI error:', errorText)
      throw new Error(`Azure OpenAI API error: ${openaiResponse.status} - ${errorText}`)
    }

    const openaiData = await openaiResponse.json()
    console.log('Azure OpenAI response received')

    // Parse the AI response
    let result
    try {
      const aiContent = openaiData.choices[0].message.content
      // Remove markdown code blocks if present
      const jsonContent = aiContent.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
      result = JSON.parse(jsonContent)
    } catch (parseError) {
      console.error('Failed to parse AI response:', openaiData.choices[0].message.content)
      throw new Error('Failed to parse AI response. Please check your AI prompt format.')
    }

    console.log('Saving to database...')

    // Save to database
    const { data: newsData, error: insertError } = await supabase
      .from('news')
      .insert({
        title_en: result.en?.title || title,
        title_no: result.no?.title || title,
        title_ua: result.ua?.title || title,
        content_en: result.en?.content || content,
        content_no: result.no?.content || content,
        content_ua: result.ua?.content || content,
        description_en: result.en?.description || result.en?.content?.substring(0, 150),
        description_no: result.no?.description || result.no?.content?.substring(0, 150),
        description_ua: result.ua?.description || result.ua?.content?.substring(0, 150),
        original_url: url,
        image_url: null, // TODO: Extract image from article
        tags: ['automated', 'ai-generated'],
        is_published: true,
        is_rewritten: true,
        published_at: new Date().toISOString()
      })
      .select()

    if (insertError) {
      console.error('Database insert error:', insertError)
      throw insertError
    }

    console.log('News saved successfully:', newsData[0].id)

    // Update usage count
    await supabase
      .from('ai_prompts')
      .update({ usage_count: prompts[0].usage_count + 1 })
      .eq('id', prompts[0].id)

    return new Response(
      JSON.stringify({
        success: true,
        newsId: newsData[0].id,
        result
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Process news error:', error)
    return new Response(
      JSON.stringify({
        error: error.message,
        details: error.toString()
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})
