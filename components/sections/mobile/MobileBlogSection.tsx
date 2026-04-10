'use client'

import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Calendar, Eye, ChevronRight, Loader2 } from 'lucide-react'
import { getAllBlogPosts } from '@/integrations/supabase/client'
import { sectionColors } from './types'
import { VerticalLabel } from './VerticalLabel'
import type { TranslateFn } from './types'

// Blog List Overlay Component with Infinite Scroll
const BlogListOverlay = ({
  onClose,
  color,
  currentLanguage,
  t,
}: {
  onClose: () => void
  color: string
  currentLanguage: string
  t: TranslateFn
}) => {
  const [allBlogs, setAllBlogs] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [offset, setOffset] = useState(0)
  const LIMIT = 10
  const scrollRef = useRef<HTMLDivElement>(null)

  const getLocalizedField = (item: any, field: string) => {
    const lang = currentLanguage.toLowerCase()
    return item[`${field}_${lang}`] || item[`${field}_en`] || ''
  }

  const formatDate = (dateStr: string) => {
    if (!dateStr) return ''
    const date = new Date(dateStr)
    return date.toLocaleDateString(
      currentLanguage === 'UA' ? 'uk-UA' : currentLanguage === 'NO' ? 'nb-NO' : 'en-US',
      { day: 'numeric', month: 'short', year: 'numeric' }
    )
  }

  // Initial load
  useEffect(() => {
    const loadBlogs = async () => {
      try {
        const { data } = await getAllBlogPosts({ limit: LIMIT, offset: 0 })
        setAllBlogs(data || [])
        setHasMore((data?.length || 0) === LIMIT)
        setOffset(LIMIT)
      } catch (error) {
        console.error('Error loading blog posts:', error)
      } finally {
        setIsLoading(false)
      }
    }
    loadBlogs()
  }, [])

  // Load more on scroll
  const loadMore = async () => {
    if (isLoadingMore || !hasMore) return
    setIsLoadingMore(true)
    try {
      const { data } = await getAllBlogPosts({ limit: LIMIT, offset })
      if (data && data.length > 0) {
        setAllBlogs((prev) => [...prev, ...data])
        setHasMore(data.length === LIMIT)
        setOffset((prev) => prev + LIMIT)
      } else {
        setHasMore(false)
      }
    } catch (error) {
      console.error('Error loading more blogs:', error)
    } finally {
      setIsLoadingMore(false)
    }
  }

  // Scroll handler for infinite scroll
  useEffect(() => {
    const container = scrollRef.current
    if (!container) return

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container
      if (scrollHeight - scrollTop - clientHeight < 200) {
        loadMore()
      }
    }

    container.addEventListener('scroll', handleScroll, { passive: true })
    return () => container.removeEventListener('scroll', handleScroll)
  }, [offset, hasMore, isLoadingMore])

  return (
    <motion.div
      className="fixed inset-0 z-50 bg-surface"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
    >
      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 w-11 h-11 flex items-center justify-center rounded-full z-10 transition-colors"
        style={{ backgroundColor: `${color}20` }}
        aria-label="Close"
      >
        <svg className="w-6 h-6" style={{ color }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      {/* Title */}
      <div className="pt-5 px-5 pb-3">
        <h2 className="font-bold text-lg tracking-wide" style={{ color }}>
          {t('blog_title')}
        </h2>
      </div>

      {/* Scrollable content */}
      <div ref={scrollRef} className="h-[calc(100%-4.5rem)] overflow-y-auto px-4 pb-8">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin" style={{ color }} />
          </div>
        ) : allBlogs.length > 0 ? (
          <div className="space-y-1">
            {allBlogs.map((item, idx) => {
              const slug = item[`slug_${currentLanguage.toLowerCase()}`] || item.slug_en
              return (
                <motion.a
                  key={item.id}
                  href={`/blog/${slug}`}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(idx * 0.05, 0.5) }}
                  className="flex gap-3 rounded-xl p-3 pb-4 border-b border-surface-border/50 active:bg-white/5 transition-colors"
                >
                  {(item.processed_image_url || item.image_url || item.cover_image_url) && (
                    <div className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0">
                      <img
                        src={item.processed_image_url || item.image_url || item.cover_image_url}
                        alt={getLocalizedField(item, 'title')}
                        loading="lazy"
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-content text-sm line-clamp-2 mb-1">
                      {getLocalizedField(item, 'title')}
                    </h4>
                    <p className="text-content-muted text-xs line-clamp-2 mb-1.5">
                      {getLocalizedField(item, 'description')}
                    </p>
                    <div className="flex items-center gap-3 text-xs text-content-faint">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {formatDate(item.published_at)}
                      </span>
                      {item.reading_time && <span>{item.reading_time} min</span>}
                      {item.views_count > 0 && (
                        <span className="flex items-center gap-1">
                          <Eye className="w-3 h-3" />
                          {item.views_count}
                        </span>
                      )}
                    </div>
                  </div>
                </motion.a>
              )
            })}
            {isLoadingMore && (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="w-6 h-6 animate-spin" style={{ color }} />
              </div>
            )}
            {!hasMore && allBlogs.length > 0 && (
              <p className="text-center text-content-faint text-sm py-4">
                {t('no_more_blogs' as any) || 'No more blog posts'}
              </p>
            )}
          </div>
        ) : (
          <p className="text-content-muted text-sm text-center py-12">
            {t('no_blog_posts' as any) || 'No blog posts available'}
          </p>
        )}
      </div>
    </motion.div>
  )
}

interface MobileBlogSectionProps {
  t: TranslateFn
  currentLanguage: string
  sectionRef: (el: HTMLElement | null) => void
  isMounted: boolean
  blogData: any[]
  isLoadingBlog: boolean
}

export const MobileBlogSection = ({
  t,
  currentLanguage,
  sectionRef,
  isMounted,
  blogData,
  isLoadingBlog,
}: MobileBlogSectionProps) => {
  const [isBlogListOpen, setIsBlogListOpen] = useState(false)

  const getLocalizedField = (item: any, field: string) => {
    const lang = currentLanguage.toLowerCase()
    return item[`${field}_${lang}`] || item[`${field}_en`] || ''
  }

  const formatDate = (dateStr: string) => {
    if (!dateStr) return ''
    const date = new Date(dateStr)
    return date.toLocaleDateString(
      currentLanguage === 'UA' ? 'uk-UA' : currentLanguage === 'NO' ? 'nb-NO' : 'en-US',
      { day: 'numeric', month: 'short' }
    )
  }

  return (
    <>
      <section ref={sectionRef} className="mb-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className={`rounded-2xl p-4 pl-8 bg-gradient-to-br ${sectionColors.blog.gradient} shadow-sm relative h-48 overflow-hidden`}
        >
          {/* Vertical Label */}
          <VerticalLabel text={t('blog_title') as string} color={sectionColors.blog.icon} />

          {/* View all button */}
          <div className="flex justify-end mb-2">
            <button
              onClick={() => setIsBlogListOpen(true)}
              className="text-xs font-medium flex items-center gap-1"
              style={{ color: sectionColors.blog.icon }}
            >
              {t('view_all' as any) || 'View all'}
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {isLoadingBlog ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-2 border-blue-900 border-t-transparent" />
            </div>
          ) : blogData.length > 0 ? (
            <div className="overflow-x-auto scrollbar-hide -mx-4 px-4">
              <div className="flex gap-3" style={{ width: 'max-content' }}>
                {blogData.map((item, idx) => {
                  const slug = item[`slug_${currentLanguage.toLowerCase()}`] || item.slug_en
                  return (
                    <motion.a
                      key={item.id}
                      href={`/blog/${slug}`}
                      initial={{ opacity: 0, x: 30 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.1 }}
                      whileTap={{ scale: 0.98 }}
                      className="w-44 flex-shrink-0 bg-surface/80 rounded-xl overflow-hidden shadow-sm"
                    >
                      {(item.processed_image_url || item.image_url || item.cover_image_url) && (
                        <div className="h-24 overflow-hidden">
                          <img
                            src={item.processed_image_url || item.image_url || item.cover_image_url}
                            alt={getLocalizedField(item, 'title')}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      )}
                      <div className="p-2.5">
                        <h4 className="font-semibold text-content text-xs line-clamp-2">
                          {getLocalizedField(item, 'title')}
                        </h4>
                        <div className="flex items-center gap-2 mt-1.5 text-xs text-content-muted">
                          <Calendar className="w-3 h-3" />
                          <span>{formatDate(item.published_at)}</span>
                          {item.reading_time && <span>• {item.reading_time} min</span>}
                        </div>
                      </div>
                    </motion.a>
                  )
                })}
              </div>
            </div>
          ) : (
            <p className="text-content-muted text-sm text-center py-4">
              {t('no_blog_posts' as any) || 'No blog posts available'}
            </p>
          )}
        </motion.div>
      </section>

      {/* Blog List Overlay Portal */}
      {isMounted &&
        createPortal(
          <AnimatePresence>
            {isBlogListOpen && (
              <BlogListOverlay
                onClose={() => setIsBlogListOpen(false)}
                color={sectionColors.blog.icon}
                currentLanguage={currentLanguage}
                t={t}
              />
            )}
          </AnimatePresence>,
          document.body
        )}
    </>
  )
}
