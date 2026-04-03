'use client'

import { useState, useEffect, useCallback, useMemo, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import { getAllBlogPosts, getTagFrequencies } from '@/integrations/supabase/client'
import type { TagFrequency } from '@/integrations/supabase/client'
import { useTranslations, type Language } from '@/contexts/TranslationContext'
import { SearchResultCard } from '@/components/search/SearchResultCard'
import type { SearchResult } from '@/components/search/SearchResultCard'
import { CategoryTabs, getActivePageBg } from '@/components/CategoryTabs'
import { Loader2, SearchX, ArrowLeft } from 'lucide-react'
import { AnimatePresence } from 'framer-motion'

const Footer = dynamic(
  () => import('@/components/layout/Footer').then(mod => mod.Footer),
  { ssr: false }
)

const ITEMS_PER_PAGE = 12

function BlogListingInner() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { t, currentLanguage, setCurrentLanguage } = useTranslations()
  const languages: Language[] = ['NO', 'EN', 'UA']

  useEffect(() => {
    document.body.style.backgroundColor = '#2D2520'
    return () => { document.body.style.backgroundColor = '' }
  }, [])

  const tagParam = searchParams.get('tag') || ''

  const [results, setResults] = useState<SearchResult[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [page, setPage] = useState(0)
  const [hasMore, setHasMore] = useState(false)
  const [tags, setTags] = useState<TagFrequency[]>([])

  const visibleCount = 7
  const topTagNames = useMemo(() => tags.slice(0, visibleCount).map(t => t.tag_name), [tags])
  const activeTag = tagParam === '__other__' ? '__other__' : (tagParam || null)

  useEffect(() => {
    getTagFrequencies('blog').then(setTags)
  }, [])

  const fetchResults = useCallback(async (pageNum: number = 0, append: boolean = false) => {
    if (!append) setLoading(true)
    else setLoadingMore(true)

    const lang = currentLanguage.toLowerCase() as 'en' | 'no' | 'ua'
    const offset = pageNum * ITEMS_PER_PAGE

    try {
      const filters: any = {
        limit: ITEMS_PER_PAGE,
        offset,
      }

      if (tagParam === '__other__') {
        filters.excludeTags = topTagNames
      } else if (tagParam) {
        filters.tags = [tagParam]
      }

      const { data, count } = await getAllBlogPosts(filters)

      const items: SearchResult[] = (data || []).map((item: any) => ({
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

      if (append) {
        setResults(prev => [...prev, ...items])
      } else {
        setResults(items)
      }

      setTotalCount(count || 0)
      setHasMore(offset + ITEMS_PER_PAGE < (count || 0))
    } catch (error) {
      console.error('Blog listing error:', error)
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }, [tagParam, currentLanguage, topTagNames])

  useEffect(() => {
    setPage(0)
    fetchResults(0, false)
  }, [fetchResults])

  const handleLoadMore = () => {
    const nextPage = page + 1
    setPage(nextPage)
    fetchResults(nextPage, true)
  }

  const handleTagChange = (tag: string | null) => {
    const params = new URLSearchParams(searchParams.toString())
    if (tag) {
      params.set('tag', tag)
    } else {
      params.delete('tag')
    }
    const qs = params.toString()
    router.replace(qs ? `/blog?${qs}` : '/blog', { scroll: false })
  }

  const pageBgTint = getActivePageBg(activeTag, tags, 7)

  return (
    <div className="min-h-screen bg-[#2D2520] flex flex-col" style={{ backgroundImage: pageBgTint !== 'transparent' ? `linear-gradient(${pageBgTint}, ${pageBgTint})` : undefined }}>
      {/* Header */}
      <header className="sticky top-0 z-50 bg-[#2D2520]/95 backdrop-blur-sm border-b border-[#443D35]">
        <div className="px-4 sm:px-6 lg:px-8 py-2.5 flex items-center gap-3">
          <Link
            href="/"
            className="flex items-center gap-2 text-[#B0AB9A] hover:text-content transition-colors group flex-shrink-0"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            <span className="font-bold text-amber-500 text-lg hidden sm:inline">Vitalii Berbeha</span>
          </Link>

          <h1 className="text-lg font-semibold text-content flex-1">
            {t('blog_listing_title')}
          </h1>

          {/* Language buttons — far right */}
          <div className="flex items-center gap-1 flex-shrink-0 ml-auto">
            {languages.map((lang) => (
              <button
                key={lang}
                onClick={() => setCurrentLanguage(lang)}
                className={`px-2.5 py-1.5 rounded-md text-xs font-semibold transition-all ${
                  currentLanguage === lang
                    ? 'bg-brand text-white'
                    : 'bg-[#35302A] text-[#B0AB9A] hover:bg-[#3D3730]'
                }`}
              >
                {lang}
              </button>
            ))}
          </div>
        </div>

        {/* Category tabs */}
        {tags.length > 0 && (
          <div className="px-4 sm:px-6 lg:px-8 py-2 border-t border-[#443D35]/50">
            <CategoryTabs
              tags={tags}
              activeTag={activeTag}
              onTagChange={handleTagChange}
            />
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="flex-1 px-4 sm:px-6 lg:px-8 py-4">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-brand-light animate-spin" />
          </div>
        ) : results.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <SearchX className="w-12 h-12 text-[#8A8478] mb-4" />
            <p className="text-lg font-medium text-[#B0AB9A]">{t('listing_no_articles')}</p>
          </div>
        ) : (
          <>
            <div className="mb-3 text-xs text-[#8A8478]">
              {totalCount} {t('search_results_count')}
            </div>

            <div className="columns-1 sm:columns-2 lg:columns-3 xl:columns-4 gap-4">
              <AnimatePresence mode="popLayout">
                {results.map((result, index) => (
                  <SearchResultCard
                    key={`blog-${result.id}`}
                    result={result}
                    index={index}
                  />
                ))}
              </AnimatePresence>
            </div>

            {hasMore && (
              <div className="flex justify-center mt-8">
                <button
                  onClick={handleLoadMore}
                  disabled={loadingMore}
                  className="px-6 py-2.5 rounded-full text-sm font-medium bg-[#35302A] text-content-secondary hover:bg-[#3D3730] disabled:opacity-50 transition-all flex items-center gap-2"
                >
                  {loadingMore && <Loader2 className="w-4 h-4 animate-spin" />}
                  {t('listing_load_more')}
                </button>
              </div>
            )}
          </>
        )}
      </main>

      <Footer />
    </div>
  )
}

function ListingSkeleton() {
  return (
    <div className="min-h-screen bg-[#2D2520] flex items-center justify-center">
      <Loader2 className="w-8 h-8 text-brand-light animate-spin" />
    </div>
  )
}

export function BlogListingClient() {
  return (
    <Suspense fallback={<ListingSkeleton />}>
      <BlogListingInner />
    </Suspense>
  )
}
