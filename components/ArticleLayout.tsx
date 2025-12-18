'use client'

import Link from 'next/link'
import dynamic from 'next/dynamic'
import { ArrowLeft } from 'lucide-react'
import { useTranslations } from '@/contexts/TranslationContext'

const Header = dynamic(
  () => import('@/components/layout/Header').then(mod => mod.Header),
  { ssr: false }
)

const Footer = dynamic(
  () => import('@/components/layout/Footer').then(mod => mod.Footer),
  { ssr: false }
)

interface ArticleLayoutProps {
  children: React.ReactNode
}

export function ArticleLayout({ children }: ArticleLayoutProps) {
  const { currentLanguage } = useTranslations()

  return (
    <div className="min-h-screen bg-gray-200 flex flex-col p-3 sm:p-5 pb-3 sm:pb-4">
      {/* Header */}
      <div className="flex-shrink-0 mb-3 sm:mb-5">
        <Header />
      </div>

      {/* Main Content */}
      <main className="flex-1 max-w-5xl mx-auto w-full">
        {/* Back Button */}
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          {currentLanguage === 'UA' ? 'На головну' : currentLanguage === 'NO' ? 'Til forsiden' : 'Back to Home'}
        </Link>

        {/* Article Content */}
        <div className="bg-white rounded-2xl p-6 md:p-8 shadow-sm border border-gray-100">
          {children}
        </div>
      </main>

      {/* Footer */}
      <div className="flex-shrink-0 mt-3 sm:mt-4">
        <Footer />
      </div>
    </div>
  )
}
