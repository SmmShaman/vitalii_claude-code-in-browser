'use client'

import { useState, useEffect } from 'react'

/**
 * Hook to detect if the current device is mobile (width < 768px)
 * Uses a safe SSR-compatible approach with initial false state
 */
export const useIsMobile = (): boolean => {
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }

    // Check on mount
    checkMobile()

    // Listen for resize
    window.addEventListener('resize', checkMobile)

    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  return isMobile
}

/**
 * Hook to detect if the current device is tablet (768px <= width < 1024px)
 */
export const useIsTablet = (): boolean => {
  const [isTablet, setIsTablet] = useState(false)

  useEffect(() => {
    const checkTablet = () => {
      const width = window.innerWidth
      setIsTablet(width >= 768 && width < 1024)
    }

    checkTablet()
    window.addEventListener('resize', checkTablet)

    return () => window.removeEventListener('resize', checkTablet)
  }, [])

  return isTablet
}
