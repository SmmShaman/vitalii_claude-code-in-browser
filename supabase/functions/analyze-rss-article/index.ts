import { azureFetch } from '../_shared/azure-to-gemini-shim.ts'
const VERSION_STAMP = '2026-03-29-fix-gemini-migration'
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'
import {
  checkDuplicateByTitle,
  checkDuplicateByAI,
  fetchRecentTitles,
  formatDuplicateWarning,
  type DuplicateResult
} from '../_shared/duplicate-helpers.ts'
import { escapeHtml } from '../_shared/social-media-helpers.ts'
import { getShortSummary, formatCompactVariants, CATEGORY_SHORT, buildPresetKeyboard } from '../_shared/telegram-format-helpers.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
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
  content?: string            // Direct text content (skip URL fetch)
  imageUrl?: string | null
  images?: string[]           // Array of image URLs
  imagesWithMeta?: ImageWithMeta[]  // Images with copyright metadata
  skipTelegram?: boolean  // Skip Telegram notification (for batch mode)
}

interface AIAnalysisResult {
  summary: string
  relevance_score: number
  linkedin_score: number  // 1-10: how good this is for LinkedIn posting
  category: string
  key_points: string[]
  trending_keywords: string[]  // 3-5 English keywords for trending checks (HN, Google Trends)
  recommended_action: 'publish' | 'skip' | 'needs_review'
  skip_reason?: string
  is_norway_related?: boolean
}

/**
 * Check if article topic is trending on Hacker News (free Algolia API)
 * Returns bonus points (0-3) based on HN engagement
 */
async function checkHackerNewsTrending(title: string, keywords: string[]): Promise<{ bonus: number; hnPosts: number; topScore: number }> {
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 8000) // 8s for 2 searches

    // Search window: last 7 days (trending topic may be discussed for days)
    const sevenDaysAgo = Math.floor(Date.now() / 1000) - 7 * 86400

    // Two parallel searches: by keywords AND by title (catches more matches)
    const keywordQuery = keywords.slice(0, 3).join(' ') || title.split(' ').slice(0, 4).join(' ')
    const titleQuery = title.substring(0, 100) // Use full title for better matching

    const [kwResponse, titleResponse] = await Promise.all([
      fetch(
        `https://hn.algolia.com/api/v1/search?query=${encodeURIComponent(keywordQuery)}&tags=story&numericFilters=created_at_i>${sevenDaysAgo}&hitsPerPage=5`,
        { signal: controller.signal }
      ),
      fetch(
        `https://hn.algolia.com/api/v1/search?query=${encodeURIComponent(titleQuery)}&tags=story&numericFilters=created_at_i>${sevenDaysAgo}&hitsPerPage=5`,
        { signal: controller.signal }
      )
    ])

    clearTimeout(timeout)

    // Merge results, deduplicate by story ID
    const allHits = new Map<string, any>()

    for (const response of [kwResponse, titleResponse]) {
      if (response.ok) {
        const data = await response.json()
        for (const hit of (data.hits || [])) {
          const id = hit.objectID || hit.story_id
          if (!allHits.has(id) || (hit.points || 0) > (allHits.get(id).points || 0)) {
            allHits.set(id, hit)
          }
        }
      }
    }

    const hits = Array.from(allHits.values())

    if (hits.length === 0) {
      console.log('📊 HN: no matching stories found')
      return { bonus: 0, hnPosts: 0, topScore: 0 }
    }

    // Find the highest-scored related post
    const topScore = Math.max(...hits.map((h: any) => h.points || 0))
    const totalComments = hits.reduce((sum: number, h: any) => sum + (h.num_comments || 0), 0)

    console.log(`📊 HN trending: ${hits.length} posts found, top score: ${topScore}, total comments: ${totalComments}`)

    // Calculate bonus based on HN engagement
    let bonus = 0
    if (topScore >= 200 || totalComments >= 100) {
      bonus = 3  // Very hot topic
    } else if (topScore >= 50 || totalComments >= 30) {
      bonus = 2  // Trending topic
    } else if (topScore >= 10 || totalComments >= 5) {
      bonus = 1  // Mildly interesting
    }

    return { bonus, hnPosts: hits.length, topScore }
  } catch (e: any) {
    console.log('⚠️ HN trending check failed:', e.name === 'AbortError' ? 'Timeout' : e.message)
    return { bonus: 0, hnPosts: 0, topScore: 0 }
  }
}

/**
 * Check if article topic is trending on Google Trends (free, no auth)
 * Fetches daily trending searches for US and NO, checks for keyword matches
 * Returns bonus points (0-3) based on Google Trends presence
 */
async function checkGoogleTrends(keywords: string[]): Promise<{ bonus: number; matchedTrends: string[] }> {
  if (!keywords || keywords.length === 0) {
    return { bonus: 0, matchedTrends: [] }
  }

  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 5000)

    // Fetch daily trending searches from Google Trends RSS (US + Norway)
    const geos = ['US', 'NO']
    const allTrendingTopics: string[] = []

    for (const geo of geos) {
      try {
        const rssUrl = `https://trends.google.com/trends/trendingsearches/daily/rss?geo=${geo}`
        const resp = await fetch(rssUrl, {
          signal: controller.signal,
          headers: { 'User-Agent': 'Mozilla/5.0' }
        })
        if (resp.ok) {
          const xml = await resp.text()
          // Extract titles from RSS <title> tags (trending search terms)
          const titles = xml.match(/<title><!\[CDATA\[([^\]]+)\]\]><\/title>/g) || []
          for (const t of titles) {
            const match = t.match(/<title><!\[CDATA\[([^\]]+)\]\]><\/title>/)
            if (match) allTrendingTopics.push(match[1].toLowerCase())
          }
          // Also check ht:news_item_title for related topics
          const newsItems = xml.match(/<ht:news_item_title><!\[CDATA\[([^\]]+)\]\]><\/ht:news_item_title>/g) || []
          for (const n of newsItems) {
            const match = n.match(/<ht:news_item_title><!\[CDATA\[([^\]]+)\]\]><\/ht:news_item_title>/)
            if (match) allTrendingTopics.push(match[1].toLowerCase())
          }
        }
      } catch { /* skip geo if fails */ }
    }

    clearTimeout(timeout)

    if (allTrendingTopics.length === 0) {
      console.log('📊 Google Trends: could not fetch trending topics')
      return { bonus: 0, matchedTrends: [] }
    }

    console.log(`📊 Google Trends: fetched ${allTrendingTopics.length} trending topics`)

    // Check if any article keywords match trending topics
    const matchedTrends: string[] = []
    const keywordsLower = keywords.map(k => k.toLowerCase())

    for (const keyword of keywordsLower) {
      // Split multi-word keyword for partial matching
      const keywordParts = keyword.split(' ').filter(p => p.length > 3)

      for (const topic of allTrendingTopics) {
        // Check if keyword appears in trending topic or vice versa
        if (topic.includes(keyword) || keyword.includes(topic)) {
          matchedTrends.push(topic)
          break
        }
        // Partial match: at least 2 significant words match
        const matchCount = keywordParts.filter(p => topic.includes(p)).length
        if (matchCount >= 2 || (keywordParts.length === 1 && keywordParts[0].length > 4 && topic.includes(keywordParts[0]))) {
          matchedTrends.push(topic)
          break
        }
      }
    }

    // Calculate bonus
    let bonus = 0
    if (matchedTrends.length >= 3) {
      bonus = 3  // Multiple trending matches — very hot
    } else if (matchedTrends.length >= 2) {
      bonus = 2  // Good trending presence
    } else if (matchedTrends.length >= 1) {
      bonus = 1  // Some trending relevance
    }

    if (matchedTrends.length > 0) {
      console.log(`🔥 Google Trends matches: ${matchedTrends.join(', ')} → bonus +${bonus}`)
    } else {
      console.log('📊 Google Trends: no keyword matches found')
    }

    return { bonus, matchedTrends }
  } catch (e: any) {
    console.log('⚠️ Google Trends check failed:', e.name === 'AbortError' ? 'Timeout' : e.message)
    return { bonus: 0, matchedTrends: [] }
  }
}

/**
 * Count LinkedIn posts made today
 */
async function getTodayLinkedInCount(supabase: any): Promise<number> {
  try {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const { count } = await supabase
      .from('social_media_posts')
      .select('id', { count: 'exact', head: true })
      .eq('platform', 'linkedin')
      .in('status', ['posted', 'pending'])
      .gte('created_at', today.toISOString())

    return count || 0
  } catch {
    return 0
  }
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
    const hasDirectContent = requestData.content && requestData.content.length >= 100
    console.log(hasDirectContent
      ? `📋 Analyzing direct content: ${requestData.title?.substring(0, 60) || 'no title'}`
      : `📰 Analyzing RSS article: ${requestData.url}`)

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    // Check if article already exists using database function (skip for direct content without URL)
    const { data: duplicateCheck, error: duplicateError } = requestData.url
      ? await supabase.rpc('check_rss_article_exists', { article_url: requestData.url })
      : { data: null, error: null }

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
      if (duplicateResults.length === 0) {
        console.log('🤖 No trigram match, checking via AI...')
        const recentTitles = await fetchRecentTitles(supabase)
        if (recentTitles.length > 0) {
          const aiResult = await checkDuplicateByAI(
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

    // Fetch article content (or use provided text)
    let articleContent: { text: string; title: string; imageUrl: string | null }

    if (requestData.content && requestData.content.length >= 100) {
      // Direct text provided (e.g. forwarded Telegram post)
      console.log('📋 Using provided text content')
      articleContent = {
        text: requestData.content,
        title: requestData.title || requestData.content.substring(0, 100),
        imageUrl: requestData.imageUrl || null,
      }
    } else {
      console.log('📥 Fetching article content from URL...')
      articleContent = await fetchArticleContent(requestData.url)
    }

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
    // Inject linkedin_score requirement into the prompt
    const linkedinScoreAddendum = `

ТАКОЖ додай ці поля:

"linkedin_score" (1-10) — оцінка того, чи варто публікувати цю статтю в LinkedIn:
- 8-10: Breaking news, дискусійна тема, трендовий AI/tech контент, бізнес-інсайти — ОБОВ'ЯЗКОВО в LinkedIn
- 5-7: Непогана стаття але не вірусна — можна опублікувати якщо нічого кращого
- 1-4: Банальна новина, нішева тема, нецікаво для бізнес-аудиторії LinkedIn — НЕ публікувати

Критерії linkedin_score:
- Чи викличе це дискусію серед tech/business професіоналів?
- Чи це breaking news яка зараз обговорюється?
- Чи є практична цінність для аудиторії (інсайти, тренди, дані)?
- Чи має потенціал стати вірусним (спірна тема, новий продукт, значна подія)?

"trending_keywords" — масив з 3-5 АНГЛІЙСЬКИХ ключових слів/фраз для перевірки трендів.
ВАЖЛИВО: ключові слова ЗАВЖДИ англійською, незалежно від мови оригінальної статті.
Приклад: ["OpenAI GPT-5", "artificial intelligence", "tech layoffs"]
Використовуй конкретні назви продуктів, компаній, технологій та загальну тему.`

    const systemPrompt = (analysisPrompt.prompt_text + linkedinScoreAddendum)
      .replace('{title}', title)
      .replace('{content}', articleContent.text.substring(0, 4000)) // Limit content
      .replace('{url}', requestData.url)

    // Call Gemini via Azure-compatible shim
    console.log('🤖 Calling Gemini for analysis...')

    const aiResponse = await azureFetch('gemini', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
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

    // Ensure linkedin_score exists (fallback if AI didn't return it)
    if (!analysis.linkedin_score) {
      analysis.linkedin_score = Math.max(1, analysis.relevance_score - 2)
    }
    if (!analysis.trending_keywords) {
      analysis.trending_keywords = []
    }

    // Use AI-generated English keywords for trending checks
    const trendingKeywords = analysis.trending_keywords.length > 0
      ? analysis.trending_keywords
      : [title] // fallback to title

    // Cross-reference with Hacker News + Google Trends in parallel
    const [hnResult, gtResult] = await Promise.all([
      checkHackerNewsTrending(title, trendingKeywords),
      checkGoogleTrends(trendingKeywords)
    ])

    // Apply combined trending bonus (max +4, capped at 10)
    const totalBonus = Math.min(4, hnResult.bonus + gtResult.bonus)
    if (totalBonus > 0) {
      const oldScore = analysis.linkedin_score
      analysis.linkedin_score = Math.min(10, analysis.linkedin_score + totalBonus)
      const bonusDetails = []
      if (hnResult.bonus > 0) bonusDetails.push(`HN +${hnResult.bonus} (${hnResult.hnPosts} posts, top ${hnResult.topScore} pts)`)
      if (gtResult.bonus > 0) bonusDetails.push(`GT +${gtResult.bonus} (${gtResult.matchedTrends.join(', ')})`)
      console.log(`🔥 Trending bonus: total +${totalBonus} (${oldScore} → ${analysis.linkedin_score}): ${bonusDetails.join(' | ')}`)
    }

    // Store trending data in analysis for reference
    ;(analysis as any).trending_data = {
      hn: { bonus: hnResult.bonus, posts: hnResult.hnPosts, topScore: hnResult.topScore },
      google_trends: { bonus: gtResult.bonus, matches: gtResult.matchedTrends },
      total_bonus: totalBonus,
      keywords_used: trendingKeywords
    }

    // Get today's LinkedIn post count
    const todayLinkedInCount = await getTodayLinkedInCount(supabase)

    console.log(`✅ Analysis complete: relevance=${analysis.relevance_score}, linkedin=${analysis.linkedin_score} (bonus +${totalBonus}), action=${analysis.recommended_action}, HN=${hnResult.hnPosts}, GT=${gtResult.matchedTrends.length} matches, LinkedIn today=${todayLinkedInCount}`)

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
        original_url: requestData.url || null,
        rss_source_url: requestData.url || null,
        source_type: requestData.content ? 'manual' : 'rss',
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
    // Skip in streams mode — website-publish handles publication via send-rss-to-telegram
    let autoPublishTriggered = false
    if (analysis.relevance_score >= 5 && !requestData.skipTelegram) {
      const { data: autoPublishSetting } = await supabase
        .from('api_settings')
        .select('key_value')
        .eq('key_name', 'ENABLE_AUTO_PUBLISH')
        .maybeSingle()

      const { data: modeSetting } = await supabase
        .from('api_settings')
        .select('key_value')
        .eq('key_name', 'STREAM_MODE')
        .maybeSingle()

      const isAutoPublishEnabled = autoPublishSetting?.key_value === 'true'
      const isStreamsMode = modeSetting?.key_value === 'streams'

      if (isStreamsMode) {
        console.log('🌊 Streams mode — skipping auto-publish (website-publish handles it)')
      } else if (isAutoPublishEnabled) {
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

          autoPublishTriggered = true
        } catch (autoPublishError) {
          console.error('❌ Auto-publish trigger failed, falling back to manual:', autoPublishError)
        }
      }
    }

    // Send to Telegram Bot for moderation (score >= 5, unless skipTelegram is set)
    // ALWAYS send buttons — even when auto-publish is triggered, so moderator can manage
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
        analysis: analysis,
        autoPublish: autoPublishTriggered
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

  const relevanceEmoji = analysis.relevance_score >= 7 ? '🟢' :
                         analysis.relevance_score >= 5 ? '🟡' : '🔴'
  const linkedinEmoji = analysis.linkedin_score >= 7 ? '🔥' :
                        analysis.linkedin_score >= 5 ? '📊' : '⬇️'

  const hasVariants = variants && variants.length > 0

  const duplicateWarning = formatDuplicateWarning(duplicates)

  // Short summary (first sentence, max 9 words)
  const shortSummary = getShortSummary(analysis.summary)

  // Expandable details block
  const keyPointsList = analysis.key_points
    .map(point => `• ${point}`)
    .join('\n')

  // Trending data section
  const trendingData = (analysis as any).trending_data
  let trendingSection = ''
  if (trendingData && (trendingData.hn.bonus > 0 || trendingData.google_trends.bonus > 0)) {
    const parts = []
    if (trendingData.hn.bonus > 0) parts.push(`HN: ${trendingData.hn.posts} posts, top ${trendingData.hn.topScore} pts (+${trendingData.hn.bonus})`)
    if (trendingData.google_trends.bonus > 0) parts.push(`GT: ${trendingData.google_trends.matches.slice(0, 3).join(', ')} (+${trendingData.google_trends.bonus})`)
    trendingSection = `\n📈 Trending: ${parts.join(' | ')}`
  }

  const expandableContent = `<blockquote expandable>📋 ${escapeHtml(analysis.summary)}

${escapeHtml(keyPointsList)}

🎯 ${analysis.recommended_action.toUpperCase()}${analysis.skip_reason ? `\nℹ️ ${escapeHtml(analysis.skip_reason)}` : ''}${trendingSection}</blockquote>`

  // Compact variant section
  let variantsSection = ''
  if (hasVariants) {
    variantsSection = '\n\n🎨 Оберіть концепцію:' + formatCompactVariants(variants!, escapeHtml)
  }

  const messageText = `📰 <b>RSS</b> | 📌 ${escapeHtml(sourceName)} | ${relevanceEmoji} ${analysis.relevance_score}/10 | ${linkedinEmoji} LI:${analysis.linkedin_score}/10 | ${CATEGORY_SHORT[analysis.category] || analysis.category}
${duplicateWarning}🔗 <a href="${url}">${escapeHtml(title.substring(0, 100))}</a>

💬 ${escapeHtml(shortSummary)}

${expandableContent}${variantsSection}

newsId:${newsId}`

  // Build preset keyboard (one-click publishing)
  const hasDuplicates = duplicates.length > 0
  const variantCount = hasVariants ? variants!.length : 0
  const keyboard = buildPresetKeyboard(newsId, variantCount, hasDuplicates)

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

