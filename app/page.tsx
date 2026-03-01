'use client'

import { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import { sectionNeonColors } from '@/components/sections/BentoGrid'
import { sectionColors } from '@/components/sections/BentoGridMobile'
import { useIsMobile } from '@/hooks/useIsMobile'
import { generatePersonSchema, generateWebsiteSchema } from '@/utils/seo'

const Header = dynamic(
  () => import('@/components/layout/Header').then(mod => mod.Header),
)

const Footer = dynamic(
  () => import('@/components/layout/Footer').then(mod => mod.Footer),
)

const BentoGrid = dynamic(
  () => import('@/components/sections/BentoGrid').then(mod => mod.BentoGrid)
)

const BentoGridMobile = dynamic(
  () => import('@/components/sections/BentoGridMobile').then(mod => mod.BentoGridMobile)
)

const ParticlesBackground = dynamic(
  () => import('@/components/background/ParticlesBackground').then(mod => mod.ParticlesBackground),
  { ssr: false }
)

export default function HomePage() {
  const [hoveredSection, setHoveredSection] = useState<string | null>(null)
  const [showParticles, setShowParticles] = useState(false)
  const isMobile = useIsMobile()

  // Defer Three.js loading until after LCP
  useEffect(() => {
    if (isMobile) return
    const id = requestIdleCallback?.(() => setShowParticles(true)) ??
      setTimeout(() => setShowParticles(true), 2000) as unknown as number
    return () => {
      cancelIdleCallback?.(id) ?? clearTimeout(id)
    }
  }, [isMobile])

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
      {/* Structured Data for SEO */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(generatePersonSchema()) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(generateWebsiteSchema()) }}
      />

      {/* Dynamic Background Color Overlay */}
      <div
        className="fixed inset-0 -z-5 transition-all duration-700 ease-in-out pointer-events-none"
        style={{
          backgroundColor: currentNeonColor || 'transparent',
          opacity: currentNeonColor ? 0.2 : 0,
        }}
      />

      {/* Animated Background - Deferred load, hidden on mobile */}
      {showParticles && <ParticlesBackground />}

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
