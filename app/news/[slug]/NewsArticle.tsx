'use client'

import { useEffect, useState } from 'react'
import { getNewsBySlug } from '@/integrations/supabase/client'
import Link from 'next/link'
import Image from 'next/image'
import { ArrowLeft, Eye, Calendar, ExternalLink } from 'lucide-react'
import {
  generateNewsArticleSchema,
  generateBreadcrumbSchema,
  BASE_URL,
  formatDate,
} from '@/utils/seo'

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

  // Generate JSON-LD schemas
  const newsArticleSchema = generateNewsArticleSchema(news)
  const breadcrumbSchema = generateBreadcrumbSchema([
    { name: 'Home', url: BASE_URL },
    { name: 'News', url: `${BASE_URL}/#news` },
    { name: news.title_en },
  ])

  return (
    <>
      {/* JSON-LD Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(newsArticleSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />

      <article className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <div className="max-w-4xl mx-auto px-4 py-8">
          {/* Breadcrumb Navigation */}
          <nav aria-label="Breadcrumb" className="mb-6">
            <ol className="flex items-center gap-2 text-sm text-white/60" itemScope itemType="https://schema.org/BreadcrumbList">
              <li itemProp="itemListElement" itemScope itemType="https://schema.org/ListItem">
                <Link href="/" itemProp="item" className="hover:text-white/80 transition-colors">
                  <span itemProp="name">Home</span>
                </Link>
                <meta itemProp="position" content="1" />
              </li>
              <li className="text-white/40">/</li>
              <li itemProp="itemListElement" itemScope itemType="https://schema.org/ListItem">
                <Link href="/#news" itemProp="item" className="hover:text-white/80 transition-colors">
                  <span itemProp="name">News</span>
                </Link>
                <meta itemProp="position" content="2" />
              </li>
              <li className="text-white/40">/</li>
              <li itemProp="itemListElement" itemScope itemType="https://schema.org/ListItem" className="text-white/80 truncate max-w-[200px]">
                <span itemProp="name">{news.title_en}</span>
                <meta itemProp="position" content="3" />
              </li>
            </ol>
          </nav>

          <Link href="/" className="text-blue-400 hover:text-blue-300 flex items-center gap-2 mb-8 transition-colors">
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </Link>

          {/* Featured Image */}
          {news.image_url && (
            <figure className="mb-8">
              <div className="relative w-full h-64 md:h-96 rounded-2xl overflow-hidden">
                <Image
                  src={news.image_url}
                  alt={news.title_en}
                  fill
                  priority
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 80vw, 896px"
                  className="object-cover"
                />
              </div>
            </figure>
          )}

          {/* Video Embed */}
          {news.video_url && news.video_type === 'youtube' && (
            <figure className="mb-8">
              <div className="relative w-full aspect-video rounded-2xl overflow-hidden">
                <iframe
                  src={`https://www.youtube.com/embed/${extractYouTubeId(news.video_url)}`}
                  title={news.title_en}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  className="absolute inset-0 w-full h-full"
                />
              </div>
            </figure>
          )}

          {/* Article Header */}
          <header className="mb-8">
            <h1 className="text-3xl md:text-4xl font-bold text-white mb-4">
              {news.title_en}
            </h1>

            {/* Article Meta */}
            <div className="flex flex-wrap items-center gap-4 text-white/60">
              {news.published_at && (
                <time
                  dateTime={news.published_at}
                  className="flex items-center gap-1"
                >
                  <Calendar className="w-4 h-4" />
                  {formatDate(news.published_at)}
                </time>
              )}
              {news.views_count > 0 && (
                <span className="flex items-center gap-1">
                  <Eye className="w-4 h-4" />
                  {news.views_count.toLocaleString()} views
                </span>
              )}
            </div>
          </header>

          {/* Article Content */}
          <div
            className="prose prose-invert prose-lg max-w-none"
            itemProp="articleBody"
          >
            <p className="text-white/90 leading-relaxed whitespace-pre-wrap">
              {news.description_en}
            </p>
          </div>

          {/* Tags */}
          {news.tags && news.tags.length > 0 && (
            <div className="mt-8">
              <div className="flex flex-wrap gap-2" role="list" aria-label="Article tags">
                {news.tags.map((tag: string) => (
                  <span
                    key={tag}
                    role="listitem"
                    className="px-3 py-1 bg-slate-800 text-white/70 rounded-full text-sm hover:bg-slate-700 transition-colors"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Original Source Link */}
          {news.original_url && (
            <footer className="mt-8">
              <a
                href={news.original_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl transition-colors"
              >
                <ExternalLink className="w-4 h-4" />
                Read Original Article
              </a>
            </footer>
          )}

          {/* Author Info */}
          <aside className="mt-12 p-6 bg-slate-800/50 rounded-2xl" itemScope itemType="https://schema.org/Person">
            <p className="text-white/60 text-sm mb-2">Curated by</p>
            <p className="text-white font-semibold" itemProp="name">Vitalii Berbeha</p>
            <p className="text-white/60 text-sm" itemProp="jobTitle">E-commerce & Marketing Expert</p>
          </aside>
        </div>
      </article>
    </>
  )
}

// Helper function to extract YouTube video ID
function extractYouTubeId(url: string): string {
  const match = url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/)
  return match ? match[1] : ''
}
