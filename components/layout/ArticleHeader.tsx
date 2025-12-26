'use client'

import Link from 'next/link'
import { ArrowLeft, Globe } from 'lucide-react'
import { useTranslations, type Language } from '@/contexts/TranslationContext'

interface ArticleHeaderProps {
  backHref?: string
  backLabel?: string
}

export function ArticleHeader({ backHref = '/', backLabel }: ArticleHeaderProps) {
  const { t, currentLanguage, setCurrentLanguage } = useTranslations()
  const languages: Language[] = ['NO', 'EN', 'UA']

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

        {/* Compact language switcher */}
        <div className="flex gap-1">
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
        </div>
      </div>
    </header>
  )
}
