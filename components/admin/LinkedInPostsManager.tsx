'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Linkedin, ExternalLink, RefreshCw, Clock, Globe, Newspaper, BookOpen, AlertCircle, Info, CheckCircle, Settings } from 'lucide-react'
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
  const [showInstructions, setShowInstructions] = useState(false)
  const [columnsExist, setColumnsExist] = useState(true)

  useEffect(() => {
    loadLinkedInPosts()
  }, [])

  const loadLinkedInPosts = async () => {
    try {
      setLoading(true)
      setError(null)

      // First check if LinkedIn columns exist
      const { data: testData, error: testError } = await supabase
        .from('news')
        .select('id, linkedin_post_id')
        .limit(1)

      if (testError && testError.message.includes('linkedin_post_id')) {
        setColumnsExist(false)
        setError('Колонки LinkedIn ще не створені в базі даних. Запустіть міграцію.')
        setLoading(false)
        return
      }

      setColumnsExist(true)

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
      if (err.message?.includes('linkedin_post_id')) {
        setColumnsExist(false)
        setError('Колонки LinkedIn ще не створені в базі даних. Запустіть міграцію.')
      } else {
        setError(err.message || 'Помилка завантаження постів')
      }
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
        throw new Error(result.error || 'Помилка публікації в LinkedIn')
      }

      // Reload posts
      await loadLinkedInPosts()

    } catch (err: any) {
      console.error('Failed to repost:', err)
      setError(err.message || 'Помилка повторної публікації')
    } finally {
      setReposting(null)
    }
  }

  const getTitle = (post: LinkedInPost): string => {
    const lang = post.linkedin_language || 'en'
    if (lang === 'ua') return post.title_ua || post.title_en || 'Без назви'
    if (lang === 'no') return post.title_no || post.title_en || 'Без назви'
    return post.title_en || 'Без назви'
  }

  const formatDate = (date: string | null): string => {
    if (!date) return 'Н/Д'
    return new Date(date).toLocaleString('uk-UA', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getLanguageLabel = (lang: string | null): string => {
    switch (lang) {
      case 'en': return 'Англ'
      case 'no': return 'Норв'
      case 'ua': return 'Укр'
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
          <p className="text-white">Завантаження LinkedIn постів...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Заголовок */}
      <div className="bg-gradient-to-br from-blue-600/20 to-blue-800/20 backdrop-blur-lg rounded-xl p-6 border border-blue-500/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-500/30 rounded-lg">
              <Linkedin className="h-8 w-8 text-blue-400" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">LinkedIn Пости</h2>
              <p className="text-gray-300">Пости опубліковані у вашому LinkedIn профілі</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowInstructions(!showInstructions)}
              className="flex items-center gap-2 px-4 py-2 bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 rounded-lg transition-colors"
            >
              <Info className="h-5 w-5" />
              Інструкція
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={loadLinkedInPosts}
              className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors"
            >
              <RefreshCw className="h-5 w-5" />
              Оновити
            </motion.button>
          </div>
        </div>
      </div>

      {/* Інструкція */}
      {showInstructions && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="bg-gradient-to-br from-purple-600/20 to-indigo-600/20 backdrop-blur-lg rounded-xl p-6 border border-purple-500/30"
        >
          <div className="flex items-start gap-4">
            <div className="p-2 bg-purple-500/30 rounded-lg">
              <Info className="h-6 w-6 text-purple-400" />
            </div>
            <div className="flex-1 space-y-4">
              <h3 className="text-xl font-bold text-white">Як користуватися LinkedIn інтеграцією</h3>

              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center text-white text-sm font-bold">1</div>
                  <div>
                    <p className="text-white font-medium">Налаштування (одноразово)</p>
                    <p className="text-gray-400 text-sm">Додайте в Supabase секрети: <code className="bg-black/30 px-1 rounded">LINKEDIN_ACCESS_TOKEN</code> та <code className="bg-black/30 px-1 rounded">LINKEDIN_PERSON_URN</code></p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center text-white text-sm font-bold">2</div>
                  <div>
                    <p className="text-white font-medium">Публікація через Telegram бота</p>
                    <p className="text-gray-400 text-sm">Спочатку опублікуйте новину/блог через кнопки "📰 В новини" або "📝 В блог"</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center text-white text-sm font-bold">3</div>
                  <div>
                    <p className="text-white font-medium">Публікація в LinkedIn</p>
                    <p className="text-gray-400 text-sm">Натисніть одну з кнопок: "🔗 LinkedIn EN", "🔗 LinkedIn NO", або "🔗 LinkedIn UA"</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-green-500 flex items-center justify-center text-white text-sm font-bold">✓</div>
                  <div>
                    <p className="text-white font-medium">Готово!</p>
                    <p className="text-gray-400 text-sm">Пост з&apos;явиться у вашому LinkedIn профілі з посиланням на статтю</p>
                  </div>
                </div>
              </div>

              <div className="mt-4 p-4 bg-black/20 rounded-lg">
                <p className="text-yellow-400 text-sm flex items-center gap-2">
                  <AlertCircle className="h-4 w-4" />
                  <span><strong>Важливо:</strong> LinkedIn Access Token діє 60 днів. Потрібно оновлювати періодично.</span>
                </p>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Помилка */}
      {error && (
        <div className="bg-red-500/20 border border-red-500/30 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-red-300 font-medium">Помилка</p>
            <p className="text-red-400 text-sm">{error}</p>
            {!columnsExist && (
              <div className="mt-3 p-3 bg-black/20 rounded text-sm">
                <p className="text-gray-300 mb-2">Для виправлення запустіть міграцію:</p>
                <code className="text-green-400 block">supabase db push</code>
                <p className="text-gray-400 mt-2">або застосуйте SQL вручну з файлу:</p>
                <code className="text-blue-400 block">supabase/migrations/20251215_add_linkedin_columns.sql</code>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Статистика */}
      {columnsExist && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white/10 backdrop-blur-lg rounded-xl p-4 border border-white/20">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/20 rounded-lg">
                <Linkedin className="h-5 w-5 text-blue-400" />
              </div>
              <div>
                <p className="text-gray-400 text-sm">Всього постів</p>
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
                <p className="text-gray-400 text-sm">Англійською</p>
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
                <p className="text-gray-400 text-sm">Норвезькою</p>
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
                <p className="text-gray-400 text-sm">Українською</p>
                <p className="text-2xl font-bold text-white">
                  {posts.filter(p => p.linkedin_language === 'ua').length}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Список постів */}
      {columnsExist && posts.length === 0 ? (
        <div className="bg-white/10 backdrop-blur-lg rounded-xl p-12 border border-white/20 text-center">
          <Linkedin className="h-16 w-16 text-gray-500 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-white mb-2">Поки немає LinkedIn постів</h3>
          <p className="text-gray-400 mb-4">
            Пости опубліковані в LinkedIn з&apos;являться тут.
          </p>
          <button
            onClick={() => setShowInstructions(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
          >
            <Info className="h-4 w-4" />
            Як почати публікувати
          </button>
        </div>
      ) : columnsExist && (
        <div className="bg-white/10 backdrop-blur-lg rounded-xl border border-white/20 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left px-6 py-4 text-gray-400 font-medium">Тип</th>
                  <th className="text-left px-6 py-4 text-gray-400 font-medium">Заголовок</th>
                  <th className="text-left px-6 py-4 text-gray-400 font-medium">Мова</th>
                  <th className="text-left px-6 py-4 text-gray-400 font-medium">Опубліковано</th>
                  <th className="text-left px-6 py-4 text-gray-400 font-medium">Дії</th>
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
                        <span className="text-gray-300">
                          {post.type === 'news' ? 'Новина' : 'Блог'}
                        </span>
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
                        {getLanguageLabel(post.linkedin_language)}
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
                          title="Переглянути статтю"
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
                              title={`Опублікувати ${lang === 'en' ? 'англійською' : lang === 'no' ? 'норвезькою' : 'українською'}`}
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
