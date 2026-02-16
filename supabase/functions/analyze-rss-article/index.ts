import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'
import {
  checkDuplicateByTitle,
  checkDuplicateByAI,
  fetchRecentTitles,
  formatDuplicateWarning,
  type DuplicateResult
} from '../_shared/duplicate-helpers.ts'

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

interface ImageWithMeta {
  url: string
  alt?: string
  title?: string
  credit?: string
  caption?: string
  source?: string
}

interface RSSAnalysisRequest {
  url: string
  sourceId?: string
  sourceName?: string
  title?: string
  description?: string
  imageUrl?: string | null
  images?: string[]           // Array of image URLs
  imagesWithMeta?: ImageWithMeta[]  // Images with copyright metadata
  skipTelegram?: boolean  // Skip Telegram notification (for batch mode)
}

interface AIAnalysisResult {
  summary: string
  relevance_score: number
  category: string
  key_points: string[]
  recommended_action: 'publish' | 'skip' | 'needs_review'
  skip_reason?: string
  is_norway_related?: boolean
}

/**
 * Analyze RSS article using AI and send to Telegram Bot for moderation
 */
serve(async (req) => {
  // Version: 2026-01-29-01 - Filter by relevance_score >= 5
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

    // ============================================
    // Title-based duplicate check (cross-source)
    // ============================================
    const articleTitle = requestData.title || ''
    let duplicateResults: DuplicateResult[] = []

    if (articleTitle.length >= 10) {
      console.log('🔍 Checking title similarity...')
      duplicateResults = await checkDuplicateByTitle(supabase, articleTitle)

      if (duplicateResults.length > 0) {
        console.log(`⚠️ Found ${duplicateResults.length} similar article(s) by title:`,
          duplicateResults.map(d => `${d.existingTitle?.substring(0, 50)} (${(d.score! * 100).toFixed(0)}%)`))
      }

      // If no trigram match, try AI-based cross-language check
      if (duplicateResults.length === 0 && AZURE_OPENAI_ENDPOINT && AZURE_OPENAI_API_KEY) {
        console.log('🤖 No trigram match, checking via AI...')
        const recentTitles = await fetchRecentTitles(supabase)
        if (recentTitles.length > 0) {
          const aiResult = await checkDuplicateByAI(
            AZURE_OPENAI_ENDPOINT,
            AZURE_OPENAI_API_KEY,
            articleTitle,
            requestData.description || '',
            recentTitles
          )
          if (aiResult) {
            duplicateResults = [aiResult]
            console.log(`⚠️ AI detected duplicate: ${aiResult.existingTitle?.substring(0, 50)} (confidence: ${(aiResult.score! * 100).toFixed(0)}%)`)
          }
        }
      }
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

    // Create news record with RSS data (including images with metadata for copyright)
    const topDuplicate = duplicateResults.length > 0 ? duplicateResults[0] : null
    const isNorwayRelated = analysis.is_norway_related === true
    if (isNorwayRelated) {
      console.log('🇳🇴 AI detected Norway-related article')
    }
    const { data: newsRecord, error: insertError } = await supabase
      .from('news')
      .insert({
        original_title: title,
        original_content: articleContent.text.substring(0, 10000),
        original_url: requestData.url,
        rss_source_url: requestData.url,
        source_type: 'rss',
        rss_analysis: analysis,
        is_norway_related: isNorwayRelated,
        image_url: requestData.imageUrl || articleContent.imageUrl,
        images: requestData.images || null,
        images_with_meta: requestData.imagesWithMeta || null,
        pre_moderation_status: analysis.recommended_action === 'skip' ? 'rejected' : 'pending',
        is_published: false,
        is_rewritten: false,
        ...(topDuplicate?.existingNewsId && {
          duplicate_of_id: topDuplicate.existingNewsId,
          duplicate_score: topDuplicate.score
        })
      })
      .select()
      .single()

    if (insertError || !newsRecord) {
      console.error('Failed to create news record:', insertError)
      throw new Error(`Database insert failed: ${insertError?.message}`)
    }

    console.log('📝 News record created:', newsRecord.id)
    console.log('🔍 DEBUG: Full newsRecord:', JSON.stringify({
      id: newsRecord.id,
      title: newsRecord.original_title?.substring(0, 50),
      pre_moderation_status: newsRecord.pre_moderation_status,
      created_at: newsRecord.created_at
    }))

    // Generate image concept variants for RSS article
    let imagePrompt: string | null = null
    let imageVariants: Array<{label: string, description: string}> | null = null
    try {
      console.log('🎨 Generating image concept variants for RSS article...')
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
            content: articleContent.text.substring(0, 2000),
            mode: 'variants'
          })
        }
      )

      if (promptResponse.ok) {
        const promptResult = await promptResponse.json()
        imageVariants = promptResult.variants || null
        console.log(`✅ Image variants generated: ${imageVariants?.length || 0} concepts`)
      } else {
        console.warn('⚠️ Image variants generation failed:', await promptResponse.text())
      }
    } catch (promptError) {
      console.warn('⚠️ Image variants generation error:', promptError)
    }

    // 🤖 Auto-publish: fire-and-forget if enabled (score >= 5)
    if (analysis.relevance_score >= 5 && !requestData.skipTelegram) {
      const { data: autoPublishSetting } = await supabase
        .from('api_settings')
        .select('key_value')
        .eq('key_name', 'ENABLE_AUTO_PUBLISH')
        .single()

      const isAutoPublishEnabled = autoPublishSetting?.key_value === 'true'

      if (isAutoPublishEnabled) {
        console.log(`🤖 Auto-publish enabled — firing auto-publish pipeline for RSS article`)
        try {
          fetch(`${SUPABASE_URL}/functions/v1/auto-publish-news`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              newsId: newsRecord.id,
              source: 'rss'
            })
          }).catch(e => console.warn('⚠️ Auto-publish fire-and-forget error:', e))

          if (TELEGRAM_BOT_TOKEN && TELEGRAM_CHAT_ID) {
            await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                chat_id: TELEGRAM_CHAT_ID,
                text: `🤖 <b>Auto-publishing RSS article...</b>\n\n📰 ${title?.substring(0, 150) || 'Untitled'}\n📊 Score: ${analysis.relevance_score}/10\n\n⏳ <i>AI обирає зображення та публікує автоматично</i>`,
                parse_mode: 'HTML'
              })
            })
          }

          return new Response(
            JSON.stringify({
              success: true,
              newsId: newsRecord.id,
              analysis: analysis,
              autoPublish: true
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        } catch (autoPublishError) {
          console.error('❌ Auto-publish trigger failed, falling back to manual:', autoPublishError)
          // Fall through to normal Telegram bot flow
        }
      }
    }

    // Send to Telegram Bot for moderation (score >= 5, unless skipTelegram is set)
    if (analysis.relevance_score >= 5 && !requestData.skipTelegram && TELEGRAM_BOT_TOKEN && TELEGRAM_CHAT_ID) {
      const telegramMessageId = await sendTelegramNotification(
        newsRecord.id,
        title,
        requestData.url,
        analysis,
        requestData.sourceName || 'RSS Feed',
        requestData.imageUrl || articleContent.imageUrl,
        imagePrompt,
        imageVariants,
        duplicateResults
      )

      // Save telegram_message_id to prevent duplicate sends
      if (telegramMessageId) {
        await supabase
          .from('news')
          .update({ telegram_message_id: telegramMessageId })
          .eq('id', newsRecord.id)
        console.log(`💾 Saved telegram_message_id: ${telegramMessageId}`)
      }
    } else {
      // Skip articles with score < 5
      const skipReason = `Low relevance (score ${analysis.relevance_score}/10 < 5) - not sent to bot`
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

  // Extract og:image (decode HTML entities in URL)
  let imageUrl: string | null = null
  const ogImageMatch = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i)
  if (ogImageMatch) {
    imageUrl = decodeHTMLEntities(ogImageMatch[1])
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
  imagePrompt: string | null = null,
  variants: Array<{label: string, description: string}> | null = null,
  duplicates: DuplicateResult[] = []
): Promise<number | null> {
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

  const hasVariants = variants && variants.length > 0

  // Build image status section
  let imageStatusText = ''
  if (hasVariants) {
    const variantEmojis = ['1️⃣', '2️⃣', '3️⃣', '4️⃣']
    imageStatusText = '\n\n🎨 <b>Оберіть концепцію зображення:</b>\n'
    variants!.forEach((v, i) => {
      imageStatusText += `\n${variantEmojis[i] || `${i+1}.`} <b>${escapeHtml(v.label)}</b>\n<i>${escapeHtml(v.description)}</i>\n`
    })
  } else if (imageUrl) {
    imageStatusText = `

🖼️ <b>Зображення:</b> ✅ Готове
${escapeHtml(imageUrl)}`
  } else {
    imageStatusText = `

⚠️ <b>Зображення:</b> Не знайдено`
  }

  const duplicateWarning = formatDuplicateWarning(duplicates)

  const messageText = `📰 <b>RSS Article Analysis</b>
${duplicateWarning}
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

  // Build keyboard
  let keyboard: { inline_keyboard: any[] }

  const hasDuplicates = duplicates.length > 0
  const skipDupButton = hasDuplicates
    ? [{ text: '🔁 Skip (дубль)', callback_data: `skip_dup_${newsId}` }]
    : []

  if (hasVariants) {
    // Has variants → Show variant selection buttons + Creative Builder
    keyboard = {
      inline_keyboard: [
        [
          { text: '1️⃣', callback_data: `select_variant_1_${newsId}` },
          { text: '2️⃣', callback_data: `select_variant_2_${newsId}` },
          { text: '3️⃣', callback_data: `select_variant_3_${newsId}` },
          { text: '4️⃣', callback_data: `select_variant_4_${newsId}` }
        ],
        [
          { text: '🔄 Нові варіанти', callback_data: `new_variants_${newsId}` },
          { text: '🎨 Creative Builder', callback_data: `cb_hub_${newsId}` }
        ],
        [
          { text: '📸 Завантажити своє', callback_data: `upload_rss_image_${newsId}` },
          { text: '❌ Skip', callback_data: `reject_${newsId}` }
        ],
        ...(hasDuplicates ? [skipDupButton] : [])
      ]
    }
  } else if (imageUrl) {
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
          { text: '❌ Skip', callback_data: `reject_${newsId}` },
          ...skipDupButton
        ]
      ]
    }
  } else {
    // No image, no variants → Generate variants or upload custom + Creative Builder
    keyboard = {
      inline_keyboard: [
        [
          { text: '🎲 Random Variants', callback_data: `new_variants_${newsId}` },
          { text: '🎨 Creative Builder', callback_data: `cb_hub_${newsId}` }
        ],
        [
          { text: '📸 Завантажити своє', callback_data: `upload_rss_image_${newsId}` }
        ],
        [
          { text: '❌ Skip', callback_data: `reject_${newsId}` },
          ...skipDupButton
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
      return null
    }

    const result = await response.json()
    const messageId = result.result?.message_id || null
    console.log(`✅ Telegram notification sent (message_id: ${messageId})`)
    return messageId
  } catch (error) {
    console.error('Failed to send Telegram notification:', error)
    return null
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
