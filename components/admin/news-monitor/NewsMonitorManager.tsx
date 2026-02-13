'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { RefreshCw, Settings, Clock, Activity, Loader2, Bot, ChevronsUp, ChevronsDown, Database } from 'lucide-react'
import { useNewsMonitor } from '@/hooks/useNewsMonitor'
import { TIER_CONFIGS } from './constants'
import { TierColumn } from './TierColumn'
import { AddSourceModal } from './AddSourceModal'
import { MonitorSettings } from './MonitorSettings'

function formatTimeAgo(date: Date | null): string {
  if (!date) return 'Never'

  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffSecs = Math.floor(diffMs / 1000)
  const diffMins = Math.floor(diffSecs / 60)

  if (diffSecs < 60) return 'Just now'
  if (diffMins < 60) return `${diffMins} min ago`
  return `${Math.floor(diffMins / 60)}h ${diffMins % 60}m ago`
}

export function NewsMonitorManager() {
  const {
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
    analysisStatus,
    reorderSources,
  } = useNewsMonitor()

  const [showAddModal, setShowAddModal] = useState(false)
  const [addModalTier, setAddModalTier] = useState<number>(3)
  const [showSettings, setShowSettings] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [syncResult, setSyncResult] = useState<{ ok: boolean; message: string } | null>(null)

  // Global expanded state for all sources (all expanded by default)
  const [expandedSources, setExpandedSources] = useState<Set<string>>(() => {
    const allSourceIds = new Set<string>()
    sources.forEach(s => allSourceIds.add(s.id))
    return allSourceIds
  })

  const collapseAll = () => setExpandedSources(new Set())
  const expandAll = () => {
    const allIds = new Set(sources.map(s => s.id))
    setExpandedSources(allIds)
  }
  const toggleSource = (id: string) => {
    setExpandedSources(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handleRefreshAll = async () => {
    setRefreshing(true)
    await fetchAllSources()
    setRefreshing(false)
  }

  const handleSyncToDb = async () => {
    setSyncing(true)
    setSyncResult(null)
    try {
      const response = await fetch('/api/trigger-rss-sync', {
        method: 'POST',
      })
      const result = await response.json()

      if (result.ok) {
        setSyncResult({
          ok: true,
          message: `Synced: ${result.articlesAnalyzed || 0} articles, ${result.qualifiedArticles || 0} qualified`
        })
      } else {
        setSyncResult({
          ok: false,
          message: result.error || 'Sync failed'
        })
      }
    } catch (error: any) {
      setSyncResult({
        ok: false,
        message: error.message || 'Network error'
      })
    } finally {
      setSyncing(false)
      // Clear result after 5 seconds
      setTimeout(() => setSyncResult(null), 5000)
    }
  }

  const handleAddSource = (tier: number) => {
    setAddModalTier(tier)
    setShowAddModal(true)
  }

  const handleDeleteSource = async (id: string) => {
    if (!confirm('Are you sure you want to delete this source?')) return
    await deleteSource(id)
  }

  const activeSources = sources.filter(s => s.isActive).length
  const totalArticles = Array.from(sourceStates.values()).reduce(
    (sum, state) => sum + (state.articles?.length || 0),
    0
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-10 w-10 animate-spin text-purple-400" />
          <p className="text-gray-400">Loading News Monitor...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-xl bg-purple-500/10">
            <Activity className="h-6 w-6 text-purple-400" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white">News Monitor</h2>
            <p className="text-gray-400 text-sm">
              Real-time RSS feed monitoring across {sources.length} sources
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Collapse/Expand All button */}
          {expandedSources.size > 0 ? (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={collapseAll}
              className="flex items-center gap-2 px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
            >
              <ChevronsUp className="h-4 w-4" />
              <span className="hidden sm:inline">Згорнути все</span>
            </motion.button>
          ) : (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={expandAll}
              className="flex items-center gap-2 px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
            >
              <ChevronsDown className="h-4 w-4" />
              <span className="hidden sm:inline">Розгорнути все</span>
            </motion.button>
          )}

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowSettings(true)}
            className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors"
          >
            <Settings className="h-4 w-4" />
            <span className="hidden sm:inline">Settings</span>
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleRefreshAll}
            disabled={refreshing}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleSyncToDb}
            disabled={syncing}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors disabled:opacity-50"
          >
            <Database className={`h-4 w-4 ${syncing ? 'animate-pulse' : ''}`} />
            <span>{syncing ? 'Syncing...' : 'Sync to DB'}</span>
          </motion.button>
        </div>

        {/* Sync Result Toast */}
        {syncResult && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className={`absolute top-20 right-4 px-4 py-2 rounded-lg ${
              syncResult.ok ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
            }`}
          >
            {syncResult.message}
          </motion.div>
        )}
      </div>

      {/* Status Bar */}
      <div className="flex flex-wrap items-center gap-6 p-4 bg-white/5 rounded-lg border border-white/10">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-gray-400" />
          <span className="text-sm text-gray-400">Last updated:</span>
          <span className="text-sm text-white">{formatTimeAgo(lastRefresh)}</span>
        </div>

        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${settings.autoRefresh ? 'bg-green-400 animate-pulse' : 'bg-gray-500'}`} />
          <span className="text-sm text-gray-400">Auto-refresh:</span>
          <span className="text-sm text-white">
            {settings.autoRefresh ? `On (${settings.refreshInterval / 60} min)` : 'Off'}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-400">Sources:</span>
          <span className="text-sm text-white">{activeSources}/{sources.length} active</span>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-400">Articles:</span>
          <span className="text-sm text-white">{totalArticles} loaded</span>
        </div>

        {/* Auto-Analyze Status */}
        <div className="flex items-center gap-2">
          <Bot className={`h-4 w-4 ${settings.autoAnalyze ? 'text-purple-400' : 'text-gray-500'}`} />
          <span className="text-sm text-gray-400">Auto-analyze:</span>
          <span className="text-sm text-white">
            {settings.autoAnalyze ? (
              analysisStatus.analyzing ? (
                <span className="text-purple-400">Analyzing...</span>
              ) : (
                `On (${analysisStatus.analyzedCount} sent)`
              )
            ) : 'Off'}
          </span>
        </div>
      </div>

      {/* Tier Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 2xl:grid-cols-4 gap-4">
        {TIER_CONFIGS.map((tier) => (
          <TierColumn
            key={tier.id}
            tier={tier}
            sources={sources}
            sourceStates={sourceStates}
            expandedSources={expandedSources}
            onToggleSource={toggleSource}
            onAddSource={handleAddSource}
            onDeleteSource={handleDeleteSource}
            onToggleActive={toggleSourceActive}
            onRefreshSource={fetchSource}
            onReorderSources={reorderSources}
          />
        ))}
      </div>

      {/* Add Source Modal */}
      <AddSourceModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onAdd={addSource}
        onValidate={validateRssUrl}
        initialTier={addModalTier}
      />

      {/* Settings Modal */}
      <MonitorSettings
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        settings={settings}
        onUpdate={updateSettings}
      />
    </div>
  )
}
