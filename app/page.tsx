'use client'

import { useState, useCallback, startTransition } from 'react'
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


const SkillsMarquee = dynamic(
  () => import('@/components/ui/SkillsMarquee').then(mod => mod.SkillsMarquee),
  { ssr: false }
)

export default function HomePage() {
  const [hoveredSection, setHoveredSection] = useState<string | null>(null)
  const isMobile = useIsMobile()

  // Update hovered section — low priority, does not block animations
  const handleSectionChange = useCallback((sectionId: string | null) => {
    startTransition(() => {
      setHoveredSection(sectionId)
    })
  }, [])

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
    <>
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

      {/* Mobile layout: CSS-driven visibility to prevent CLS from SSR hydration mismatch */}
      <div className="h-screen-safe w-full max-w-[100vw] flex flex-col relative overflow-hidden bg-surface md:hidden">
        {/* Header - mobile */}
        <div className="flex-shrink-0 relative z-20 p-3 pb-2">
          <Header hoveredSection={hoveredSection} />
        </div>

        {/* Main Content - mobile */}
        <main className="relative z-10 flex-1 min-h-0 px-2">
          <BentoGridMobile onHoveredSectionChange={handleSectionChange} />
        </main>
      </div>

      {/* Desktop layout: CSS-driven visibility to prevent CLS from SSR hydration mismatch */}
      <div className="h-screen-safe w-full max-w-[100vw] flex-col relative p-3 sm:p-5 pb-3 sm:pb-4 overflow-hidden bg-surface hidden md:flex">
        {/* Header - desktop */}
        <div className="flex-shrink-0 relative z-20 mb-3 sm:mb-5">
          <Header hoveredSection={hoveredSection} />
        </div>

        {/* Main Content - desktop */}
        <main id="main-content" className="relative z-10 flex-1 min-h-0 overflow-hidden">
          <BentoGrid onHoveredSectionChange={handleSectionChange} />
        </main>

        {/* Skills Marquee - page level, behind sections (z-8), visible in gaps */}
        <SkillsMarquee />

        {/* Footer - Only on desktop, mobile has BottomNavigation */}
        <div className="flex-shrink-0 relative z-20 mt-[20px]">
          <Footer />
        </div>
      </div>
    </>
  )
}
