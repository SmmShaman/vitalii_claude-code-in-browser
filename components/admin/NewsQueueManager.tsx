'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  List, CheckCircle, XCircle,
  Search, Trash2, Clock, RefreshCw, Linkedin,
  BookOpen, Send, Bot, Filter, ChevronDown, ChevronUp,
  ExternalLink, Image as ImageIcon, Video, AlertCircle
} from 'lucide-react'
import { supabase } from '@/integrations/supabase/client'

interface NewsItem {
  id: string
  original_title: string
  original_content: string
  title_en: string | null
  description_en: string | null
  slug_en: string | null
  image_url: string | null
  images: string[] | null
  video_url: string | null
  video_type: string | null
  original_url: string | null
  source_link: string | null
  created_at: string
  is_published: boolean
  is_rewritten: boolean
  published_at: string | null
  pre_moderation_status: 'pending' | 'approved' | 'rejected' | null
  rejection_reason: string | null
  moderation_checked_at: string | null
  linkedin_post_id: string | null
  linkedin_posted_at: string | null
  linkedin_language: string | null
  source_id: string | null
  news_sources?: {
    name: string
    channel_username: string
  } | null
  blog_posts?: {
    id: string
    slug_en: string
  }[]
}

type StatusFilter = 'all' | 'pending_ai' | 'rejected_ai' | 'waiting_approval' | 'published_news' | 'published_linkedin' | 'published_blog'

const STATUS_FILTERS: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: '🔄 Всі' },
  { value: 'pending_ai', label: '⏳ Очікує AI' },
  { value: 'rejected_ai', label: '❌ AI відхилено' },
  { value: 'waiting_approval', label: '🤖 В Telegram боті' },
  { value: 'published_news', label: '📰 Опубліковано' },
  { value: 'published_linkedin', label: '🔗 LinkedIn' },
  { value: 'published_blog', label: '📝 Блог' },
]

export const NewsQueueManager = () => {
  const [news, setNews] = useState<NewsItem[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [stats, setStats] = useState({
    total: 0,
    pendingAI: 0,
    rejectedAI: 0,
    waitingApproval: 0,
    published: 0,
    linkedin: 0,
    blog: 0
  })

  useEffect(() => {
    loadNews()

    const handleQueueUpdate = () => {
      console.log('News queue update event received, reloading...')
      loadNews()
    }

    window.addEventListener('news-queue-updated', handleQueueUpdate)
    return () => window.removeEventListener('news-queue-updated', handleQueueUpdate)
  }, [])

  const loadNews = async () => {
    try {
      setLoading(true)

      // Load news - simple query without relations first
      const { data: newsData, error: newsError } = await supabase
        .from('news')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(200)

      if (newsError) {
        console.error('News query error:', newsError)
        throw newsError
      }

      console.log('Loaded news count:', newsData?.length || 0)

      if (!newsData || newsData.length === 0) {
        setNews([])
        setStats({
          total: 0,
          pendingAI: 0,
          rejectedAI: 0,
          waitingApproval: 0,
          published: 0,
          linkedin: 0,
          blog: 0
        })
        return
      }

      // Load sources separately
      const sourceIds = [...new Set(newsData.filter(n => n.source_id).map(n => n.source_id))]
      let sourcesMap: Record<string, { name: string; channel_username: string }> = {}

      if (sourceIds.length > 0) {
        const { data: sources, error: sourcesError } = await supabase
          .from('news_sources')
          .select('id, name, url, source_type')
          .in('id', sourceIds)

        if (sourcesError) {
          console.warn('Sources query error:', sourcesError)
        }

        if (sources) {
          sourcesMap = sources.reduce((acc, s) => {
            // Extract channel username from URL for Telegram sources
            let channelUsername = s.name
            if (s.source_type === 'telegram' && s.url) {
              const match = s.url.match(/t\.me\/([^\/]+)/)
              if (match) channelUsername = match[1]
            }
            acc[s.id] = { name: s.name, channel_username: channelUsername }
            return acc
          }, {} as Record<string, { name: string; channel_username: string }>)
        }
      }

      // Load blog posts that reference these news items
      const newsIds = newsData.map(n => n.id)
      let blogPostsMap: Record<string, { id: string; slug_en: string }[]> = {}

      try {
        const { data: blogPosts, error: blogError } = await supabase
          .from('blog_posts')
          .select('id, slug_en, source_news_id')
          .in('source_news_id', newsIds)

        if (blogError) {
          console.warn('Blog posts query error:', blogError)
        }

        if (blogPosts) {
          blogPosts.forEach(bp => {
            if (bp.source_news_id) {
              if (!blogPostsMap[bp.source_news_id]) {
                blogPostsMap[bp.source_news_id] = []
              }
              blogPostsMap[bp.source_news_id].push({ id: bp.id, slug_en: bp.slug_en || '' })
            }
          })
        }
      } catch (e) {
        console.warn('Blog posts query failed:', e)
      }

      // Merge all data
      const enrichedNews = newsData.map(n => ({
        ...n,
        news_sources: n.source_id ? sourcesMap[n.source_id] : null,
        blog_posts: blogPostsMap[n.id] || []
      })) as NewsItem[]

      setNews(enrichedNews)

      // Calculate stats
      setStats({
        total: enrichedNews.length,
        pendingAI: enrichedNews.filter(n => n.pre_moderation_status === 'pending').length,
        rejectedAI: enrichedNews.filter(n => n.pre_moderation_status === 'rejected').length,
        waitingApproval: enrichedNews.filter(n => n.pre_moderation_status === 'approved' && !n.is_published).length,
        published: enrichedNews.filter(n => n.is_published).length,
        linkedin: enrichedNews.filter(n => n.linkedin_post_id).length,
        blog: enrichedNews.filter(n => n.blog_posts && n.blog_posts.length > 0).length
      })
    } catch (error) {
      console.error('Failed to load news:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredNews = news.filter(item => {
    // Search filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase()
      if (!item.original_title?.toLowerCase().includes(searchLower) &&
          !item.title_en?.toLowerCase().includes(searchLower)) {
        return false
      }
    }

    // Status filter
    switch (statusFilter) {
      case 'pending_ai':
        return item.pre_moderation_status === 'pending'
      case 'rejected_ai':
        return item.pre_moderation_status === 'rejected'
      case 'waiting_approval':
        return item.pre_moderation_status === 'approved' && !item.is_published
      case 'published_news':
        return item.is_published
      case 'published_linkedin':
        return !!item.linkedin_post_id
      case 'published_blog':
        return item.blog_posts && item.blog_posts.length > 0
      default:
        return true
    }
  })

  const getStatusBadges = (item: NewsItem) => {
    const badges = []

    // Pre-moderation status
    if (item.pre_moderation_status === 'pending') {
      badges.push({ label: '⏳ AI Pending', color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50' })
    } else if (item.pre_moderation_status === 'rejected') {
      badges.push({ label: '❌ AI Rejected', color: 'bg-red-500/20 text-red-400 border-red-500/50' })
    } else if (item.pre_moderation_status === 'approved' && !item.is_published) {
      badges.push({ label: '🤖 In Telegram', color: 'bg-blue-500/20 text-blue-400 border-blue-500/50' })
    }

    // Published status
    if (item.is_published) {
      badges.push({ label: '📰 Published', color: 'bg-green-500/20 text-green-400 border-green-500/50' })
    }

    // LinkedIn status
    if (item.linkedin_post_id) {
      badges.push({ label: `🔗 LinkedIn ${item.linkedin_language?.toUpperCase() || ''}`, color: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/50' })
    }

    // Blog status
    if (item.blog_posts && item.blog_posts.length > 0) {
      badges.push({ label: '📝 Blog', color: 'bg-purple-500/20 text-purple-400 border-purple-500/50' })
    }

    return badges
  }

  const getTimelineEvents = (item: NewsItem) => {
    const events = []

    // Scraped
    events.push({
      label: 'Скраплено з Telegram',
      time: item.created_at,
      icon: Send,
      color: 'text-gray-400',
      details: item.news_sources?.channel_username ? `@${item.news_sources.channel_username}` : 'Unknown source'
    })

    // AI Pre-moderation
    if (item.moderation_checked_at) {
      events.push({
        label: item.pre_moderation_status === 'approved' ? 'AI: Схвалено' : 'AI: Відхилено',
        time: item.moderation_checked_at,
        icon: Bot,
        color: item.pre_moderation_status === 'approved' ? 'text-green-400' : 'text-red-400',
        details: item.rejection_reason || undefined
      })
    } else if (item.pre_moderation_status === 'pending') {
      events.push({
        label: 'Очікує AI перевірки',
        time: null,
        icon: Clock,
        color: 'text-yellow-400',
        details: undefined
      })
    }

    // Sent to Telegram bot (approved but not published)
    if (item.pre_moderation_status === 'approved' && !item.is_published) {
      events.push({
        label: 'Відправлено в Telegram бот',
        time: item.moderation_checked_at,
        icon: Bot,
        color: 'text-blue-400',
        details: 'Очікує схвалення модератором'
      })
    }

    // Published to News
    if (item.is_published && item.published_at) {
      events.push({
        label: 'Опубліковано в новини',
        time: item.published_at,
        icon: CheckCircle,
        color: 'text-green-400',
        details: item.title_en?.substring(0, 50) + '...'
      })
    }

    // Published to LinkedIn
    if (item.linkedin_posted_at) {
      events.push({
        label: `Опубліковано в LinkedIn (${item.linkedin_language?.toUpperCase()})`,
        time: item.linkedin_posted_at,
        icon: Linkedin,
        color: 'text-cyan-400',
        details: item.linkedin_post_id
      })
    }

    // Published to Blog
    if (item.blog_posts && item.blog_posts.length > 0) {
      events.push({
        label: 'Створено блог-пост',
        time: item.published_at,
        icon: BookOpen,
        color: 'text-purple-400',
        details: `/blog/${item.blog_posts[0].slug_en}`
      })
    }

    return events
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Видалити цю новину?')) return

    try {
      const { error } = await supabase.from('news').delete().eq('id', id)
      if (error) throw error
      loadNews()
    } catch (error) {
      console.error('Failed to delete:', error)
      alert('Помилка видалення')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-3">
            <List className="h-7 w-7" />
            News Pipeline
          </h2>
          <p className="text-gray-300 text-sm mt-1">
            Всі новини зі скрапінгу та їхній статус
          </p>
        </div>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={loadNews}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 text-white rounded-lg transition-colors font-medium"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Оновити
        </motion.button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
        <div className="bg-white/10 rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-white">{stats.total}</div>
          <div className="text-xs text-gray-400">Всього</div>
        </div>
        <div className="bg-yellow-500/20 rounded-lg p-3 text-center border border-yellow-500/30">
          <div className="text-2xl font-bold text-yellow-400">{stats.pendingAI}</div>
          <div className="text-xs text-yellow-300">AI Pending</div>
        </div>
        <div className="bg-red-500/20 rounded-lg p-3 text-center border border-red-500/30">
          <div className="text-2xl font-bold text-red-400">{stats.rejectedAI}</div>
          <div className="text-xs text-red-300">AI Rejected</div>
        </div>
        <div className="bg-blue-500/20 rounded-lg p-3 text-center border border-blue-500/30">
          <div className="text-2xl font-bold text-blue-400">{stats.waitingApproval}</div>
          <div className="text-xs text-blue-300">В Telegram</div>
        </div>
        <div className="bg-green-500/20 rounded-lg p-3 text-center border border-green-500/30">
          <div className="text-2xl font-bold text-green-400">{stats.published}</div>
          <div className="text-xs text-green-300">Опубліковано</div>
        </div>
        <div className="bg-cyan-500/20 rounded-lg p-3 text-center border border-cyan-500/30">
          <div className="text-2xl font-bold text-cyan-400">{stats.linkedin}</div>
          <div className="text-xs text-cyan-300">LinkedIn</div>
        </div>
        <div className="bg-purple-500/20 rounded-lg p-3 text-center border border-purple-500/30">
          <div className="text-2xl font-bold text-purple-400">{stats.blog}</div>
          <div className="text-xs text-purple-300">Блог</div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white/10 backdrop-blur-lg rounded-lg p-4 border border-white/20">
        <div className="flex flex-wrap items-center gap-4">
          {/* Search */}
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Пошук за заголовком..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-gray-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
              className="px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              {STATUS_FILTERS.map(filter => (
                <option key={filter.value} value={filter.value} className="bg-gray-800">
                  {filter.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* News List */}
      <div className="space-y-3">
        <div className="text-sm text-gray-400 px-2">
          Показано: {filteredNews.length} з {news.length}
        </div>

        {filteredNews.length === 0 ? (
          <div className="text-center py-12 bg-white/5 rounded-lg">
            <List className="h-12 w-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-300">Немає новин з таким фільтром</p>
          </div>
        ) : (
          <AnimatePresence>
            {filteredNews.map((item) => {
              const badges = getStatusBadges(item)
              const isExpanded = expandedId === item.id

              return (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -100 }}
                  className="bg-white/10 backdrop-blur-lg rounded-lg border border-white/20 hover:border-purple-500/50 transition-colors overflow-hidden"
                >
                  {/* Main Row */}
                  <div className="p-4">
                    <div className="flex items-start gap-4">
                      {/* Media Preview */}
                      <div className="relative w-20 h-20 flex-shrink-0">
                        {item.video_url ? (
                          <div className="w-full h-full bg-gray-700 rounded-lg flex items-center justify-center">
                            <Video className="h-8 w-8 text-gray-400" />
                          </div>
                        ) : item.image_url ? (
                          <img
                            src={item.image_url}
                            alt=""
                            className="w-full h-full object-cover rounded-lg"
                          />
                        ) : (
                          <div className="w-full h-full bg-gray-700 rounded-lg flex items-center justify-center">
                            <ImageIcon className="h-8 w-8 text-gray-400" />
                          </div>
                        )}
                        {item.images && item.images.length > 1 && (
                          <div className="absolute -top-1 -right-1 bg-purple-600 text-white text-xs px-1.5 py-0.5 rounded-full">
                            +{item.images.length - 1}
                          </div>
                        )}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <h3 className="text-white font-medium line-clamp-2">
                            {item.title_en || item.original_title || 'Без заголовку'}
                          </h3>
                        </div>

                        {/* Status Badges */}
                        <div className="flex flex-wrap gap-2 mb-2">
                          {badges.map((badge, idx) => (
                            <span
                              key={idx}
                              className={`px-2 py-0.5 rounded-full text-xs font-medium border ${badge.color}`}
                            >
                              {badge.label}
                            </span>
                          ))}
                        </div>

                        {/* Meta */}
                        <div className="flex flex-wrap items-center gap-3 text-xs text-gray-400">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {new Date(item.created_at).toLocaleString('uk-UA')}
                          </span>
                          {item.news_sources?.channel_username && (
                            <span className="text-blue-400">
                              @{item.news_sources.channel_username}
                            </span>
                          )}
                          {item.original_url && (
                            <a
                              href={item.original_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1 text-blue-400 hover:text-blue-300"
                            >
                              <ExternalLink className="h-3 w-3" />
                              Оригінал
                            </a>
                          )}
                        </div>

                        {/* Rejection Reason */}
                        {item.pre_moderation_status === 'rejected' && item.rejection_reason && (
                          <div className="mt-2 p-2 bg-red-500/10 border border-red-500/30 rounded text-xs text-red-300 flex items-start gap-2">
                            <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                            <span><strong>Причина:</strong> {item.rejection_reason}</span>
                          </div>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setExpandedId(isExpanded ? null : item.id)}
                          className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                          title="Деталі"
                        >
                          {isExpanded ? (
                            <ChevronUp className="h-5 w-5 text-gray-400" />
                          ) : (
                            <ChevronDown className="h-5 w-5 text-gray-400" />
                          )}
                        </button>
                        <button
                          onClick={() => handleDelete(item.id)}
                          className="p-2 hover:bg-red-500/20 rounded-lg transition-colors"
                          title="Видалити"
                        >
                          <Trash2 className="h-5 w-5 text-red-400" />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Expanded Timeline */}
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="border-t border-white/10"
                      >
                        <div className="p-4 bg-white/5">
                          <h4 className="text-sm font-medium text-white mb-4">📋 Історія обробки:</h4>
                          <div className="space-y-4">
                            {getTimelineEvents(item).map((event, idx) => {
                              const Icon = event.icon
                              return (
                                <div key={idx} className="flex items-start gap-3">
                                  <div className={`p-1.5 rounded-full bg-white/10 ${event.color}`}>
                                    <Icon className="h-4 w-4" />
                                  </div>
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2">
                                      <span className="text-sm text-white">{event.label}</span>
                                      {event.time && (
                                        <span className="text-xs text-gray-500">
                                          {new Date(event.time).toLocaleString('uk-UA')}
                                        </span>
                                      )}
                                    </div>
                                    {event.details && (
                                      <p className="text-xs text-gray-400 mt-0.5">{event.details}</p>
                                    )}
                                  </div>
                                </div>
                              )
                            })}
                          </div>

                          {/* Full Content Preview */}
                          <div className="mt-4 pt-4 border-t border-white/10">
                            <h4 className="text-sm font-medium text-white mb-2">📄 Оригінальний контент:</h4>
                            <p className="text-sm text-gray-300 whitespace-pre-wrap line-clamp-6">
                              {item.original_content || item.description_en || 'Немає контенту'}
                            </p>
                          </div>

                          {/* Links */}
                          <div className="mt-4 pt-4 border-t border-white/10 flex flex-wrap gap-3">
                            {item.is_published && item.slug_en && (
                              <a
                                href={`/news/${item.slug_en}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-sm text-green-400 hover:text-green-300 flex items-center gap-1"
                              >
                                <ExternalLink className="h-4 w-4" />
                                Переглянути новину
                              </a>
                            )}
                            {item.linkedin_post_id && (
                              <a
                                href={`https://www.linkedin.com/feed/update/${item.linkedin_post_id}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-sm text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
                              >
                                <Linkedin className="h-4 w-4" />
                                Переглянути в LinkedIn
                              </a>
                            )}
                            {item.blog_posts && item.blog_posts.length > 0 && (
                              <a
                                href={`/blog/${item.blog_posts[0].slug_en}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-sm text-purple-400 hover:text-purple-300 flex items-center gap-1"
                              >
                                <BookOpen className="h-4 w-4" />
                                Переглянути блог-пост
                              </a>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              )
            })}
          </AnimatePresence>
        )}
      </div>
    </div>
  )
}
