import type { Metadata } from 'next'
import './globals.css'
import { ParticlesBackground } from '@/components/background/ParticlesBackground'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'

export const metadata: Metadata = {
  title: 'News - Vitalii Berbeha',
  description: 'Latest news and updates from Vitalii Berbeha - E-commerce & Marketing Expert',
  keywords: ['news', 'blog', 'e-commerce', 'marketing', 'vitalii berbeha'],
  authors: [{ name: 'Vitalii Berbeha' }],
  openGraph: {
    title: 'News - Vitalii Berbeha',
    description: 'Latest news and updates from Vitalii Berbeha',
    type: 'website',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="antialiased h-screen w-screen overflow-hidden flex flex-col relative">
        {/* Animated Background */}
        <ParticlesBackground />

        {/* Compact Header - 6vh */}
        <div className="flex-shrink-0 relative z-20" style={{ height: 'clamp(50px, 6vh, 70px)' }}>
          <Header />
        </div>

        {/* Main Content - Takes remaining space */}
        <main className="flex-1 relative z-10 overflow-y-auto overflow-x-hidden">
          {children}
        </main>

        {/* Compact Footer - 7vh */}
        <div className="flex-shrink-0 relative z-20" style={{ height: 'clamp(50px, 7vh, 90px)' }}>
          <Footer />
        </div>
      </body>
    </html>
  )
}
