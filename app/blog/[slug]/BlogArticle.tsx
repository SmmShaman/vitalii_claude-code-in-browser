'use client'

import { useEffect, useState } from 'react'
import { getBlogPostBySlug } from '@/integrations/supabase/client'
import Link from 'next/link'
import Image from 'next/image'
import { ArrowLeft, Clock, Eye, Calendar } from 'lucide-react'
import {
  generateBlogPostSchema,
  generateBreadcrumbSchema,
  BASE_URL,
  formatDate,
  calculateReadingTime,
} from '@/utils/seo'

interface BlogArticleProps {
  slug: string
}

export function BlogArticle({ slug }: BlogArticleProps) {
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
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="animate-pulse text-white/50">Loading...</div>
      </div>
    )
  }

  if (!post) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex flex-col items-center justify-center text-white">
        <h1 className="text-2xl font-bold mb-4">Blog Post Not Found</h1>
        <Link href="/" className="text-blue-400 hover:text-blue-300 flex items-center gap-2">
          <ArrowLeft className="w-4 h-4" />
          Back to Home
        </Link>
      </div>
    )
  }

  // Generate JSON-LD schemas
  const blogPostSchema = generateBlogPostSchema(post)
  const breadcrumbSchema = generateBreadcrumbSchema([
    { name: 'Home', url: BASE_URL },
    { name: 'Blog', url: `${BASE_URL}/#blog` },
    { name: post.title_en },
  ])

  const readingTime = post.reading_time || calculateReadingTime(post.content_en)

  return (
    <>
      {/* JSON-LD Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(blogPostSchema) }}
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
                <Link href="/#blog" itemProp="item" className="hover:text-white/80 transition-colors">
                  <span itemProp="name">Blog</span>
                </Link>
                <meta itemProp="position" content="2" />
              </li>
              <li className="text-white/40">/</li>
              <li itemProp="itemListElement" itemScope itemType="https://schema.org/ListItem" className="text-white/80 truncate max-w-[200px]">
                <span itemProp="name">{post.title_en}</span>
                <meta itemProp="position" content="3" />
              </li>
            </ol>
          </nav>

          <Link href="/" className="text-blue-400 hover:text-blue-300 flex items-center gap-2 mb-8 transition-colors">
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </Link>

          {/* Featured Image */}
          {(post.image_url || post.cover_image_url) && (
            <figure className="mb-8">
              <div className="relative w-full h-64 md:h-96 rounded-2xl overflow-hidden">
                <Image
                  src={post.image_url || post.cover_image_url}
                  alt={post.title_en}
                  fill
                  priority
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 80vw, 896px"
                  className="object-cover"
                />
              </div>
            </figure>
          )}

          {/* Article Header */}
          <header className="mb-8">
            <h1 className="text-3xl md:text-4xl font-bold text-white mb-4">
              {post.title_en}
            </h1>

            {/* Article Meta */}
            <div className="flex flex-wrap items-center gap-4 text-white/60">
              {post.published_at && (
                <time
                  dateTime={post.published_at}
                  className="flex items-center gap-1"
                >
                  <Calendar className="w-4 h-4" />
                  {formatDate(post.published_at)}
                </time>
              )}
              {readingTime > 0 && (
                <span className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  {readingTime} min read
                </span>
              )}
              {post.views_count > 0 && (
                <span className="flex items-center gap-1">
                  <Eye className="w-4 h-4" />
                  {post.views_count.toLocaleString()} views
                </span>
              )}
              {post.category && (
                <span className="px-2 py-1 bg-blue-600/20 text-blue-400 rounded-full text-sm">
                  {post.category}
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
              {post.content_en || post.description_en}
            </p>
          </div>

          {/* Tags */}
          {post.tags && post.tags.length > 0 && (
            <footer className="mt-8">
              <div className="flex flex-wrap gap-2" role="list" aria-label="Article tags">
                {post.tags.map((tag: string) => (
                  <span
                    key={tag}
                    role="listitem"
                    className="px-3 py-1 bg-slate-800 text-white/70 rounded-full text-sm hover:bg-slate-700 transition-colors"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            </footer>
          )}

          {/* Author Info */}
          <aside className="mt-12 p-6 bg-slate-800/50 rounded-2xl" itemScope itemType="https://schema.org/Person">
            <p className="text-white/60 text-sm mb-2">Written by</p>
            <p className="text-white font-semibold" itemProp="name">Vitalii Berbeha</p>
            <p className="text-white/60 text-sm" itemProp="jobTitle">E-commerce & Marketing Expert</p>
          </aside>
        </div>
      </article>
    </>
  )
}
