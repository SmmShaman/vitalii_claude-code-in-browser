'use client'

import { useState, useEffect, useCallback, useRef, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import { getAllNews, getAllBlogPosts, getAllTags } from '@/integrations/supabase/client'
import { useTranslations, type Language } from '@/contexts/TranslationContext'
import { SearchResultCard } from '@/components/search/SearchResultCard'
import { TagCloud } from '@/components/search/TagCloud'
import { Loader2, SearchX, ArrowLeft, Search, X, Calendar, SlidersHorizontal } from 'lucide-react'
import { AnimatePresence } from 'framer-motion'
import type { SearchResult } from '@/components/search/SearchResultCard'

const Footer = dynamic(
  () => import('@/components/layout/Footer').then(mod => mod.Footer),
  { ssr: false }
)

const ITEMS_PER_PAGE = 12

function SearchPageInner() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { t, currentLanguage, setCurrentLanguage } = useTranslations()
  const languages: Language[] = ['NO', 'EN', 'UA']

  // Override body background for this page
  useEffect(() => {
    document.body.style.backgroundColor = '#2D2850'
    return () => { document.body.style.backgroundColor = '' }
  }, [])

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

  // Inline filter state (moved from SearchFilters)
  const [localQuery, setLocalQuery] = useState(queryParam)
  const [showDateFilters, setShowDateFilters] = useState(!!dateFromParam || !!dateToParam)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => { setLocalQuery(queryParam) }, [queryParam])

  const handleQueryChange = (value: string) => {
    setLocalQuery(value)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => updateFilters({ q: value }), 300)
  }

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

  useEffect(() => {
    setPage(0)
    fetchResults(0, false)
  }, [fetchResults])

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

  const tabs: Array<{ key: 'all' | 'news' | 'blog'; label: string }> = [
    { key: 'all', label: t('search_all') },
    { key: 'news', label: t('search_news') },
    { key: 'blog', label: t('search_blog') },
  ]

  return (
    <div className="min-h-screen bg-[#2D2850] flex flex-col">
      {/* Compact Sticky Header — 2 rows */}
      <header className="sticky top-0 z-50 bg-[#2D2850]/95 backdrop-blur-sm border-b border-[#443D6E]">
        {/* Row 1: Brand + Search Input + Language */}
        <div className="px-4 sm:px-6 lg:px-8 py-2.5 flex items-center gap-3">
          <Link
            href="/"
            className="flex items-center gap-2 text-[#B0ABCA] hover:text-[#EEEDF5] transition-colors group flex-shrink-0"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            <span className="font-bold text-amber-500 text-lg hidden sm:inline">Vitalii Berbeha</span>
          </Link>

          {/* Search input — flexible width */}
          <div className="relative flex-1 max-w-2xl">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8A84A8]" />
            <input
              type="text"
              value={localQuery}
              onChange={(e) => handleQueryChange(e.target.value)}
              placeholder={t('search_articles_placeholder')}
              className="w-full pl-9 pr-9 py-2 rounded-lg border border-[#443D6E] bg-[#352F5A] text-sm text-[#EEEDF5] placeholder-[#8A84A8] focus:outline-none focus:ring-2 focus:ring-[#6366F1]/30 focus:border-[#6366F1] transition-all"
            />
            {localQuery && (
              <button
                onClick={() => { setLocalQuery(''); updateFilters({ q: '' }) }}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 rounded-full hover:bg-[#3D3768] text-[#8A84A8] hover:text-[#B0ABCA] transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Language buttons */}
          <div className="flex items-center gap-1 flex-shrink-0">
            {languages.map((lang) => (
              <button
                key={lang}
                onClick={() => setCurrentLanguage(lang)}
                className={`px-2.5 py-1.5 rounded-md text-xs font-semibold transition-all ${
                  currentLanguage === lang
                    ? 'bg-[#6366F1] text-white'
                    : 'bg-[#352F5A] text-[#B0ABCA] hover:bg-[#3D3768]'
                }`}
                aria-label={`Switch to ${lang}`}
              >
                {lang}
              </button>
            ))}
          </div>
        </div>

        {/* Row 2: Tag + Tabs + Date + Count */}
        <div className="px-4 sm:px-6 lg:px-8 py-2 flex items-center gap-2 flex-wrap border-t border-[#443D6E]/50">
          {/* Active tag chip */}
          {tagParam && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-[#3D3768] text-[#818CF8]">
              #{tagParam}
              <button
                onClick={() => updateFilters({ tag: '' })}
                className="p-0.5 rounded-full hover:bg-[#443D6E] transition-colors"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}

          {/* Type tabs */}
          <div className="flex items-center gap-1">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => updateFilters({ type: tab.key === 'all' ? '' : tab.key })}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                  typeParam === tab.key
                    ? 'bg-[#6366F1] text-white shadow-sm'
                    : 'bg-[#3D3768] text-[#B0ABCA] hover:bg-[#443D6E]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="flex-1" />

          {/* Date toggle */}
          <button
            onClick={() => setShowDateFilters(!showDateFilters)}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs transition-all ${
              showDateFilters || dateFromParam || dateToParam
                ? 'bg-[#3D3768] text-[#818CF8]'
                : 'bg-[#3D3768] text-[#B0ABCA] hover:bg-[#443D6E]'
            }`}
          >
            <Calendar className="w-3 h-3" />
            <SlidersHorizontal className="w-3 h-3" />
          </button>

          {/* Result count */}
          {totalCount > 0 && (
            <span className="text-xs text-[#8A84A8]">
              {totalCount} {t('search_results_count')}
            </span>
          )}
        </div>

        {/* Expandable date range (not a permanent row) */}
        {showDateFilters && (
          <div className="px-4 sm:px-6 lg:px-8 py-2 flex items-center gap-3 flex-wrap border-t border-[#443D6E]/30">
            <div className="flex items-center gap-2">
              <span className="text-xs text-[#B0ABCA]">{t('search_date_from')}:</span>
              <input
                type="date"
                value={dateFromParam}
                onChange={(e) => updateFilters({ dateFrom: e.target.value })}
                className="px-2.5 py-1 rounded-lg border border-[#443D6E] bg-[#352F5A] text-xs text-[#C8C5D6] focus:outline-none focus:ring-2 focus:ring-[#6366F1]/20 focus:border-[#6366F1]"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-[#B0ABCA]">{t('search_date_to')}:</span>
              <input
                type="date"
                value={dateToParam}
                onChange={(e) => updateFilters({ dateTo: e.target.value })}
                className="px-2.5 py-1 rounded-lg border border-[#443D6E] bg-[#352F5A] text-xs text-[#C8C5D6] focus:outline-none focus:ring-2 focus:ring-[#6366F1]/20 focus:border-[#6366F1]"
              />
            </div>
            {(dateFromParam || dateToParam) && (
              <button
                onClick={() => updateFilters({ dateFrom: '', dateTo: '' })}
                className="text-xs text-[#818CF8] hover:text-[#A5B4FC] underline"
              >
                {t('search_clear_filters')}
              </button>
            )}
          </div>
        )}
      </header>

      {/* Main Content — full width */}
      <main className="flex-1 px-4 sm:px-6 lg:px-8 py-4">
        {/* Tag Cloud */}
        <TagCloud tags={tags} activeTag={tagParam} />

        {/* Results */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-[#818CF8] animate-spin" />
          </div>
        ) : results.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <SearchX className="w-12 h-12 text-[#8A84A8] mb-4" />
            <p className="text-lg font-medium text-[#B0ABCA]">{t('search_no_results')}</p>
            <p className="text-sm text-[#8A84A8] mt-1">{t('search_no_results_hint')}</p>
            {(tagParam || queryParam || dateFromParam || dateToParam) && (
              <button
                onClick={() => router.replace('/search')}
                className="mt-4 px-4 py-2 rounded-full text-sm font-medium bg-[#6366F1] text-white hover:bg-[#4F46E5] transition-colors"
              >
                {t('search_clear_filters')}
              </button>
            )}
          </div>
        ) : (
          <>
            {/* Masonry Layout — CSS columns for tight packing */}
            <div className="columns-1 sm:columns-2 lg:columns-3 xl:columns-4 gap-4 mt-4">
              <AnimatePresence mode="popLayout">
                {results.map((result, index) => (
                  <SearchResultCard
                    key={`${result.type}-${result.id}`}
                    result={result}
                    index={index}
                  />
                ))}
              </AnimatePresence>
            </div>

            {/* Load More */}
            {hasMore && (
              <div className="flex justify-center mt-8">
                <button
                  onClick={handleLoadMore}
                  disabled={loadingMore}
                  className="px-6 py-2.5 rounded-full text-sm font-medium bg-[#352F5A] text-[#C8C5D6] hover:bg-[#3D3768] disabled:opacity-50 transition-all flex items-center gap-2"
                >
                  {loadingMore && <Loader2 className="w-4 h-4 animate-spin" />}
                  {t('search_load_more')}
                </button>
              </div>
            )}
          </>
        )}
      </main>

      {/* Footer */}
      <div className="mt-auto">
        <Footer />
      </div>
    </div>
  )
}

// Skeleton for Suspense fallback
function SearchSkeleton() {
  return (
    <div className="min-h-screen bg-[#2D2850] flex flex-col">
      <div className="sticky top-0 z-50 bg-[#2D2850] border-b border-[#443D6E]">
        <div className="px-4 sm:px-6 lg:px-8 py-2.5 flex items-center gap-3">
          <div className="h-6 w-36 bg-[#3D3768] rounded animate-pulse" />
          <div className="flex-1 max-w-2xl h-9 bg-[#3D3768] rounded-lg animate-pulse" />
          <div className="flex gap-1">
            <div className="h-7 w-8 bg-[#3D3768] rounded animate-pulse" />
            <div className="h-7 w-8 bg-[#3D3768] rounded animate-pulse" />
            <div className="h-7 w-8 bg-[#3D3768] rounded animate-pulse" />
          </div>
        </div>
        <div className="px-4 sm:px-6 lg:px-8 py-2 flex items-center gap-2">
          <div className="h-6 w-14 bg-[#3D3768] rounded-full animate-pulse" />
          <div className="h-6 w-16 bg-[#3D3768] rounded-full animate-pulse" />
          <div className="h-6 w-14 bg-[#3D3768] rounded-full animate-pulse" />
        </div>
      </div>
      <main className="flex-1 px-4 sm:px-6 lg:px-8 py-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="bg-[#352F5A] rounded-xl overflow-hidden border border-[#443D6E]">
              <div className="w-full aspect-video bg-[#3D3768] animate-pulse" />
              <div className="p-4">
                <div className="h-5 w-full bg-[#3D3768] rounded mb-2 animate-pulse" />
                <div className="h-5 w-3/4 bg-[#3D3768] rounded mb-3 animate-pulse" />
                <div className="h-3 w-24 bg-[#3D3768] rounded animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      </main>
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
