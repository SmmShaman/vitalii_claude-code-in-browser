import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const AZURE_OPENAI_ENDPOINT = Deno.env.get('AZURE_OPENAI_ENDPOINT')
const AZURE_OPENAI_API_KEY = Deno.env.get('AZURE_OPENAI_API_KEY')
const TELEGRAM_BOT_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN')
const TELEGRAM_CHAT_ID = Deno.env.get('TELEGRAM_CHAT_ID')

interface RSSAnalysisRequest {
  url: string
  sourceId?: string
  sourceName?: string
  title?: string
  description?: string
  imageUrl?: string | null
}

interface AIAnalysisResult {
  summary: string
  relevance_score: number
  category: string
  key_points: string[]
  recommended_action: 'publish' | 'skip' | 'needs_review'
  skip_reason?: string
}

/**
 * Analyze RSS article using AI and send to Telegram Bot for moderation
 */
serve(async (req) => {
  // Version: 2026-01-28-03 - Filter by relevance_score >= 7 (only 'publish' goes to bot)
  console.log('🔍 Analyze RSS Article v2026-01-28-03 started')

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const requestData: RSSAnalysisRequest = await req.json()
    console.log('📰 Analyzing RSS article:', requestData.url)

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    // Check if article already exists using database function (more efficient)
    const { data: duplicateCheck, error: duplicateError } = await supabase
      .rpc('check_rss_article_exists', { article_url: requestData.url })

    if (duplicateError) {
      console.warn('⚠️ Duplicate check failed, falling back to direct query:', duplicateError)
      // Fallback to direct query if function doesn't exist
      const { data: existingNews } = await supabase
        .from('news')
        .select('id')
        .or(`rss_source_url.eq.${requestData.url},original_url.eq.${requestData.url}`)
        .limit(1)
        .single()

      if (existingNews) {
        console.log(`⚠️ Article already exists: ${existingNews.id}`)
        return new Response(
          JSON.stringify({
            success: false,
            error: 'Article already exists',
            newsId: existingNews.id
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    } else if (duplicateCheck && duplicateCheck.length > 0 && duplicateCheck[0].article_exists) {
      const existing = duplicateCheck[0]
      console.log(`⚠️ Article already exists: ${existing.news_id}`)
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Article already exists',
          newsId: existing.news_id,
          telegramMessageId: existing.telegram_message_id
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Fetch article content
    console.log('📥 Fetching article content...')
    const articleContent = await fetchArticleContent(requestData.url)

    if (!articleContent.text || articleContent.text.length < 100) {
      console.log('⚠️ Could not extract sufficient content from article')
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Could not extract article content'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`✅ Extracted ${articleContent.text.length} chars from article`)

    // Get AI analysis prompt
    const { data: prompts, error: promptError } = await supabase
      .from('ai_prompts')
      .select('*')
      .eq('is_active', true)
      .eq('prompt_type', 'rss_article_analysis')
      .order('updated_at', { ascending: false })
      .limit(1)

    if (promptError || !prompts || prompts.length === 0) {
      console.warn('⚠️ No rss_article_analysis prompt found')
      throw new Error('No RSS analysis prompt configured')
    }

    const analysisPrompt = prompts[0]
    console.log('Using analysis prompt:', analysisPrompt.name)

    // Prepare prompt with article data
    const title = requestData.title || articleContent.title || 'No title'
    const systemPrompt = analysisPrompt.prompt_text
      .replace('{title}', title)
      .replace('{content}', articleContent.text.substring(0, 4000)) // Limit content
      .replace('{url}', requestData.url)

    // Call Azure OpenAI for analysis
    if (!AZURE_OPENAI_ENDPOINT || !AZURE_OPENAI_API_KEY) {
      throw new Error('Azure OpenAI not configured')
    }

    console.log('🤖 Calling Azure OpenAI for analysis...')
    const azureUrl = `${AZURE_OPENAI_ENDPOINT}/openai/deployments/Jobbot-gpt-4.1-mini/chat/completions?api-version=2024-02-15-preview`

    const aiResponse = await fetch(azureUrl, {
      method: 'POST',
      headers: {
        'api-key': AZURE_OPENAI_API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        messages: [
          {
            role: 'system',
            content: 'You are a news analyst. Analyze articles and respond ONLY with valid JSON.'
          },
          {
            role: 'user',
            content: systemPrompt
          }
        ],
        temperature: 0.3,
        max_tokens: 1000
      })
    })

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text()
      console.error('Azure OpenAI error:', errorText)
      throw new Error(`AI analysis failed: ${aiResponse.status}`)
    }

    const aiResult = await aiResponse.json()
    const aiContent = aiResult.choices[0]?.message?.content?.trim()

    console.log('AI response received, parsing JSON...')

    // Parse AI response
    let analysis: AIAnalysisResult
    try {
      const jsonMatch = aiContent.match(/\{[\s\S]*\}/)
      if (!jsonMatch) {
        throw new Error('No JSON found in response')
      }
      analysis = JSON.parse(jsonMatch[0])
    } catch (parseError: any) {
      console.error('Failed to parse AI response:', aiContent?.substring(0, 500))
      throw new Error(`Failed to parse AI response: ${parseError.message}`)
    }

    console.log(`✅ Analysis complete: score=${analysis.relevance_score}, action=${analysis.recommended_action}`)

    // Update AI prompt usage count
    await supabase
      .from('ai_prompts')
      .update({ usage_count: analysisPrompt.usage_count + 1 })
      .eq('id', analysisPrompt.id)

    // Create news record with RSS data
    const { data: newsRecord, error: insertError } = await supabase
      .from('news')
      .insert({
        original_title: title,
        original_content: articleContent.text.substring(0, 10000),
        original_url: requestData.url,
        rss_source_url: requestData.url,
        source_type: 'rss',
        rss_analysis: analysis,
        image_url: requestData.imageUrl || articleContent.imageUrl,
        pre_moderation_status: analysis.recommended_action === 'skip' ? 'rejected' : 'pending',
        is_published: false,
        is_rewritten: false
      })
      .select()
      .single()

    if (insertError || !newsRecord) {
      console.error('Failed to create news record:', insertError)
      throw new Error(`Database insert failed: ${insertError?.message}`)
    }

    console.log('📝 News record created:', newsRecord.id)

    // Generate image prompt for RSS article (same as Telegram donor workflow)
    let imagePrompt: string | null = null
    try {
      console.log('🎨 Generating image prompt for RSS article...')
      const promptResponse = await fetch(
        `${SUPABASE_URL}/functions/v1/generate-image-prompt`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            newsId: newsRecord.id,
            title: title,
            content: articleContent.text.substring(0, 2000)
          })
        }
      )

      if (promptResponse.ok) {
        const promptResult = await promptResponse.json()
        imagePrompt = promptResult.prompt
        console.log(`✅ Image prompt generated: ${imagePrompt?.substring(0, 100)}...`)
      } else {
        console.warn('⚠️ Image prompt generation failed:', await promptResponse.text())
      }
    } catch (promptError) {
      console.warn('⚠️ Image prompt generation error:', promptError)
    }

    // Send to Telegram Bot for moderation (only if publish - score >= 7)
    if (analysis.recommended_action === 'publish' && TELEGRAM_BOT_TOKEN && TELEGRAM_CHAT_ID) {
      await sendTelegramNotification(
        newsRecord.id,
        title,
        requestData.url,
        analysis,
        requestData.sourceName || 'RSS Feed',
        requestData.imageUrl || articleContent.imageUrl,
        imagePrompt
      )
    } else {
      // Skip both 'skip' (score <= 3) and 'needs_review' (score 4-6)
      const skipReason = analysis.recommended_action === 'skip'
        ? analysis.skip_reason || 'Low relevance (score <= 3)'
        : `Medium relevance (score ${analysis.relevance_score}/10) - not sent to bot`
      console.log(`⏭️ Auto-skipped article: ${skipReason}`)
    }

    return new Response(
      JSON.stringify({
        success: true,
        newsId: newsRecord.id,
        analysis: analysis
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error: any) {
    console.error('❌ Error analyzing RSS article:', error)
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
 * Fetch article content from URL and extract main text
 */
async function fetchArticleContent(url: string): Promise<{
  text: string
  title: string
  imageUrl: string | null
}> {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
      },
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    const html = await response.text()

    // Extract content using regex-based approach (no DOM parser needed)
    return extractArticleContent(html)
  } catch (error: any) {
    console.error('Error fetching article:', error)
    throw new Error(`Failed to fetch article: ${error.message}`)
  }
}

/**
 * Extract article content from HTML using regex patterns
 * This is a simplified readability-like approach
 */
function extractArticleContent(html: string): {
  text: string
  title: string
  imageUrl: string | null
} {
  // Extract title
  let title = ''
  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i)
  if (titleMatch) {
    title = decodeHTMLEntities(titleMatch[1]).trim()
  }

  // Try og:title as fallback
  if (!title) {
    const ogTitleMatch = html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i)
    if (ogTitleMatch) {
      title = decodeHTMLEntities(ogTitleMatch[1]).trim()
    }
  }

  // Extract og:image
  let imageUrl: string | null = null
  const ogImageMatch = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i)
  if (ogImageMatch) {
    imageUrl = ogImageMatch[1]
  }

  // Remove scripts, styles, and other non-content elements
  let content = html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<nav[\s\S]*?<\/nav>/gi, '')
    .replace(/<header[\s\S]*?<\/header>/gi, '')
    .replace(/<footer[\s\S]*?<\/footer>/gi, '')
    .replace(/<aside[\s\S]*?<\/aside>/gi, '')
    .replace(/<!--[\s\S]*?-->/g, '')

  // Try to find article content
  let articleText = ''

  // Method 1: Look for article tag
  const articleMatch = content.match(/<article[^>]*>([\s\S]*?)<\/article>/i)
  if (articleMatch) {
    articleText = articleMatch[1]
  }

  // Method 2: Look for main content div patterns
  if (!articleText || articleText.length < 500) {
    const mainPatterns = [
      /<div[^>]+class=["'][^"']*(?:post-content|article-content|entry-content|content-body|story-body|article-body)[^"']*["'][^>]*>([\s\S]*?)<\/div>/i,
      /<main[^>]*>([\s\S]*?)<\/main>/i,
      /<div[^>]+id=["']content["'][^>]*>([\s\S]*?)<\/div>/i,
    ]

    for (const pattern of mainPatterns) {
      const match = content.match(pattern)
      if (match && match[1].length > (articleText?.length || 0)) {
        articleText = match[1]
      }
    }
  }

  // Method 3: Collect all paragraph text
  if (!articleText || articleText.length < 500) {
    const paragraphs: string[] = []
    const pRegex = /<p[^>]*>([\s\S]*?)<\/p>/gi
    let pMatch
    while ((pMatch = pRegex.exec(content)) !== null) {
      const pText = stripTags(pMatch[1]).trim()
      if (pText.length > 50) { // Only include substantial paragraphs
        paragraphs.push(pText)
      }
    }
    if (paragraphs.length > 0) {
      articleText = paragraphs.join('\n\n')
    }
  }

  // Clean up the extracted text
  const text = stripTags(articleText)
    .replace(/\s+/g, ' ')
    .replace(/\n\s*\n/g, '\n\n')
    .trim()

  return { text, title, imageUrl }
}

/**
 * Strip HTML tags from text
 */
function stripTags(html: string): string {
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
}

/**
 * Decode HTML entities
 */
function decodeHTMLEntities(text: string): string {
  return text
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(parseInt(code)))
    .replace(/&#x([a-fA-F0-9]+);/g, (_, code) => String.fromCharCode(parseInt(code, 16)))
}

/**
 * Send notification to Telegram Bot with image workflow buttons
 */
async function sendTelegramNotification(
  newsId: string,
  title: string,
  url: string,
  analysis: AIAnalysisResult,
  sourceName: string,
  imageUrl: string | null = null,
  imagePrompt: string | null = null
): Promise<void> {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
    console.warn('⚠️ Telegram credentials not configured')
    return
  }

  // Format key points as bullet list
  const keyPointsList = analysis.key_points
    .map(point => `• ${point}`)
    .join('\n')

  // Build message text
  const relevanceEmoji = analysis.relevance_score >= 7 ? '🟢' :
                         analysis.relevance_score >= 5 ? '🟡' : '🔴'

  const categoryLabels: Record<string, string> = {
    'tech_product': '💻 Tech Product',
    'marketing_campaign': '📢 Marketing',
    'ai_research': '🤖 AI Research',
    'business_news': '💼 Business',
    'science': '🔬 Science',
    'lifestyle': '🌟 Lifestyle',
    'other': '📰 Other'
  }

  // Build image status section
  let imageStatusText = ''
  if (imageUrl) {
    imageStatusText = `

🖼️ <b>Зображення:</b> ✅ Готове
${imageUrl}`
  } else if (imagePrompt) {
    imageStatusText = `

⚠️ <b>Зображення:</b> Немає (є промпт)
🎨 <i>Натисни "Згенерувати" для створення AI зображення</i>`
  } else {
    imageStatusText = `

⚠️ <b>Зображення:</b> Не знайдено`
  }

  const messageText = `📰 <b>RSS Article Analysis</b>

📌 <b>Source:</b> ${sourceName}
🔗 <a href="${url}">${escapeHtml(title.substring(0, 100))}</a>

📋 <b>Summary:</b>
${escapeHtml(analysis.summary)}

${relevanceEmoji} <b>Relevance:</b> ${analysis.relevance_score}/10
📁 <b>Category:</b> ${categoryLabels[analysis.category] || analysis.category}

<b>Key Points:</b>
${escapeHtml(keyPointsList)}

🎯 <b>Recommendation:</b> ${analysis.recommended_action.toUpperCase()}
${analysis.skip_reason ? `ℹ️ ${escapeHtml(analysis.skip_reason)}` : ''}${imageStatusText}

newsId:${newsId}`

  // Build keyboard with image workflow buttons (same pattern as Telegram donors)
  let keyboard: { inline_keyboard: any[] }

  if (imageUrl) {
    // Has image from RSS → Confirm, regenerate, or upload custom
    keyboard = {
      inline_keyboard: [
        [
          { text: '✅ Використати фото', callback_data: `confirm_rss_image_${newsId}` },
          { text: '🔄 Згенерувати AI', callback_data: `regenerate_rss_image_${newsId}` }
        ],
        [
          { text: '📸 Завантажити своє', callback_data: `upload_rss_image_${newsId}` }
        ],
        [
          { text: '❌ Skip', callback_data: `reject_${newsId}` }
        ]
      ]
    }
  } else {
    // No image → Generate or upload custom
    keyboard = {
      inline_keyboard: [
        [
          { text: '🎨 Згенерувати зображення', callback_data: `regenerate_rss_image_${newsId}` }
        ],
        [
          { text: '📸 Завантажити своє', callback_data: `upload_rss_image_${newsId}` }
        ],
        [
          { text: '❌ Skip', callback_data: `reject_${newsId}` }
        ]
      ]
    }
  }

  try {
    const response = await fetch(
      `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: TELEGRAM_CHAT_ID,
          text: messageText,
          parse_mode: 'HTML',
          disable_web_page_preview: true,
          reply_markup: keyboard
        })
      }
    )

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Telegram API error:', errorText)
    } else {
      console.log('✅ Telegram notification sent')
    }
  } catch (error) {
    console.error('Failed to send Telegram notification:', error)
  }
}

/**
 * Escape HTML special characters for Telegram
 */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}
