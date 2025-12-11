'use client'

import { Globe } from 'lucide-react'
import { useTranslations, type Language } from '@/components/contexts/TranslationContext'

export const Header = () => {
  const { currentLanguage, setCurrentLanguage } = useTranslations()

  const languages: Language[] = ['NO', 'EN', 'UA']

  return (
    <header className="w-full h-full flex items-center justify-end px-2 sm:px-4">
      <div className="max-w-7xl mx-auto w-full flex justify-end">
        {/* Language Switcher */}
        <div className="flex gap-1 sm:gap-2 flex-shrink-0">
          {languages.map((lang) => (
            <button
              key={lang}
              onClick={() => setCurrentLanguage(lang)}
              className={`flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1.5 sm:py-2 rounded-md transition-all duration-300 ${
                currentLanguage === lang
                  ? 'bg-amber-500/20 text-amber-400 border border-amber-400/30'
                  : 'bg-white/5 text-white/60 hover:bg-white/10 hover:text-white/80 border border-white/10'
              }`}
              aria-label={`Switch to ${lang}`}
            >
              <Globe className="w-3 h-3 sm:w-4 sm:h-4" />
              <span className="font-semibold text-xs sm:text-sm">{lang}</span>
            </button>
          ))}
        </div>
      </div>
    </header>
  )
}
