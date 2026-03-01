'use client'

import dynamic from 'next/dynamic'
import { ArticleHeader } from '@/components/layout/ArticleHeader'

const Footer = dynamic(
  () => import('@/components/layout/Footer').then(mod => mod.Footer),
  { ssr: false }
)

interface ArticleLayoutProps {
  children: React.ReactNode
  backHref?: string
  backLabel?: string
}

export function ArticleLayout({ children, backHref = '/', backLabel }: ArticleLayoutProps) {
  return (
    <div className="min-h-screen bg-[#0F0D1A] flex flex-col">
      {/* Compact Sticky Header */}
      <ArticleHeader backHref={backHref} backLabel={backLabel} />

      {/* Main Content - Full width, children handle their own max-width */}
      <main className="flex-1">
        {children}
      </main>

      {/* Footer */}
      <div className="mt-auto">
        <Footer />
      </div>
    </div>
  )
}
