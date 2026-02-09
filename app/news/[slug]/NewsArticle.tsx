'use client'

import { useEffect, useState, useRef, useMemo, useCallback } from 'react'
import { getNewsBySlug, getRelatedNews } from '@/integrations/supabase/client'
import Link from 'next/link'
import Image from 'next/image'
import ReactMarkdown from 'react-markdown'
import { Calendar, ExternalLink, Eye, ChevronRight, Home } from 'lucide-react'
import { useTranslations } from '@/contexts/TranslationContext'
import { useTrackingSafe } from '@/contexts/TrackingContext'
import { ShareButtons } from '@/components/ui/ShareButtons'
import { ArticleSkeleton } from '@/components/ui/Skeleton'
import { ScrollReveal } from '@/components/ui/ScrollReveal'
import { ImageLightbox, useLightbox, LightboxImage } from '@/components/ui/ImageLightbox'
import {
  generateNewsArticleSchema,
  formatDate,
} from '@/utils/seo'

// Helper function to extract YouTube video ID
function extractYouTubeId(url: string): string {
  const match = url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/)
  return match ? match[1] : ''
}

interface NewsArticleProps {
  slug: string
  initialLanguage?: 'en' | 'no' | 'ua'
}

export function NewsArticle({ slug, initialLanguage }: NewsArticleProps) {
  const { currentLanguage } = useTranslations()
  const tracking = useTrackingSafe()
  const [news, setNews] = useState<any>(null)
  const [relatedNews, setRelatedNews] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const hasTrackedView = useRef(false)
  const { isOpen, currentIndex, images, openWithImage, closeLightbox, setImages } = useLightbox()

  useEffect(() => {
    const fetchNews = async () => {
      const data = await getNewsBySlug(slug)
      setNews(data)
      setLoading(false)

      // Track article view once when data is loaded
      if (data && !hasTrackedView.current) {
        const lang = currentLanguage.toLowerCase() as 'en' | 'no' | 'ua'
        const title = data[`title_${lang}`] || data.title_en
        tracking?.trackArticleView('news', data.id, title, currentLanguage)
        hasTrackedView.current = true
      }

      // Fetch related news based on tags
      if (data?.id && data?.tags?.length > 0) {
        const related = await getRelatedNews(data.id, data.tags, 3)
        setRelatedNews(related || [])
      }
    }
    fetchNews()
  }, [slug, currentLanguage, tracking])

  // Get translated content (must be before conditional returns for hooks)
  const lang = currentLanguage.toLowerCase() as 'en' | 'no' | 'ua'
  const title = news?.[`title_${lang}`] || news?.title_en || ''
  const description = news?.[`description_${lang}`] || news?.description_en || ''
  const content = news?.[`content_${lang}`] || news?.content_en || description
  const currentSlug = news?.[`slug_${lang}`] || news?.slug_en || slug
  const heroImage = news?.processed_image_url || news?.images?.[0] || news?.image_url

  // Collect all images for lightbox (hero + images from content) - MUST be before conditional returns
  const allImages = useMemo(() => {
    if (!news) return []
    const imageList: LightboxImage[] = []
    if (heroImage) {
      imageList.push({ src: heroImage, alt: title })
    }
    // Add additional images from news.images array
    if (news.images && Array.isArray(news.images)) {
      news.images.forEach((img: string, index: number) => {
        if (img !== heroImage) {
          imageList.push({ src: img, alt: `${title} - Image ${index + 1}` })
        }
      })
    }
    return imageList
  }, [heroImage, news, title])

  // Update lightbox images when allImages changes - MUST be before conditional returns
  useEffect(() => {
    setImages(allImages)
  }, [allImages, setImages])

  // Handle image click for lightbox - MUST be before conditional returns
  const handleImageClick = useCallback((imageSrc: string) => {
    openWithImage(imageSrc, allImages)
  }, [openWithImage, allImages])

  // Generate JSON-LD schema using slug language for SEO (what Google sees on first render)
  const schemaLang = initialLanguage || lang
  const newsArticleSchema = news ? generateNewsArticleSchema(news, schemaLang) : null

  if (loading) {
    return <ArticleSkeleton />
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

  return (
    <>
      {/* JSON-LD Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(newsArticleSchema) }}
      />

      <article itemScope itemType="https://schema.org/NewsArticle">
        {/* Breadcrumbs */}
        <nav
          aria-label="Breadcrumb"
          className="max-w-5xl mx-auto px-4 py-4"
          itemScope
          itemType="https://schema.org/BreadcrumbList"
        >
          <ol className="flex items-center gap-2 text-sm text-gray-600">
            <li
              itemProp="itemListElement"
              itemScope
              itemType="https://schema.org/ListItem"
              className="flex items-center"
            >
              <Link
                href="/"
                itemProp="item"
                className="flex items-center gap-1.5 hover:text-lime-600 transition-colors"
              >
                <Home className="w-4 h-4" />
                <span itemProp="name">Home</span>
              </Link>
              <meta itemProp="position" content="1" />
            </li>
            <ChevronRight className="w-4 h-4 text-gray-400" />
            <li
              itemProp="itemListElement"
              itemScope
              itemType="https://schema.org/ListItem"
              className="flex items-center"
            >
              <Link
                href="/#news"
                itemProp="item"
                className="hover:text-lime-600 transition-colors"
              >
                <span itemProp="name">News</span>
              </Link>
              <meta itemProp="position" content="2" />
            </li>
            <ChevronRight className="w-4 h-4 text-gray-400" />
            <li
              itemProp="itemListElement"
              itemScope
              itemType="https://schema.org/ListItem"
              className="flex items-center"
            >
              <span
                itemProp="name"
                className="text-gray-900 font-medium truncate max-w-[200px] sm:max-w-[300px]"
                title={title}
              >
                {title}
              </span>
              <meta itemProp="position" content="3" />
            </li>
          </ol>
        </nav>

        {/* Hero Section - Full Width */}
        {heroImage && !news.video_url && (
          <button
            type="button"
            onClick={() => handleImageClick(heroImage)}
            className="relative w-full h-[35vh] md:h-[45vh] lg:h-[50vh] bg-gray-100 cursor-zoom-in focus:outline-none focus:ring-2 focus:ring-lime-500 focus:ring-offset-2"
            aria-label={`View ${title} image in fullscreen`}
          >
            <Image
              src={heroImage}
              alt={title}
              fill
              priority
              sizes="100vw"
              className="object-cover"
            />
            {/* Gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent pointer-events-none" />
          </button>
        )}

        {/* Video Hero (if video exists) */}
        {news.video_url && (
          <div className="w-full bg-black">
            <div className="max-w-5xl mx-auto">
              <div className="relative w-full aspect-video">
                {news.video_type === 'youtube' ? (
                  <iframe
                    src={`https://www.youtube.com/embed/${extractYouTubeId(news.video_url)}`}
                    title={title}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    className="absolute inset-0 w-full h-full"
                  />
                ) : news.video_type === 'telegram_embed' ? (
                  <TelegramVideoPlaceholder url={news.video_url} />
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
            </div>
          </div>
        )}

        {/* Content Container */}
        <div className="max-w-3xl mx-auto px-4 py-8 md:py-12">
          {/* Meta info */}
          <ScrollReveal delay={0.1}>
            <div className="flex flex-wrap items-center gap-3 text-sm text-gray-500 mb-4">
              {news.published_at && (
                <time dateTime={news.published_at} className="flex items-center gap-1.5">
                  <Calendar className="w-4 h-4" />
                  {formatDate(news.published_at)}
                </time>
              )}
              {news.views_count > 0 && (
                <span className="flex items-center gap-1.5">
                  <Eye className="w-4 h-4" />
                  {news.views_count} views
                </span>
              )}
            </div>
          </ScrollReveal>

          {/* Title */}
          <ScrollReveal delay={0.2}>
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 mb-6 leading-tight">
              {title}
            </h1>
          </ScrollReveal>

          {/* Tags */}
          {news.tags && news.tags.length > 0 && (
            <ScrollReveal delay={0.3}>
              <div className="flex flex-wrap gap-2 mb-8">
                {news.tags.map((tag: string) => (
                  <Link
                    key={tag}
                    href={`/news?tag=${encodeURIComponent(tag)}`}
                    className="px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-sm hover:bg-lime-100 hover:text-lime-700 transition-colors"
                  >
                    #{tag}
                  </Link>
                ))}
              </div>
            </ScrollReveal>
          )}

          {/* Article Content - Section with H2 */}
          <ScrollReveal delay={0.4}>
            <section aria-labelledby="article-content">
              <h2 id="article-content" className="sr-only">Article Content</h2>
              <div className="prose prose-lg max-w-none mb-8" itemProp="articleBody">
                <ReactMarkdown
                  components={{
                    a: ({ href, children }) => (
                      <a
                        href={href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800 underline"
                      >
                        {children}
                      </a>
                    ),
                    p: ({ children }) => (
                      <p className="text-gray-700 leading-relaxed text-lg mb-4">{children}</p>
                    ),
                    strong: ({ children }) => (
                      <strong className="font-semibold">{children}</strong>
                    ),
                    ul: ({ children }) => (
                      <ul className="list-disc list-inside mb-4 space-y-1 text-gray-700">{children}</ul>
                    ),
                    ol: ({ children }) => (
                      <ol className="list-decimal list-inside mb-4 space-y-1 text-gray-700">{children}</ol>
                    ),
                    li: ({ children }) => (
                      <li className="text-gray-700">{children}</li>
                    ),
                    h1: ({ children }) => (
                      <h1 className="text-2xl font-bold text-gray-900 mt-6 mb-4">{children}</h1>
                    ),
                    h2: ({ children }) => (
                      <h2 className="text-xl font-bold text-gray-900 mt-5 mb-3">{children}</h2>
                    ),
                    h3: ({ children }) => (
                      <h3 className="text-lg font-semibold text-gray-900 mt-4 mb-2">{children}</h3>
                    ),
                    img: ({ src, alt }) => {
                      const imgSrc = typeof src === 'string' ? src : ''
                      return (
                        <button
                          type="button"
                          onClick={() => imgSrc && handleImageClick(imgSrc)}
                          className="block w-full my-4 cursor-zoom-in focus:outline-none focus:ring-2 focus:ring-lime-500 focus:ring-offset-2 rounded-lg overflow-hidden"
                          aria-label={`View ${alt || 'image'} in fullscreen`}
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={imgSrc}
                            alt={alt || ''}
                            className="w-full h-auto rounded-lg hover:scale-[1.02] transition-transform"
                          />
                        </button>
                      )
                    },
                  }}
                >
                  {content}
                </ReactMarkdown>
              </div>
            </section>
          </ScrollReveal>

          {/* Source Links - Display all external links */}
          {(news.source_links?.length > 0 || news.source_link || news.original_url) && (
            <ScrollReveal delay={0.5}>
              <div className="mb-8">
                <h2 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <ExternalLink className="w-5 h-5 text-lime-600" />
                  Resources
                </h2>
                <div className="flex flex-wrap gap-3">
                  {/* If we have multiple source_links, display all */}
                  {news.source_links?.length > 0 ? (
                    news.source_links.map((link: string, index: number) => {
                      let hostname = 'Source'
                      try {
                        hostname = new URL(link).hostname.replace('www.', '')
                      } catch {}
                      return (
                        <a
                          key={index}
                          href={link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-lime-100 text-gray-700 hover:text-lime-700 rounded-lg transition-colors text-sm font-medium"
                        >
                          <ExternalLink className="w-4 h-4" />
                          {hostname}
                        </a>
                      )
                    })
                  ) : (
                    /* Fallback to single source_link or original_url */
                    <a
                      href={news.source_link || news.original_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-5 py-2.5 bg-lime-600 hover:bg-lime-700 text-white rounded-lg transition-colors font-medium"
                    >
                      <ExternalLink className="w-4 h-4" />
                      Read Original Article
                    </a>
                  )}
                </div>
              </div>
            </ScrollReveal>
          )}

          {/* Share Buttons */}
          <ScrollReveal delay={0.6}>
            <section aria-labelledby="share-section">
              <h2 id="share-section" className="sr-only">Share this article</h2>
              <div className="py-6 border-t border-gray-200">
                <ShareButtons
                  url={`/news/${currentSlug}`}
                  title={title}
                  description={content?.substring(0, 150)}
                />
              </div>
            </section>
          </ScrollReveal>
        </div>

        {/* Related News - Full width background */}
        {relatedNews.length > 0 && (
          <div className="bg-gray-50 py-12">
            <div className="max-w-5xl mx-auto px-4">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Related News</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {relatedNews.map((relatedItem) => {
                  const relatedTitle = relatedItem[`title_${lang}`] || relatedItem.title_en
                  const relatedSlug = relatedItem[`slug_${lang}`] || relatedItem.slug_en
                  const relatedImage = (relatedItem as any).processed_image_url || relatedItem.image_url

                  return (
                    <Link
                      key={relatedItem.id}
                      href={`/news/${relatedSlug}`}
                      className="group bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow"
                    >
                      {relatedImage && (
                        <div className="relative w-full aspect-video overflow-hidden">
                          <Image
                            src={relatedImage}
                            alt={relatedTitle}
                            fill
                            sizes="(max-width: 768px) 100vw, 33vw"
                            className="object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                        </div>
                      )}
                      <div className="p-4">
                        <h3 className="font-semibold text-gray-900 group-hover:text-lime-600 transition-colors line-clamp-2">
                          {relatedTitle}
                        </h3>
                        {relatedItem.tags && relatedItem.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {relatedItem.tags.slice(0, 2).map((tag: string) => (
                              <span
                                key={tag}
                                className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full"
                              >
                                #{tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </Link>
                  )
                })}
              </div>
            </div>
          </div>
        )}
      </article>

      {/* Lightbox for fullscreen image viewing */}
      <ImageLightbox
        images={images}
        isOpen={isOpen}
        onClose={closeLightbox}
        currentIndex={currentIndex}
      />
    </>
  )
}

// Telegram Video Placeholder Component
function TelegramVideoPlaceholder({ url }: { url: string }) {
  const channelMatch = url.match(/t\.me\/([^/]+)\/(\d+)/)
  const channelName = channelMatch ? channelMatch[1] : 'Telegram'
  const messageId = channelMatch ? channelMatch[2] : ''
  const telegramDirectUrl = `https://t.me/${channelName}/${messageId}`

  return (
    <div className="w-full h-full bg-gradient-to-br from-[#2AABEE] to-[#229ED9] flex flex-col items-center justify-center relative overflow-hidden">
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-4 left-4 w-20 h-20 rounded-full bg-white/20" />
        <div className="absolute bottom-8 right-8 w-32 h-32 rounded-full bg-white/10" />
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
}
