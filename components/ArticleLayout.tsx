'use client'

import { Header } from '@/components/layout/Header'
import { Sidebar } from '@/components/Sidebar'

interface ArticleLayoutProps {
  children: React.ReactNode
  type: 'news' | 'blog'
  slug: string
}

export function ArticleLayout({ children, type, slug }: ArticleLayoutProps) {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-br from-slate-800 via-slate-700 to-slate-800 px-4 py-6">
        <Header />
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Article Content */}
          <div className="flex-1 min-w-0">
            <div className="bg-white rounded-2xl p-6 md:p-8 shadow-sm border border-gray-100">
              {children}
            </div>
          </div>

          {/* Sidebar - Hidden on mobile, shown on lg+ */}
          <div className="lg:block">
            <Sidebar currentType={type} currentSlug={slug} />
          </div>
        </div>
      </main>
    </div>
  )
}
