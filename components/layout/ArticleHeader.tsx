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
    <header className="sticky top-0 z-50 bg-[#0F0D1A]/95 backdrop-blur-sm border-b border-[#2D2A40]">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
        {/* Back button + Brand */}
        <Link
          href={backHref}
          className="flex items-center gap-3 text-[#9B97B0] hover:text-[#EEEDF5] transition-colors group"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          <span className="font-bold text-amber-500 text-lg">Vitalii Berbeha</span>
          <span className="hidden sm:inline text-[#6B6680]">|</span>
          <span className="hidden sm:inline text-sm text-[#9B97B0]">{getBackLabel()}</span>
        </Link>

        {/* Search + language switcher */}
        <div className="flex items-center gap-1">
          {/* Search — before lang buttons, expands right */}
          <div className="relative z-20">
            <button
              onClick={handleSearchToggle}
              className={`relative z-10 p-1.5 rounded-lg transition-all duration-300 ${
                searchQuery.trim()
                  ? 'bg-purple-600 text-white animate-pulse'
                  : searchOpen
                    ? 'bg-[#221F3A] text-[#C8C5D6]'
                    : 'bg-[#1A1730] text-[#9B97B0] hover:bg-[#221F3A]'
              }`}
              aria-label="Search"
            >
              <Search className="w-3.5 h-3.5" />
            </button>
            <div
              className={`absolute left-8 top-1/2 -translate-y-1/2 overflow-hidden transition-all duration-300 ease-out ${
                searchOpen ? 'w-40 sm:w-56 opacity-100' : 'w-0 opacity-0'
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
                className="w-full px-3 py-1.5 rounded-lg text-sm text-[#EEEDF5] placeholder-[#6B6680] border border-[#2D2A40] shadow-lg bg-[#1A1730] focus:outline-none focus:ring-2 focus:ring-[#6366F1]/30 focus:border-[#6366F1]"
              />
            </div>
          </div>
          {/* Language buttons */}
          {languages.map((lang) => (
            <button
              key={lang}
              onClick={() => setCurrentLanguage(lang)}
              className={`px-2.5 py-1.5 rounded-md text-xs font-semibold transition-all ${
                currentLanguage === lang
                  ? 'bg-[#6366F1] text-white'
                  : 'bg-[#1A1730] text-[#9B97B0] hover:bg-[#221F3A]'
              }`}
              aria-label={`Switch to ${lang}`}
            >
              {lang}
            </button>
          ))}
        </div>
      </div>
    </header>
  )
}
