'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Share2,
  RefreshCw,
  ExternalLink,
  Eye,
  Heart,
  MessageCircle,
  Repeat2,
  Filter,
  ChevronDown,
  Linkedin,
  Instagram,
  AlertCircle,
  CheckCircle2,
  Trash2,
  Calendar,
  XCircle
} from 'lucide-react'
import { supabase, isSupabaseConfigured } from '@/integrations/supabase/client'
import type { SocialMediaPost, SocialPlatform, PostStatus } from '@/integrations/supabase/types'

// Facebook icon component
const Facebook = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
  </svg>
)

// TikTok icon component
const TikTok = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
  </svg>
)

interface SocialPostWithContent extends SocialMediaPost {
  news?: {
    title_en: string | null
    title_no: string | null
    title_ua: string | null
    slug_en: string | null
    slug_no: string | null
    slug_ua: string | null
  } | null
  blog_posts?: {
    title_en: string | null
    title_no: string | null
    title_ua: string | null
    slug_en: string | null
    slug_no: string | null
    slug_ua: string | null
  } | null
}

interface DailyStatRow {
  date: string
  total: number
  linkedin: number
  facebook: number
  instagram: number
  tiktok: number
}

const PLATFORMS: { id: SocialPlatform | 'all'; label: string; icon: React.ComponentType<{ className?: string }>; color: string }[] = [
  { id: 'all', label: 'All', icon: Share2, color: 'purple' },
  { id: 'linkedin', label: 'LinkedIn', icon: Linkedin, color: 'blue' },
  { id: 'facebook', label: 'Facebook', icon: Facebook, color: 'blue' },
  { id: 'instagram', label: 'Instagram', icon: Instagram, color: 'pink' },
  { id: 'tiktok', label: 'TikTok', icon: TikTok, color: 'gray' },
]

const STATUSES: { id: PostStatus | 'all'; label: string; color: string }[] = [
  { id: 'all', label: 'All', color: 'bg-white/10 text-gray-300' },
  { id: 'posted', label: 'Posted', color: 'bg-green-500/20 text-green-400' },
  { id: 'pending', label: 'Pending', color: 'bg-yellow-500/20 text-yellow-400' },
  { id: 'failed', label: 'Failed', color: 'bg-red-500/20 text-red-400' },
]

const STATUS_COLORS: Record<string, string> = {
  posted: 'bg-green-500/20 text-green-400',
  pending: 'bg-yellow-500/20 text-yellow-400',
  failed: 'bg-red-500/20 text-red-400',
  scheduled: 'bg-blue-500/20 text-blue-400',
}

export function SocialMediaPostsManager() {
  const [posts, setPosts] = useState<SocialPostWithContent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [platformFilter, setPlatformFilter] = useState<SocialPlatform | 'all'>('all')
  const [statusFilter, setStatusFilter] = useState<PostStatus | 'all'>('all')
  const [showFilters, setShowFilters] = useState(false)
  const [tablesExist, setTablesExist] = useState(true)
  const [showDailyStats, setShowDailyStats] = useState(false)
  const [dailyStats, setDailyStats] = useState<DailyStatRow[]>([])
  const [loadingStats, setLoadingStats] = useState(false)

  const loadPosts = useCallback(async () => {
    if (!isSupabaseConfigured()) {
      setPosts([])
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)

      // First check if the table exists
      const { error: tableError } = await supabase
        .from('social_media_posts')
        .select('id')
        .limit(1)

      if (tableError) {
        if (tableError.message.includes('does not exist') || tableError.code === '42P01') {
          setTablesExist(false)
          setPosts([])
          setLoading(false)
          return
        }
        throw tableError
      }

      setTablesExist(true)

      // Fetch posts (without join - content_id is polymorphic, no FK relationship)
      let query = supabase
        .from('social_media_posts')
        .select('*')
        .order('created_at', { ascending: false })

      if (platformFilter !== 'all') {
        query = query.eq('platform', platformFilter)
      }

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter)
      }

      const { data, error: fetchError } = await query.limit(300)

      if (fetchError) throw fetchError

      // Batch fetch related content to avoid N+1 queries
      const newsIds = [...new Set((data || []).filter(p => p.content_type === 'news' && p.content_id).map(p => p.content_id))]
      const blogIds = [...new Set((data || []).filter(p => p.content_type === 'blog' && p.content_id).map(p => p.content_id))]

      const newsMap = new Map<string, any>()
      const blogMap = new Map<string, any>()

      if (newsIds.length > 0) {
        const { data: newsData } = await supabase
          .from('news')
          .select('id, title_en, title_no, title_ua, slug_en, slug_no, slug_ua')
          .in('id', newsIds)
        for (const n of (newsData || [])) {
          newsMap.set(n.id, n)
        }
      }

      if (blogIds.length > 0) {
        const { data: blogData } = await supabase
          .from('blog_posts')
          .select('id, title_en, title_no, title_ua, slug_en, slug_no, slug_ua')
          .in('id', blogIds)
        for (const b of (blogData || [])) {
          blogMap.set(b.id, b)
        }
      }

      const postsWithContent: SocialPostWithContent[] = (data || []).map(post => ({
        ...post,
        news: post.content_type === 'news' && post.content_id ? newsMap.get(post.content_id) || null : null,
        blog_posts: post.content_type === 'blog' && post.content_id ? blogMap.get(post.content_id) || null : null,
      }))

      setPosts(postsWithContent)
    } catch (err) {
      console.error('Error loading social posts:', err)
      setError(err instanceof Error ? err.message : 'Failed to load posts')
    } finally {
      setLoading(false)
    }
  }, [platformFilter, statusFilter])

  const loadDailyStats = useCallback(async () => {
    if (!isSupabaseConfigured()) return

    try {
      setLoadingStats(true)
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

      const { data, error: fetchError } = await supabase
        .from('social_media_posts')
        .select('platform, posted_at')
        .eq('status', 'posted')
        .gte('posted_at', thirtyDaysAgo.toISOString())
        .order('posted_at', { ascending: false })

      if (fetchError || !data) {
        setLoadingStats(false)
        return
      }

      // Group by date
      const grouped: Record<string, DailyStatRow> = {}
      for (const post of data) {
        if (!post.posted_at) continue
        const date = new Date(post.posted_at).toISOString().split('T')[0]
        if (!grouped[date]) {
          grouped[date] = { date, total: 0, linkedin: 0, facebook: 0, instagram: 0, tiktok: 0 }
        }
        grouped[date].total++
        const platform = post.platform as keyof Pick<DailyStatRow, 'linkedin' | 'facebook' | 'instagram' | 'tiktok'>
        if (platform in grouped[date]) {
          grouped[date][platform]++
        }
      }

      setDailyStats(Object.values(grouped).sort((a, b) => b.date.localeCompare(a.date)))
    } catch (err) {
      console.error('Error loading daily stats:', err)
    } finally {
      setLoadingStats(false)
    }
  }, [])

  useEffect(() => {
    loadPosts()
  }, [loadPosts])

  useEffect(() => {
    if (showDailyStats && dailyStats.length === 0) {
      loadDailyStats()
    }
  }, [showDailyStats, dailyStats.length, loadDailyStats])

  const handleDeletePost = async (id: string) => {
    if (!confirm('Delete this social media post record?')) return
    const { error } = await supabase.from('social_media_posts').delete().eq('id', id)
    if (!error) loadPosts()
  }

  const cleanStuckPending = async () => {
    if (!confirm('Delete all pending posts older than 24 hours?')) return
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    const { error } = await supabase
      .from('social_media_posts')
      .delete()
      .eq('status', 'pending')
      .lt('created_at', cutoff)
    if (!error) loadPosts()
  }

  const getTitle = (post: SocialPostWithContent): string => {
    const content = post.content_type === 'news' ? post.news : post.blog_posts
    if (!content) return 'Untitled'

    const lang = post.language || 'en'
    const titleKey = `title_${lang}` as keyof typeof content
    return (content[titleKey] as string) || content.title_en || 'Untitled'
  }

  const getArticleUrl = (post: SocialPostWithContent): string | null => {
    const content = post.content_type === 'news' ? post.news : post.blog_posts
    if (!content) return null

    const lang = post.language || 'en'
    const slugKey = `slug_${lang}` as keyof typeof content
    const slug = (content[slugKey] as string) || content.slug_en

    if (!slug) return null

    const type = post.content_type === 'news' ? 'news' : 'blog'
    return `https://vitalii.no/${type}/${slug}`
  }

  const getPlatformIcon = (platform: string) => {
    const platformConfig = PLATFORMS.find(p => p.id === platform)
    if (!platformConfig) return Share2
    return platformConfig.icon
  }

  const formatDate = (dateStr: string | null): string => {
    if (!dateStr) return '—'
    return new Date(dateStr).toLocaleDateString('uk-UA', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const getDayLabel = (dateStr: string): string => {
    const today = new Date().toISOString().split('T')[0]
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0]
    if (dateStr === today) return 'Today'
    if (dateStr === yesterday) return 'Yesterday'
    return new Date(dateStr).toLocaleDateString('uk-UA', { day: '2-digit', month: '2-digit' })
  }

  // Statistics
  const stats = {
    total: posts.length,
    linkedin: posts.filter(p => p.platform === 'linkedin').length,
    facebook: posts.filter(p => p.platform === 'facebook').length,
    instagram: posts.filter(p => p.platform === 'instagram').length,
    tiktok: posts.filter(p => p.platform === 'tiktok').length,
    posted: posts.filter(p => p.status === 'posted').length,
    failed: posts.filter(p => p.status === 'failed').length,
  }

  const totalEngagement = posts.reduce((sum, p) =>
    sum + (p.likes_count || 0) + (p.comments_count || 0) + (p.shares_count || 0), 0
  )

  if (!isSupabaseConfigured()) {
    return (
      <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-6">
        <div className="flex items-center gap-3">
          <AlertCircle className="h-6 w-6 text-yellow-400" />
          <p className="text-yellow-200">Supabase is not configured. Please set up environment variables.</p>
        </div>
      </div>
    )
  }

  if (!tablesExist) {
    return (
      <div className="space-y-6">
        <div className="bg-gradient-to-br from-purple-600/20 to-pink-800/20 backdrop-blur-lg rounded-xl p-6 border border-purple-500/30">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-purple-500/30 rounded-lg">
              <Share2 className="h-8 w-8 text-purple-400" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">Social Media Posts</h2>
              <p className="text-gray-300">Manage posts across all social platforms</p>
            </div>
          </div>
        </div>

        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-6">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-6 w-6 text-yellow-400 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-yellow-200 mb-2">Database Tables Not Found</h3>
              <p className="text-yellow-200/80 mb-4">
                The social_media_posts table does not exist. Please apply the migrations in Supabase Dashboard.
              </p>
              <div className="bg-black/20 rounded-lg p-4 font-mono text-sm text-gray-300">
                <p className="mb-2">Run this SQL in Supabase SQL Editor:</p>
                <code className="text-green-400">
                  SELECT table_name FROM information_schema.tables<br/>
                  WHERE table_schema = &apos;public&apos;<br/>
                  AND table_name = &apos;social_media_posts&apos;;
                </code>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-br from-purple-600/20 to-pink-800/20 backdrop-blur-lg rounded-xl p-6 border border-purple-500/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-purple-500/30 rounded-lg">
              <Share2 className="h-8 w-8 text-purple-400" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">Social Media Posts</h2>
              <p className="text-gray-300">Manage posts across all social platforms</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={cleanStuckPending}
              className="flex items-center gap-2 px-4 py-2 bg-red-600/20 hover:bg-red-600/30 text-red-400 rounded-lg transition-colors"
              title="Delete all pending posts older than 24 hours"
            >
              <XCircle className="h-4 w-4" />
              Clean stuck
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors"
            >
              <Filter className="h-4 w-4" />
              Filters
              <ChevronDown className={`h-4 w-4 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={loadPosts}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </motion.button>
          </div>
        </div>
      </div>

      {/* Filters */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="bg-white/5 backdrop-blur-lg rounded-xl p-4 border border-white/10 space-y-3">
              {/* Platform filters */}
              <div>
                <span className="text-xs text-gray-500 uppercase tracking-wider mb-2 block">Platform</span>
                <div className="flex flex-wrap gap-2">
                  {PLATFORMS.map((platform) => {
                    const Icon = platform.icon
                    return (
                      <motion.button
                        key={platform.id}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setPlatformFilter(platform.id)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                          platformFilter === platform.id
                            ? 'bg-purple-600 text-white'
                            : 'bg-white/10 text-gray-300 hover:bg-white/20'
                        }`}
                      >
                        <Icon className="h-4 w-4" />
                        {platform.label}
                      </motion.button>
                    )
                  })}
                </div>
              </div>
              {/* Status filters */}
              <div>
                <span className="text-xs text-gray-500 uppercase tracking-wider mb-2 block">Status</span>
                <div className="flex flex-wrap gap-2">
                  {STATUSES.map((status) => (
                    <motion.button
                      key={status.id}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setStatusFilter(status.id)}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                        statusFilter === status.id
                          ? 'bg-purple-600 text-white'
                          : status.color
                      }`}
                    >
                      {status.label}
                    </motion.button>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-red-400" />
            <p className="text-red-200">{error}</p>
          </div>
        </div>
      )}

      {/* Statistics */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
        <div className="bg-white/10 backdrop-blur-lg rounded-xl p-4 border border-white/20">
          <div className="flex items-center gap-2 mb-2">
            <Share2 className="h-4 w-4 text-purple-400" />
            <span className="text-gray-400 text-sm">Total</span>
          </div>
          <p className="text-2xl font-bold text-white">{stats.total}</p>
        </div>
        <div className="bg-white/10 backdrop-blur-lg rounded-xl p-4 border border-white/20">
          <div className="flex items-center gap-2 mb-2">
            <Linkedin className="h-4 w-4 text-blue-400" />
            <span className="text-gray-400 text-sm">LinkedIn</span>
          </div>
          <p className="text-2xl font-bold text-blue-400">{stats.linkedin}</p>
        </div>
        <div className="bg-white/10 backdrop-blur-lg rounded-xl p-4 border border-white/20">
          <div className="flex items-center gap-2 mb-2">
            <Facebook className="h-4 w-4 text-blue-500" />
            <span className="text-gray-400 text-sm">Facebook</span>
          </div>
          <p className="text-2xl font-bold text-blue-500">{stats.facebook}</p>
        </div>
        <div className="bg-white/10 backdrop-blur-lg rounded-xl p-4 border border-white/20">
          <div className="flex items-center gap-2 mb-2">
            <Instagram className="h-4 w-4 text-pink-400" />
            <span className="text-gray-400 text-sm">Instagram</span>
          </div>
          <p className="text-2xl font-bold text-pink-400">{stats.instagram}</p>
        </div>
        <div className="bg-white/10 backdrop-blur-lg rounded-xl p-4 border border-white/20">
          <div className="flex items-center gap-2 mb-2">
            <TikTok className="h-4 w-4 text-gray-400" />
            <span className="text-gray-400 text-sm">TikTok</span>
          </div>
          <p className="text-2xl font-bold text-gray-300">{stats.tiktok}</p>
        </div>
        <div className="bg-white/10 backdrop-blur-lg rounded-xl p-4 border border-white/20">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle2 className="h-4 w-4 text-green-400" />
            <span className="text-gray-400 text-sm">Posted</span>
          </div>
          <p className="text-2xl font-bold text-green-400">{stats.posted}</p>
        </div>
        <div className="bg-white/10 backdrop-blur-lg rounded-xl p-4 border border-white/20">
          <div className="flex items-center gap-2 mb-2">
            <Heart className="h-4 w-4 text-red-400" />
            <span className="text-gray-400 text-sm">Engagement</span>
          </div>
          <p className="text-2xl font-bold text-red-400">{totalEngagement}</p>
        </div>
      </div>

      {/* Daily Stats Toggle */}
      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={() => setShowDailyStats(!showDailyStats)}
        className="flex items-center gap-2 px-4 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-colors w-full text-left"
      >
        <Calendar className="h-5 w-5 text-purple-400" />
        <span className="text-white font-medium">Daily Publication Stats</span>
        <span className="text-gray-500 text-sm ml-2">Last 30 days</span>
        <ChevronDown className={`h-4 w-4 text-gray-400 ml-auto transition-transform ${showDailyStats ? 'rotate-180' : ''}`} />
      </motion.button>

      {/* Daily Stats Table */}
      <AnimatePresence>
        {showDailyStats && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            {loadingStats ? (
              <div className="bg-white/10 backdrop-blur-lg rounded-xl p-8 border border-white/20 flex items-center justify-center">
                <RefreshCw className="h-6 w-6 text-purple-400 animate-spin" />
              </div>
            ) : dailyStats.length === 0 ? (
              <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20 text-center">
                <p className="text-gray-400">No published posts in the last 30 days.</p>
              </div>
            ) : (
              <div className="bg-white/10 backdrop-blur-lg rounded-xl border border-white/20 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-white/10">
                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">Date</th>
                        <th className="px-4 py-3 text-center text-sm font-medium text-gray-400">Total</th>
                        <th className="px-4 py-3 text-center text-sm font-medium text-blue-400">
                          <div className="flex items-center justify-center gap-1">
                            <Linkedin className="h-3.5 w-3.5" />
                            LI
                          </div>
                        </th>
                        <th className="px-4 py-3 text-center text-sm font-medium text-blue-500">
                          <div className="flex items-center justify-center gap-1">
                            <Facebook className="h-3.5 w-3.5" />
                            FB
                          </div>
                        </th>
                        <th className="px-4 py-3 text-center text-sm font-medium text-pink-400">
                          <div className="flex items-center justify-center gap-1">
                            <Instagram className="h-3.5 w-3.5" />
                            IG
                          </div>
                        </th>
                        <th className="px-4 py-3 text-center text-sm font-medium text-gray-400">
                          <div className="flex items-center justify-center gap-1">
                            <TikTok className="h-3.5 w-3.5" />
                            TT
                          </div>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {dailyStats.map((row) => (
                        <tr key={row.date} className="border-b border-white/5 hover:bg-white/5">
                          <td className="px-4 py-2.5 text-sm text-white font-medium">{getDayLabel(row.date)}</td>
                          <td className="px-4 py-2.5 text-center text-sm font-bold text-white">{row.total}</td>
                          <td className="px-4 py-2.5 text-center text-sm text-blue-400">{row.linkedin || '—'}</td>
                          <td className="px-4 py-2.5 text-center text-sm text-blue-500">{row.facebook || '—'}</td>
                          <td className="px-4 py-2.5 text-center text-sm text-pink-400">{row.instagram || '—'}</td>
                          <td className="px-4 py-2.5 text-center text-sm text-gray-400">{row.tiktok || '—'}</td>
                        </tr>
                      ))}
                      {/* Totals row */}
                      <tr className="border-t border-white/20 bg-white/5">
                        <td className="px-4 py-2.5 text-sm font-bold text-purple-400">Total (30d)</td>
                        <td className="px-4 py-2.5 text-center text-sm font-bold text-white">
                          {dailyStats.reduce((s, r) => s + r.total, 0)}
                        </td>
                        <td className="px-4 py-2.5 text-center text-sm font-bold text-blue-400">
                          {dailyStats.reduce((s, r) => s + r.linkedin, 0)}
                        </td>
                        <td className="px-4 py-2.5 text-center text-sm font-bold text-blue-500">
                          {dailyStats.reduce((s, r) => s + r.facebook, 0)}
                        </td>
                        <td className="px-4 py-2.5 text-center text-sm font-bold text-pink-400">
                          {dailyStats.reduce((s, r) => s + r.instagram, 0)}
                        </td>
                        <td className="px-4 py-2.5 text-center text-sm font-bold text-gray-400">
                          {dailyStats.reduce((s, r) => s + r.tiktok, 0)}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Posts Table */}
      {loading ? (
        <div className="bg-white/10 backdrop-blur-lg rounded-xl p-8 border border-white/20">
          <div className="flex items-center justify-center">
            <RefreshCw className="h-8 w-8 text-purple-400 animate-spin" />
          </div>
        </div>
      ) : posts.length === 0 ? (
        <div className="bg-white/10 backdrop-blur-lg rounded-xl p-8 border border-white/20 text-center">
          <Share2 className="h-12 w-12 text-gray-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-white mb-2">No posts yet</h3>
          <p className="text-gray-400">
            Social media posts will appear here after publishing content via Telegram bot.
          </p>
        </div>
      ) : (
        <div className="bg-white/10 backdrop-blur-lg rounded-xl border border-white/20 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">Platform</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">Content</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">Language</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">Status</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">Engagement</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">Posted</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">Actions</th>
                </tr>
              </thead>
              <tbody>
                <AnimatePresence>
                  {posts.map((post, index) => {
                    const PlatformIcon = getPlatformIcon(post.platform)
                    const articleUrl = getArticleUrl(post)

                    return (
                      <motion.tr
                        key={post.id}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.03 }}
                        className="border-b border-white/5 hover:bg-white/5"
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <PlatformIcon className="h-5 w-5 text-gray-300" />
                            <span className="text-white capitalize">{post.platform}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div>
                            <span className={`text-xs px-2 py-0.5 rounded ${
                              post.content_type === 'news' ? 'bg-blue-500/20 text-blue-400' : 'bg-purple-500/20 text-purple-400'
                            }`}>
                              {post.content_type}
                            </span>
                            <p className="text-white mt-1 line-clamp-1 max-w-xs">{getTitle(post)}</p>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-1 rounded text-xs font-bold ${
                            post.language === 'en' ? 'bg-green-500/20 text-green-400' :
                            post.language === 'no' ? 'bg-red-500/20 text-red-400' :
                            'bg-yellow-500/20 text-yellow-400'
                          }`}>
                            {(post.language || 'en').toUpperCase()}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${STATUS_COLORS[post.status] || 'bg-gray-500/20 text-gray-400'}`}>
                            {post.status}
                          </span>
                          {post.error_message && (
                            <p className="text-xs text-red-400 mt-1 max-w-xs truncate" title={post.error_message}>
                              {post.error_message}
                            </p>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3 text-sm text-gray-300">
                            <span className="flex items-center gap-1" title="Likes">
                              <Heart className="h-3 w-3" />
                              {post.likes_count || 0}
                            </span>
                            <span className="flex items-center gap-1" title="Comments">
                              <MessageCircle className="h-3 w-3" />
                              {post.comments_count || 0}
                            </span>
                            <span className="flex items-center gap-1" title="Shares">
                              <Repeat2 className="h-3 w-3" />
                              {post.shares_count || 0}
                            </span>
                            {post.views_count !== null && (
                              <span className="flex items-center gap-1" title="Views">
                                <Eye className="h-3 w-3" />
                                {post.views_count}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-400">
                          {formatDate(post.posted_at)}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            {post.platform_post_url && (
                              <a
                                href={post.platform_post_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-2 hover:bg-white/10 rounded-lg transition-colors text-gray-400 hover:text-white"
                                title="View on platform"
                              >
                                <ExternalLink className="h-4 w-4" />
                              </a>
                            )}
                            {articleUrl && (
                              <a
                                href={articleUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-2 hover:bg-white/10 rounded-lg transition-colors text-gray-400 hover:text-white"
                                title="View article"
                              >
                                <Eye className="h-4 w-4" />
                              </a>
                            )}
                            {(post.status === 'pending' || post.status === 'failed') && (
                              <button
                                onClick={() => handleDeletePost(post.id)}
                                className="p-2 hover:bg-red-500/20 rounded-lg transition-colors text-gray-500 hover:text-red-400"
                                title="Delete record"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </motion.tr>
                    )
                  })}
                </AnimatePresence>
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
