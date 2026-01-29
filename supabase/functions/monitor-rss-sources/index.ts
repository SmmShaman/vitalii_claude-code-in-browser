import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

interface NewsMonitorSource {
  id: string
  name: string
  rss_url: string
  tier: number
  is_active: boolean
}

interface RSSArticle {
  id: string
  title: string
  url: string
  description: string
  pubDate: string
  imageUrl: string | null
  sourceName?: string
}

interface AnalysisResult {
  success: boolean
  newsId?: string
  analysis?: {
    relevance_score: number
    recommended_action: string
  }
  error?: string
}

/**
 * Monitor ALL RSS sources from news_monitor_sources table
 * Called by GitHub Action (rss-monitor-v2.yml) every hour
 *
 * Flow:
 * 1. Read ALL active sources from news_monitor_sources
 * 2. For each source: fetch RSS feed, filter new articles, analyze
 * 3. Collect qualified articles (score >= 5)
 * 4. Send ALL qualified articles to Telegram in batch
 */
serve(async (req) => {
  // Version: 2026-01-29-01 - Initial implementation
  console.log('📡 Monitor RSS Sources v2026-01-29-01 started')

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const startTime = Date.now()

  try {
    const body = await req.json().catch(() => ({}))
    const source = body.source || 'manual'
    console.log(`📋 Source: ${source}`)

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    // 1. Get ALL active sources from news_monitor_sources
    const { data: sources, error: sourcesError } = await supabase
      .from('news_monitor_sources')
      .select('id, name, rss_url, tier')
      .eq('is_active', true)
      .order('tier')

    if (sourcesError) {
      throw new Error(`Failed to fetch sources: ${sourcesError.message}`)
    }

    if (!sources || sources.length === 0) {
      console.log('⚠️ No active sources found')
      return new Response(
        JSON.stringify({
          ok: true,
          sourcesProcessed: 0,
          articlesAnalyzed: 0,
          qualifiedArticles: 0,
          sentToTelegram: 0,
          message: 'No active sources found'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`📰 Found ${sources.length} active sources`)

    // Statistics
    let sourcesProcessed = 0
    let articlesAnalyzed = 0
    let qualifiedArticles = 0
    let sentToTelegram = 0
    const errors: string[] = []
    const qualifiedNewsIds: string[] = []

    // 2. Process each source
    for (const src of sources as NewsMonitorSource[]) {
      try {
        console.log(`\n🔍 Processing source: ${src.name} (Tier ${src.tier})`)

        // Fetch RSS feed using fetch-rss-preview
        const rssResponse = await fetch(
          `${SUPABASE_URL}/functions/v1/fetch-rss-preview`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              rssUrl: src.rss_url,
              limit: 10 // Get last 10 articles per source
            })
          }
        )

        if (!rssResponse.ok) {
          const errorText = await rssResponse.text()
          console.error(`❌ Failed to fetch RSS for ${src.name}: ${errorText}`)
          errors.push(`${src.name}: RSS fetch failed`)
          continue
        }

        const rssData = await rssResponse.json()
        const articles: RSSArticle[] = rssData.articles || []

        if (articles.length === 0) {
          console.log(`⚠️ No articles found for ${src.name}`)
          sourcesProcessed++
          continue
        }

        console.log(`📄 Got ${articles.length} articles from ${src.name}`)

        // 3. Analyze each article (with skipTelegram=true for batch mode)
        for (const article of articles) {
          try {
            const analysisResponse = await fetch(
              `${SUPABASE_URL}/functions/v1/analyze-rss-article`,
              {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                  url: article.url,
                  title: article.title,
                  description: article.description,
                  imageUrl: article.imageUrl,
                  sourceId: src.id,
                  sourceName: src.name,
                  skipTelegram: true // Don't send immediately - we'll batch at the end
                })
              }
            )

            const analysisResult: AnalysisResult = await analysisResponse.json()
            articlesAnalyzed++

            if (analysisResult.success && analysisResult.newsId) {
              // Check if article is qualified (score >= 5)
              const score = analysisResult.analysis?.relevance_score || 0
              if (score >= 5) {
                qualifiedNewsIds.push(analysisResult.newsId)
                qualifiedArticles++
                console.log(`✅ Qualified: "${article.title.substring(0, 50)}..." (score: ${score})`)
              } else {
                console.log(`⏭️ Skipped: "${article.title.substring(0, 50)}..." (score: ${score})`)
              }
            } else if (analysisResult.error === 'Article already exists') {
              console.log(`⏭️ Duplicate: "${article.title.substring(0, 50)}..."`)
            } else if (analysisResult.error) {
              console.warn(`⚠️ Analysis failed: ${analysisResult.error}`)
            }

            // Small delay between articles to avoid rate limiting
            await sleep(500)

          } catch (articleError: any) {
            console.error(`❌ Error analyzing article: ${articleError.message}`)
          }
        }

        sourcesProcessed++

        // Small delay between sources
        await sleep(1000)

      } catch (sourceError: any) {
        console.error(`❌ Error processing source ${src.name}: ${sourceError.message}`)
        errors.push(`${src.name}: ${sourceError.message}`)
      }
    }

    // 4. Send ALL qualified articles to Telegram in batch
    console.log(`\n📤 Sending ${qualifiedNewsIds.length} qualified articles to Telegram...`)

    for (const newsId of qualifiedNewsIds) {
      try {
        const sendResponse = await fetch(
          `${SUPABASE_URL}/functions/v1/send-rss-to-telegram`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ newsId })
          }
        )

        const sendResult = await sendResponse.json()

        if (sendResult.success) {
          sentToTelegram++
          console.log(`✅ Sent to Telegram: ${newsId}`)
        } else if (sendResult.error === 'Already sent to Telegram') {
          console.log(`⏭️ Already sent: ${newsId}`)
        } else {
          console.warn(`⚠️ Failed to send ${newsId}: ${sendResult.error}`)
        }

        // Delay between Telegram messages to avoid rate limiting
        await sleep(1000)

      } catch (sendError: any) {
        console.error(`❌ Error sending to Telegram: ${sendError.message}`)
      }
    }

    const duration = ((Date.now() - startTime) / 1000).toFixed(1)
    console.log(`\n✅ RSS Monitor completed in ${duration}s`)
    console.log(`   Sources: ${sourcesProcessed}/${sources.length}`)
    console.log(`   Analyzed: ${articlesAnalyzed}`)
    console.log(`   Qualified: ${qualifiedArticles}`)
    console.log(`   Sent to Telegram: ${sentToTelegram}`)

    return new Response(
      JSON.stringify({
        ok: true,
        sourcesProcessed,
        articlesAnalyzed,
        qualifiedArticles,
        sentToTelegram,
        errors: errors.length > 0 ? errors : undefined,
        durationSeconds: parseFloat(duration)
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error: any) {
    console.error('❌ Monitor RSS Sources error:', error)
    return new Response(
      JSON.stringify({
        ok: false,
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
 * Sleep helper
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}
