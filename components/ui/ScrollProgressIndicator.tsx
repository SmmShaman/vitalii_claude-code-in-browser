'use client'

import { useEffect, useState } from 'react'
import { motion, useScroll, useSpring } from 'framer-motion'

interface ScrollProgressIndicatorProps {
  /**
   * Color of the progress bar (hex or CSS color)
   * Defaults to current section color
   */
  color?: string
  /**
   * Height of the progress bar in pixels
   */
  height?: number
  /**
   * Position: 'top' | 'bottom'
   */
  position?: 'top' | 'bottom'
  /**
   * Show percentage text
   */
  showPercentage?: boolean
}

export function ScrollProgressIndicator({
  color = '#0F4C81',
  height = 3,
  position = 'top',
  showPercentage = false
}: ScrollProgressIndicatorProps) {
  const [scrollPercentage, setScrollPercentage] = useState(0)
  const { scrollYProgress } = useScroll()

  // Add spring physics for smooth animation
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 100,
    damping: 30,
    restDelta: 0.001
  })

  // Track percentage for optional display
  useEffect(() => {
    return scrollYProgress.on('change', (value) => {
      setScrollPercentage(Math.round(value * 100))
    })
  }, [scrollYProgress])

  return (
    <>
      {/* Progress Bar */}
      <motion.div
        className={`fixed left-0 right-0 z-50 origin-left ${
          position === 'top' ? 'top-0' : 'bottom-0'
        }`}
        style={{
          height: `${height}px`,
          backgroundColor: 'rgba(0, 0, 0, 0.1)'
        }}
      >
        <motion.div
          className="h-full origin-left"
          style={{
            scaleX,
            backgroundColor: color
          }}
        />
      </motion.div>

      {/* Optional Percentage Display */}
      {showPercentage && (
        <motion.div
          className="fixed top-4 right-4 z-50 bg-black/70 text-white px-3 py-1.5 rounded-full text-xs font-semibold"
          initial={{ opacity: 0 }}
          animate={{ opacity: scrollPercentage > 5 ? 1 : 0 }}
          transition={{ duration: 0.2 }}
        >
          {scrollPercentage}%
        </motion.div>
      )}
    </>
  )
}

/**
 * Sectioned scroll progress indicator
 * Shows which section user is currently viewing
 */
interface SectionedProgressProps {
  sections: { id: string; color: string }[]
  activeSection: number | null
}

export function SectionedScrollProgress({ sections, activeSection }: SectionedProgressProps) {
  const segmentWidth = 100 / sections.length

  return (
    <div className="fixed top-0 left-0 right-0 z-50 h-1 bg-gray-200/30 flex">
      {sections.map((section, index) => (
        <div
          key={section.id}
          className="h-full transition-all duration-500"
          style={{
            width: `${segmentWidth}%`,
            backgroundColor: activeSection === index ? section.color : 'transparent',
            opacity: activeSection === index ? 1 : 0.3
          }}
        />
      ))}
    </div>
  )
}
