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

interface NewsRewriteRequest {
  newsId: string
  title: string
  content: string
  url?: string
  imageUrl?: string | null
  videoUrl?: string | null
  videoType?: string | null
}

/**
 * Process and publish news article
 * Rewrites content in objective journalistic style
 */
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const requestData: NewsRewriteRequest = await req.json()
    console.log('🚀 Processing news for newsId:', requestData.newsId)

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    // Get news rewrite prompt from database
    const { data: prompts, error: promptError } = await supabase
      .from('ai_prompts')
      .select('*')
      .eq('is_active', true)
      .eq('prompt_type', 'news_rewrite')
      .limit(1)

    if (promptError || !prompts || prompts.length === 0) {
      console.warn('⚠️ No active news rewrite prompt found, using default behavior')
      // If no prompt, just publish as-is
      await supabase
        .from('news')
        .update({
          is_published: true,
          is_rewritten: false,
          published_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', requestData.newsId)

      return new Response(
        JSON.stringify({
          success: true,
          message: 'News published without AI rewrite (no prompt configured)'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const newsPrompt = prompts[0]
    console.log('Using news rewrite prompt:', newsPrompt.name)

    if (!AZURE_OPENAI_ENDPOINT || !AZURE_OPENAI_API_KEY) {
      throw new Error('Azure OpenAI not configured')
    }

    // Build prompt
    const systemPrompt = newsPrompt.prompt_text
      .replace('{title}', requestData.title)
      .replace('{content}', requestData.content)
      .replace('{url}', requestData.url || '')

    console.log('📝 Rewriting news with AI...')

    // Call Azure OpenAI for each language
    const languages = ['en', 'ua', 'no']
    const rewrittenContent: { [key: string]: { title: string; content: string; description: string } } = {}

    for (const lang of languages) {
      const langName = lang === 'en' ? 'English' : lang === 'ua' ? 'Ukrainian' : 'Norwegian'
      const langPrompt = `${systemPrompt}\n\nPlease rewrite this content in ${langName} in objective journalistic style. Return ONLY a JSON object with this structure:\n{\n  "title": "news title (max 120 chars)",\n  "content": "full news article content",\n  "description": "short summary for SEO (max 200 chars)"\n}`

      const azureUrl = `${AZURE_OPENAI_ENDPOINT}/openai/deployments/Jobbot-gpt-4.1-mini/chat/completions?api-version=2024-02-15-preview`

      const response = await fetch(azureUrl, {
        method: 'POST',
        headers: {
          'api-key': AZURE_OPENAI_API_KEY,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          messages: [
            {
              role: 'system',
              content: 'You are a professional news editor. Rewrite content in objective, factual journalistic style. Be clear, concise, and informative.'
            },
            {
              role: 'user',
              content: langPrompt
            }
          ],
          temperature: 0.5,
          max_tokens: 2000
        })
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error(`Azure OpenAI error for ${lang}:`, errorText)
        throw new Error(`AI rewrite failed for ${lang}`)
      }

      const data = await response.json()
      const aiContent = data.choices[0]?.message?.content?.trim()

      // Parse JSON response
      const jsonMatch = aiContent.match(/\{[\s\S]*\}/)
      if (!jsonMatch) {
        throw new Error(`Failed to parse AI response for ${lang}`)
      }

      const parsed = JSON.parse(jsonMatch[0])
      rewrittenContent[lang] = {
        title: parsed.title || requestData.title,
        content: parsed.content || requestData.content,
        description: parsed.description || parsed.content.substring(0, 200)
      }

      console.log(`✅ Rewritten for ${langName}`)
    }

    // Generate slugs
    const generateSlug = (text: string): string => {
      return text
        .toLowerCase()
        .replace(/[^\w\s-]/g, '')
        .replace(/\s+/g, '-')
        .substring(0, 100)
    }

    // Update news item with rewritten content
    const { error: updateError } = await supabase
      .from('news')
      .update({
        title_en: rewrittenContent.en.title,
        content_en: rewrittenContent.en.content,
        description_en: rewrittenContent.en.description,
        slug_en: generateSlug(rewrittenContent.en.title),
        title_ua: rewrittenContent.ua.title,
        content_ua: rewrittenContent.ua.content,
        description_ua: rewrittenContent.ua.description,
        slug_ua: generateSlug(rewrittenContent.ua.title),
        title_no: rewrittenContent.no.title,
        content_no: rewrittenContent.no.content,
        description_no: rewrittenContent.no.description,
        slug_no: generateSlug(rewrittenContent.no.title),
        is_rewritten: true,
        is_published: true,
        published_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', requestData.newsId)

    if (updateError) {
      console.error('Failed to update news:', updateError)
      throw updateError
    }

    console.log('✅ News published:', requestData.newsId)

    // Update AI prompt usage count
    await supabase
      .from('ai_prompts')
      .update({ usage_count: newsPrompt.usage_count + 1 })
      .eq('id', newsPrompt.id)

    return new Response(
      JSON.stringify({
        success: true,
        newsId: requestData.newsId,
        message: 'News published successfully'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error: any) {
    console.error('❌ Error processing news:', error)
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
