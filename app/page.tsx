'use client'

import dynamic from 'next/dynamic'

const Header = dynamic(
  () => import('@/components/layout/Header').then(mod => mod.Header),
  { ssr: false }
)

const Footer = dynamic(
  () => import('@/components/layout/Footer').then(mod => mod.Footer),
  { ssr: false }
)

const BentoGrid = dynamic(
  () => import('@/components/sections/BentoGrid').then(mod => mod.BentoGrid),
  { ssr: false }
)

const ParticlesBackground = dynamic(
  () => import('@/components/background/ParticlesBackground').then(mod => mod.ParticlesBackground),
  { ssr: false }
)

export default function HomePage() {
  return (
    <div className="h-screen w-screen overflow-hidden flex flex-col relative">
      {/* Animated Background */}
      <ParticlesBackground />

      {/* Compact Header - Language switcher only */}
      <div className="flex-shrink-0 relative z-20" style={{ height: 'clamp(50px, 6vh, 70px)' }}>
        <Header />
      </div>

      {/* Main Content - Takes remaining space */}
      <main className="flex-1 relative z-10 overflow-hidden">
        <BentoGrid />
      </main>

      {/* Compact Footer - 8vh */}
      <div className="flex-shrink-0 relative z-20" style={{ height: 'clamp(50px, 7vh, 90px)' }}>
        <Footer />
      </div>
    </div>
  )
}
