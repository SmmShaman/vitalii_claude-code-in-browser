'use client'

import { useState } from 'react'
import dynamic from 'next/dynamic'
import { sectionNeonColors } from '@/components/sections/BentoGrid'

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
  const [hoveredSection, setHoveredSection] = useState<string | null>(null)

  // Get the current neon color based on hovered section
  const currentNeonColor = hoveredSection ? sectionNeonColors[hoveredSection]?.primary : null

  return (
    <div className="h-screen w-screen overflow-hidden flex flex-col relative p-5 pb-4 gap-[22px]">
      {/* Dynamic Background Color Overlay */}
      <div
        className="fixed inset-0 -z-5 transition-all duration-700 ease-in-out pointer-events-none"
        style={{
          backgroundColor: currentNeonColor || 'transparent',
          opacity: currentNeonColor ? 0.4 : 0,
        }}
      />

      {/* Animated Background */}
      <ParticlesBackground />

      {/* Header - Auto height based on content */}
      <div className="flex-shrink-0 relative z-20">
        <Header />
      </div>

      {/* Main Content - Takes remaining space */}
      <main className="flex-1 min-h-0 relative z-10 overflow-hidden">
        <BentoGrid onHoveredSectionChange={setHoveredSection} />
      </main>

      {/* Footer */}
      <div className="flex-shrink-0 relative z-20">
        <Footer />
      </div>
    </div>
  )
}
