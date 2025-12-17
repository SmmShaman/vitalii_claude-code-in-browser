'use client'

import { useEffect, useState } from 'react'
import { getBlogPostBySlug } from '@/integrations/supabase/client'
import Link from 'next/link'
import Image from 'next/image'
import { Clock, Calendar } from 'lucide-react'
import { useTranslations } from '@/contexts/TranslationContext'
import {
  generateBlogPostSchema,
  formatDate,
  calculateReadingTime,
} from '@/utils/seo'

interface BlogArticleProps {
  slug: string
}

export function BlogArticle({ slug }: BlogArticleProps) {
  const { currentLanguage } = useTranslations()
  const [post, setPost] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchPost = async () => {
      const data = await getBlogPostBySlug(slug)
      setPost(data)
      setLoading(false)
    }
    fetchPost()
  }, [slug])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-pulse text-gray-400">Loading...</div>
      </div>
    )
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

  const readingTime = post.reading_time || calculateReadingTime(content)

  return (
    <>
      {/* JSON-LD Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(blogPostSchema) }}
      />

      <article className="flex-1">
        {/* Featured Image */}
        {(post.image_url || post.cover_image_url) && (
          <figure className="mb-6">
            <div className="relative w-full aspect-video rounded-2xl overflow-hidden">
              <Image
                src={post.image_url || post.cover_image_url}
                alt={title}
                fill
                priority
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 70vw, 800px"
                className="object-cover"
              />
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
            {post.published_at && (
              <time
                dateTime={post.published_at}
                className="flex items-center gap-1 text-sm"
              >
                <Calendar className="w-4 h-4" />
                {formatDate(post.published_at)}
              </time>
            )}
            {readingTime > 0 && (
              <span className="flex items-center gap-1 text-sm">
                <Clock className="w-4 h-4" />
                {readingTime} min read
              </span>
            )}
            {post.category && (
              <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
                {post.category}
              </span>
            )}
          </div>
        </header>

        {/* Article Content */}
        <div className="prose prose-lg max-w-none mb-8" itemProp="articleBody">
          <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
            {content}
          </p>
        </div>

        {/* Tags */}
        {post.tags && post.tags.length > 0 && (
          <footer>
            <div className="flex flex-wrap gap-2" role="list" aria-label="Article tags">
              {post.tags.map((tag: string) => (
                <span
                  key={tag}
                  role="listitem"
                  className="px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-sm hover:bg-gray-200 transition-colors"
                >
                  #{tag}
                </span>
              ))}
            </div>
          </footer>
        )}
      </article>
    </>
  )
}
