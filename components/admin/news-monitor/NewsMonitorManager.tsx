'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { RefreshCw, Settings, Clock, Activity, Loader2, Bot } from 'lucide-react'
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
  } = useNewsMonitor()

  const [showAddModal, setShowAddModal] = useState(false)
  const [addModalTier, setAddModalTier] = useState<number>(3)
  const [showSettings, setShowSettings] = useState(false)
  const [refreshing, setRefreshing] = useState(false)

  const handleRefreshAll = async () => {
    setRefreshing(true)
    await fetchAllSources()
    setRefreshing(false)
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
            <span>Refresh Now</span>
          </motion.button>
        </div>
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
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {TIER_CONFIGS.map((tier) => (
          <TierColumn
            key={tier.id}
            tier={tier}
            sources={sources}
            sourceStates={sourceStates}
            onAddSource={handleAddSource}
            onDeleteSource={handleDeleteSource}
            onToggleActive={toggleSourceActive}
            onRefreshSource={fetchSource}
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
