'use client'

import { useState, useRef } from 'react'
import Link from 'next/link'
import { ArrowLeft, Search } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useTranslations, type Language } from '@/contexts/TranslationContext'

interface ArticleHeaderProps {
  backHref?: string
  backLabel?: string
}

export function ArticleHeader({ backHref = '/', backLabel }: ArticleHeaderProps) {
  const { t, currentLanguage, setCurrentLanguage } = useTranslations()
  const router = useRouter()
  const languages: Language[] = ['NO', 'EN', 'UA']

  // Search state
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const searchInputRef = useRef<HTMLInputElement>(null)

  const handleSearchToggle = () => {
    if (searchOpen && searchQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`)
      setSearchOpen(false)
      setSearchQuery('')
    } else {
      setSearchOpen(true)
      setTimeout(() => searchInputRef.current?.focus(), 100)
    }
  }

  const handleSearchBlur = () => {
    if (!searchQuery.trim()) {
      setTimeout(() => setSearchOpen(false), 150)
    }
  }

  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && searchQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`)
      setSearchOpen(false)
      setSearchQuery('')
    }
    if (e.key === 'Escape') {
      setSearchOpen(false)
      setSearchQuery('')
    }
  }

  const getBackLabel = () => {
    if (backLabel) return backLabel
    switch (currentLanguage) {
      case 'UA': return 'На головну'
      case 'NO': return 'Til forsiden'
      default: return 'Back'
    }
  }

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b border-gray-100">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
        {/* Back button + Brand */}
        <Link
          href={backHref}
          className="flex items-center gap-3 text-gray-600 hover:text-gray-900 transition-colors group"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          <span className="font-bold text-amber-500 text-lg">Vitalii Berbeha</span>
          <span className="hidden sm:inline text-gray-400">|</span>
          <span className="hidden sm:inline text-sm text-gray-500">{getBackLabel()}</span>
        </Link>

        {/* Compact language switcher + search */}
        <div className="flex items-center gap-1">
          {languages.map((lang) => (
            <button
              key={lang}
              onClick={() => setCurrentLanguage(lang)}
              className={`px-2.5 py-1.5 rounded-md text-xs font-semibold transition-all ${
                currentLanguage === lang
                  ? 'bg-gray-900 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
              aria-label={`Switch to ${lang}`}
            >
              {lang}
            </button>
          ))}
          {/* Search */}
          <div className="relative">
            <button
              onClick={handleSearchToggle}
              className={`relative z-10 p-1.5 rounded-lg transition-all duration-300 ${
                searchQuery.trim()
                  ? 'bg-purple-600 text-white animate-pulse'
                  : searchOpen
                    ? 'bg-gray-200 text-gray-700'
                    : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
              }`}
              aria-label="Search"
            >
              <Search className="w-3.5 h-3.5" />
            </button>
            <div
              className={`absolute right-8 top-1/2 -translate-y-1/2 overflow-hidden z-20 transition-all duration-300 ease-out ${
                searchOpen ? 'w-36 sm:w-56 opacity-100' : 'w-0 opacity-0'
              }`}
            >
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onBlur={handleSearchBlur}
                onKeyDown={handleSearchKeyDown}
                placeholder={t('search_placeholder_short') as string}
                className="w-full px-3 py-1.5 rounded-lg text-sm text-gray-900 placeholder-gray-400 border border-gray-200 shadow-lg bg-white focus:outline-none focus:ring-2 focus:ring-purple-500/30 focus:border-purple-400"
              />
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}
