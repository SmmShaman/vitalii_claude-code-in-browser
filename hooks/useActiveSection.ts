'use client'

import { useState, useEffect, useRef, RefObject } from 'react'

/**
 * Hook to track which section is currently in the viewport center
 * Used for scroll-driven animations on mobile
 */
export function useActiveSection(sectionRefs: RefObject<HTMLElement>[]) {
  const [activeSection, setActiveSection] = useState<number | null>(null)
  const observerRef = useRef<IntersectionObserver | null>(null)

  useEffect(() => {
    // Only run on client
    if (typeof window === 'undefined') return

    // Create intersection observer with threshold for center detection
    observerRef.current = new IntersectionObserver(
      (entries) => {
        // Find the section with highest intersection ratio (closest to center)
        let maxRatio = 0
        let maxIndex = -1

        entries.forEach((entry, index) => {
          if (entry.isIntersecting && entry.intersectionRatio > maxRatio) {
            maxRatio = entry.intersectionRatio
            maxIndex = sectionRefs.findIndex(ref => ref.current === entry.target)
          }
        })

        if (maxIndex !== -1) {
          setActiveSection(maxIndex)
        }
      },
      {
        // Multiple thresholds for smooth detection
        threshold: [0, 0.25, 0.5, 0.75, 1.0],
        // Custom root margin to define "center" area
        rootMargin: '-20% 0px -20% 0px'
      }
    )

    // Observe all section refs
    sectionRefs.forEach(ref => {
      if (ref.current) {
        observerRef.current?.observe(ref.current)
      }
    })

    return () => {
      observerRef.current?.disconnect()
    }
  }, [sectionRefs])

  return activeSection
}

/**
 * Hook to track scroll progress within a section
 * Returns 0-1 value representing how far through the section we've scrolled
 */
export function useScrollProgress(elementRef: RefObject<HTMLElement>) {
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    if (!elementRef.current) return

    const handleScroll = () => {
      if (!elementRef.current) return

      const rect = elementRef.current.getBoundingClientRect()
      const windowHeight = window.innerHeight

      // Calculate progress: 0 when top of element at bottom of screen
      // 1 when bottom of element at top of screen
      const elementHeight = rect.height
      const scrolled = windowHeight - rect.top
      const totalScrollDistance = windowHeight + elementHeight

      const scrollProgress = Math.max(0, Math.min(1, scrolled / totalScrollDistance))
      setProgress(scrollProgress)
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    handleScroll() // Initial calculation

    return () => window.removeEventListener('scroll', handleScroll)
  }, [elementRef])

  return progress
}

/**
 * Hook to detect when element enters viewport
 * Returns boolean indicating if element is in view
 */
export function useInViewport(elementRef: RefObject<HTMLElement>, options?: IntersectionObserverInit) {
  const [isInView, setIsInView] = useState(false)

  useEffect(() => {
    if (!elementRef.current) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsInView(entry.isIntersecting)
      },
      {
        threshold: 0.1,
        ...options
      }
    )

    observer.observe(elementRef.current)

    return () => observer.disconnect()
  }, [elementRef, options])

  return isInView
}
