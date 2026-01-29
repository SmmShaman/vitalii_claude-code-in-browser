'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '@/integrations/supabase/client'
import {
  RSSSource,
  RSSArticle,
  ViewerSettings,
  SourceState,
  FetchRSSResponse,
  DBNewsMonitorSource,
  DBNewsMonitorSettings,
} from '@/components/admin/news-monitor/types'
import { DEFAULT_SETTINGS, DEFAULT_SOURCES } from '@/components/admin/news-monitor/constants'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL

// LocalStorage key for tracking analyzed articles
const ANALYZED_URLS_KEY = 'news_monitor_analyzed_urls'
const MAX_ANALYZED_URLS = 500 // Limit to prevent localStorage bloat

interface AnalysisStatus {
  analyzing: boolean
  analyzedCount: number
  failedCount: number
  lastAnalyzedUrl: string | null
}

interface UseNewsMonitorReturn {
  sources: RSSSource[]
  sourceStates: Map<string, SourceState>
  settings: ViewerSettings
  loading: boolean
  lastRefresh: Date | null
  fetchSource: (sourceId: string) => Promise<void>
  fetchAllSources: () => Promise<void>
  updateSettings: (newSettings: Partial<ViewerSettings>) => Promise<void>
  addSource: (source: Omit<RSSSource, 'id' | 'createdAt' | 'updatedAt' | 'sortOrder'>) => Promise<boolean>
  deleteSource: (sourceId: string) => Promise<boolean>
  toggleSourceActive: (sourceId: string) => Promise<boolean>
  validateRssUrl: (rssUrl: string) => Promise<{ valid: boolean; articles?: RSSArticle[]; error?: string }>
  reloadSources: () => Promise<void>
  analysisStatus: AnalysisStatus
  analyzeArticle: (article: RSSArticle, sourceName: string, skipTelegram?: boolean) => Promise<{ success: boolean; newsId?: string; score?: number }>
  clearAnalyzedUrls: () => void
  updateSourceOrder: (sourceId: string, newOrder: number) => Promise<boolean>
  reorderSources: (tier: number, orderedIds: string[]) => Promise<boolean>
}

function mapDBSourceToSource(dbSource: DBNewsMonitorSource): RSSSource {
  return {
    id: dbSource.id,
    name: dbSource.name,
    url: dbSource.url,
    rssUrl: dbSource.rss_url,
    tier: dbSource.tier as 1 | 2 | 3 | 4,
    isActive: dbSource.is_active,
    isDefault: dbSource.is_default,
    sortOrder: dbSource.sort_order ?? 0,
    createdAt: dbSource.created_at,
    updatedAt: dbSource.updated_at,
  }
}

export function useNewsMonitor(): UseNewsMonitorReturn {
  const [sources, setSources] = useState<RSSSource[]>([])
  const [sourceStates, setSourceStates] = useState<Map<string, SourceState>>(new Map())
  const [settings, setSettings] = useState<ViewerSettings>(DEFAULT_SETTINGS)
  const [loading, setLoading] = useState(true)
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null)
  const [analysisStatus, setAnalysisStatus] = useState<AnalysisStatus>({
    analyzing: false,
    analyzedCount: 0,
    failedCount: 0,
    lastAnalyzedUrl: null,
  })
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const analyzedUrlsRef = useRef<Set<string>>(new Set())

  // Load analyzed URLs from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(ANALYZED_URLS_KEY)
      if (stored) {
        const urls = JSON.parse(stored) as string[]
        analyzedUrlsRef.current = new Set(urls)
      }
    } catch {
      // Ignore localStorage errors
    }
  }, [])

  // Save analyzed URLs to localStorage
  const saveAnalyzedUrls = useCallback(() => {
    try {
      const urls = Array.from(analyzedUrlsRef.current)
      // Keep only the most recent URLs to prevent bloat
      const trimmed = urls.slice(-MAX_ANALYZED_URLS)
      localStorage.setItem(ANALYZED_URLS_KEY, JSON.stringify(trimmed))
    } catch {
      // Ignore localStorage errors
    }
  }, [])

  // Clear analyzed URLs
  const clearAnalyzedUrls = useCallback(() => {
    analyzedUrlsRef.current = new Set()
    try {
      localStorage.removeItem(ANALYZED_URLS_KEY)
    } catch {
      // Ignore localStorage errors
    }
    setAnalysisStatus(prev => ({
      ...prev,
      analyzedCount: 0,
      failedCount: 0,
      lastAnalyzedUrl: null,
    }))
  }, [])

  // Load sources from database
  const loadSources = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('news_monitor_sources')
        .select('*')
        .order('tier', { ascending: true })
        .order('sort_order', { ascending: true })
        .order('name', { ascending: true })

      if (error) {
        console.error('Failed to load sources:', error)
        // Fallback to default sources
        const fallbackSources: RSSSource[] = DEFAULT_SOURCES.map((s, i) => ({
          ...s,
          id: `default-${i}`,
          sortOrder: i + 1,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }))
        setSources(fallbackSources)
        return
      }

      if (data && data.length > 0) {
        setSources(data.map(mapDBSourceToSource))
      } else {
        // No sources in DB, use defaults
        const fallbackSources: RSSSource[] = DEFAULT_SOURCES.map((s, i) => ({
          ...s,
          id: `default-${i}`,
          sortOrder: i + 1,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }))
        setSources(fallbackSources)
      }
    } catch (err) {
      console.error('Error loading sources:', err)
    }
  }, [])

  // Load settings from database
  const loadSettings = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data, error } = await supabase
        .from('news_monitor_settings')
        .select('*')
        .eq('user_id', user.id)
        .single()

      if (error && error.code !== 'PGRST116') {
        console.error('Failed to load settings:', error)
        return
      }

      if (data) {
        setSettings({
          refreshInterval: data.refresh_interval,
          articlesPerSource: data.articles_per_source,
          autoRefresh: data.auto_refresh,
          autoAnalyze: data.auto_analyze ?? false,
          expandedSources: data.expanded_sources || [],
        })
      }
    } catch (err) {
      console.error('Error loading settings:', err)
    }
  }, [])

  // Check if article already exists in database
  const checkArticleExists = useCallback(async (url: string): Promise<boolean> => {
    try {
      // Try using the database function first
      const { data, error } = await supabase
        .rpc('check_rss_article_exists', { article_url: url })

      if (error) {
        console.warn('Duplicate check via RPC failed, using fallback:', error)
        // Fallback to direct query
        const { data: existing } = await supabase
          .from('news')
          .select('id')
          .or(`rss_source_url.eq.${url},original_url.eq.${url}`)
          .limit(1)

        return !!(existing && existing.length > 0)
      }

      return !!(data && data.length > 0 && data[0].article_exists)
    } catch (err) {
      console.error('Error checking article existence:', err)
      return false
    }
  }, [])

  // Analyze single article via Edge Function
  // Returns { success, newsId, score } for batch processing
  const analyzeArticle = useCallback(async (
    article: RSSArticle,
    sourceName: string,
    skipTelegram: boolean = false
  ): Promise<{ success: boolean; newsId?: string; score?: number }> => {
    // Skip if already analyzed locally
    if (analyzedUrlsRef.current.has(article.url)) {
      return { success: false }
    }

    // Check if article already exists in database (prevents duplicate Telegram messages)
    const exists = await checkArticleExists(article.url)
    if (exists) {
      console.log(`Article already in database, skipping: ${article.url}`)
      // Mark as analyzed locally to avoid repeated DB checks
      analyzedUrlsRef.current.add(article.url)
      saveAnalyzedUrls()
      return { success: false }
    }

    try {
      const response = await fetch(`${SUPABASE_URL}/functions/v1/analyze-rss-article`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url: article.url,
          title: article.title,
          description: article.description,
          imageUrl: article.imageUrl,
          sourceName: sourceName,
          skipTelegram: skipTelegram,
        }),
      })

      const data = await response.json()

      if (data.error) {
        // If error is "Article already exists", don't count as failure
        if (data.error === 'Article already exists') {
          console.log(`Article already exists in DB: ${article.url}`)
          analyzedUrlsRef.current.add(article.url)
          saveAnalyzedUrls()
          return { success: false }
        }
        console.error(`Analysis failed for ${article.url}:`, data.error)
        setAnalysisStatus(prev => ({
          ...prev,
          failedCount: prev.failedCount + 1,
        }))
        return { success: false }
      }

      // Mark as analyzed
      analyzedUrlsRef.current.add(article.url)
      saveAnalyzedUrls()

      // Extract relevance score from analysis result
      const relevanceScore = data.analysis?.relevance_score || null

      setAnalysisStatus(prev => ({
        ...prev,
        analyzedCount: prev.analyzedCount + 1,
        lastAnalyzedUrl: article.url,
      }))

      // Update the article in sourceStates with the relevance score
      setSourceStates(prev => {
        const newMap = new Map(prev)
        for (const [sourceId, state] of newMap) {
          const updatedArticles = state.articles.map(a =>
            a.url === article.url
              ? { ...a, relevanceScore, analyzed: true }
              : a
          )
          if (updatedArticles !== state.articles) {
            newMap.set(sourceId, { ...state, articles: updatedArticles })
          }
        }
        return newMap
      })

      console.log(`Article analyzed (score: ${relevanceScore}): ${article.title}`)
      return {
        success: true,
        newsId: data.newsId,
        score: relevanceScore
      }
    } catch (err) {
      console.error(`Error analyzing article ${article.url}:`, err)
      setAnalysisStatus(prev => ({
        ...prev,
        failedCount: prev.failedCount + 1,
      }))
      return { success: false }
    }
  }, [saveAnalyzedUrls, checkArticleExists])

  // Send batch of analyzed articles to Telegram
  const sendBatchToTelegram = useCallback(async (newsIds: string[]) => {
    if (newsIds.length === 0) return

    console.log(`📤 Sending ${newsIds.length} articles to Telegram...`)

    for (const newsId of newsIds) {
      try {
        await fetch(`${SUPABASE_URL}/functions/v1/send-rss-to-telegram`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ newsId }),
        })
        // Small delay between Telegram messages to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 500))
      } catch (err) {
        console.error(`Failed to send newsId ${newsId} to Telegram:`, err)
      }
    }

    console.log(`✅ Batch sent to Telegram`)
  }, [])

  // Analyze new articles from a source (batch mode)
  const analyzeNewArticles = useCallback(async (articles: RSSArticle[], sourceName: string) => {
    if (!settings.autoAnalyze) return

    // Filter out already analyzed articles
    const newArticles = articles.filter(a => !analyzedUrlsRef.current.has(a.url))

    if (newArticles.length === 0) return

    setAnalysisStatus(prev => ({ ...prev, analyzing: true }))

    const BATCH_SIZE = 3
    const qualifiedNewsIds: string[] = [] // Articles with score >= 5

    // Analyze in batches of 3 with skipTelegram=true
    const totalBatches = Math.ceil(newArticles.length / BATCH_SIZE)

    for (let i = 0; i < newArticles.length; i += BATCH_SIZE) {
      const batchNum = Math.floor(i / BATCH_SIZE) + 1
      const batch = newArticles.slice(i, i + BATCH_SIZE)

      console.log(`📊 Analyzing batch ${batchNum} of ${totalBatches} (${batch.length} articles)...`)

      // Analyze batch in parallel (skipTelegram=true)
      const batchResults = await Promise.all(
        batch.map(article => analyzeArticle(article, sourceName, true))
      )

      // Collect newsIds for articles that passed the threshold (score >= 5)
      batchResults.forEach(result => {
        if (result.success && result.newsId && result.score !== undefined && result.score >= 5) {
          qualifiedNewsIds.push(result.newsId)
        }
      })

      // Small delay between batches to avoid rate limiting
      if (i + BATCH_SIZE < newArticles.length) {
        await new Promise(resolve => setTimeout(resolve, 300))
      }
    }

    // After ALL articles analyzed, send qualified ones to Telegram
    if (qualifiedNewsIds.length > 0) {
      console.log(`📬 ${qualifiedNewsIds.length} articles passed threshold (score >= 5), sending to Telegram...`)
      await sendBatchToTelegram(qualifiedNewsIds)
    } else {
      console.log(`⏭️ No articles passed threshold (score >= 5)`)
    }

    setAnalysisStatus(prev => ({ ...prev, analyzing: false }))
  }, [settings.autoAnalyze, analyzeArticle, sendBatchToTelegram])

  // Fetch single RSS source
  const fetchSource = useCallback(async (sourceId: string) => {
    const source = sources.find(s => s.id === sourceId)
    if (!source || !source.isActive) return

    // Set loading state
    setSourceStates(prev => {
      const newMap = new Map(prev)
      newMap.set(sourceId, {
        loading: true,
        error: null,
        articles: prev.get(sourceId)?.articles || [],
        lastFetched: prev.get(sourceId)?.lastFetched || null,
      })
      return newMap
    })

    try {
      const response = await fetch(`${SUPABASE_URL}/functions/v1/fetch-rss-preview`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          rssUrl: source.rssUrl,
          limit: settings.articlesPerSource,
        }),
      })

      const data: FetchRSSResponse = await response.json()

      if (data.error) {
        throw new Error(data.error)
      }

      // Add source name to articles
      const articlesWithSource = data.articles.map(a => ({
        ...a,
        sourceName: source.name,
      }))

      setSourceStates(prev => {
        const newMap = new Map(prev)
        newMap.set(sourceId, {
          loading: false,
          error: null,
          articles: articlesWithSource,
          lastFetched: new Date(),
        })
        return newMap
      })

      // Trigger auto-analysis for new articles (non-blocking)
      if (settings.autoAnalyze) {
        analyzeNewArticles(articlesWithSource, source.name)
      }
    } catch (err: any) {
      console.error(`Error fetching source ${source.name}:`, err)
      setSourceStates(prev => {
        const newMap = new Map(prev)
        newMap.set(sourceId, {
          loading: false,
          error: err.message || 'Failed to fetch',
          articles: [],
          lastFetched: null,
        })
        return newMap
      })
    }
  }, [sources, settings.articlesPerSource, settings.autoAnalyze, analyzeNewArticles])

  // Fetch all active sources
  const fetchAllSources = useCallback(async () => {
    const activeSources = sources.filter(s => s.isActive)
    setLastRefresh(new Date())

    // Fetch in parallel with a small delay between batches to avoid rate limiting
    const batchSize = 4
    for (let i = 0; i < activeSources.length; i += batchSize) {
      const batch = activeSources.slice(i, i + batchSize)
      await Promise.all(batch.map(s => fetchSource(s.id)))

      // Small delay between batches
      if (i + batchSize < activeSources.length) {
        await new Promise(resolve => setTimeout(resolve, 500))
      }
    }
  }, [sources, fetchSource])

  // Update settings
  const updateSettings = useCallback(async (newSettings: Partial<ViewerSettings>) => {
    const updated = { ...settings, ...newSettings }
    setSettings(updated)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { error } = await supabase
        .from('news_monitor_settings')
        .upsert({
          user_id: user.id,
          refresh_interval: updated.refreshInterval,
          articles_per_source: updated.articlesPerSource,
          auto_refresh: updated.autoRefresh,
          auto_analyze: updated.autoAnalyze,
          expanded_sources: updated.expandedSources,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'user_id',
        })

      if (error) {
        console.error('Failed to save settings:', error)
      }
    } catch (err) {
      console.error('Error saving settings:', err)
    }
  }, [settings])

  // Validate RSS URL
  const validateRssUrl = useCallback(async (rssUrl: string): Promise<{
    valid: boolean
    articles?: RSSArticle[]
    error?: string
  }> => {
    try {
      const response = await fetch(`${SUPABASE_URL}/functions/v1/fetch-rss-preview`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          rssUrl,
          limit: 3,
        }),
      })

      const data: FetchRSSResponse = await response.json()

      if (data.error) {
        return { valid: false, error: data.error }
      }

      if (!data.articles || data.articles.length === 0) {
        return { valid: false, error: 'No articles found in feed' }
      }

      return { valid: true, articles: data.articles }
    } catch (err: any) {
      return { valid: false, error: err.message || 'Validation failed' }
    }
  }, [])

  // Add new source
  const addSource = useCallback(async (
    source: Omit<RSSSource, 'id' | 'createdAt' | 'updatedAt' | 'sortOrder'>
  ): Promise<boolean> => {
    try {
      // Get max sort_order for this tier to add at the end
      const tierSources = sources.filter(s => s.tier === source.tier)
      const maxSortOrder = tierSources.length > 0
        ? Math.max(...tierSources.map(s => s.sortOrder))
        : 0

      const { data, error } = await supabase
        .from('news_monitor_sources')
        .insert({
          name: source.name,
          url: source.url,
          rss_url: source.rssUrl,
          tier: source.tier,
          is_active: source.isActive,
          is_default: false,
          sort_order: maxSortOrder + 1,
        })
        .select()
        .single()

      if (error) {
        console.error('Failed to add source:', error)
        return false
      }

      setSources(prev => [...prev, mapDBSourceToSource(data)])
      return true
    } catch (err) {
      console.error('Error adding source:', err)
      return false
    }
  }, [sources])

  // Delete source (only non-default)
  const deleteSource = useCallback(async (sourceId: string): Promise<boolean> => {
    const source = sources.find(s => s.id === sourceId)
    if (!source || source.isDefault) return false

    try {
      const { error } = await supabase
        .from('news_monitor_sources')
        .delete()
        .eq('id', sourceId)

      if (error) {
        console.error('Failed to delete source:', error)
        return false
      }

      setSources(prev => prev.filter(s => s.id !== sourceId))
      setSourceStates(prev => {
        const newMap = new Map(prev)
        newMap.delete(sourceId)
        return newMap
      })
      return true
    } catch (err) {
      console.error('Error deleting source:', err)
      return false
    }
  }, [sources])

  // Toggle source active state
  const toggleSourceActive = useCallback(async (sourceId: string): Promise<boolean> => {
    const source = sources.find(s => s.id === sourceId)
    if (!source) return false

    try {
      const { error } = await supabase
        .from('news_monitor_sources')
        .update({ is_active: !source.isActive })
        .eq('id', sourceId)

      if (error) {
        console.error('Failed to toggle source:', error)
        return false
      }

      setSources(prev =>
        prev.map(s => s.id === sourceId ? { ...s, isActive: !s.isActive } : s)
      )
      return true
    } catch (err) {
      console.error('Error toggling source:', err)
      return false
    }
  }, [sources])

  // Reload sources
  const reloadSources = useCallback(async () => {
    await loadSources()
  }, [loadSources])

  // Update sort order for a single source
  const updateSourceOrder = useCallback(async (sourceId: string, newOrder: number): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('news_monitor_sources')
        .update({ sort_order: newOrder })
        .eq('id', sourceId)

      if (error) {
        console.error('Failed to update source order:', error)
        return false
      }

      setSources(prev =>
        prev.map(s => s.id === sourceId ? { ...s, sortOrder: newOrder } : s)
      )
      return true
    } catch (err) {
      console.error('Error updating source order:', err)
      return false
    }
  }, [])

  // Reorder all sources in a tier (after drag & drop)
  const reorderSources = useCallback(async (tier: number, orderedIds: string[]): Promise<boolean> => {
    try {
      // Optimistically update local state
      setSources(prev => {
        const otherSources = prev.filter(s => s.tier !== tier)
        const tierSources = orderedIds.map((id, index) => {
          const source = prev.find(s => s.id === id)
          return source ? { ...source, sortOrder: index + 1 } : null
        }).filter(Boolean) as RSSSource[]
        return [...otherSources, ...tierSources].sort((a, b) => {
          if (a.tier !== b.tier) return a.tier - b.tier
          return a.sortOrder - b.sortOrder
        })
      })

      // Update all sources in parallel
      const updates = orderedIds.map((id, index) =>
        supabase
          .from('news_monitor_sources')
          .update({ sort_order: index + 1 })
          .eq('id', id)
      )

      const results = await Promise.all(updates)
      const hasError = results.some(r => r.error)

      if (hasError) {
        console.error('Some sources failed to update order')
        // Reload to get consistent state
        await loadSources()
        return false
      }

      return true
    } catch (err) {
      console.error('Error reordering sources:', err)
      await loadSources()
      return false
    }
  }, [loadSources])

  // Initial load
  useEffect(() => {
    const init = async () => {
      setLoading(true)
      await Promise.all([loadSources(), loadSettings()])
      setLoading(false)
    }
    init()
  }, [loadSources, loadSettings])

  // Auto-refresh interval
  useEffect(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
    }

    if (settings.autoRefresh && sources.length > 0) {
      // Initial fetch
      fetchAllSources()

      // Set up interval
      intervalRef.current = setInterval(() => {
        fetchAllSources()
      }, settings.refreshInterval * 1000)
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [settings.autoRefresh, settings.refreshInterval, sources.length, fetchAllSources])

  return {
    sources,
    sourceStates,
    settings,
    loading,
    lastRefresh,
    fetchSource,
    fetchAllSources,
    updateSettings,
    addSource,
    deleteSource,
    toggleSourceActive,
    validateRssUrl,
    reloadSources,
    analysisStatus,
    analyzeArticle,
    clearAnalyzedUrls,
    updateSourceOrder,
    reorderSources,
  }
}
