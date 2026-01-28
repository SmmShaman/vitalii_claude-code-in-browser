'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Send, Rss, RefreshCw, Loader2, CheckCircle, Clock, AlertCircle } from 'lucide-react'
import { supabase } from '@/integrations/supabase/client'
import { NewsMonitorManager } from './news-monitor'

interface TelegramSource {
  id: string
  name: string
  url: string | null
  source_type: string
  is_active: boolean
  last_fetched_at: string | null
}

function formatTimeAgo(dateString: string | null): string {
  if (!dateString) return 'Never'

  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / (1000 * 60))
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  return `${diffDays}d ago`
}

export const DashboardOverview = () => {
  const [telegramSources, setTelegramSources] = useState<TelegramSource[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshingAll, setRefreshingAll] = useState(false)

  useEffect(() => {
    loadTelegramSources()
  }, [])

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
      setLoading(false)
    }
  }

  const handleRefreshAllTelegram = async () => {
    setRefreshingAll(true)
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
        // Reload sources to get updated last_fetched_at
        await loadTelegramSources()
      }
    } catch (error) {
      console.error('Failed to refresh telegram sources:', error)
    } finally {
      setRefreshingAll(false)
    }
  }

  const activeTelegramSources = telegramSources.filter(s => s.is_active).length

  if (loading) {
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
    <div className="space-y-6">
      {/* Telegram Channels Section */}
      <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-blue-500/20">
              <Send className="h-5 w-5 text-blue-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Telegram Channels</h2>
              <p className="text-sm text-gray-400">
                {activeTelegramSources}/{telegramSources.length} active channels
              </p>
            </div>
          </div>

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleRefreshAllTelegram}
            disabled={refreshingAll}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${refreshingAll ? 'animate-spin' : ''}`} />
            <span>Refresh All</span>
          </motion.button>
        </div>

        {telegramSources.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <Send className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>No Telegram channels configured</p>
            <p className="text-sm mt-1">Add channels in Settings → News Sources</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
            {telegramSources.map((source) => (
              <TelegramSourceCard key={source.id} source={source} />
            ))}
          </div>
        )}
      </div>

      {/* RSS Sources Section */}
      <div className="bg-purple-500/10 border border-purple-500/30 rounded-xl p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 rounded-xl bg-purple-500/20">
            <Rss className="h-5 w-5 text-purple-400" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">RSS Sources</h2>
            <p className="text-sm text-gray-400">Real-time RSS feed monitoring</p>
          </div>
        </div>

        <NewsMonitorManager />
      </div>
    </div>
  )
}

// Compact Telegram source card
function TelegramSourceCard({ source }: { source: TelegramSource }) {
  const isActive = source.is_active
  const lastFetched = formatTimeAgo(source.last_fetched_at)
  const isStale = source.last_fetched_at
    ? (new Date().getTime() - new Date(source.last_fetched_at).getTime()) > 1000 * 60 * 60 // > 1 hour
    : true

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`
        rounded-lg p-3 border transition-all
        ${isActive
          ? 'bg-blue-500/10 border-blue-500/30 hover:border-blue-400/50'
          : 'bg-gray-500/10 border-gray-500/30 opacity-60'
        }
      `}
    >
      <div className="flex items-center justify-between gap-2 mb-1">
        <span className="text-white font-medium text-sm truncate flex-1" title={source.name}>
          {source.name}
        </span>
        {isActive ? (
          <CheckCircle className="h-4 w-4 text-green-400 flex-shrink-0" />
        ) : (
          <AlertCircle className="h-4 w-4 text-gray-500 flex-shrink-0" />
        )}
      </div>
      <div className="flex items-center gap-1 text-xs text-gray-400">
        <Clock className="h-3 w-3" />
        <span className={isStale && isActive ? 'text-yellow-400' : ''}>
          {lastFetched}
        </span>
      </div>
    </motion.div>
  )
}
