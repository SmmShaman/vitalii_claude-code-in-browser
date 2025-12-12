'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { Calendar, Tag, ChevronLeft, Clock, BookOpen } from 'lucide-react';
import type { BlogPost } from '@/lib/supabase';

interface Props {
  post: BlogPost;
}

export function BlogArticleClient({ post }: Props) {
  const formatDate = (dateString: string | null) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }).format(date);
  };

  // Estimate reading time (assuming ~200 words per minute)
  const getReadingTime = (content: string | null) => {
    if (!content) return '1 min read';
    const words = content.split(/\s+/).length;
    const minutes = Math.ceil(words / 200);
    return `${minutes} min read`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-slate-900/95 backdrop-blur-sm border-b border-slate-700">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-2 text-white/80 hover:text-white transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
            <span>Back to Home</span>
          </Link>

          <span className="text-amber-400 font-bold">Vitalii Berbeha</span>
        </div>
      </header>

      {/* Article Content */}
      <main className="max-w-4xl mx-auto px-4 py-8">
        <motion.article
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-slate-800/50 rounded-2xl overflow-hidden shadow-xl"
        >
          {/* Hero Image */}
          {post.image_url && (
            <div className="relative aspect-video bg-black">
              <img
                src={post.image_url}
                alt={post.title_en || 'Blog post image'}
                className="w-full h-full object-cover"
              />
            </div>
          )}

          {/* Article Body */}
          <div className="p-6 md:p-8">
            {/* Category Badge */}
            {post.category && (
              <div className="mb-4">
                <span className="px-3 py-1 bg-purple-500/20 text-purple-400 rounded-full text-sm">
                  {post.category}
                </span>
              </div>
            )}

            {/* Title */}
            <h1 className="text-3xl md:text-4xl font-bold text-white mb-4">
              {post.title_en}
            </h1>

            {/* Meta */}
            <div className="flex flex-wrap items-center gap-4 text-sm text-slate-400 mb-6">
              {post.published_at && (
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  <span>{formatDate(post.published_at)}</span>
                </div>
              )}

              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                <span>{getReadingTime(post.content_en)}</span>
              </div>

              <div className="flex items-center gap-2 text-green-400">
                <BookOpen className="w-4 h-4" />
                <span>{post.views_count} views</span>
              </div>
            </div>

            {/* Tags */}
            {post.tags && post.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-6">
                {post.tags.map((tag, index) => (
                  <span
                    key={index}
                    className="px-3 py-1 bg-blue-500/20 text-blue-400 rounded-full text-sm flex items-center gap-1"
                  >
                    <Tag className="w-3 h-3" />
                    {tag}
                  </span>
                ))}
              </div>
            )}

            {/* Description/Summary */}
            {post.description_en && (
              <p className="text-lg text-slate-300 mb-6 leading-relaxed font-medium border-l-4 border-blue-500 pl-4">
                {post.description_en}
              </p>
            )}

            {/* Content */}
            {post.content_en && (
              <div className="prose prose-lg prose-invert max-w-none">
                <p className="whitespace-pre-wrap text-slate-300 leading-relaxed">
                  {post.content_en}
                </p>
              </div>
            )}
          </div>
        </motion.article>

        {/* Back to Home CTA */}
        <div className="mt-8 text-center">
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-6 py-3 bg-purple-600 hover:bg-purple-500 text-white rounded-lg transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
            <span>Back to Portfolio</span>
          </Link>
        </div>
      </main>
    </div>
  );
}
