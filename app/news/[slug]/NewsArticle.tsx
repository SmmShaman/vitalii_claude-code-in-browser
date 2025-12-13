'use client'

import { useEffect, useState } from 'react'
import { getNewsBySlug } from '@/integrations/supabase/client'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

interface NewsArticleProps {
  slug: string
}

export function NewsArticle({ slug }: NewsArticleProps) {
  const [news, setNews] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchNews = async () => {
      const data = await getNewsBySlug(slug)
      setNews(data)
      setLoading(false)
    }
    fetchNews()
  }, [slug])

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="animate-pulse text-white/50">Loading...</div>
      </div>
    )
  }

  if (!news) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex flex-col items-center justify-center text-white">
        <h1 className="text-2xl font-bold mb-4">News Not Found</h1>
        <Link href="/" className="text-blue-400 hover:text-blue-300 flex items-center gap-2">
          <ArrowLeft className="w-4 h-4" />
          Back to Home
        </Link>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <Link href="/" className="text-blue-400 hover:text-blue-300 flex items-center gap-2 mb-8">
          <ArrowLeft className="w-4 h-4" />
          Back to Home
        </Link>

        {news.image_url && (
          <img
            src={news.image_url}
            alt={news.title_en}
            className="w-full h-64 md:h-96 object-cover rounded-2xl mb-8"
          />
        )}

        <h1 className="text-3xl md:text-4xl font-bold text-white mb-4">
          {news.title_en}
        </h1>

        <div className="flex items-center gap-4 text-white/60 mb-8">
          {news.published_at && (
            <time>{new Date(news.published_at).toLocaleDateString()}</time>
          )}
          {news.views_count > 0 && (
            <span>{news.views_count} views</span>
          )}
        </div>

        <div className="prose prose-invert prose-lg max-w-none">
          <p className="text-white/90 leading-relaxed whitespace-pre-wrap">
            {news.description_en}
          </p>
        </div>

        {news.original_url && (
          <a
            href={news.original_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block mt-8 px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl transition-colors"
          >
            Read Original Article
          </a>
        )}
      </div>
    </div>
  )
}
