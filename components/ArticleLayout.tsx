'use client'

import Link from 'next/link'
import { Header } from '@/components/layout/Header'
import { ArrowLeft } from 'lucide-react'
import { useTranslations } from '@/contexts/TranslationContext'

interface ArticleLayoutProps {
  children: React.ReactNode
}

export function ArticleLayout({ children }: ArticleLayoutProps) {
  const { currentLanguage } = useTranslations()

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-br from-slate-800 via-slate-700 to-slate-800 px-4 py-6">
        <Header />
      </div>

      {/* Main Content */}
      <main className="max-w-5xl mx-auto px-4 py-8">
        {/* Back Button */}
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          {currentLanguage === 'UA' ? 'На головну' : currentLanguage === 'NO' ? 'Til forsiden' : 'Back to Home'}
        </Link>

        {/* Article Content */}
        <div className="bg-white rounded-2xl p-6 md:p-8 shadow-sm border border-gray-100">
          {children}
        </div>
      </main>
    </div>
  )
}
