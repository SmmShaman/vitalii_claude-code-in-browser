'use client'

import Link from 'next/link'
import Image from 'next/image'
import { Calendar, Eye, Video, Newspaper, BookOpen } from 'lucide-react'
import { motion } from 'framer-motion'

export interface SearchResult {
  id: string
  type: 'news' | 'blog'
  title: string
  description: string
  slug: string
  image_url: string | null
  processed_image_url: string | null
  tags: string[] | null
  published_at: string | null
  views_count: number
  category?: string | null
  reading_time?: number | null
  video_url?: string | null
  video_type?: string | null
}

type CardSize = 'small' | 'medium' | 'large'

const SIZE_PATTERN: CardSize[] = [
  'large', 'medium', 'small', 'medium', 'small', 'small',
  'medium', 'small', 'large', 'small', 'medium', 'small',
]

export function getCardSize(index: number, hasImage: boolean): CardSize {
  if (!hasImage) return 'small'
  return SIZE_PATTERN[index % SIZE_PATTERN.length]
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return ''
  try {
    return new Date(dateStr).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    })
  } catch {
    return ''
  }
}

interface SearchResultCardProps {
  result: SearchResult
  size: CardSize
  index: number
}

export function SearchResultCard({ result, size, index }: SearchResultCardProps) {
  const imageUrl = result.processed_image_url || result.image_url
  const href = `/${result.type === 'news' ? 'news' : 'blog'}/${result.slug}`
  const isNews = result.type === 'news'

  // Grid span classes
  const gridClasses =
    size === 'large'
      ? 'sm:col-span-2 row-span-3'
      : size === 'medium'
        ? 'row-span-3'
        : 'row-span-2'

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: Math.min(index * 0.05, 0.3) }}
      className={gridClasses}
    >
      <Link
        href={href}
        className="group block h-full rounded-xl overflow-hidden border border-gray-200 bg-white hover:shadow-lg hover:border-gray-300 transition-all duration-300 hover:scale-[1.02]"
      >
        {/* Image */}
        {imageUrl && size !== 'small' && (
          <div className={`relative w-full ${size === 'large' ? 'h-48 sm:h-56' : 'h-36 sm:h-40'} overflow-hidden`}>
            <Image
              src={imageUrl}
              alt={result.title}
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-500"
              sizes={size === 'large' ? '(max-width: 640px) 100vw, 66vw' : '(max-width: 640px) 100vw, 33vw'}
            />
            {/* Type badge */}
            <div
              className={`absolute top-2 left-2 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider text-white ${
                isNews ? 'bg-purple-600/90' : 'bg-blue-600/90'
              }`}
            >
              {isNews ? 'News' : 'Blog'}
            </div>
            {/* Video indicator */}
            {result.video_url && (
              <div className="absolute top-2 right-2 p-1 rounded-full bg-black/50 text-white">
                <Video className="w-3.5 h-3.5" />
              </div>
            )}
          </div>
        )}

        {/* Content */}
        <div className={`p-3 ${size === 'small' ? 'flex items-start gap-3' : ''}`}>
          {/* Small card: inline badge */}
          {size === 'small' && (
            <div className="flex-shrink-0 mt-0.5">
              {isNews ? (
                <Newspaper className="w-4 h-4 text-purple-500" />
              ) : (
                <BookOpen className="w-4 h-4 text-blue-500" />
              )}
            </div>
          )}

          <div className="min-w-0 flex-1">
            {/* No-image medium card badge */}
            {!imageUrl && size !== 'small' && (
              <div
                className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider text-white mb-2 ${
                  isNews ? 'bg-purple-600/90' : 'bg-blue-600/90'
                }`}
              >
                {isNews ? 'News' : 'Blog'}
              </div>
            )}

            <h3
              className={`font-semibold text-gray-900 group-hover:text-purple-700 transition-colors ${
                size === 'large' ? 'text-base sm:text-lg line-clamp-3' : 'text-sm line-clamp-2'
              }`}
            >
              {result.title}
            </h3>

            {/* Description for large cards */}
            {size === 'large' && result.description && (
              <p className="text-xs text-gray-500 mt-1 line-clamp-2">{result.description}</p>
            )}

            {/* Tags */}
            {size !== 'small' && result.tags && result.tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {result.tags.slice(0, 2).map((tag) => (
                  <span
                    key={tag}
                    className="px-1.5 py-0.5 rounded-full text-[10px] bg-gray-100 text-gray-500"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            )}

            {/* Meta */}
            <div className="flex items-center gap-2 mt-2 text-[10px] text-gray-400">
              {result.published_at && (
                <span className="flex items-center gap-0.5">
                  <Calendar className="w-3 h-3" />
                  {formatDate(result.published_at)}
                </span>
              )}
              {result.views_count > 0 && (
                <span className="flex items-center gap-0.5">
                  <Eye className="w-3 h-3" />
                  {result.views_count}
                </span>
              )}
              {result.reading_time && (
                <span>{result.reading_time} min</span>
              )}
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  )
}
