'use client'

import { useEffect, useState } from 'react'
import { getBlogPostBySlug } from '@/integrations/supabase/client'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <Link href="/" className="text-blue-400 hover:text-blue-300 flex items-center gap-2 mb-8">
          <ArrowLeft className="w-4 h-4" />
          Back to Home
        </Link>

        {post.image_url && (
          <img
            src={post.image_url}
            alt={post.title_en}
            className="w-full h-64 md:h-96 object-cover rounded-2xl mb-8"
          />
        )}

        <h1 className="text-3xl md:text-4xl font-bold text-white mb-4">
          {post.title_en}
        </h1>

        <div className="flex items-center gap-4 text-white/60 mb-8">
          {post.published_at && (
            <time>{new Date(post.published_at).toLocaleDateString()}</time>
          )}
          {post.views_count > 0 && (
            <span>{post.views_count} views</span>
          )}
          {post.category && (
            <span className="px-2 py-1 bg-blue-600/20 text-blue-400 rounded-full text-sm">
              {post.category}
            </span>
          )}
        </div>

        <div className="prose prose-invert prose-lg max-w-none">
          <p className="text-white/90 leading-relaxed whitespace-pre-wrap">
            {post.content_en || post.description_en}
          </p>
        </div>

        {post.tags && post.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-8">
            {post.tags.map((tag: string) => (
              <span
                key={tag}
                className="px-3 py-1 bg-slate-800 text-white/70 rounded-full text-sm"
              >
                #{tag}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
