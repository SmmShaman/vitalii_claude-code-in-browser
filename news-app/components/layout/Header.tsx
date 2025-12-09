'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Globe } from 'lucide-react'

export const Header = () => {
  const pathname = usePathname()

  // Extract current locale from pathname
  const getCurrentLocale = () => {
    if (pathname.startsWith('/blog/')) {
      const parts = pathname.split('/')
      return parts[2] as 'en' | 'ua' | 'no'
    }
    const parts = pathname.split('/')
    if (parts[1] === 'en' || parts[1] === 'ua' || parts[1] === 'no') {
      return parts[1] as 'en' | 'ua' | 'no'
    }
    return 'en'
  }

  const currentLocale = getCurrentLocale()

  // Get the appropriate link for each language
  const getLocaleLink = (locale: 'en' | 'ua' | 'no') => {
    if (pathname === '/') return `/${locale}`
    if (pathname.startsWith('/blog/')) {
      return pathname.replace(/\/blog\/[a-z]{2}/, `/blog/${locale}`)
    }
    return pathname.replace(/^\/[a-z]{2}/, `/${locale}`)
  }

  const languages: Array<{code: 'en' | 'ua' | 'no', label: string}> = [
    { code: 'no', label: 'NO' },
    { code: 'en', label: 'EN' },
    { code: 'ua', label: 'UA' },
  ]

  return (
    <header className="w-full h-full flex items-center justify-between px-4">
      <div className="max-w-7xl mx-auto w-full flex items-center justify-between">
        {/* Logo/Brand */}
        <Link href="/" className="text-white/90 hover:text-white transition-colors">
          <h1 className="text-lg sm:text-xl font-bold">Vitalii Berbeha</h1>
        </Link>

        {/* Language Switcher */}
        <div className="flex gap-1 sm:gap-2 flex-shrink-0">
          {languages.map((lang) => (
            <Link
              key={lang.code}
              href={getLocaleLink(lang.code)}
              className={`flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1.5 sm:py-2 rounded-md transition-all duration-300 ${
                currentLocale === lang.code
                  ? 'bg-amber-500/20 text-amber-400 border border-amber-400/30'
                  : 'bg-white/5 text-white/60 hover:bg-white/10 hover:text-white/80 border border-white/10'
              }`}
              aria-label={`Switch to ${lang.label}`}
            >
              <Globe className="w-3 h-3 sm:w-4 sm:h-4" />
              <span className="font-semibold text-xs sm:text-sm">{lang.label}</span>
            </Link>
          ))}
        </div>
      </div>
    </header>
  )
}
