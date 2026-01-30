'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { NewsItem, NewsStats, INITIAL_STATS, TimeFilter } from '@/components/admin/news-queue/types'

const getTimeFilterDate = (filter: TimeFilter): string | null => {
  const now = new Date()
  switch (filter) {
    case 'today':
      return new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString()
    case 'week':
      return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString()
    case 'month':
      return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString()
    default:
      return null
  }
}

export function useNewsQueue() {
  const [news, setNews] = useState<NewsItem[]>([])
  const [stats, setStats] = useState<NewsStats>(INITIAL_STATS)
  const [loading, setLoading] = useState(true)
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('all')

  const loadStats = useCallback(async (filter: TimeFilter): Promise<NewsStats> => {
    const fortyEightHoursAgo = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString()
    const timeFilterDate = getTimeFilterDate(filter)

    try {
      // Build all queries in parallel
      const queries = [
        // Sources
        timeFilterDate
          ? supabase.from('news').select('*', { count: 'exact', head: true }).gt('created_at', timeFilterDate)
          : supabase.from('news').select('*', { count: 'exact', head: true }),
        timeFilterDate
          ? supabase.from('news').select('*', { count: 'exact', head: true }).eq('source_type', 'telegram').gt('created_at', timeFilterDate)
          : supabase.from('news').select('*', { count: 'exact', head: true }).eq('source_type', 'telegram'),
        timeFilterDate
          ? supabase.from('news').select('*', { count: 'exact', head: true }).eq('source_type', 'rss').gt('created_at', timeFilterDate)
          : supabase.from('news').select('*', { count: 'exact', head: true }).eq('source_type', 'rss'),

        // Pipeline
        timeFilterDate
          ? supabase.from('news').select('*', { count: 'exact', head: true }).eq('pre_moderation_status', 'pending').gt('created_at', timeFilterDate)
          : supabase.from('news').select('*', { count: 'exact', head: true }).eq('pre_moderation_status', 'pending'),
        // waiting48h - approved, not published, created within last 48 hours (always uses 48h window, not time filter)
        supabase.from('news').select('*', { count: 'exact', head: true })
          .eq('pre_moderation_status', 'approved')
          .eq('is_published', false)
          .gt('created_at', fortyEightHoursAgo),
        // inTelegramBot - approved, not published (all, with time filter)
        timeFilterDate
          ? supabase.from('news').select('*', { count: 'exact', head: true })
              .eq('pre_moderation_status', 'approved')
              .eq('is_published', false)
              .gt('created_at', timeFilterDate)
          : supabase.from('news').select('*', { count: 'exact', head: true })
              .eq('pre_moderation_status', 'approved')
              .eq('is_published', false),
        timeFilterDate
          ? supabase.from('news').select('*', { count: 'exact', head: true }).eq('pre_moderation_status', 'rejected').gt('created_at', timeFilterDate)
          : supabase.from('news').select('*', { count: 'exact', head: true }).eq('pre_moderation_status', 'rejected'),

        // Published
        timeFilterDate
          ? supabase.from('news').select('*', { count: 'exact', head: true }).eq('is_published', true).gt('published_at', timeFilterDate)
          : supabase.from('news').select('*', { count: 'exact', head: true }).eq('is_published', true),
        supabase.from('blog_posts').select('*', { count: 'exact', head: true }).not('source_news_id', 'is', null),

        // Social Media
        timeFilterDate
          ? supabase.from('social_media_posts').select('*', { count: 'exact', head: true })
              .eq('platform', 'linkedin')
              .eq('status', 'posted')
              .gt('posted_at', timeFilterDate)
          : supabase.from('social_media_posts').select('*', { count: 'exact', head: true })
              .eq('platform', 'linkedin')
              .eq('status', 'posted'),
        timeFilterDate
          ? supabase.from('social_media_posts').select('*', { count: 'exact', head: true })
              .eq('platform', 'facebook')
              .eq('status', 'posted')
              .gt('posted_at', timeFilterDate)
          : supabase.from('social_media_posts').select('*', { count: 'exact', head: true })
              .eq('platform', 'facebook')
              .eq('status', 'posted'),
        timeFilterDate
          ? supabase.from('social_media_posts').select('*', { count: 'exact', head: true })
              .eq('platform', 'instagram')
              .eq('status', 'posted')
              .gt('posted_at', timeFilterDate)
          : supabase.from('social_media_posts').select('*', { count: 'exact', head: true })
              .eq('platform', 'instagram')
              .eq('status', 'posted'),
      ]

      const results = await Promise.all(queries)

      return {
        // Sources
        total: results[0].count || 0,
        telegram: results[1].count || 0,
        rss: results[2].count || 0,

        // Pipeline
        pendingAI: results[3].count || 0,
        waiting48h: results[4].count || 0,
        inTelegramBot: results[5].count || 0,
        rejected: results[6].count || 0,

        // Published
        publishedNews: results[7].count || 0,
        publishedBlog: results[8].count || 0,

        // Social Media
        linkedin: results[9].count || 0,
        facebook: results[10].count || 0,
        instagram: results[11].count || 0,
      }
    } catch (error) {
      console.error('Failed to load stats:', error)
      return INITIAL_STATS
    }
  }, [])

  const loadNews = useCallback(async () => {
    try {
      setLoading(true)

      // Load stats with current time filter
      const newStats = await loadStats(timeFilter)
      setStats(newStats)

      // Load news items for the list (no time filter - always show recent 200)
      const { data: newsData, error: newsError } = await supabase
        .from('news')
        .select(`
          *,
          news_sources(id, name, url, source_type),
          blog_posts!blog_posts_source_news_id_fkey(id, slug_en)
        `)
        .order('created_at', { ascending: false })
        .limit(200)

      if (newsError) {
        console.error('News query error:', newsError)
        throw newsError
      }

      console.log('Loaded news count:', newsData?.length || 0)

      if (!newsData || newsData.length === 0) {
        setNews([])
        return
      }

      // Bug fix: Load news items with blog posts that might not be in top 200
      const { data: blogNewsData } = await supabase
        .from('blog_posts')
        .select('source_news_id')
        .not('source_news_id', 'is', null)

      const blogNewsIds = blogNewsData?.map(b => b.source_news_id).filter(Boolean) || []
      const loadedNewsIds = new Set(newsData.map(n => n.id))
      const missingBlogNewsIds = blogNewsIds.filter(id => id && !loadedNewsIds.has(id))

      // Load missing news items that have blog posts
      if (missingBlogNewsIds.length > 0) {
        const { data: blogNews } = await supabase
          .from('news')
          .select(`
            *,
            news_sources(id, name, url, source_type),
            blog_posts!blog_posts_source_news_id_fkey(id, slug_en)
          `)
          .in('id', missingBlogNewsIds)

        if (blogNews) {
          newsData.push(...blogNews)
          console.log('Added', blogNews.length, 'news items with blog posts')
        }
      }

      // Load social media posts separately (no FK relationship, uses content_id)
      const newsIds = newsData.map(n => n.id)
      const { data: socialPosts } = await supabase
        .from('social_media_posts')
        .select('content_id, platform, status')
        .eq('content_type', 'news')
        .in('content_id', newsIds)

      // Create a map for quick lookup
      const socialPostsMap = new Map<string, { platform: string; status: string }[]>()
      socialPosts?.forEach(post => {
        const existing = socialPostsMap.get(post.content_id) || []
        existing.push({ platform: post.platform, status: post.status })
        socialPostsMap.set(post.content_id, existing)
      })

      // Transform data to match NewsItem interface
      const enrichedNews: NewsItem[] = newsData.map(n => {
        // Extract channel username from source
        let channelUsername = n.news_sources?.name || ''
        const sourceType = n.source_type || (n.news_sources?.source_type === 'rss' ? 'rss' : 'telegram')

        // Telegram source - extract @username from t.me URL
        if (n.news_sources?.source_type === 'telegram' && n.news_sources?.url) {
          const match = n.news_sources.url.match(/t\.me\/([^\/]+)/)
          if (match) channelUsername = match[1]
        }

        // RSS source - extract domain from rss_source_url
        if (sourceType === 'rss' && n.rss_source_url) {
          try {
            const url = new URL(n.rss_source_url)
            channelUsername = url.hostname.replace('www.', '')
          } catch {
            // Keep the existing channelUsername if URL parsing fails
          }
        }

        return {
          ...n,
          source_type: sourceType,
          rss_source_url: n.rss_source_url || null,
          news_sources: n.news_sources ? {
            name: n.news_sources.name,
            channel_username: channelUsername
          } : (sourceType === 'rss' && channelUsername ? {
            name: channelUsername,
            channel_username: channelUsername
          } : null),
          blog_posts: n.blog_posts || [],
          social_media_posts: socialPostsMap.get(n.id) || []
        }
      })

      setNews(enrichedNews)
    } catch (error) {
      console.error('Failed to load news:', error)
    } finally {
      setLoading(false)
    }
  }, [timeFilter, loadStats])

  const deleteNews = useCallback(async (id: string): Promise<boolean> => {
    try {
      const { error } = await supabase.from('news').delete().eq('id', id)
      if (error) throw error
      await loadNews()
      return true
    } catch (error) {
      console.error('Failed to delete:', error)
      return false
    }
  }, [loadNews])

  useEffect(() => {
    loadNews()

    const handleQueueUpdate = () => {
      console.log('News queue update event received, reloading...')
      loadNews()
    }

    window.addEventListener('news-queue-updated', handleQueueUpdate)
    return () => window.removeEventListener('news-queue-updated', handleQueueUpdate)
  }, [loadNews])

  return { news, stats, loading, loadNews, deleteNews, timeFilter, setTimeFilter }
}
