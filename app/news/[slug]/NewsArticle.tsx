'use client'

import { useEffect, useState } from 'react'
import { getNewsBySlug } from '@/integrations/supabase/client'
import Link from 'next/link'
import Image from 'next/image'
import { Calendar, ExternalLink } from 'lucide-react'
import { useTranslations } from '@/contexts/TranslationContext'
import {
  generateNewsArticleSchema,
  BASE_URL,
  formatDate,
} from '@/utils/seo'

interface NewsArticleProps {
  slug: string
}

export function NewsArticle({ slug }: NewsArticleProps) {
  const { currentLanguage } = useTranslations()
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
      <div className="flex items-center justify-center py-20">
        <div className="animate-pulse text-gray-400">Loading...</div>
      </div>
    )
  }

  if (!news) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-gray-900">
        <h1 className="text-2xl font-bold mb-4">News Not Found</h1>
        <Link href="/" className="text-blue-600 hover:text-blue-500">
          Back to Home
        </Link>
      </div>
    )
  }

  // Generate JSON-LD schema
  const newsArticleSchema = generateNewsArticleSchema(news)

  // Get translated content
  const lang = currentLanguage.toLowerCase() as 'en' | 'no' | 'ua'
  const title = news[`title_${lang}`] || news.title_en
  const description = news[`description_${lang}`] || news.description_en

  return (
    <>
      {/* JSON-LD Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(newsArticleSchema) }}
      />

      <article className="flex-1">
        {/* Featured Image */}
        {news.image_url && !news.video_url && (
          <figure className="mb-6">
            <div className="relative w-full aspect-video rounded-2xl overflow-hidden">
              <Image
                src={news.image_url}
                alt={title}
                fill
                priority
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 70vw, 800px"
                className="object-cover"
              />
            </div>
          </figure>
        )}

        {/* Video Embed */}
        {news.video_url && (
          <figure className="mb-6">
            <div className="relative w-full aspect-video rounded-2xl overflow-hidden shadow-lg">
              {news.video_type === 'youtube' ? (
                <iframe
                  src={`https://www.youtube.com/embed/${extractYouTubeId(news.video_url)}`}
                  title={title}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  className="absolute inset-0 w-full h-full"
                />
              ) : news.video_type === 'telegram_embed' ? (
                (() => {
                  const channelMatch = news.video_url.match(/t\.me\/([^/]+)\/(\d+)/)
                  const channelName = channelMatch ? channelMatch[1] : 'Telegram'
                  const messageId = channelMatch ? channelMatch[2] : ''
                  const telegramDirectUrl = `https://t.me/${channelName}/${messageId}`

                  return (
                    <div className="w-full h-full bg-gradient-to-br from-[#2AABEE] to-[#229ED9] flex flex-col items-center justify-center relative overflow-hidden">
                      <div className="absolute inset-0 opacity-10">
                        <div className="absolute top-4 left-4 w-20 h-20 rounded-full bg-white/20" />
                        <div className="absolute bottom-8 right-8 w-32 h-32 rounded-full bg-white/10" />
                        <div className="absolute top-1/2 left-1/4 w-16 h-16 rounded-full bg-white/15" />
                      </div>
                      <div className="relative z-10 mb-4">
                        <svg className="w-16 h-16 text-white" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.74-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z"/>
                        </svg>
                      </div>
                      <p className="relative z-10 text-white/90 text-sm mb-4 font-medium">
                        @{channelName}
                      </p>
                      <a
                        href={telegramDirectUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="relative z-10 inline-flex items-center gap-2 px-6 py-3 bg-white text-[#2AABEE] font-semibold rounded-full hover:bg-white/90 transition-all duration-200 shadow-lg hover:shadow-xl hover:scale-105"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Watch on Telegram
                      </a>
                    </div>
                  )
                })()
              ) : (
                <video
                  src={news.video_url}
                  controls
                  className="w-full h-full"
                  playsInline
                  preload="metadata"
                />
              )}
            </div>
          </figure>
        )}

        {/* Article Header */}
        <header className="mb-6">
          <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
            {title}
          </h1>

          {/* Article Meta */}
          <div className="flex flex-wrap items-center gap-4 text-gray-500">
            {news.published_at && (
              <time
                dateTime={news.published_at}
                className="flex items-center gap-1 text-sm"
              >
                <Calendar className="w-4 h-4" />
                {formatDate(news.published_at)}
              </time>
            )}
          </div>
        </header>

        {/* Article Content */}
        <div className="prose prose-lg max-w-none mb-8" itemProp="articleBody">
          <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
            {description}
          </p>
        </div>

        {/* Tags */}
        {news.tags && news.tags.length > 0 && (
          <div className="mb-8">
            <div className="flex flex-wrap gap-2" role="list" aria-label="Article tags">
              {news.tags.map((tag: string) => (
                <span
                  key={tag}
                  role="listitem"
                  className="px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-sm hover:bg-gray-200 transition-colors"
                >
                  #{tag}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Original Source Link */}
        {news.original_url && (
          <footer>
            <a
              href={news.original_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl transition-colors shadow-md font-medium"
            >
              <ExternalLink className="w-4 h-4" />
              Read Original Article
            </a>
          </footer>
        )}
      </article>
    </>
  )
}

// Helper function to extract YouTube video ID
function extractYouTubeId(url: string): string {
  const match = url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/)
  return match ? match[1] : ''
}
