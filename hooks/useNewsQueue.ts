'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { NewsItem, NewsStats, INITIAL_STATS } from '@/components/admin/news-queue/types'
import { calculateStats } from '@/components/admin/news-queue/utils'

export function useNewsQueue() {
  const [news, setNews] = useState<NewsItem[]>([])
  const [stats, setStats] = useState<NewsStats>(INITIAL_STATS)
  const [loading, setLoading] = useState(true)

  const loadNews = useCallback(async () => {
    try {
      setLoading(true)

      // Single query with JOINs
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
        setStats(INITIAL_STATS)
        return
      }

      // Transform data to match NewsItem interface
      const enrichedNews: NewsItem[] = newsData.map(n => {
        // Extract channel username from source
        let channelUsername = n.news_sources?.name || ''
        if (n.news_sources?.source_type === 'telegram' && n.news_sources?.url) {
          const match = n.news_sources.url.match(/t\.me\/([^\/]+)/)
          if (match) channelUsername = match[1]
        }

        return {
          ...n,
          news_sources: n.news_sources ? {
            name: n.news_sources.name,
            channel_username: channelUsername
          } : null,
          blog_posts: n.blog_posts || []
        }
      })

      setNews(enrichedNews)
      setStats(calculateStats(enrichedNews))
    } catch (error) {
      console.error('Failed to load news:', error)
    } finally {
      setLoading(false)
    }
  }, [])

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

  return { news, stats, loading, loadNews, deleteNews }
}
