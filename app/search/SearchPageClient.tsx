'use client'

import { useState, useEffect, useCallback, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { getAllNews, getAllBlogPosts, getAllTags } from '@/integrations/supabase/client'
import { useTranslations } from '@/contexts/TranslationContext'
import { SearchFilters } from '@/components/search/SearchFilters'
import { SearchResultCard, getCardSize } from '@/components/search/SearchResultCard'
import { TagCloud } from '@/components/search/TagCloud'
import { Loader2, SearchX } from 'lucide-react'
import { AnimatePresence } from 'framer-motion'
import type { SearchResult } from '@/components/search/SearchResultCard'

const ITEMS_PER_PAGE = 12

function SearchPageInner() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { t, currentLanguage } = useTranslations()

  // Read URL params
  const tagParam = searchParams.get('tag') || ''
  const queryParam = searchParams.get('q') || ''
  const typeParam = (searchParams.get('type') || 'all') as 'all' | 'news' | 'blog'
  const dateFromParam = searchParams.get('dateFrom') || ''
  const dateToParam = searchParams.get('dateTo') || ''

  const [results, setResults] = useState<SearchResult[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [page, setPage] = useState(0)
  const [tags, setTags] = useState<any[]>([])
  const [hasMore, setHasMore] = useState(false)

  // Fetch tags once
  useEffect(() => {
    getAllTags().then(setTags)
  }, [])

  // Fetch results when filters change
  const fetchResults = useCallback(async (pageNum: number = 0, append: boolean = false) => {
    if (!append) setLoading(true)
    else setLoadingMore(true)

    const lang = currentLanguage.toLowerCase() as 'en' | 'no' | 'ua'
    const offset = pageNum * ITEMS_PER_PAGE
    const tagsFilter = tagParam ? [tagParam] : undefined

    try {
      const promises: Promise<any>[] = []

      if (typeParam === 'all' || typeParam === 'news') {
        promises.push(getAllNews({
          tags: tagsFilter,
          search: queryParam || undefined,
          dateFrom: dateFromParam || undefined,
          dateTo: dateToParam || undefined,
          limit: ITEMS_PER_PAGE,
          offset,
        }))
      } else {
        promises.push(Promise.resolve({ data: [], count: 0 }))
      }

      if (typeParam === 'all' || typeParam === 'blog') {
        promises.push(getAllBlogPosts({
          tags: tagsFilter,
          search: queryParam || undefined,
          dateFrom: dateFromParam || undefined,
          dateTo: dateToParam || undefined,
          limit: ITEMS_PER_PAGE,
          offset,
        }))
      } else {
        promises.push(Promise.resolve({ data: [], count: 0 }))
      }

      const [newsResult, blogResult] = await Promise.all(promises)

      // Transform news
      const newsItems: SearchResult[] = (newsResult.data || []).map((item: any) => ({
        id: item.id,
        type: 'news' as const,
        title: item[`title_${lang}`] || item.title_en || item.original_title || '',
        description: item[`description_${lang}`] || item.description_en || '',
        slug: item[`slug_${lang}`] || item.slug_en || item.id,
        image_url: item.image_url,
        processed_image_url: item.processed_image_url,
        tags: item.tags,
        published_at: item.published_at,
        views_count: item.views_count || 0,
        video_url: item.video_url,
        video_type: item.video_type,
      }))

      // Transform blog
      const blogItems: SearchResult[] = (blogResult.data || []).map((item: any) => ({
        id: item.id,
        type: 'blog' as const,
        title: item[`title_${lang}`] || item.title_en || '',
        description: item[`description_${lang}`] || item.description_en || '',
        slug: item[`slug_${lang}`] || item.slug_en || item.id,
        image_url: item.image_url,
        processed_image_url: item.processed_image_url,
        tags: item.tags,
        published_at: item.published_at,
        views_count: item.views_count || 0,
        category: item.category,
        reading_time: item.reading_time,
      }))

      // Merge and sort by date
      const merged = [...newsItems, ...blogItems].sort((a, b) => {
        const dateA = new Date(a.published_at || 0).getTime()
        const dateB = new Date(b.published_at || 0).getTime()
        return dateB - dateA
      })

      const total = (newsResult.count || 0) + (blogResult.count || 0)

      if (append) {
        setResults(prev => [...prev, ...merged])
      } else {
        setResults(merged)
      }

      setTotalCount(total)
      setHasMore(offset + ITEMS_PER_PAGE < total)
    } catch (error) {
      console.error('Search error:', error)
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }, [tagParam, queryParam, typeParam, dateFromParam, dateToParam, currentLanguage])

  // Refetch when filters change
  useEffect(() => {
    setPage(0)
    fetchResults(0, false)
  }, [fetchResults])

  // URL update helper
  const updateFilters = useCallback((updates: Record<string, string>) => {
    const params = new URLSearchParams(searchParams.toString())
    Object.entries(updates).forEach(([key, value]) => {
      if (value) {
        params.set(key, value)
      } else {
        params.delete(key)
      }
    })
    const qs = params.toString()
    router.replace(qs ? `/search?${qs}` : '/search', { scroll: false })
  }, [searchParams, router])

  const handleLoadMore = () => {
    const nextPage = page + 1
    setPage(nextPage)
    fetchResults(nextPage, true)
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
      {/* Header */}
      <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-6">
        {t('search_title')}
      </h1>

      {/* Filters */}
      <SearchFilters
        query={queryParam}
        onQueryChange={(q) => updateFilters({ q })}
        contentType={typeParam}
        onContentTypeChange={(type) => updateFilters({ type: type === 'all' ? '' : type })}
        dateFrom={dateFromParam}
        onDateFromChange={(date) => updateFilters({ dateFrom: date })}
        dateTo={dateToParam}
        onDateToChange={(date) => updateFilters({ dateTo: date })}
        activeTag={tagParam}
        onClearTag={() => updateFilters({ tag: '' })}
        totalResults={totalCount}
      />

      {/* Tag Cloud */}
      <div className="mt-6">
        <TagCloud tags={tags} activeTag={tagParam} />
      </div>

      {/* Results */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-purple-500 animate-spin" />
        </div>
      ) : results.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <SearchX className="w-12 h-12 text-gray-300 mb-4" />
          <p className="text-lg font-medium text-gray-600">{t('search_no_results')}</p>
          <p className="text-sm text-gray-400 mt-1">{t('search_no_results_hint')}</p>
          {(tagParam || queryParam || dateFromParam || dateToParam) && (
            <button
              onClick={() => router.replace('/search')}
              className="mt-4 px-4 py-2 rounded-full text-sm font-medium bg-purple-600 text-white hover:bg-purple-700 transition-colors"
            >
              {t('search_clear_filters')}
            </button>
          )}
        </div>
      ) : (
        <>
          {/* Masonry Grid */}
          <div
            className="search-grid mt-6"
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(1, 1fr)',
              gridAutoRows: '120px',
              gap: '16px',
            }}
          >
            <style>{`
              @media (min-width: 640px) {
                .search-grid { grid-template-columns: repeat(2, 1fr) !important; grid-auto-rows: 130px !important; }
              }
              @media (min-width: 1024px) {
                .search-grid { grid-template-columns: repeat(3, 1fr) !important; grid-auto-rows: 120px !important; }
              }
            `}</style>
            <AnimatePresence mode="popLayout">
              {results.map((result, index) => {
                const hasImage = !!(result.processed_image_url || result.image_url || result.video_url)
                const size = getCardSize(index, hasImage)
                return (
                  <SearchResultCard
                    key={`${result.type}-${result.id}`}
                    result={result}
                    size={size}
                    index={index}
                  />
                )
              })}
            </AnimatePresence>
          </div>

          {/* Load More */}
          {hasMore && (
            <div className="flex justify-center mt-8">
              <button
                onClick={handleLoadMore}
                disabled={loadingMore}
                className="px-6 py-2.5 rounded-full text-sm font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 disabled:opacity-50 transition-all flex items-center gap-2"
              >
                {loadingMore && <Loader2 className="w-4 h-4 animate-spin" />}
                {t('search_load_more')}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}

// Skeleton for Suspense fallback
function SearchSkeleton() {
  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
      <div className="h-9 w-32 bg-gray-200 rounded-lg mb-6 animate-pulse" />
      <div className="h-12 w-full bg-gray-200 rounded-xl mb-4 animate-pulse" />
      <div className="flex gap-2 mb-6">
        <div className="h-9 w-16 bg-gray-200 rounded-full animate-pulse" />
        <div className="h-9 w-20 bg-gray-200 rounded-full animate-pulse" />
        <div className="h-9 w-16 bg-gray-200 rounded-full animate-pulse" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="bg-white rounded-xl overflow-hidden border border-gray-200">
            <div className="w-full aspect-video bg-gray-200 animate-pulse" />
            <div className="p-4">
              <div className="h-5 w-full bg-gray-200 rounded mb-2 animate-pulse" />
              <div className="h-5 w-3/4 bg-gray-200 rounded mb-3 animate-pulse" />
              <div className="h-3 w-24 bg-gray-200 rounded animate-pulse" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export function SearchPageClient() {
  return (
    <Suspense fallback={<SearchSkeleton />}>
      <SearchPageInner />
    </Suspense>
  )
}
