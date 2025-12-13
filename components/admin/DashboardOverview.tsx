'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Newspaper, BookOpen, Eye, TrendingUp, Play, CheckCircle, XCircle, Loader2 } from 'lucide-react'
import { supabase } from '@/integrations/supabase/client'
import { ActivityMonitor } from './ActivityMonitor'

interface Stats {
  totalNews: number
  totalBlogPosts: number
  publishedNews: number
  publishedBlogPosts: number
}

type WorkflowStatus = 'idle' | 'fetching_rss' | 'fetching_telegram' | 'complete' | 'error'

interface WorkflowLog {
  step: string
  status: 'pending' | 'running' | 'success' | 'error'
  message: string
  details?: any
}

export const DashboardOverview = () => {
  const [stats, setStats] = useState<Stats>({
    totalNews: 0,
    totalBlogPosts: 0,
    publishedNews: 0,
    publishedBlogPosts: 0,
  })
  const [loading, setLoading] = useState(true)
  const [workflowStatus, setWorkflowStatus] = useState<WorkflowStatus>('idle')
  const [workflowLogs, setWorkflowLogs] = useState<WorkflowLog[]>([])
  const [isRunning, setIsRunning] = useState(false)

  useEffect(() => {
    loadStats()
  }, [])

  const loadStats = async () => {
    try {
      setLoading(true)

      // Get news stats
      const { count: totalNews } = await supabase
        .from('news')
        .select('*', { count: 'exact', head: true })

      const { count: publishedNews } = await supabase
        .from('news')
        .select('*', { count: 'exact', head: true })
        .eq('is_published', true)

      // Get blog stats
      const { count: totalBlogPosts } = await supabase
        .from('blog_posts')
        .select('*', { count: 'exact', head: true })

      const { count: publishedBlogPosts } = await supabase
        .from('blog_posts')
        .select('*', { count: 'exact', head: true })
        .eq('is_published', true)

      setStats({
        totalNews: totalNews || 0,
        totalBlogPosts: totalBlogPosts || 0,
        publishedNews: publishedNews || 0,
        publishedBlogPosts: publishedBlogPosts || 0,
      })
    } catch (error) {
      console.error('Failed to load stats:', error)
    } finally {
      setLoading(false)
    }
  }

  const addLog = (step: string, status: WorkflowLog['status'], message: string, details?: any) => {
    setWorkflowLogs(prev => [...prev, { step, status, message, details }])
  }

  const updateLog = (step: string, status: WorkflowLog['status'], message: string, details?: any) => {
    setWorkflowLogs(prev =>
      prev.map(log =>
        log.step === step ? { ...log, status, message, details } : log
      )
    )
  }

  const startWork = async () => {
    if (isRunning) return

    setIsRunning(true)
    setWorkflowStatus('fetching_rss')
    setWorkflowLogs([])

    try {
      // Step 1: RSS Fetch
      addLog('rss', 'running', 'Checking RSS sources...')
      setWorkflowStatus('fetching_rss')

      const rssResponse = await fetch(
        'https://uchmopqiylywnemvjttl.supabase.co/functions/v1/fetch-news',
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json',
          },
        }
      )

      let rssData: any = null
      if (rssResponse.ok) {
        rssData = await rssResponse.json()
        updateLog(
          'rss',
          'success',
          `RSS completed! Found ${rssData.totalProcessed || 0} new posts`,
          rssData.results
        )
      } else {
        updateLog('rss', 'error', `RSS Error: ${rssResponse.status}`)
      }

      // Wait 2 seconds between requests
      await new Promise(resolve => setTimeout(resolve, 2000))

      // Step 2: Telegram Fetch
      addLog('telegram', 'running', 'Checking Telegram channels...')
      setWorkflowStatus('fetching_telegram')

      const telegramResponse = await fetch(
        'https://uchmopqiylywnemvjttl.supabase.co/functions/v1/telegram-scraper',
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json',
          },
        }
      )

      let telegramData: any = null
      if (telegramResponse.ok) {
        telegramData = await telegramResponse.json()
        updateLog(
          'telegram',
          'success',
          `Telegram completed! Found ${telegramData.totalProcessed || 0} new posts`,
          telegramData.results
        )
      } else {
        updateLog('telegram', 'error', `Telegram Error: ${telegramResponse.status}`)
      }

      // Complete
      setWorkflowStatus('complete')

      // Calculate total new posts from both sources
      const totalRssProcessed = rssData?.totalProcessed || 0
      const totalTelegramProcessed = telegramData?.totalProcessed || 0
      const totalNewPosts = totalRssProcessed + totalTelegramProcessed

      // Calculate AI moderation stats
      const totalApproved = (rssData?.totalApproved || 0) + (telegramData?.totalApproved || 0)
      const totalRejected = (rssData?.totalRejected || 0) + (telegramData?.totalRejected || 0)
      const totalSentToBot = (rssData?.totalSentToBot || 0) + (telegramData?.totalSentToBot || 0)

      let message = `Work completed! Found ${totalNewPosts} new posts.`
      if (totalNewPosts > 0) {
        message += `\nAI Pre-moderation: ${totalApproved} approved, ${totalRejected} rejected`
        message += `\nSent to Telegram bot: ${totalSentToBot} posts`
      }

      addLog('complete', 'success', message)

      // Reload stats and notify other components
      setTimeout(() => {
        loadStats()
        window.dispatchEvent(new CustomEvent('news-queue-updated'))
      }, 2000)

    } catch (error: any) {
      setWorkflowStatus('error')
      addLog('error', 'error', `Error: ${error.message}`)
    } finally {
      setIsRunning(false)
    }
  }

  const resetWorkflow = () => {
    setWorkflowStatus('idle')
    setWorkflowLogs([])
  }

  const statCards = [
    {
      title: 'Total News',
      value: stats.totalNews,
      icon: Newspaper,
      color: 'from-blue-500 to-blue-600',
      bgColor: 'bg-blue-500/20',
    },
    {
      title: 'Published News',
      value: stats.publishedNews,
      icon: Eye,
      color: 'from-green-500 to-green-600',
      bgColor: 'bg-green-500/20',
    },
    {
      title: 'Total Blog Posts',
      value: stats.totalBlogPosts,
      icon: BookOpen,
      color: 'from-purple-500 to-purple-600',
      bgColor: 'bg-purple-500/20',
    },
    {
      title: 'Published Posts',
      value: stats.publishedBlogPosts,
      icon: TrendingUp,
      color: 'from-orange-500 to-orange-600',
      bgColor: 'bg-orange-500/20',
    },
  ]

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
          <p className="text-white">Loading statistics...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
        <h2 className="text-2xl font-bold text-white mb-2">Welcome to Admin Panel</h2>
        <p className="text-gray-300">Manage your portfolio content from here</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((card, index) => {
          const Icon = card.icon
          return (
            <motion.div
              key={card.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20 hover:border-white/40 transition-all"
            >
              <div className="flex items-center justify-between mb-4">
                <div className={`p-3 rounded-lg ${card.bgColor}`}>
                  <Icon className="h-6 w-6 text-white" />
                </div>
              </div>
              <h3 className="text-gray-300 text-sm font-medium mb-1">{card.title}</h3>
              <p className="text-3xl font-bold text-white">{card.value}</p>
            </motion.div>
          )
        })}
      </div>

      {/* Start Work Section */}
      <div className="bg-gradient-to-br from-green-500/20 to-emerald-600/20 backdrop-blur-lg rounded-xl p-8 border border-green-500/30">
        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-20 h-20 rounded-full bg-green-500/30 flex items-center justify-center mb-4">
            <Play className="h-10 w-10 text-green-400" />
          </div>
          <h2 className="text-3xl font-bold text-white mb-2">Start Work</h2>
          <p className="text-gray-300 max-w-2xl">
            Click the button to automatically check all configured news sources (RSS and Telegram),
            run AI pre-moderation, and send approved posts to your Telegram bot for confirmation.
          </p>
        </div>

        {/* Workflow Button */}
        {workflowStatus === 'idle' && (
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={startWork}
            disabled={isRunning}
            className="w-full max-w-md mx-auto flex items-center justify-center gap-3 px-8 py-4 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 disabled:from-gray-600 disabled:to-gray-700 text-white rounded-xl transition-all font-bold text-lg shadow-lg"
          >
            <Play className="h-6 w-6" />
            Start Work
          </motion.button>
        )}

        {/* Workflow Progress */}
        {workflowStatus !== 'idle' && (
          <div className="space-y-4 mt-6">
            {/* Progress Steps */}
            <div className="bg-black/20 rounded-lg p-6 space-y-3">
              <AnimatePresence>
                {workflowLogs.map((log, index) => (
                  <motion.div
                    key={`${log.step}-${index}`}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    className="flex items-start gap-3 p-3 bg-white/5 rounded-lg"
                  >
                    {/* Status Icon */}
                    <div className="flex-shrink-0 mt-0.5">
                      {log.status === 'running' && (
                        <Loader2 className="h-5 w-5 text-blue-400 animate-spin" />
                      )}
                      {log.status === 'success' && (
                        <CheckCircle className="h-5 w-5 text-green-400" />
                      )}
                      {log.status === 'error' && (
                        <XCircle className="h-5 w-5 text-red-400" />
                      )}
                      {log.status === 'pending' && (
                        <div className="h-5 w-5 rounded-full border-2 border-gray-500" />
                      )}
                    </div>

                    {/* Message */}
                    <div className="flex-1">
                      <p className={`text-sm font-medium ${
                        log.status === 'success' ? 'text-green-300' :
                        log.status === 'error' ? 'text-red-300' :
                        log.status === 'running' ? 'text-blue-300' :
                        'text-gray-400'
                      }`}>
                        {log.message}
                      </p>

                      {/* Details */}
                      {log.details && Array.isArray(log.details) && log.details.length > 0 && (
                        <div className="mt-2 space-y-1">
                          {log.details.map((detail: any, i: number) => (
                            <div key={i} className="text-xs text-gray-400">
                              <span>{detail.source || detail.channel}: </span>
                              {detail.error ? (
                                <span className="text-red-400">{detail.error}</span>
                              ) : (
                                <span className="text-green-400">{detail.processed} posts</span>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>

            {/* Complete/Error Actions */}
            {(workflowStatus === 'complete' || workflowStatus === 'error') && (
              <div className="flex justify-center gap-4">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={resetWorkflow}
                  className="px-6 py-3 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors font-medium"
                >
                  Close
                </motion.button>
                {workflowStatus === 'complete' && (
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => {
                      resetWorkflow()
                      startWork()
                    }}
                    className="px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white rounded-lg transition-all font-medium"
                  >
                    Run Again
                  </motion.button>
                )}
              </div>
            )}

            {/* Running indicator */}
            {isRunning && (
              <div className="flex items-center justify-center gap-2 text-blue-300 text-sm">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Running...</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
        <h3 className="text-xl font-bold text-white mb-4">Quick Actions</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white/5 rounded-lg p-4 border border-white/10">
            <h4 className="text-white font-medium mb-2">News Management</h4>
            <p className="text-gray-400 text-sm">Create, edit, and publish news articles</p>
          </div>
          <div className="bg-white/5 rounded-lg p-4 border border-white/10">
            <h4 className="text-white font-medium mb-2">Blog Management</h4>
            <p className="text-gray-400 text-sm">Write and manage blog posts</p>
          </div>
        </div>
      </div>

      {/* Activity Monitor */}
      <ActivityMonitor />
    </div>
  )
}
