'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Clock, RefreshCw, CheckCircle, XCircle, Zap, AlertCircle } from 'lucide-react'
import { supabase } from '@/integrations/supabase/client'

interface NewsSource {
  id: string
  name: string
  url: string
  rss_url: string | null
  source_type: 'rss' | 'telegram' | 'web'
  is_active: boolean
  fetch_interval: number
  last_fetched_at: string | null
}

const INTERVAL_OPTIONS = [
  { value: 900, label: '15 minutes' },
  { value: 1800, label: '30 minutes' },
  { value: 3600, label: '1 hour' },
  { value: 7200, label: '2 hours' },
  { value: 21600, label: '6 hours' },
  { value: 43200, label: '12 hours' },
  { value: 86400, label: '24 hours' },
]

export const AutoPublishSettings = () => {
  const [sources, setSources] = useState<NewsSource[]>([])
  const [loading, setLoading] = useState(true)
  const [globalInterval, setGlobalInterval] = useState(3600)
  const [isTesting, setIsTesting] = useState(false)
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null)
  const [isMonitoring, setIsMonitoring] = useState(false)
  const [monitorResult, setMonitorResult] = useState<{ success: boolean; message: string; details?: any } | null>(null)

  const [selectedSourceId, setSelectedSourceId] = useState<string>('')
  const [fromDate, setFromDate] = useState<string>('')
  const [toDate, setToDate] = useState<string>('')
  const [isLoadingHistory, setIsLoadingHistory] = useState(false)
  const [historyResult, setHistoryResult] = useState<{ success: boolean; message: string; details?: any } | null>(null)

  useEffect(() => {
    loadSources()
  }, [])

  const loadSources = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('news_sources')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error

      setSources(data || [])

      if (data && data.length > 0) {
        setGlobalInterval(data[0].fetch_interval)
      }
    } catch (error) {
      console.error('Failed to load news sources:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleToggleSource = async (sourceId: string, currentActive: boolean) => {
    try {
      const { error } = await supabase
        .from('news_sources')
        .update({ is_active: !currentActive })
        .eq('id', sourceId)

      if (error) throw error
      loadSources()
    } catch (error) {
      console.error('Failed to toggle source:', error)
      alert('Error toggling source status')
    }
  }

  const handleUpdateInterval = async (sourceId: string, interval: number) => {
    try {
      const { error } = await supabase
        .from('news_sources')
        .update({ fetch_interval: interval })
        .eq('id', sourceId)

      if (error) throw error
      loadSources()
    } catch (error) {
      console.error('Failed to update interval:', error)
      alert('Error updating interval')
    }
  }

  const handleUpdateAllIntervals = async () => {
    try {
      const { error } = await supabase
        .from('news_sources')
        .update({ fetch_interval: globalInterval })
        .neq('id', '00000000-0000-0000-0000-000000000000')

      if (error) throw error
      loadSources()
      alert('Interval updated for all sources!')
    } catch (error) {
      console.error('Failed to update all intervals:', error)
      alert('Error updating intervals')
    }
  }

  const handleTestFetch = async () => {
    setIsTesting(true)
    setTestResult(null)

    try {
      const response = await fetch(
        'https://uchmopqiylywnemvjttl.supabase.co/functions/v1/fetch-news',
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json',
          },
        }
      )

      if (response.ok) {
        setTestResult({
          success: true,
          message: 'Fetch started successfully! Check for new news in 1-2 minutes.',
        })
        setTimeout(loadSources, 3000)
      } else {
        setTestResult({
          success: false,
          message: `Edge Function not found or not working. Status: ${response.status}`,
        })
      }
    } catch (error) {
      setTestResult({
        success: false,
        message: 'Connection error. Edge Function may not exist.',
      })
    } finally {
      setIsTesting(false)
    }
  }

  const handleTelegramMonitor = async () => {
    setIsMonitoring(true)
    setMonitorResult(null)

    try {
      const response = await fetch(
        'https://uchmopqiylywnemvjttl.supabase.co/functions/v1/telegram-scraper',
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json',
          },
        }
      )

      if (response.ok) {
        const data = await response.json()
        setMonitorResult({
          success: true,
          message: `Telegram monitoring complete! Processed: ${data.totalProcessed} posts`,
          details: data.results,
        })
        setTimeout(loadSources, 3000)
      } else {
        setMonitorResult({
          success: false,
          message: `Telegram Scraper not working. Status: ${response.status}. Check if function is deployed.`,
        })
      }
    } catch (error) {
      setMonitorResult({
        success: false,
        message: 'Connection error. Make sure telegram-scraper is deployed.',
      })
    } finally {
      setIsMonitoring(false)
    }
  }

  const handleLoadHistoricalPosts = async () => {
    if (!selectedSourceId) {
      setHistoryResult({ success: false, message: 'Please select a source' })
      return
    }

    if (!fromDate) {
      setHistoryResult({ success: false, message: 'Please specify start date' })
      return
    }

    setIsLoadingHistory(true)
    setHistoryResult(null)

    try {
      const requestBody: any = {
        source_id: selectedSourceId,
        from_date: fromDate,
      }

      if (toDate) {
        requestBody.to_date = toDate
      }

      const response = await fetch(
        'https://uchmopqiylywnemvjttl.supabase.co/functions/v1/telegram-scraper',
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
        }
      )

      if (response.ok) {
        const data = await response.json()
        setHistoryResult({
          success: true,
          message: `Historical load complete! Processed: ${data.totalProcessed} posts`,
          details: data.results,
        })
        setTimeout(loadSources, 3000)
      } else {
        setHistoryResult({
          success: false,
          message: `Loading error. Status: ${response.status}`,
        })
      }
    } catch (error) {
      setHistoryResult({
        success: false,
        message: 'Connection error loading historical posts',
      })
    } finally {
      setIsLoadingHistory(false)
    }
  }

  const formatLastFetch = (timestamp: string | null) => {
    if (!timestamp) return 'Never'
    const date = new Date(timestamp)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMins / 60)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins} min ago`
    if (diffHours < 24) return `${diffHours} hrs ago`
    return date.toLocaleDateString()
  }

  const getNextFetchTime = (interval: number) => {
    const now = new Date()
    const next = new Date(now.getTime() + interval * 1000)
    return next.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
      </div>
    )
  }

  const activeCount = sources.filter(s => s.is_active).length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-3">
            <Clock className="h-7 w-7" />
            Auto Publish Settings
          </h2>
          <p className="text-gray-300 text-sm mt-1">
            Manage schedule and sources for automatic news loading
          </p>
        </div>
        <div className="flex gap-3">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleTelegramMonitor}
            disabled={isMonitoring}
            className="flex items-center gap-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-700 disabled:bg-gray-600 text-white rounded-lg transition-colors"
            title="Run Telegram channel monitoring via Client API"
          >
            {isMonitoring ? (
              <>
                <RefreshCw className="h-5 w-5 animate-spin" />
                Monitoring...
              </>
            ) : (
              <>
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69.01-.03.01-.14-.07-.2-.08-.06-.19-.04-.27-.02-.12.02-1.96 1.25-5.54 3.67-.52.36-.99.53-1.39.52-.46-.01-1.34-.26-2-.48-.81-.27-1.45-.42-1.4-.88.03-.24.37-.48 1.02-.73 3.99-1.73 6.65-2.87 7.98-3.42 3.8-1.58 4.59-1.86 5.1-1.87.11 0 .36.03.53.16.14.11.18.26.2.37.01.06.03.24.02.38z"/>
                </svg>
                Telegram Monitor
              </>
            )}
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleTestFetch}
            disabled={isTesting}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 text-white rounded-lg transition-colors"
          >
            {isTesting ? (
              <>
                <RefreshCw className="h-5 w-5 animate-spin" />
                Running...
              </>
            ) : (
              <>
                <Zap className="h-5 w-5" />
                RSS Fetch
              </>
            )}
          </motion.button>
        </div>
      </div>

      {/* Test Result */}
      {testResult && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`p-4 rounded-lg border ${
            testResult.success
              ? 'bg-green-500/10 border-green-500/50 text-green-300'
              : 'bg-red-500/10 border-red-500/50 text-red-300'
          }`}
        >
          <div className="flex items-start gap-3">
            {testResult.success ? (
              <CheckCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
            ) : (
              <XCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
            )}
            <p className="text-sm">{testResult.message}</p>
          </div>
        </motion.div>
      )}

      {/* Telegram Monitor Result */}
      {monitorResult && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`p-4 rounded-lg border ${
            monitorResult.success
              ? 'bg-green-500/10 border-green-500/50 text-green-300'
              : 'bg-red-500/10 border-red-500/50 text-red-300'
          }`}
        >
          <div className="flex items-start gap-3">
            {monitorResult.success ? (
              <CheckCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
            ) : (
              <XCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
            )}
            <div className="flex-1">
              <p className="text-sm font-semibold mb-2">{monitorResult.message}</p>
              {monitorResult.details && monitorResult.details.length > 0 && (
                <div className="mt-2 space-y-1">
                  {monitorResult.details.map((result: any, index: number) => (
                    <div key={index} className="text-xs opacity-80 flex items-center gap-2">
                      <span>{result.channel}:</span>
                      {result.error ? (
                        <span className="text-red-300">{result.error}</span>
                      ) : (
                        <span>{result.processed} posts</span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </motion.div>
      )}

      {/* Historical Load Section */}
      <div className="bg-gradient-to-br from-amber-500/10 to-orange-500/10 backdrop-blur-lg rounded-lg p-6 border border-amber-500/30">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <svg className="h-5 w-5 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Historical Post Loading
        </h3>
        <p className="text-sm text-gray-300 mb-4">
          Load old posts from a Telegram channel for a specific time period.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm text-gray-300 mb-2">Select Telegram source:</label>
            <select
              value={selectedSourceId}
              onChange={(e) => setSelectedSourceId(e.target.value)}
              className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
            >
              <option value="" className="bg-gray-800">-- Select channel --</option>
              {sources
                .filter(s => s.source_type === 'telegram')
                .map(source => (
                  <option key={source.id} value={source.id} className="bg-gray-800">
                    {source.name}
                  </option>
                ))}
            </select>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-sm text-gray-300 mb-2">From date (required):</label>
              <input
                type="datetime-local"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-300 mb-2">To date (optional):</label>
              <input
                type="datetime-local"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
          </div>
        </div>

        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleLoadHistoricalPosts}
          disabled={isLoadingHistory}
          className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 disabled:from-gray-600 disabled:to-gray-700 text-white rounded-lg transition-all font-semibold"
        >
          {isLoadingHistory ? (
            <>
              <RefreshCw className="h-5 w-5 animate-spin" />
              Loading historical posts...
            </>
          ) : (
            <>
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Load Historical Posts
            </>
          )}
        </motion.button>

        {/* Historical Load Result */}
        {historyResult && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`mt-4 p-4 rounded-lg border ${
              historyResult.success
                ? 'bg-green-500/10 border-green-500/50 text-green-300'
                : 'bg-red-500/10 border-red-500/50 text-red-300'
            }`}
          >
            <div className="flex items-start gap-3">
              {historyResult.success ? (
                <CheckCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
              ) : (
                <XCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
              )}
              <div className="flex-1">
                <p className="text-sm font-semibold mb-2">{historyResult.message}</p>
                {historyResult.details && historyResult.details.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {historyResult.details.map((result: any, index: number) => (
                      <div key={index} className="text-xs opacity-80 flex items-center gap-2">
                        <span>{result.channel}:</span>
                        {result.error ? (
                          <span className="text-red-300">{result.error}</span>
                        ) : (
                          <span>{result.processed} posts</span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </div>

      {/* Status Card */}
      <div className="bg-white/10 backdrop-blur-lg rounded-lg p-6 border border-white/20">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <div className="text-sm text-gray-300 mb-1">Status</div>
            <div className="text-2xl font-bold text-white flex items-center gap-2">
              {activeCount > 0 ? (
                <>
                  <CheckCircle className="h-6 w-6 text-green-400" />
                  <span>Active</span>
                </>
              ) : (
                <>
                  <XCircle className="h-6 w-6 text-red-400" />
                  <span>Disabled</span>
                </>
              )}
            </div>
          </div>
          <div>
            <div className="text-sm text-gray-300 mb-1">Active sources</div>
            <div className="text-2xl font-bold text-white">
              {activeCount} / {sources.length}
            </div>
          </div>
          <div>
            <div className="text-sm text-gray-300 mb-1">Next fetch</div>
            <div className="text-2xl font-bold text-white">
              {activeCount > 0 ? getNextFetchTime(globalInterval) : '-'}
            </div>
          </div>
        </div>
      </div>

      {/* Global Interval Settings */}
      <div className="bg-white/10 backdrop-blur-lg rounded-lg p-6 border border-white/20">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <RefreshCw className="h-5 w-5" />
          Global Interval
        </h3>
        <div className="flex items-center gap-4">
          <select
            value={globalInterval}
            onChange={(e) => setGlobalInterval(Number(e.target.value))}
            className="flex-1 px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
          >
            {INTERVAL_OPTIONS.map((option) => (
              <option key={option.value} value={option.value} className="bg-gray-800">
                {option.label}
              </option>
            ))}
          </select>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleUpdateAllIntervals}
            className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors whitespace-nowrap"
          >
            Apply to all
          </motion.button>
        </div>
        <p className="text-sm text-gray-400 mt-2">
          Set fetch interval for all active sources at once
        </p>
      </div>

      {/* Sources List */}
      <div className="bg-white/10 backdrop-blur-lg rounded-lg p-6 border border-white/20">
        <h3 className="text-lg font-semibold text-white mb-4">News Sources</h3>

        {sources.length === 0 ? (
          <div className="text-center py-8">
            <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-300">No sources configured</p>
          </div>
        ) : (
          <div className="space-y-4">
            {sources.map((source) => (
              <motion.div
                key={source.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="bg-white/5 rounded-lg p-4 border border-white/10"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h4 className="text-white font-semibold">{source.name}</h4>
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        source.source_type === 'rss'
                          ? 'bg-blue-500/20 text-blue-300'
                          : source.source_type === 'telegram'
                          ? 'bg-cyan-500/20 text-cyan-300'
                          : 'bg-purple-500/20 text-purple-300'
                      }`}>
                        {source.source_type.toUpperCase()}
                      </span>
                      {source.is_active ? (
                        <span className="px-2 py-1 bg-green-500/20 text-green-300 rounded-full text-xs">
                          Active
                        </span>
                      ) : (
                        <span className="px-2 py-1 bg-gray-500/20 text-gray-300 rounded-full text-xs">
                          Disabled
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-400 mb-2">{source.url}</p>
                    <div className="flex items-center gap-4 mt-3 text-sm">
                      <span className="text-gray-400">
                        Last fetch: {formatLastFetch(source.last_fetched_at)}
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-col gap-3 items-end">
                    <div className="flex items-center gap-2">
                      <div className="text-right">
                        <div className="text-xs text-gray-400 mb-1">Scrape interval:</div>
                        <select
                          value={source.fetch_interval}
                          onChange={(e) => handleUpdateInterval(source.id, Number(e.target.value))}
                          disabled={!source.is_active}
                          className="px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50 min-w-[140px]"
                        >
                          {INTERVAL_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value} className="bg-gray-800">
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </div>
                      <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => handleToggleSource(source.id, source.is_active)}
                        className={`p-3 rounded-lg transition-colors ${
                          source.is_active
                            ? 'bg-green-500/20 hover:bg-green-500/30 text-green-300'
                            : 'bg-gray-500/20 hover:bg-gray-500/30 text-gray-300'
                        }`}
                        title={source.is_active ? 'Disable' : 'Enable'}
                      >
                        {source.is_active ? (
                          <CheckCircle className="h-5 w-5" />
                        ) : (
                          <XCircle className="h-5 w-5" />
                        )}
                      </motion.button>
                    </div>
                    {source.is_active && (
                      <div className="text-xs text-gray-400 italic">
                        Next fetch: ~{Math.floor(source.fetch_interval / 60)} min
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Info Box */}
      <div className="bg-blue-500/10 border border-blue-500/50 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-blue-300 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-200">
            <p className="font-semibold mb-2">How it works:</p>
            <div className="space-y-3">
              <div>
                <p className="font-medium text-blue-100 mb-1">RSS Fetch:</p>
                <ul className="list-disc list-inside space-y-1 text-blue-300 ml-2">
                  <li>Cron job calls Edge Function every hour</li>
                  <li>Loads new articles from RSS sources</li>
                  <li>Supports standard RSS/Atom feeds</li>
                </ul>
              </div>
              <div>
                <p className="font-medium text-blue-100 mb-1">Telegram Monitor (Web Scraping):</p>
                <ul className="list-disc list-inside space-y-1 text-blue-300 ml-2">
                  <li>Uses web scraping of public channels via t.me/s/</li>
                  <li>Reads latest posts from telegram type channels</li>
                  <li>Works WITHOUT authorization and API credentials</li>
                  <li>Loads text, photos, publication date</li>
                </ul>
              </div>
              <div>
                <p className="font-medium text-blue-100 mb-1">Processing:</p>
                <ul className="list-disc list-inside space-y-1 text-blue-300 ml-2">
                  <li>AI automatically translates news to 3 languages</li>
                  <li>News is saved with is_published=false</li>
                  <li>You receive Telegram notification for publish confirmation</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
