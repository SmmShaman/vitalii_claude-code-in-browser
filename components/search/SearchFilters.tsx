'use client'

import { useState, useEffect, useRef } from 'react'
import { Search, X, Calendar, SlidersHorizontal } from 'lucide-react'
import { useTranslations } from '@/contexts/TranslationContext'

interface SearchFiltersProps {
  query: string
  onQueryChange: (q: string) => void
  contentType: 'all' | 'news' | 'blog'
  onContentTypeChange: (type: 'all' | 'news' | 'blog') => void
  dateFrom: string
  onDateFromChange: (date: string) => void
  dateTo: string
  onDateToChange: (date: string) => void
  activeTag: string
  onClearTag: () => void
  totalResults: number
}

export function SearchFilters({
  query,
  onQueryChange,
  contentType,
  onContentTypeChange,
  dateFrom,
  onDateFromChange,
  dateTo,
  onDateToChange,
  activeTag,
  onClearTag,
  totalResults,
}: SearchFiltersProps) {
  const { t } = useTranslations()
  const [localQuery, setLocalQuery] = useState(query)
  const [showDateFilters, setShowDateFilters] = useState(!!dateFrom || !!dateTo)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    setLocalQuery(query)
  }, [query])

  const handleQueryChange = (value: string) => {
    setLocalQuery(value)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => onQueryChange(value), 300)
  }

  const tabs: Array<{ key: 'all' | 'news' | 'blog'; label: string }> = [
    { key: 'all', label: t('search_all') },
    { key: 'news', label: t('search_news') },
    { key: 'blog', label: t('search_blog') },
  ]

  return (
    <div className="space-y-4">
      {/* Active tag chip */}
      {activeTag && (
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium bg-[#221F3A] text-[#818CF8]">
            #{activeTag}
            <button
              onClick={onClearTag}
              className="p-0.5 rounded-full hover:bg-[#221F3A] transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </span>
        </div>
      )}

      {/* Search bar */}
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-[#6B6680]" />
        <input
          type="text"
          value={localQuery}
          onChange={(e) => handleQueryChange(e.target.value)}
          placeholder={t('search_articles_placeholder')}
          className="w-full pl-11 pr-10 py-3 rounded-xl border border-[#2D2A40] bg-[#1A1730] text-sm text-[#EEEDF5] placeholder-[#6B6680] focus:outline-none focus:ring-2 focus:ring-[#6366F1]/20 focus:border-[#6366F1] transition-all"
        />
        {localQuery && (
          <button
            onClick={() => { setLocalQuery(''); onQueryChange('') }}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 p-0.5 rounded-full hover:bg-[#221F3A] text-[#6B6680] hover:text-[#9B97B0] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Tabs + date toggle */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-1.5">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => onContentTypeChange(tab.key)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
                contentType === tab.key
                  ? 'bg-[#6366F1] text-white shadow-sm'
                  : 'bg-[#221F3A] text-[#9B97B0] hover:bg-[#221F3A]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowDateFilters(!showDateFilters)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm transition-all ${
              showDateFilters || dateFrom || dateTo
                ? 'bg-[#221F3A] text-[#818CF8]'
                : 'bg-[#221F3A] text-[#9B97B0] hover:bg-[#221F3A]'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <SlidersHorizontal className="w-3.5 h-3.5" />
          </button>

          {totalResults > 0 && (
            <span className="text-xs text-[#6B6680]">
              {totalResults} {t('search_results_count')}
            </span>
          )}
        </div>
      </div>

      {/* Date range */}
      {showDateFilters && (
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="text-xs text-[#9B97B0]">{t('search_date_from')}:</span>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => onDateFromChange(e.target.value)}
              className="px-2.5 py-1.5 rounded-lg border border-[#2D2A40] text-xs text-[#C8C5D6] focus:outline-none focus:ring-2 focus:ring-[#6366F1]/20 focus:border-[#6366F1]"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-[#9B97B0]">{t('search_date_to')}:</span>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => onDateToChange(e.target.value)}
              className="px-2.5 py-1.5 rounded-lg border border-[#2D2A40] text-xs text-[#C8C5D6] focus:outline-none focus:ring-2 focus:ring-[#6366F1]/20 focus:border-[#6366F1]"
            />
          </div>
          {(dateFrom || dateTo) && (
            <button
              onClick={() => { onDateFromChange(''); onDateToChange('') }}
              className="text-xs text-[#818CF8] hover:text-[#A5B4FC] underline"
            >
              {t('search_clear_filters')}
            </button>
          )}
        </div>
      )}
    </div>
  )
}
