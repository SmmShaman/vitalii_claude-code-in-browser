'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  TrendingUp, Eye, Heart, MessageCircle, Repeat2, Users, FileText,
  Trophy, RefreshCw, Download, Loader2, AlertCircle, Share2,
  ChevronUp, ChevronDown, ExternalLink, Calendar, BarChart3,
  Linkedin, Facebook, Instagram, ArrowUpRight, ArrowDownRight
} from 'lucide-react'
import { supabase, isSupabaseConfigured } from '@/integrations/supabase/client'
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend
} from 'recharts'

// ============================================================
// Types
// ============================================================

interface SocialPost {
  id: string
  content_type: string
  content_id: string
  platform: string
  platform_post_id: string | null
  platform_post_url: string | null
  language: string
  status: string
  post_content: string | null
  impressions_count: number
  reach_count: number
  likes_count: number
  comments_count: number
  shares_count: number
  saves_count: number
  views_count: number
  engagement_rate: number | null
  posted_at: string | null
  last_synced_at: string | null
  // Joined content
  news?: { title_en: string; slug_en: string } | null
  blog?: { title_en: string; slug_en: string } | null
}

interface AnalyticsSnapshot {
  id: string
  platform: string
  snapshot_date: string
  total_posts: number
  total_impressions: number
  total_reach: number
  total_likes: number
  total_comments: number
  total_shares: number
  total_saves: number
  total_views: number
  avg_engagement_rate: number | null
}

interface FollowerRecord {
  id: string
  platform: string
  follower_count: number
  recorded_date: string
}

type PeriodType = '7d' | '30d' | '90d' | 'ytd' | 'all'
type SortField = 'impressions_count' | 'likes_count' | 'comments_count' | 'shares_count' | 'engagement_rate' | 'posted_at'

// ============================================================
// Constants
// ============================================================

const PLATFORM_COLORS: Record<string, string> = {
  linkedin: '#0A66C2',
  facebook: '#1877F2',
  instagram: '#E4405F',
  tiktok: '#6B7280',
  all: '#8b5cf6',
}

const METRIC_COLORS = {
  impressions: '#8b5cf6',
  likes: '#ef4444',
  comments: '#eab308',
  shares: '#22c55e',
}

const CHART_THEME = {
  axisColor: 'rgba(255,255,255,0.4)',
  gridColor: 'rgba(255,255,255,0.08)',
}

const PERIODS: { id: PeriodType; label: string }[] = [
  { id: '7d', label: '7D' },
  { id: '30d', label: '30D' },
  { id: '90d', label: '90D' },
  { id: 'ytd', label: 'YTD' },
  { id: 'all', label: 'All' },
]

const PlatformIcon = ({ platform, className }: { platform: string; className?: string }) => {
  switch (platform) {
    case 'linkedin': return <Linkedin className={className} />
    case 'facebook': return <Facebook className={className} />
    case 'instagram': return <Instagram className={className} />
    default: return <Share2 className={className} />
  }
}

// ============================================================
// Helpers
// ============================================================

function getCutoffDate(period: PeriodType): string {
  const d = new Date()
  switch (period) {
    case '7d': d.setDate(d.getDate() - 7); break
    case '30d': d.setDate(d.getDate() - 30); break
    case '90d': d.setDate(d.getDate() - 90); break
    case 'ytd': d.setMonth(0, 1); d.setHours(0, 0, 0, 0); break
    case 'all': d.setFullYear(2020); break
  }
  return d.toISOString()
}

function getPreviousPeriodRange(period: PeriodType): { from: string; to: string } {
  const to = new Date()
  const from = new Date()
  switch (period) {
    case '7d': to.setDate(to.getDate() - 7); from.setDate(from.getDate() - 14); break
    case '30d': to.setDate(to.getDate() - 30); from.setDate(from.getDate() - 60); break
    case '90d': to.setDate(to.getDate() - 90); from.setDate(from.getDate() - 180); break
    case 'ytd': {
      const yr = new Date().getFullYear()
      to.setFullYear(yr - 1, 0, 1)
      from.setFullYear(yr - 1, 0, 1)
      const now = new Date()
      const dayOfYear = Math.floor((now.getTime() - new Date(yr, 0, 1).getTime()) / 86400000)
      from.setFullYear(yr - 1, 0, 1)
      to.setFullYear(yr - 1)
      to.setDate(to.getDate() + dayOfYear)
      break
    }
    case 'all': return { from: '2020-01-01T00:00:00Z', to: '2020-01-01T00:00:00Z' }
  }
  return { from: from.toISOString(), to: to.toISOString() }
}

function formatNumber(n: number): string {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`
  return String(n)
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })
}

function getPostTitle(post: SocialPost): string {
  return post.news?.title_en || post.blog?.title_en || post.post_content?.substring(0, 50) || 'Untitled'
}

// ============================================================
// Custom Tooltip for Charts
// ============================================================

const ChartTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-gray-900 border border-white/20 rounded-lg px-3 py-2 text-xs shadow-xl">
      <div className="font-bold text-white mb-1">{label}</div>
      {payload.map((entry: any) => (
        <div key={entry.name} className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
          <span className="text-gray-300">{entry.name}:</span>
          <span className="text-white font-medium">{formatNumber(entry.value)}</span>
        </div>
      ))}
    </div>
  )
}

// ============================================================
// Main Component
// ============================================================

export function SocialAnalyticsDashboard() {
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [period, setPeriod] = useState<PeriodType>('30d')
  const [platformFilter, setPlatformFilter] = useState<string>('all')
  const [posts, setPosts] = useState<SocialPost[]>([])
  const [prevPosts, setPrevPosts] = useState<any[]>([])
  const [snapshots, setSnapshots] = useState<AnalyticsSnapshot[]>([])
  const [followers, setFollowers] = useState<FollowerRecord[]>([])
  const [sortBy, setSortBy] = useState<SortField>('impressions_count')
  const [sortDesc, setSortDesc] = useState(true)
  const [showAllPosts, setShowAllPosts] = useState(false)
  const [visibleMetrics, setVisibleMetrics] = useState({
    impressions: true,
    likes: true,
    comments: true,
    shares: true,
  })

  // ============================================================
  // Data Loading
  // ============================================================

  const loadAnalytics = useCallback(async () => {
    if (!isSupabaseConfigured()) {
      setPosts([])
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)

      const cutoff = getCutoffDate(period)
      const prevRange = getPreviousPeriodRange(period)

      // Fetch current period posts, snapshots, followers in parallel
      const [postsResult, prevPostsResult, snapshotsResult, followersResult] = await Promise.all([
        supabase.from('social_media_posts').select('*')
          .eq('status', 'posted')
          .gte('posted_at', cutoff)
          .order('posted_at', { ascending: false }),
        supabase.from('social_media_posts').select('impressions_count, likes_count, comments_count, shares_count, views_count, engagement_rate, platform')
          .eq('status', 'posted')
          .gte('posted_at', prevRange.from)
          .lte('posted_at', prevRange.to),
        supabase.from('analytics_snapshots').select('*')
          .gte('snapshot_date', cutoff)
          .order('snapshot_date', { ascending: true }),
        supabase.from('follower_history').select('*')
          .gte('recorded_date', cutoff)
          .order('recorded_date', { ascending: true }),
      ])

      if (postsResult.error) throw postsResult.error

      // Fetch content titles for posts
      const allPosts = postsResult.data || []
      const newsIds = [...new Set(allPosts.filter(p => p.content_type === 'news' && p.content_id).map(p => p.content_id))]
      const blogIds = [...new Set(allPosts.filter(p => p.content_type === 'blog' && p.content_id).map(p => p.content_id))]

      const [newsResult, blogResult] = await Promise.all([
        newsIds.length > 0
          ? supabase.from('news').select('id, title_en, slug_en').in('id', newsIds)
          : { data: [] },
        blogIds.length > 0
          ? supabase.from('blog_posts').select('id, title_en, slug_en').in('id', blogIds)
          : { data: [] },
      ])

      const newsMap = new Map((newsResult.data || []).map(n => [n.id, n]))
      const blogMap = new Map((blogResult.data || []).map(b => [b.id, b]))

      const postsWithContent = allPosts.map(post => ({
        ...post,
        news: post.content_type === 'news' && post.content_id ? newsMap.get(post.content_id) || null : null,
        blog: post.content_type === 'blog' && post.content_id ? blogMap.get(post.content_id) || null : null,
      }))

      setPosts(postsWithContent)
      setPrevPosts(prevPostsResult.data || [])
      setSnapshots(snapshotsResult.data || [])
      setFollowers(followersResult.data || [])
    } catch (err: any) {
      console.error('Analytics load error:', err)
      setError(err.message || 'Failed to load analytics')
    } finally {
      setLoading(false)
    }
  }, [period])

  useEffect(() => {
    loadAnalytics()
  }, [loadAnalytics])

  // ============================================================
  // Computed Data
  // ============================================================

  const filteredPosts = useMemo(() => {
    if (platformFilter === 'all') return posts
    return posts.filter(p => p.platform === platformFilter)
  }, [posts, platformFilter])

  const filteredPrevPosts = useMemo(() => {
    if (platformFilter === 'all') return prevPosts
    return prevPosts.filter((p: any) => p.platform === platformFilter)
  }, [prevPosts, platformFilter])

  // Summary stats
  const stats = useMemo(() => {
    const totalImpressions = filteredPosts.reduce((s, p) => s + (p.impressions_count || 0), 0)
    const totalLikes = filteredPosts.reduce((s, p) => s + (p.likes_count || 0), 0)
    const totalComments = filteredPosts.reduce((s, p) => s + (p.comments_count || 0), 0)
    const totalShares = filteredPosts.reduce((s, p) => s + (p.shares_count || 0), 0)
    const totalEngagement = totalLikes + totalComments + totalShares
    const postsWithRate = filteredPosts.filter(p => p.engagement_rate != null && p.engagement_rate > 0)
    const avgEngRate = postsWithRate.length > 0
      ? postsWithRate.reduce((s, p) => s + (p.engagement_rate || 0), 0) / postsWithRate.length
      : 0
    const bestPost = filteredPosts.reduce<SocialPost | null>((best, p) =>
      (p.impressions_count || 0) > (best?.impressions_count || 0) ? p : best
    , null)

    // Previous period for % change
    const prevImpressions = filteredPrevPosts.reduce((s: number, p: any) => s + (p.impressions_count || 0), 0)
    const prevEngagement = filteredPrevPosts.reduce((s: number, p: any) => s + (p.likes_count || 0) + (p.comments_count || 0) + (p.shares_count || 0), 0)

    return {
      totalImpressions,
      totalEngagement,
      avgEngRate,
      totalPosts: filteredPosts.length,
      bestPost,
      prevImpressions,
      prevEngagement,
      prevPosts: filteredPrevPosts.length,
    }
  }, [filteredPosts, filteredPrevPosts])

  // Latest follower counts
  const latestFollowers = useMemo(() => {
    const map: Record<string, number> = {}
    for (const f of followers) {
      map[f.platform] = f.follower_count
    }
    return map
  }, [followers])

  // Engagement over time chart data
  const engagementChartData = useMemo(() => {
    const filtered = platformFilter === 'all'
      ? snapshots.filter(s => s.platform === 'all')
      : snapshots.filter(s => s.platform === platformFilter)

    return filtered.map(s => ({
      date: formatDate(s.snapshot_date),
      impressions: s.total_impressions,
      likes: s.total_likes,
      comments: s.total_comments,
      shares: s.total_shares,
    }))
  }, [snapshots, platformFilter])

  // Follower growth chart data
  const followerChartData = useMemo(() => {
    const dateMap = new Map<string, Record<string, number>>()
    for (const f of followers) {
      const key = f.recorded_date
      if (!dateMap.has(key)) dateMap.set(key, {})
      dateMap.get(key)![f.platform] = f.follower_count
    }
    return Array.from(dateMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, platforms]) => ({
        date: formatDate(date),
        ...platforms,
      }))
  }, [followers])

  // Platform comparison
  const platformComparison = useMemo(() => {
    const platforms = ['linkedin', 'facebook', 'instagram'] as const
    return platforms.map(p => {
      const platPosts = posts.filter(post => post.platform === p)
      const engagement = platPosts.reduce((s, post) =>
        s + (post.likes_count || 0) + (post.comments_count || 0) + (post.shares_count || 0), 0)
      const impressions = platPosts.reduce((s, post) => s + (post.impressions_count || 0), 0)
      return { platform: p, engagement, impressions, posts: platPosts.length }
    }).filter(p => p.posts > 0)
  }, [posts])

  // Posting frequency
  const postingFrequency = useMemo(() => {
    const dayMap = new Map<string, number>()
    for (const p of filteredPosts) {
      if (!p.posted_at) continue
      const day = p.posted_at.split('T')[0]
      dayMap.set(day, (dayMap.get(day) || 0) + 1)
    }
    return Array.from(dayMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, count]) => ({ date: formatDate(date), posts: count }))
  }, [filteredPosts])

  // Sorted top posts
  const topPosts = useMemo(() => {
    const sorted = [...filteredPosts].sort((a, b) => {
      const aVal = (a[sortBy] as number) ?? 0
      const bVal = (b[sortBy] as number) ?? 0
      return sortDesc ? bVal - aVal : aVal - bVal
    })
    return showAllPosts ? sorted : sorted.slice(0, 15)
  }, [filteredPosts, sortBy, sortDesc, showAllPosts])

  // ============================================================
  // Handlers
  // ============================================================

  const handleSort = (field: SortField) => {
    if (sortBy === field) setSortDesc(!sortDesc)
    else { setSortBy(field); setSortDesc(true) }
  }

  const handleManualSync = async () => {
    setSyncing(true)
    try {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
      const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      if (!supabaseUrl || !supabaseAnonKey) throw new Error('Supabase not configured')

      const response = await fetch(`${supabaseUrl}/functions/v1/sync-social-metrics`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${supabaseAnonKey}`,
          'Content-Type': 'application/json',
        },
      })

      const data = await response.json()
      if (!data.success) throw new Error(data.error || 'Sync failed')

      console.log('Metrics synced:', data)
      await loadAnalytics()
    } catch (err: any) {
      setError(`Sync failed: ${err.message}`)
    } finally {
      setSyncing(false)
    }
  }

  const exportCSV = () => {
    const headers = ['Platform', 'Type', 'Title', 'Language', 'Date', 'Impressions', 'Reach', 'Likes', 'Comments', 'Shares', 'Saves', 'Engagement Rate', 'URL']
    const rows = filteredPosts.map(p => [
      p.platform,
      p.content_type,
      `"${getPostTitle(p).replace(/"/g, '""')}"`,
      p.language,
      p.posted_at?.split('T')[0] || '',
      p.impressions_count || 0,
      p.reach_count || 0,
      p.likes_count || 0,
      p.comments_count || 0,
      p.shares_count || 0,
      p.saves_count || 0,
      p.engagement_rate?.toFixed(2) || '0',
      p.platform_post_url || '',
    ])
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `social-analytics-${period}-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const toggleMetric = (key: keyof typeof visibleMetrics) => {
    setVisibleMetrics(prev => ({ ...prev, [key]: !prev[key] }))
  }

  // ============================================================
  // Percent change helper
  // ============================================================

  const ChangeIndicator = ({ current, previous }: { current: number; previous: number }) => {
    if (previous === 0) return null
    const pct = ((current - previous) / previous) * 100
    const isUp = pct >= 0
    return (
      <span className={`flex items-center gap-0.5 text-xs ${isUp ? 'text-green-400' : 'text-red-400'}`}>
        {isUp ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
        {Math.abs(pct).toFixed(1)}%
      </span>
    )
  }

  // ============================================================
  // Render
  // ============================================================

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-10 w-10 animate-spin text-purple-400" />
          <p className="text-gray-400">Loading analytics...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-br from-purple-600/20 to-indigo-800/20 backdrop-blur-lg rounded-xl p-6 border border-purple-500/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-purple-500/30 rounded-lg">
              <TrendingUp className="h-8 w-8 text-purple-400" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">Social Analytics</h2>
              <p className="text-gray-300">Engagement metrics across all platforms</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={exportCSV}
              className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-white text-sm transition-colors"
            >
              <Download className="h-4 w-4" />
              CSV
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleManualSync}
              disabled={syncing}
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-500 rounded-lg text-white text-sm transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
              {syncing ? 'Syncing...' : 'Sync Now'}
            </motion.button>
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-red-400 flex-shrink-0" />
            <p className="text-red-200 text-sm">{error}</p>
          </div>
        </div>
      )}

      {/* Period + Platform Filters */}
      <div className="flex flex-wrap items-center gap-4">
        {/* Period */}
        <div className="flex items-center gap-1 bg-white/5 rounded-lg p-1">
          {PERIODS.map(p => (
            <button
              key={p.id}
              onClick={() => setPeriod(p.id)}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                period === p.id
                  ? 'bg-purple-600 text-white'
                  : 'text-gray-400 hover:text-white hover:bg-white/10'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Platform */}
        <div className="flex items-center gap-1 bg-white/5 rounded-lg p-1">
          <button
            onClick={() => setPlatformFilter('all')}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              platformFilter === 'all'
                ? 'bg-purple-600 text-white'
                : 'text-gray-400 hover:text-white hover:bg-white/10'
            }`}
          >
            All
          </button>
          {(['linkedin', 'facebook', 'instagram'] as const).map(p => (
            <button
              key={p}
              onClick={() => setPlatformFilter(p)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                platformFilter === p
                  ? 'text-white'
                  : 'text-gray-400 hover:text-white hover:bg-white/10'
              }`}
              style={platformFilter === p ? { backgroundColor: PLATFORM_COLORS[p] } : undefined}
            >
              <PlatformIcon platform={p} className="h-3.5 w-3.5" />
              {p.charAt(0).toUpperCase() + p.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {/* Total Impressions */}
        <div className="bg-white/10 backdrop-blur-lg rounded-xl p-4 border border-white/20">
          <div className="flex items-center gap-2 mb-2">
            <Eye className="h-4 w-4 text-purple-400" />
            <span className="text-gray-400 text-xs">Impressions</span>
          </div>
          <p className="text-2xl font-bold text-white">{formatNumber(stats.totalImpressions)}</p>
          <ChangeIndicator current={stats.totalImpressions} previous={stats.prevImpressions} />
        </div>

        {/* Total Engagement */}
        <div className="bg-white/10 backdrop-blur-lg rounded-xl p-4 border border-white/20">
          <div className="flex items-center gap-2 mb-2">
            <Heart className="h-4 w-4 text-red-400" />
            <span className="text-gray-400 text-xs">Engagement</span>
          </div>
          <p className="text-2xl font-bold text-white">{formatNumber(stats.totalEngagement)}</p>
          <ChangeIndicator current={stats.totalEngagement} previous={stats.prevEngagement} />
        </div>

        {/* Avg Engagement Rate */}
        <div className="bg-white/10 backdrop-blur-lg rounded-xl p-4 border border-white/20">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="h-4 w-4 text-green-400" />
            <span className="text-gray-400 text-xs">Avg Rate</span>
          </div>
          <p className="text-2xl font-bold text-white">{stats.avgEngRate.toFixed(2)}%</p>
        </div>

        {/* Followers */}
        <div className="bg-white/10 backdrop-blur-lg rounded-xl p-4 border border-white/20">
          <div className="flex items-center gap-2 mb-2">
            <Users className="h-4 w-4 text-blue-400" />
            <span className="text-gray-400 text-xs">Followers</span>
          </div>
          <p className="text-2xl font-bold text-white">
            {formatNumber(Object.values(latestFollowers).reduce((s, v) => s + v, 0))}
          </p>
          <div className="flex gap-2 mt-1 text-[10px]">
            {Object.entries(latestFollowers).map(([p, count]) => (
              <span key={p} style={{ color: PLATFORM_COLORS[p] }}>{count}</span>
            ))}
          </div>
        </div>

        {/* Posts This Period */}
        <div className="bg-white/10 backdrop-blur-lg rounded-xl p-4 border border-white/20">
          <div className="flex items-center gap-2 mb-2">
            <FileText className="h-4 w-4 text-yellow-400" />
            <span className="text-gray-400 text-xs">Posts</span>
          </div>
          <p className="text-2xl font-bold text-white">{stats.totalPosts}</p>
          <ChangeIndicator current={stats.totalPosts} previous={stats.prevPosts} />
        </div>

        {/* Best Post */}
        <div className="bg-white/10 backdrop-blur-lg rounded-xl p-4 border border-white/20">
          <div className="flex items-center gap-2 mb-2">
            <Trophy className="h-4 w-4 text-amber-400" />
            <span className="text-gray-400 text-xs">Top Post</span>
          </div>
          {stats.bestPost ? (
            <>
              <p className="text-sm font-medium text-white truncate" title={getPostTitle(stats.bestPost)}>
                {getPostTitle(stats.bestPost).substring(0, 30)}
              </p>
              <div className="flex items-center gap-1 mt-1">
                <span style={{ color: PLATFORM_COLORS[stats.bestPost.platform] }}>
                  <PlatformIcon platform={stats.bestPost.platform} className="h-3 w-3" />
                </span>
                <span className="text-xs text-gray-400">{formatNumber(stats.bestPost.impressions_count)} impr</span>
              </div>
            </>
          ) : (
            <p className="text-sm text-gray-500">No data</p>
          )}
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Engagement Over Time */}
        <div className="bg-white/10 backdrop-blur-lg rounded-xl p-4 border border-white/20">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white">Engagement Over Time</h3>
            <div className="flex gap-2">
              {(Object.keys(METRIC_COLORS) as (keyof typeof METRIC_COLORS)[]).map(key => (
                <button
                  key={key}
                  onClick={() => toggleMetric(key)}
                  className={`px-2 py-0.5 rounded text-[10px] font-medium transition-all ${
                    visibleMetrics[key] ? 'opacity-100' : 'opacity-40'
                  }`}
                  style={{ backgroundColor: `${METRIC_COLORS[key]}30`, color: METRIC_COLORS[key] }}
                >
                  {key}
                </button>
              ))}
            </div>
          </div>
          {engagementChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={engagementChartData}>
                <CartesianGrid stroke={CHART_THEME.gridColor} strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={{ fill: CHART_THEME.axisColor, fontSize: 11 }} />
                <YAxis tick={{ fill: CHART_THEME.axisColor, fontSize: 11 }} />
                <Tooltip content={<ChartTooltip />} />
                {visibleMetrics.impressions && <Line type="monotone" dataKey="impressions" stroke={METRIC_COLORS.impressions} strokeWidth={2} dot={false} />}
                {visibleMetrics.likes && <Line type="monotone" dataKey="likes" stroke={METRIC_COLORS.likes} strokeWidth={2} dot={false} />}
                {visibleMetrics.comments && <Line type="monotone" dataKey="comments" stroke={METRIC_COLORS.comments} strokeWidth={2} dot={false} />}
                {visibleMetrics.shares && <Line type="monotone" dataKey="shares" stroke={METRIC_COLORS.shares} strokeWidth={2} dot={false} />}
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[280px] text-gray-500 text-sm">
              No snapshot data yet. Run a sync to start collecting.
            </div>
          )}
        </div>

        {/* Follower Growth */}
        <div className="bg-white/10 backdrop-blur-lg rounded-xl p-4 border border-white/20">
          <h3 className="text-lg font-semibold text-white mb-4">Follower Growth</h3>
          {followerChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={followerChartData}>
                <CartesianGrid stroke={CHART_THEME.gridColor} strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={{ fill: CHART_THEME.axisColor, fontSize: 11 }} />
                <YAxis tick={{ fill: CHART_THEME.axisColor, fontSize: 11 }} />
                <Tooltip content={<ChartTooltip />} />
                <Legend wrapperStyle={{ color: 'white', fontSize: 12 }} />
                {['linkedin', 'facebook', 'instagram'].map(p => (
                  <Line key={p} type="monotone" dataKey={p} stroke={PLATFORM_COLORS[p]} strokeWidth={2} dot={false} name={p.charAt(0).toUpperCase() + p.slice(1)} />
                ))}
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[280px] text-gray-500 text-sm">
              No follower data yet. Run a sync to start tracking.
            </div>
          )}
        </div>

        {/* Platform Comparison */}
        <div className="bg-white/10 backdrop-blur-lg rounded-xl p-4 border border-white/20">
          <h3 className="text-lg font-semibold text-white mb-4">Platform Comparison</h3>
          {platformComparison.length > 0 ? (
            <div className="space-y-3">
              {platformComparison
                .sort((a, b) => b.engagement - a.engagement)
                .map(p => {
                  const maxEng = Math.max(...platformComparison.map(x => x.engagement))
                  const pct = maxEng > 0 ? (p.engagement / maxEng) * 100 : 0
                  return (
                    <div key={p.platform}>
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <PlatformIcon platform={p.platform} className="h-4 w-4" />
                          <span className="text-sm text-white capitalize">{p.platform}</span>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-gray-400">
                          <span>{p.posts} posts</span>
                          <span>{formatNumber(p.impressions)} impr</span>
                          <span className="text-white font-medium">{formatNumber(p.engagement)} eng</span>
                        </div>
                      </div>
                      <div className="w-full bg-white/5 rounded-full h-2.5">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${pct}%` }}
                          transition={{ duration: 0.8, ease: 'easeOut' }}
                          className="h-2.5 rounded-full"
                          style={{ backgroundColor: PLATFORM_COLORS[p.platform] }}
                        />
                      </div>
                    </div>
                  )
                })}
            </div>
          ) : (
            <div className="flex items-center justify-center h-32 text-gray-500 text-sm">
              No platform data available
            </div>
          )}
        </div>

        {/* Posting Frequency */}
        <div className="bg-white/10 backdrop-blur-lg rounded-xl p-4 border border-white/20">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white">Posting Frequency</h3>
            {postingFrequency.length > 0 && (
              <span className="text-xs text-gray-400">
                Avg {(filteredPosts.length / Math.max(postingFrequency.length, 1)).toFixed(1)} posts/day
              </span>
            )}
          </div>
          {postingFrequency.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={postingFrequency}>
                <CartesianGrid stroke={CHART_THEME.gridColor} strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={{ fill: CHART_THEME.axisColor, fontSize: 10 }} />
                <YAxis tick={{ fill: CHART_THEME.axisColor, fontSize: 11 }} allowDecimals={false} />
                <Tooltip content={<ChartTooltip />} />
                <Bar dataKey="posts" fill="#8b5cf6" radius={[4, 4, 0, 0]} name="Posts" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[200px] text-gray-500 text-sm">
              No posting data for this period
            </div>
          )}
        </div>
      </div>

      {/* Top Posts Table */}
      <div className="bg-white/10 backdrop-blur-lg rounded-xl border border-white/20 overflow-hidden">
        <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-white">Top Posts</h3>
          <span className="text-xs text-gray-400">{filteredPosts.length} posts</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10">
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400">#</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400">Platform</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400">Post</th>
                <SortableHeader field="posted_at" label="Date" current={sortBy} desc={sortDesc} onClick={handleSort} />
                <SortableHeader field="impressions_count" label="Impressions" current={sortBy} desc={sortDesc} onClick={handleSort} />
                <SortableHeader field="likes_count" label="Likes" current={sortBy} desc={sortDesc} onClick={handleSort} />
                <SortableHeader field="comments_count" label="Comments" current={sortBy} desc={sortDesc} onClick={handleSort} />
                <SortableHeader field="shares_count" label="Shares" current={sortBy} desc={sortDesc} onClick={handleSort} />
                <SortableHeader field="engagement_rate" label="Rate" current={sortBy} desc={sortDesc} onClick={handleSort} />
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400">Link</th>
              </tr>
            </thead>
            <tbody>
              <AnimatePresence>
                {topPosts.map((post, i) => (
                  <motion.tr
                    key={post.id}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.02 }}
                    className="border-b border-white/5 hover:bg-white/5"
                  >
                    <td className="px-4 py-2.5 text-sm text-gray-500">{i + 1}</td>
                    <td className="px-4 py-2.5">
                      <PlatformIcon platform={post.platform} className="h-4 w-4" />
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="max-w-[200px]">
                        <p className="text-sm text-white truncate" title={getPostTitle(post)}>
                          {getPostTitle(post)}
                        </p>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                          post.content_type === 'news' ? 'bg-blue-500/20 text-blue-400' : 'bg-purple-500/20 text-purple-400'
                        }`}>
                          {post.content_type} / {post.language}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-2.5 text-sm text-gray-400">
                      {post.posted_at ? formatDate(post.posted_at) : '-'}
                    </td>
                    <td className="px-4 py-2.5 text-sm text-white font-medium">{formatNumber(post.impressions_count || 0)}</td>
                    <td className="px-4 py-2.5 text-sm text-red-400">{post.likes_count || 0}</td>
                    <td className="px-4 py-2.5 text-sm text-yellow-400">{post.comments_count || 0}</td>
                    <td className="px-4 py-2.5 text-sm text-green-400">{post.shares_count || 0}</td>
                    <td className="px-4 py-2.5 text-sm text-white">
                      {post.engagement_rate != null ? `${post.engagement_rate.toFixed(2)}%` : '-'}
                    </td>
                    <td className="px-4 py-2.5">
                      {post.platform_post_url && (
                        <a
                          href={post.platform_post_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-purple-400 hover:text-purple-300"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      )}
                    </td>
                  </motion.tr>
                ))}
              </AnimatePresence>
            </tbody>
          </table>
        </div>
        {filteredPosts.length > 15 && (
          <div className="px-4 py-3 border-t border-white/10 text-center">
            <button
              onClick={() => setShowAllPosts(!showAllPosts)}
              className="text-sm text-purple-400 hover:text-purple-300 transition-colors"
            >
              {showAllPosts ? 'Show less' : `Show all ${filteredPosts.length} posts`}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// ============================================================
// Sortable Header Sub-component
// ============================================================

function SortableHeader({ field, label, current, desc, onClick }: {
  field: SortField
  label: string
  current: SortField
  desc: boolean
  onClick: (field: SortField) => void
}) {
  const isActive = current === field
  return (
    <th
      className="px-4 py-3 text-left text-xs font-medium text-gray-400 cursor-pointer hover:text-white transition-colors select-none"
      onClick={() => onClick(field)}
    >
      <div className="flex items-center gap-1">
        {label}
        {isActive && (desc ? <ChevronDown className="h-3 w-3" /> : <ChevronUp className="h-3 w-3" />)}
      </div>
    </th>
  )
}
