'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { Calendar, Eye, Video, Newspaper, BookOpen } from 'lucide-react'
import { motion } from 'framer-motion'

// Helper to extract YouTube video ID from URL
const getYouTubeVideoId = (url: string): string | null => {
  if (!url) return null
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\s]+)/,
    /^([a-zA-Z0-9_-]{11})$/
  ]
  for (const pattern of patterns) {
    const match = url.match(pattern)
    if (match) return match[1]
  }
  return null
}

// Helper to get YouTube thumbnail URL
const getYouTubeThumbnail = (videoUrl: string): string | null => {
  const videoId = getYouTubeVideoId(videoUrl)
  if (!videoId) return null
  return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`
}

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
  index: number
}

export function SearchResultCard({ result, index }: SearchResultCardProps) {
  const router = useRouter()
  const [imgFailed, setImgFailed] = useState(false)
  const [fallbackFailed, setFallbackFailed] = useState(false)

  const directImage = result.processed_image_url || result.image_url
  const videoThumbnail = result.video_url && result.video_type === 'youtube'
    ? getYouTubeThumbnail(result.video_url)
    : null

  // Fallback chain: primary -> alternate -> video thumbnail -> null
  const alternateImage = directImage === result.processed_image_url
    ? result.image_url
    : result.processed_image_url
  const primaryImage = directImage || videoThumbnail
  const displayImage = imgFailed
    ? (fallbackFailed ? null : (alternateImage || videoThumbnail))
    : primaryImage

  const isVideoThumbnail = !directImage && !!videoThumbnail
  const href = `/${result.type === 'news' ? 'news' : 'blog'}/${result.slug}`
  const isNews = result.type === 'news'

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: Math.min(index * 0.05, 0.3) }}
      className="break-inside-avoid mb-4"
    >
      <div className="group rounded-xl overflow-hidden border border-[#443D35] bg-[#35302A] hover:shadow-lg hover:border-[#5A5140] transition-all duration-300 hover:scale-[1.02]">
        <Link href={href} className="block">
          {/* Image — natural aspect ratio, no cropping */}
          {displayImage ? (
            <div className="relative w-full overflow-hidden">
              <Image
                src={displayImage}
                alt={result.title}
                width={600}
                height={400}
                className="w-full h-auto group-hover:scale-105 transition-transform duration-500"
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                onError={() => {
                  if (!imgFailed) setImgFailed(true)
                  else if (!fallbackFailed) setFallbackFailed(true)
                }}
                unoptimized
              />
              {/* Type badge */}
              <div
                className={`absolute top-2 left-2 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider text-white ${
                  isNews ? 'bg-brand/90' : 'bg-blue-600/90'
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
              {/* Play overlay for video thumbnails */}
              {isVideoThumbnail && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                  <div className="w-10 h-10 rounded-full bg-[#35302A]/90 flex items-center justify-center">
                    <div className="w-0 h-0 border-l-[14px] border-l-[#35302A] border-y-[8px] border-y-transparent ml-1" />
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* Gradient placeholder when no image */
            <div className="relative w-full aspect-video bg-gradient-to-br from-[#3D3730] to-[#2D2520] flex items-center justify-center overflow-hidden">
              {result.video_url ? (
                <Video className="w-10 h-10 text-[#5A5140]" />
              ) : isNews ? (
                <Newspaper className="w-10 h-10 text-[#5A5140]" />
              ) : (
                <BookOpen className="w-10 h-10 text-[#5A5140]" />
              )}
              <div
                className={`absolute top-2 left-2 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider text-white ${
                  isNews ? 'bg-brand/90' : 'bg-blue-600/90'
                }`}
              >
                {isNews ? 'News' : 'Blog'}
              </div>
            </div>
          )}

          {/* Title + description — inside Link for article navigation */}
          <div className="px-3 pt-3">
            <h3 className="text-sm font-semibold text-content group-hover:text-brand-light transition-colors line-clamp-2">
              {result.title}
            </h3>

            {result.description && (
              <p className="text-xs text-[#B0AB9A] mt-1 line-clamp-2">{result.description}</p>
            )}
          </div>
        </Link>

        {/* Tags + meta — OUTSIDE Link to prevent navigation conflict */}
        <div className="px-3 pb-3">
          {result.tags && result.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {result.tags.slice(0, 3).map((tag) => (
                <button
                  key={tag}
                  onClick={() => {
                    router.push(`/${result.type === 'news' ? 'news' : 'blog'}?tag=${encodeURIComponent(tag.toLowerCase())}`)
                  }}
                  className="px-1.5 py-0.5 rounded-full text-[10px] bg-[#3D3730] text-[#B0AB9A] hover:bg-[#4A4580] hover:text-brand-light transition-colors cursor-pointer"
                >
                  #{tag}
                </button>
              ))}
            </div>
          )}

          <div className="flex items-center gap-2 mt-2 text-[10px] text-[#8A8478]">
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
    </motion.div>
  )
}
