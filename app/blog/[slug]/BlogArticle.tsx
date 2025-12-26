'use client'

import { useEffect, useState } from 'react'
import { getBlogPostBySlug, getRelatedBlogPosts } from '@/integrations/supabase/client'
import Link from 'next/link'
import Image from 'next/image'
import { Clock, Calendar, ExternalLink, Eye, ChevronRight, Home } from 'lucide-react'
import { useTranslations } from '@/contexts/TranslationContext'
import { ShareButtons } from '@/components/ui/ShareButtons'
import { ArticleSkeleton } from '@/components/ui/Skeleton'
import { ScrollReveal } from '@/components/ui/ScrollReveal'
import {
  generateBlogPostSchema,
  formatDate,
  calculateReadingTime,
} from '@/utils/seo'

// Helper function to extract YouTube video ID
function extractYouTubeId(url: string): string {
  const match = url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/)
  return match ? match[1] : ''
}

interface BlogArticleProps {
  slug: string
}

export function BlogArticle({ slug }: BlogArticleProps) {
  const { currentLanguage } = useTranslations()
  const [post, setPost] = useState<any>(null)
  const [relatedPosts, setRelatedPosts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchPost = async () => {
      const data = await getBlogPostBySlug(slug)
      setPost(data)
      setLoading(false)

      // Fetch related posts based on tags
      if (data?.id && data?.tags?.length > 0) {
        const related = await getRelatedBlogPosts(data.id, data.tags, 3)
        setRelatedPosts(related || [])
      }
    }
    fetchPost()
  }, [slug])

  if (loading) {
    return <ArticleSkeleton />
  }

  if (!post) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-gray-900">
        <h1 className="text-2xl font-bold mb-4">Blog Post Not Found</h1>
        <Link href="/" className="text-blue-600 hover:text-blue-500">
          Back to Home
        </Link>
      </div>
    )
  }

  // Generate JSON-LD schema
  const blogPostSchema = generateBlogPostSchema(post)

  // Get translated content
  const lang = currentLanguage.toLowerCase() as 'en' | 'no' | 'ua'
  const title = post[`title_${lang}`] || post.title_en
  const content = post[`content_${lang}`] || post.content_en || post[`description_${lang}`] || post.description_en
  const currentSlug = post[`slug_${lang}`] || post.slug_en || slug

  const readingTime = post.reading_time || calculateReadingTime(content)
  const heroImage = (post as any).processed_image_url || post.images?.[0] || post.image_url || post.cover_image_url

  return (
    <>
      {/* JSON-LD Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(blogPostSchema) }}
      />

      <article itemScope itemType="https://schema.org/BlogPosting">
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
                className="flex items-center gap-1.5 hover:text-blue-600 transition-colors"
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
                href="/#blog"
                itemProp="item"
                className="hover:text-blue-600 transition-colors"
              >
                <span itemProp="name">Blog</span>
              </Link>
              <meta itemProp="position" content="2" />
            </li>
            {post.category && (
              <>
                <ChevronRight className="w-4 h-4 text-gray-400" />
                <li
                  itemProp="itemListElement"
                  itemScope
                  itemType="https://schema.org/ListItem"
                  className="flex items-center"
                >
                  <span itemProp="name" className="text-blue-600">
                    {post.category}
                  </span>
                  <meta itemProp="position" content="3" />
                </li>
              </>
            )}
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
              <meta itemProp="position" content={post.category ? "4" : "3"} />
            </li>
          </ol>
        </nav>

        {/* Hero Section - Full Width */}
        {heroImage && !post.video_url && (
          <div className="relative w-full h-[35vh] md:h-[45vh] lg:h-[50vh] bg-gray-100">
            <Image
              src={heroImage}
              alt={title}
              fill
              priority
              sizes="100vw"
              className="object-cover"
            />
            {/* Gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />

            {/* Category badge on hero */}
            {post.category && (
              <div className="absolute top-4 left-4 md:top-6 md:left-6">
                <span className="px-3 py-1.5 bg-blue-600 text-white rounded-full text-sm font-medium shadow-lg">
                  {post.category}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Video Hero (if video exists) */}
        {post.video_url && (
          <div className="w-full bg-black">
            <div className="max-w-5xl mx-auto">
              <div className="relative w-full aspect-video">
                {post.video_type === 'youtube' ? (
                  <iframe
                    src={`https://www.youtube.com/embed/${extractYouTubeId(post.video_url)}`}
                    title={title}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    className="absolute inset-0 w-full h-full"
                  />
                ) : post.video_type === 'telegram_embed' ? (
                  <TelegramVideoPlaceholder url={post.video_url} />
                ) : (
                  <video
                    src={post.video_url}
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
              {post.category && !heroImage && (
                <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full font-medium">
                  {post.category}
                </span>
              )}
              {post.published_at && (
                <time dateTime={post.published_at} className="flex items-center gap-1.5">
                  <Calendar className="w-4 h-4" />
                  {formatDate(post.published_at)}
                </time>
              )}
              {readingTime > 0 && (
                <span className="flex items-center gap-1.5">
                  <Clock className="w-4 h-4" />
                  {readingTime} min read
                </span>
              )}
              {post.views_count > 0 && (
                <span className="flex items-center gap-1.5">
                  <Eye className="w-4 h-4" />
                  {post.views_count} views
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
          {post.tags && post.tags.length > 0 && (
            <ScrollReveal delay={0.3}>
              <div className="flex flex-wrap gap-2 mb-8">
                {post.tags.map((tag: string) => (
                  <Link
                    key={tag}
                    href={`/blog?tag=${encodeURIComponent(tag)}`}
                    className="px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-sm hover:bg-blue-100 hover:text-blue-700 transition-colors"
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
                <p className="text-gray-700 leading-relaxed whitespace-pre-wrap text-lg">
                  {content}
                </p>
              </div>
            </section>
          </ScrollReveal>

          {/* Original Source Link */}
          {post.original_url && (
            <ScrollReveal delay={0.5}>
              <div className="mb-8">
                <h2 className="sr-only">Original Source</h2>
                <a
                  href={post.original_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium"
                >
                  <ExternalLink className="w-4 h-4" />
                  Read Original Article
                </a>
              </div>
            </ScrollReveal>
          )}

          {/* Share Buttons */}
          <ScrollReveal delay={0.6}>
            <section aria-labelledby="share-section">
              <h2 id="share-section" className="sr-only">Share this article</h2>
              <div className="py-6 border-t border-gray-200">
                <ShareButtons
                  url={`/blog/${currentSlug}`}
                  title={title}
                  description={content?.substring(0, 150)}
                />
              </div>
            </section>
          </ScrollReveal>
        </div>

        {/* Related Posts - Full width background */}
        {relatedPosts.length > 0 && (
          <div className="bg-gray-50 py-12">
            <div className="max-w-5xl mx-auto px-4">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Related Articles</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {relatedPosts.map((relatedPost) => {
                  const relatedTitle = relatedPost[`title_${lang}`] || relatedPost.title_en
                  const relatedSlug = relatedPost[`slug_${lang}`] || relatedPost.slug_en
                  const relatedImage = (relatedPost as any).processed_image_url || relatedPost.image_url

                  return (
                    <Link
                      key={relatedPost.id}
                      href={`/blog/${relatedSlug}`}
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
                        <h3 className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors line-clamp-2">
                          {relatedTitle}
                        </h3>
                        {relatedPost.tags && relatedPost.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {relatedPost.tags.slice(0, 2).map((tag: string) => (
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
