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
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium bg-purple-100 text-purple-700">
            #{activeTag}
            <button
              onClick={onClearTag}
              className="p-0.5 rounded-full hover:bg-purple-200 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </span>
        </div>
      )}

      {/* Search bar */}
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          type="text"
          value={localQuery}
          onChange={(e) => handleQueryChange(e.target.value)}
          placeholder={t('search_articles_placeholder')}
          className="w-full pl-11 pr-10 py-3 rounded-xl border border-gray-200 bg-white text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400 transition-all"
        />
        {localQuery && (
          <button
            onClick={() => { setLocalQuery(''); onQueryChange('') }}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 p-0.5 rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
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
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
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
                ? 'bg-purple-100 text-purple-700'
                : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <SlidersHorizontal className="w-3.5 h-3.5" />
          </button>

          {totalResults > 0 && (
            <span className="text-xs text-gray-400">
              {totalResults} {t('search_results_count')}
            </span>
          )}
        </div>
      </div>

      {/* Date range */}
      {showDateFilters && (
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">{t('search_date_from')}:</span>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => onDateFromChange(e.target.value)}
              className="px-2.5 py-1.5 rounded-lg border border-gray-200 text-xs text-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">{t('search_date_to')}:</span>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => onDateToChange(e.target.value)}
              className="px-2.5 py-1.5 rounded-lg border border-gray-200 text-xs text-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400"
            />
          </div>
          {(dateFrom || dateTo) && (
            <button
              onClick={() => { onDateFromChange(''); onDateToChange('') }}
              className="text-xs text-purple-600 hover:text-purple-800 underline"
            >
              {t('search_clear_filters')}
            </button>
          )}
        </div>
      )}
    </div>
  )
}
