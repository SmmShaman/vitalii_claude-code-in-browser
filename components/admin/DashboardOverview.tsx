'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Send, Rss, RefreshCw, Loader2, Settings, ChevronsUp, ChevronsDown } from 'lucide-react'
import { supabase } from '@/integrations/supabase/client'
import { useNewsMonitor } from '@/hooks/useNewsMonitor'
import { TIER_CONFIGS } from './news-monitor/constants'
import { AddSourceModal } from './news-monitor/AddSourceModal'
import { MonitorSettings } from './news-monitor/MonitorSettings'
import { TierColumn } from './news-monitor/TierColumn'

interface TelegramSource {
  id: string
  name: string
  url: string | null
  source_type: string
  is_active: boolean
  last_fetched_at: string | null
}

interface SourceStats {
  total: number
  published: number
  lastArticle: Date | null
}

// Format time since last article
function formatTimeSince(date: Date | null): string {
  if (!date) return '—'

  const now = new Date()
  const diff = now.getTime() - date.getTime()

  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)

  if (minutes < 1) return 'щойно'
  if (minutes < 60) return `${minutes}хв`
  if (hours < 24) {
    const remainingMinutes = minutes % 60
    return remainingMinutes > 0 ? `${hours}г ${remainingMinutes}хв` : `${hours}г`
  }
  if (days < 7) {
    const remainingHours = hours % 24
    return remainingHours > 0 ? `${days}д ${remainingHours}г` : `${days}д`
  }
  const weeks = Math.floor(days / 7)
  const remainingDays = days % 7
  return remainingDays > 0 ? `${weeks}т ${remainingDays}д` : `${weeks}т`
}

export const DashboardOverview = () => {
  const [telegramSources, setTelegramSources] = useState<TelegramSource[]>([])
  const [telegramLoading, setTelegramLoading] = useState(true)
  const [refreshingTelegram, setRefreshingTelegram] = useState(false)
  const [telegramStats, setTelegramStats] = useState<Map<string, SourceStats>>(new Map())
  const [rssStats, setRssStats] = useState<Map<string, SourceStats>>(new Map())

  // RSS Monitor hook
  const {
    sources: rssSources,
    sourceStates,
    settings,
    loading: rssLoading,
    fetchAllSources,
    fetchSource,
    updateSettings,
    addSource,
    deleteSource,
    toggleSourceActive,
    toggleSkipPreModeration,
    validateRssUrl,
    reorderSources,
  } = useNewsMonitor()

  const [showSettings, setShowSettings] = useState(false)
  const [showAddModal, setShowAddModal] = useState(false)
  const [addModalTier, setAddModalTier] = useState<number>(3)
  const [refreshingRSS, setRefreshingRSS] = useState(false)
  const [expandedSources, setExpandedSources] = useState<Set<string>>(new Set())

  const collapseAll = () => setExpandedSources(new Set())
  const expandAll = () => setExpandedSources(new Set(rssSources.map(s => s.id)))
  const toggleSource = (id: string) => {
    setExpandedSources(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }
  const isAllExpanded = rssSources.length > 0 && expandedSources.size === rssSources.length

  useEffect(() => {
    loadTelegramSources()
  }, [])

  // Load stats when telegram sources are loaded
  useEffect(() => {
    if (telegramSources.length === 0) return
    loadTelegramStats()
  }, [telegramSources])

  // Load stats when RSS sources are loaded
  useEffect(() => {
    if (rssSources.length === 0) return
    loadRssStats()
  }, [rssSources])

  const loadTelegramStats = async () => {
    try {
      const sourceIds = telegramSources.map(s => s.id)

      const { data, error } = await supabase
        .from('news')
        .select('source_id, is_published, created_at')
        .in('source_id', sourceIds)

      if (error) throw error

      // Aggregate stats in JavaScript
      const statsMap = new Map<string, SourceStats>()

      // Initialize all sources with zero stats
      sourceIds.forEach(id => {
        statsMap.set(id, { total: 0, published: 0, lastArticle: null })
      })

      // Process data
      data?.forEach(item => {
        const stats = statsMap.get(item.source_id)
        if (stats) {
          stats.total++
          if (item.is_published) stats.published++
          const articleDate = new Date(item.created_at)
          if (!stats.lastArticle || articleDate > stats.lastArticle) {
            stats.lastArticle = articleDate
          }
        }
      })

      setTelegramStats(statsMap)
    } catch (error) {
      console.error('Failed to load telegram stats:', error)
    }
  }

  const loadRssStats = async () => {
    try {
      // Get news with rss_source_url
      const { data, error } = await supabase
        .from('news')
        .select('rss_source_url, is_published, created_at')
        .not('rss_source_url', 'is', null)

      if (error) throw error

      // Create a map from RSS source URL to source ID
      const urlToSourceId = new Map<string, string>()
      rssSources.forEach(source => {
        // Match by rss_url or url
        if (source.rssUrl) urlToSourceId.set(source.rssUrl, source.id)
        if (source.url) urlToSourceId.set(source.url, source.id)
      })

      // Aggregate stats
      const statsMap = new Map<string, SourceStats>()

      // Initialize all sources with zero stats
      rssSources.forEach(source => {
        statsMap.set(source.id, { total: 0, published: 0, lastArticle: null })
      })

      // Process data - match by URL domain/path
      data?.forEach(item => {
        if (!item.rss_source_url) return

        // Try to find matching source
        let matchedSourceId: string | null = null

        // Check if rss_source_url starts with any known source URL
        for (const source of rssSources) {
          if (source.rssUrl && item.rss_source_url.includes(new URL(source.rssUrl).hostname)) {
            matchedSourceId = source.id
            break
          }
          if (source.url && item.rss_source_url.includes(new URL(source.url).hostname)) {
            matchedSourceId = source.id
            break
          }
        }

        if (matchedSourceId) {
          const stats = statsMap.get(matchedSourceId)
          if (stats) {
            stats.total++
            if (item.is_published) stats.published++
            const articleDate = new Date(item.created_at)
            if (!stats.lastArticle || articleDate > stats.lastArticle) {
              stats.lastArticle = articleDate
            }
          }
        }
      })

      setRssStats(statsMap)
    } catch (error) {
      console.error('Failed to load RSS stats:', error)
    }
  }

  const loadTelegramSources = async () => {
    try {
      const { data, error } = await supabase
        .from('news_sources')
        .select('id, name, url, source_type, is_active, last_fetched_at')
        .eq('source_type', 'telegram')
        .order('name')

      if (error) throw error
      setTelegramSources(data || [])
    } catch (error) {
      console.error('Failed to load telegram sources:', error)
    } finally {
      setTelegramLoading(false)
    }
  }

  const handleRefreshTelegram = async () => {
    setRefreshingTelegram(true)
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/telegram-scraper`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json',
          },
        }
      )

      if (response.ok) {
        await loadTelegramSources()
      }
    } catch (error) {
      console.error('Failed to refresh telegram sources:', error)
    } finally {
      setRefreshingTelegram(false)
    }
  }

  const handleRefreshRSS = async () => {
    setRefreshingRSS(true)
    await fetchAllSources()
    setRefreshingRSS(false)
  }

  const handleAddSource = (tier: number) => {
    setAddModalTier(tier)
    setShowAddModal(true)
  }

  const handleDeleteSource = async (id: string) => {
    if (!confirm('Are you sure you want to delete this source?')) return
    await deleteSource(id)
  }

  const activeTelegram = telegramSources.filter(s => s.is_active).length
  const activeRSS = rssSources.filter(s => s.isActive).length

  if (telegramLoading || rssLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-10 w-10 animate-spin text-purple-400" />
          <p className="text-gray-400">Loading sources...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-12 gap-4 h-[calc(100vh-180px)] min-h-[500px]">
      {/* Telegram Section - 30% (3 cols) */}
      <div className="col-span-3 bg-blue-500/10 border border-blue-500/30 rounded-xl p-4 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between mb-3 flex-shrink-0">
          <div className="flex items-center gap-2">
            <Send className="h-4 w-4 text-blue-400" />
            <span className="text-sm font-bold text-white">Telegram</span>
            <span className="text-xs text-gray-400">({activeTelegram}/{telegramSources.length})</span>
          </div>
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={handleRefreshTelegram}
            disabled={refreshingTelegram}
            className="p-1.5 rounded-lg bg-blue-500/20 hover:bg-blue-500/30 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 text-blue-400 ${refreshingTelegram ? 'animate-spin' : ''}`} />
          </motion.button>
        </div>

        {/* Telegram Sources Grid */}
        <div className="flex-1 overflow-y-auto">
          {telegramSources.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <Send className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-xs">No channels</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-1.5">
              {telegramSources.map((source) => (
                <MiniTelegramCard
                  key={source.id}
                  source={source}
                  stats={telegramStats.get(source.id)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* RSS Section - 70% (9 cols) */}
      <div className="col-span-9 bg-purple-500/10 border border-purple-500/30 rounded-xl p-4 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between mb-3 flex-shrink-0">
          <div className="flex items-center gap-2">
            <Rss className="h-4 w-4 text-purple-400" />
            <span className="text-sm font-bold text-white">RSS Sources</span>
            <span className="text-xs text-gray-400">({activeRSS}/{rssSources.length})</span>
          </div>
          <div className="flex items-center gap-2">
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={isAllExpanded ? collapseAll : expandAll}
              className="p-1.5 rounded-lg bg-gray-500/20 hover:bg-gray-500/30 transition-colors"
              title={isAllExpanded ? 'Collapse all' : 'Expand all'}
            >
              {isAllExpanded ? (
                <ChevronsUp className="h-3.5 w-3.5 text-gray-400" />
              ) : (
                <ChevronsDown className="h-3.5 w-3.5 text-gray-400" />
              )}
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => setShowSettings(true)}
              className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
            >
              <Settings className="h-3.5 w-3.5 text-gray-400" />
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={handleRefreshRSS}
              disabled={refreshingRSS}
              className="p-1.5 rounded-lg bg-purple-500/20 hover:bg-purple-500/30 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`h-3.5 w-3.5 text-purple-400 ${refreshingRSS ? 'animate-spin' : ''}`} />
            </motion.button>
          </div>
        </div>

        {/* RSS Tier Grid - 4 columns horizontal */}
        <div className="flex-1 overflow-y-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
            {TIER_CONFIGS.map((tier) => (
              <TierColumn
                key={tier.id}
                tier={tier}
                sources={rssSources.filter(s => s.isActive)}
                sourceStates={sourceStates}
                expandedSources={expandedSources}
                sourceStats={rssStats}
                onToggleSource={toggleSource}
                onAddSource={handleAddSource}
                onDeleteSource={handleDeleteSource}
                onToggleActive={toggleSourceActive}
                onTogglePreModeration={toggleSkipPreModeration}
                onRefreshSource={fetchSource}
                onReorderSources={reorderSources}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Modals */}
      <AddSourceModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onAdd={addSource}
        onValidate={validateRssUrl}
        initialTier={addModalTier}
      />

      <MonitorSettings
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        settings={settings}
        onUpdate={updateSettings}
      />
    </div>
  )
}

// Compact Telegram card with stats
function MiniTelegramCard({ source, stats }: { source: TelegramSource; stats?: SourceStats }) {
  const isActive = source.is_active

  return (
    <div
      className={`
        px-2 py-1.5 rounded-md text-xs
        ${isActive
          ? 'bg-blue-500/20 border border-blue-500/30'
          : 'bg-gray-500/10 border border-gray-500/20 opacity-60'
        }
      `}
    >
      <div className="flex items-center gap-1.5">
        <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${isActive ? 'bg-green-400' : 'bg-gray-500'}`} />
        <span className="text-white truncate" title={source.name}>{source.name}</span>
      </div>
      {stats && (
        <div className="flex items-center gap-1.5 text-[10px] mt-1 ml-3">
          <span className="text-cyan-400" title="Час з останньої статті">
            ⏱{formatTimeSince(stats.lastArticle)}
          </span>
          <span className="text-amber-400" title="Всього статей">
            📊{stats.total}
          </span>
          <span className="text-emerald-400" title="Опубліковано">
            ✅{stats.published}
          </span>
        </div>
      )}
    </div>
  )
}

