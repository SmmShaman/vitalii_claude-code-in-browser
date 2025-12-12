'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { Calendar, Tag, ExternalLink, ChevronLeft, Video } from 'lucide-react';
import type { NewsItem } from '@/lib/supabase';

interface Props {
  news: NewsItem;
}

export function NewsArticleClient({ news }: Props) {
  const formatDate = (dateString: string | null) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }).format(date);
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
          {/* Hero Image/Video */}
          {(news.video_url || news.image_url) && (
            <div className="relative aspect-video bg-black">
              {news.video_url ? (
                <div className="w-full h-full">
                  {news.video_type === 'youtube' ? (
                    <iframe
                      src={news.video_url}
                      className="w-full h-full"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                      title={news.title_en || 'Video'}
                    />
                  ) : (
                    <video
                      src={news.video_url}
                      controls
                      className="w-full h-full object-cover"
                      playsInline
                      preload="metadata"
                    />
                  )}
                </div>
              ) : news.image_url && (
                <img
                  src={news.image_url}
                  alt={news.title_en || 'News image'}
                  className="w-full h-full object-cover"
                />
              )}
            </div>
          )}

          {/* Article Body */}
          <div className="p-6 md:p-8">
            {/* Title */}
            <h1 className="text-3xl md:text-4xl font-bold text-white mb-4">
              {news.title_en}
            </h1>

            {/* Meta */}
            <div className="flex flex-wrap items-center gap-4 text-sm text-slate-400 mb-6">
              {news.published_at && (
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  <span>{formatDate(news.published_at)}</span>
                </div>
              )}

              {news.video_url && (
                <div className="flex items-center gap-2 text-blue-400">
                  <Video className="w-4 h-4" />
                  <span>Video</span>
                </div>
              )}
            </div>

            {/* Tags */}
            {news.tags && news.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-6">
                {news.tags.map((tag, index) => (
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
            {news.description_en && (
              <p className="text-lg text-slate-300 mb-6 leading-relaxed">
                {news.description_en}
              </p>
            )}

            {/* Content */}
            {news.content_en && (
              <div className="prose prose-lg prose-invert max-w-none">
                <p className="whitespace-pre-wrap text-slate-300">
                  {news.content_en}
                </p>
              </div>
            )}

            {/* Source Link */}
            {news.original_url && (
              <div className="mt-8 pt-6 border-t border-slate-700">
                <a
                  href={news.original_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-blue-400 hover:text-blue-300 transition-colors"
                >
                  <span>Read original article</span>
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>
            )}
          </div>
        </motion.article>

        {/* Back to Home CTA */}
        <div className="mt-8 text-center">
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
            <span>Back to Portfolio</span>
          </Link>
        </div>
      </main>
    </div>
  );
}
