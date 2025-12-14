'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Linkedin, ExternalLink, RefreshCw, Clock, Globe, Newspaper, BookOpen, AlertCircle } from 'lucide-react'
import { supabase } from '@/integrations/supabase/client'

interface LinkedInPost {
  id: string
  type: 'news' | 'blog'
  title_en: string | null
  title_no: string | null
  title_ua: string | null
  linkedin_post_id: string | null
  linkedin_posted_at: string | null
  linkedin_language: string | null
  published_at: string | null
  slug_en: string | null
  slug_no: string | null
  slug_ua: string | null
}

export const LinkedInPostsManager = () => {
  const [posts, setPosts] = useState<LinkedInPost[]>([])
  const [loading, setLoading] = useState(true)
  const [reposting, setReposting] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadLinkedInPosts()
  }, [])

  const loadLinkedInPosts = async () => {
    try {
      setLoading(true)
      setError(null)

      // Fetch news with LinkedIn posts
      const { data: newsData, error: newsError } = await supabase
        .from('news')
        .select('id, title_en, title_no, title_ua, linkedin_post_id, linkedin_posted_at, linkedin_language, published_at, slug_en, slug_no, slug_ua')
        .not('linkedin_post_id', 'is', null)
        .order('linkedin_posted_at', { ascending: false })

      if (newsError) throw newsError

      // Fetch blog posts with LinkedIn posts
      const { data: blogData, error: blogError } = await supabase
        .from('blog_posts')
        .select('id, title_en, title_no, title_ua, linkedin_post_id, linkedin_posted_at, linkedin_language, published_at, slug_en, slug_no, slug_ua')
        .not('linkedin_post_id', 'is', null)
        .order('linkedin_posted_at', { ascending: false })

      if (blogError) throw blogError

      // Combine and sort by linkedin_posted_at
      const allPosts: LinkedInPost[] = [
        ...(newsData || []).map(item => ({ ...item, type: 'news' as const })),
        ...(blogData || []).map(item => ({ ...item, type: 'blog' as const }))
      ].sort((a, b) => {
        const dateA = a.linkedin_posted_at ? new Date(a.linkedin_posted_at).getTime() : 0
        const dateB = b.linkedin_posted_at ? new Date(b.linkedin_posted_at).getTime() : 0
        return dateB - dateA
      })

      setPosts(allPosts)
    } catch (err: any) {
      console.error('Failed to load LinkedIn posts:', err)
      setError(err.message || 'Failed to load posts')
    } finally {
      setLoading(false)
    }
  }

  const repostToLinkedIn = async (post: LinkedInPost, language: 'en' | 'no' | 'ua') => {
    try {
      setReposting(`${post.id}-${language}`)

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/post-to-linkedin`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            newsId: post.type === 'news' ? post.id : undefined,
            blogPostId: post.type === 'blog' ? post.id : undefined,
            language,
            contentType: post.type
          })
        }
      )

      const result = await response.json()

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to post to LinkedIn')
      }

      // Reload posts
      await loadLinkedInPosts()

    } catch (err: any) {
      console.error('Failed to repost:', err)
      setError(err.message || 'Failed to repost')
    } finally {
      setReposting(null)
    }
  }

  const getTitle = (post: LinkedInPost): string => {
    const lang = post.linkedin_language || 'en'
    if (lang === 'ua') return post.title_ua || post.title_en || 'Untitled'
    if (lang === 'no') return post.title_no || post.title_en || 'Untitled'
    return post.title_en || 'Untitled'
  }

  const formatDate = (date: string | null): string => {
    if (!date) return 'N/A'
    return new Date(date).toLocaleString('uk-UA', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getLanguageFlag = (lang: string | null): string => {
    switch (lang) {
      case 'en': return 'EN'
      case 'no': return 'NO'
      case 'ua': return 'UA'
      default: return '??'
    }
  }

  const getSiteUrl = (): string => {
    return process.env.NEXT_PUBLIC_SITE_URL || 'https://vitalii-berbeha.netlify.app'
  }

  const getArticleUrl = (post: LinkedInPost): string => {
    const lang = post.linkedin_language || 'en'
    const slug = lang === 'ua' ? post.slug_ua : lang === 'no' ? post.slug_no : post.slug_en
    const langPrefix = lang === 'en' ? '' : `/${lang === 'ua' ? 'uk' : lang}`
    const type = post.type === 'news' ? 'news' : 'blog'
    return `${getSiteUrl()}${langPrefix}/${type}/${slug}`
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
          <p className="text-white">Loading LinkedIn posts...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-br from-blue-600/20 to-blue-800/20 backdrop-blur-lg rounded-xl p-6 border border-blue-500/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-500/30 rounded-lg">
              <Linkedin className="h-8 w-8 text-blue-400" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">LinkedIn Posts</h2>
              <p className="text-gray-300">Posts published to your LinkedIn profile</p>
            </div>
          </div>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={loadLinkedInPosts}
            className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors"
          >
            <RefreshCw className="h-5 w-5" />
            Refresh
          </motion.button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-500/20 border border-red-500/30 rounded-lg p-4 flex items-center gap-3">
          <AlertCircle className="h-5 w-5 text-red-400" />
          <p className="text-red-300">{error}</p>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white/10 backdrop-blur-lg rounded-xl p-4 border border-white/20">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500/20 rounded-lg">
              <Linkedin className="h-5 w-5 text-blue-400" />
            </div>
            <div>
              <p className="text-gray-400 text-sm">Total Posts</p>
              <p className="text-2xl font-bold text-white">{posts.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-white/10 backdrop-blur-lg rounded-xl p-4 border border-white/20">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-500/20 rounded-lg">
              <Globe className="h-5 w-5 text-green-400" />
            </div>
            <div>
              <p className="text-gray-400 text-sm">English</p>
              <p className="text-2xl font-bold text-white">
                {posts.filter(p => p.linkedin_language === 'en').length}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white/10 backdrop-blur-lg rounded-xl p-4 border border-white/20">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-500/20 rounded-lg">
              <Globe className="h-5 w-5 text-red-400" />
            </div>
            <div>
              <p className="text-gray-400 text-sm">Norwegian</p>
              <p className="text-2xl font-bold text-white">
                {posts.filter(p => p.linkedin_language === 'no').length}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white/10 backdrop-blur-lg rounded-xl p-4 border border-white/20">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-yellow-500/20 rounded-lg">
              <Globe className="h-5 w-5 text-yellow-400" />
            </div>
            <div>
              <p className="text-gray-400 text-sm">Ukrainian</p>
              <p className="text-2xl font-bold text-white">
                {posts.filter(p => p.linkedin_language === 'ua').length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Posts List */}
      {posts.length === 0 ? (
        <div className="bg-white/10 backdrop-blur-lg rounded-xl p-12 border border-white/20 text-center">
          <Linkedin className="h-16 w-16 text-gray-500 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-white mb-2">No LinkedIn Posts Yet</h3>
          <p className="text-gray-400">
            Posts published to LinkedIn will appear here. Use the Telegram bot to publish content.
          </p>
        </div>
      ) : (
        <div className="bg-white/10 backdrop-blur-lg rounded-xl border border-white/20 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left px-6 py-4 text-gray-400 font-medium">Type</th>
                  <th className="text-left px-6 py-4 text-gray-400 font-medium">Title</th>
                  <th className="text-left px-6 py-4 text-gray-400 font-medium">Language</th>
                  <th className="text-left px-6 py-4 text-gray-400 font-medium">Posted At</th>
                  <th className="text-left px-6 py-4 text-gray-400 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {posts.map((post, index) => (
                  <motion.tr
                    key={`${post.type}-${post.id}`}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="border-b border-white/5 hover:bg-white/5"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        {post.type === 'news' ? (
                          <Newspaper className="h-4 w-4 text-blue-400" />
                        ) : (
                          <BookOpen className="h-4 w-4 text-purple-400" />
                        )}
                        <span className="text-gray-300 capitalize">{post.type}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-white font-medium truncate max-w-xs">
                        {getTitle(post)}
                      </p>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded text-xs font-bold ${
                        post.linkedin_language === 'en' ? 'bg-green-500/20 text-green-400' :
                        post.linkedin_language === 'no' ? 'bg-red-500/20 text-red-400' :
                        'bg-yellow-500/20 text-yellow-400'
                      }`}>
                        {getLanguageFlag(post.linkedin_language)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-gray-400">
                        <Clock className="h-4 w-4" />
                        <span className="text-sm">{formatDate(post.linkedin_posted_at)}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <a
                          href={getArticleUrl(post)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                          title="View Article"
                        >
                          <ExternalLink className="h-4 w-4 text-gray-400 hover:text-white" />
                        </a>
                        <div className="flex gap-1">
                          {(['en', 'no', 'ua'] as const).map(lang => (
                            <motion.button
                              key={lang}
                              whileHover={{ scale: 1.1 }}
                              whileTap={{ scale: 0.9 }}
                              onClick={() => repostToLinkedIn(post, lang)}
                              disabled={reposting === `${post.id}-${lang}`}
                              className={`px-2 py-1 text-xs rounded font-medium transition-colors disabled:opacity-50 ${
                                post.linkedin_language === lang
                                  ? 'bg-blue-600 text-white'
                                  : 'bg-white/10 text-gray-300 hover:bg-white/20'
                              }`}
                              title={`Post in ${lang.toUpperCase()}`}
                            >
                              {reposting === `${post.id}-${lang}` ? (
                                <RefreshCw className="h-3 w-3 animate-spin" />
                              ) : (
                                lang.toUpperCase()
                              )}
                            </motion.button>
                          ))}
                        </div>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
