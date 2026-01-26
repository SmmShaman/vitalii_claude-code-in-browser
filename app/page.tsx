'use client'

import { useState } from 'react'
import dynamic from 'next/dynamic'
import { sectionNeonColors } from '@/components/sections/BentoGrid'
import { sectionColors } from '@/components/sections/BentoGridMobile'
import { useIsMobile } from '@/hooks/useIsMobile'

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

const BentoGridMobile = dynamic(
  () => import('@/components/sections/BentoGridMobile').then(mod => mod.BentoGridMobile),
  { ssr: false }
)

const ParticlesBackground = dynamic(
  () => import('@/components/background/ParticlesBackground').then(mod => mod.ParticlesBackground),
  { ssr: false }
)

export default function HomePage() {
  const [hoveredSection, setHoveredSection] = useState<string | null>(null)
  const isMobile = useIsMobile()

  // Update hovered section for background color changes
  const handleSectionChange = (sectionId: string | null) => {
    setHoveredSection(sectionId)
  }

  // Get the current neon color based on hovered section
  // Desktop uses { primary, secondary }, Mobile uses { bg, text, icon }
  const getCurrentColor = () => {
    if (!hoveredSection) return null
    if (isMobile) {
      return sectionColors[hoveredSection]?.icon || null
    }
    return sectionNeonColors[hoveredSection]?.primary || null
  }
  const currentNeonColor = getCurrentColor()

  return (
    <div className={`h-screen-safe w-full max-w-[100vw] flex flex-col relative ${isMobile ? 'overflow-hidden bg-gray-50' : 'p-3 sm:p-5 pb-3 sm:pb-4 overflow-hidden'}`}>
      {/* Dynamic Background Color Overlay */}
      <div
        className="fixed inset-0 -z-5 transition-all duration-700 ease-in-out pointer-events-none"
        style={{
          backgroundColor: currentNeonColor || 'transparent',
          opacity: currentNeonColor ? 0.2 : 0,
        }}
      />

      {/* Animated Background - Hidden on mobile for performance */}
      {!isMobile && <ParticlesBackground />}

      {/* Header - Smaller on mobile */}
      <div className={`flex-shrink-0 relative z-20 ${isMobile ? 'p-3 pb-2' : 'mb-3 sm:mb-5'}`}>
        <Header hoveredSection={hoveredSection} />
      </div>

      {/* Main Content - Different layouts for mobile/desktop */}
      <main id="main-content" className={`relative z-10 ${isMobile ? 'flex-1 min-h-0 px-2' : 'flex-1 min-h-0 overflow-hidden'}`}>
        {isMobile ? (
          <BentoGridMobile onHoveredSectionChange={handleSectionChange} />
        ) : (
          <BentoGrid onHoveredSectionChange={handleSectionChange} />
        )}
      </main>

      {/* Footer - Only show on desktop, mobile has BottomNavigation */}
      {!isMobile && (
        <div className="flex-shrink-0 relative z-20 mt-3 sm:mt-4">
          <Footer />
        </div>
      )}
    </div>
  )
}
