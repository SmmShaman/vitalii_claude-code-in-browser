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

interface ImageWithMeta {
  url: string
  alt?: string
  title?: string
  credit?: string
  caption?: string
  source?: string
}

interface RSSArticle {
  id: string
  title: string
  url: string
  description: string
  pubDate: string
  imageUrl: string | null
  images?: string[]
  imagesWithMeta?: ImageWithMeta[]
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
 * Monitor RSS sources from news_monitor_sources table
 * Called by GitHub Action (rss-monitor-v2.yml) every hour
 *
 * Uses round-robin approach: processes 2 sources per run
 * Over multiple runs, all sources get covered
 */
serve(async (req) => {
  // Version: 2026-02-17-01 - Process ALL sources every run
  console.log('📡 Monitor RSS Sources v2026-02-17-01 started')

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const startTime = Date.now()

  try {
    const body = await req.json().catch(() => ({}))
    const sourceIndex = body.sourceIndex // Optional: specific source index to process
    console.log(`📋 Source index: ${sourceIndex ?? 'auto'}`)

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    // 1. Get ALL active sources from news_monitor_sources
    const { data: sources, error: sourcesError } = await supabase
      .from('news_monitor_sources')
      .select('id, name, rss_url, tier')
      .eq('is_active', true)
      .order('tier')
      .order('name')

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

    console.log(`📰 Total active sources: ${sources.length}`)

    // 2. Select sources to process
    // Accept batch parameters: batchIndex and batchSize for splitting across multiple calls
    const batchSize = body.batchSize || sources.length // Default: all sources
    const batchIndex = body.batchIndex || 0
    const startIdx = batchIndex * batchSize
    const endIdx = Math.min(startIdx + batchSize, sources.length)

    const selectedSources: NewsMonitorSource[] = (sources as NewsMonitorSource[]).slice(startIdx, endIdx)
    console.log(`🎯 Processing batch ${batchIndex} (sources ${startIdx}-${endIdx - 1} of ${sources.length}): ${selectedSources.map(s => s.name).join(', ')}`)

    // Statistics
    let sourcesProcessed = 0
    let articlesAnalyzed = 0
    let qualifiedArticles = 0
    let sentToTelegram = 0
    const errors: string[] = []
    const qualifiedNewsIds: string[] = []

    // 3. Process selected sources
    for (const src of selectedSources) {
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
              limit: 5 // Get last 5 articles per source
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

        // 4. Analyze each article (with skipTelegram=true for batch mode)
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
                  images: article.images || [],
                  imagesWithMeta: article.imagesWithMeta || [],
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

            // Small delay between articles
            await sleep(100)

          } catch (articleError: any) {
            console.error(`❌ Error analyzing article: ${articleError.message}`)
          }
        }

        sourcesProcessed++

      } catch (sourceError: any) {
        console.error(`❌ Error processing source ${src.name}: ${sourceError.message}`)
        errors.push(`${src.name}: ${sourceError.message}`)
      }
    }

    // 5. Send qualified articles to Telegram
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

        // Delay between Telegram messages
        await sleep(300)

      } catch (sendError: any) {
        console.error(`❌ Error sending to Telegram: ${sendError.message}`)
      }
    }

    const duration = ((Date.now() - startTime) / 1000).toFixed(1)
    console.log(`\n✅ RSS Monitor completed in ${duration}s`)
    console.log(`   Sources: ${sourcesProcessed}/${selectedSources.length}`)
    console.log(`   Analyzed: ${articlesAnalyzed}`)
    console.log(`   Qualified: ${qualifiedArticles}`)
    console.log(`   Sent to Telegram: ${sentToTelegram}`)

    return new Response(
      JSON.stringify({
        ok: true,
        sourcesProcessed,
        totalSources: sources.length,
        articlesAnalyzed,
        qualifiedArticles,
        sentToTelegram,
        selectedSources: selectedSources.map(s => s.name),
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
