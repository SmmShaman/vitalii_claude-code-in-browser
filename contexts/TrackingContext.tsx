'use client'

import {
  createContext,
  useContext,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react'
import { usePathname } from 'next/navigation'
import {
  pageview,
  trackEvent,
  trackFormSubmit as gtmTrackFormSubmit,
  trackArticleView as gtmTrackArticleView,
  trackShare as gtmTrackShare,
  trackLanguageChange as gtmTrackLanguageChange,
  trackSectionClick as gtmTrackSectionClick,
  trackOutboundLink as gtmTrackOutboundLink,
  trackScrollDepth as gtmTrackScrollDepth,
  trackVideoInteraction as gtmTrackVideoInteraction,
  isTrackingEnabled,
} from '@/utils/gtm'

/**
 * Tracking Context Type Definition
 */
interface TrackingContextType {
  /** Track a form submission */
  trackFormSubmit: (formName: string, formData?: Record<string, unknown>) => void
  /** Track article view (news or blog) */
  trackArticleView: (
    contentType: 'news' | 'blog',
    contentId: string,
    contentTitle: string,
    language?: string
  ) => void
  /** Track social sharing */
  trackShare: (
    platform: 'linkedin' | 'twitter' | 'copy',
    contentUrl: string,
    contentTitle?: string
  ) => void
  /** Track language change */
  trackLanguageChange: (newLanguage: string, previousLanguage?: string) => void
  /** Track section click in BentoGrid */
  trackSectionClick: (sectionName: string) => void
  /** Track outbound link click */
  trackOutboundLink: (linkUrl: string, linkText?: string) => void
  /** Track scroll depth */
  trackScrollDepth: (percentage: number) => void
  /** Track video interaction */
  trackVideoInteraction: (
    action: 'play' | 'pause' | 'complete',
    videoUrl: string,
    videoTitle?: string
  ) => void
  /** Track custom event */
  trackCustomEvent: (eventName: string, data?: Record<string, unknown>) => void
  /** Check if tracking is enabled */
  isEnabled: boolean
}

const TrackingContext = createContext<TrackingContextType | null>(null)

/**
 * TrackingProvider - Provides tracking functionality throughout the app
 *
 * Features:
 * - Automatic page view tracking on route change
 * - Convenience methods for common tracking events
 * - Graceful degradation when GTM is not configured
 */
export function TrackingProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname()

  // Automatic page view tracking on route change
  useEffect(() => {
    if (pathname) {
      pageview(pathname)
    }
  }, [pathname])

  // Memoized tracking functions
  const trackFormSubmit = useCallback(
    (formName: string, formData?: Record<string, unknown>) => {
      gtmTrackFormSubmit(formName, formData)
    },
    []
  )

  const trackArticleView = useCallback(
    (
      contentType: 'news' | 'blog',
      contentId: string,
      contentTitle: string,
      language?: string
    ) => {
      gtmTrackArticleView(contentType, contentId, contentTitle, language)
    },
    []
  )

  const trackShare = useCallback(
    (
      platform: 'linkedin' | 'twitter' | 'copy',
      contentUrl: string,
      contentTitle?: string
    ) => {
      gtmTrackShare(platform, contentUrl, contentTitle)
    },
    []
  )

  const trackLanguageChange = useCallback(
    (newLanguage: string, previousLanguage?: string) => {
      gtmTrackLanguageChange(newLanguage, previousLanguage)
    },
    []
  )

  const trackSectionClick = useCallback((sectionName: string) => {
    gtmTrackSectionClick(sectionName)
  }, [])

  const trackOutboundLink = useCallback(
    (linkUrl: string, linkText?: string) => {
      gtmTrackOutboundLink(linkUrl, linkText)
    },
    []
  )

  const trackScrollDepth = useCallback(
    (percentage: number) => {
      gtmTrackScrollDepth(percentage, pathname || '/')
    },
    [pathname]
  )

  const trackVideoInteraction = useCallback(
    (
      action: 'play' | 'pause' | 'complete',
      videoUrl: string,
      videoTitle?: string
    ) => {
      gtmTrackVideoInteraction(action, videoUrl, videoTitle)
    },
    []
  )

  const trackCustomEvent = useCallback(
    (eventName: string, data?: Record<string, unknown>) => {
      trackEvent(eventName, data)
    },
    []
  )

  const value: TrackingContextType = {
    trackFormSubmit,
    trackArticleView,
    trackShare,
    trackLanguageChange,
    trackSectionClick,
    trackOutboundLink,
    trackScrollDepth,
    trackVideoInteraction,
    trackCustomEvent,
    isEnabled: isTrackingEnabled(),
  }

  return (
    <TrackingContext.Provider value={value}>
      {children}
    </TrackingContext.Provider>
  )
}

/**
 * useTracking hook - Access tracking functions throughout the app
 *
 * @returns TrackingContextType with all tracking methods
 * @throws Error if used outside of TrackingProvider
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { trackShare, trackFormSubmit } = useTracking()
 *
 *   const handleShare = () => {
 *     trackShare('linkedin', '/blog/my-post', 'My Post Title')
 *   }
 * }
 * ```
 */
export function useTracking(): TrackingContextType {
  const context = useContext(TrackingContext)

  if (!context) {
    throw new Error('useTracking must be used within a TrackingProvider')
  }

  return context
}

/**
 * Safe version of useTracking that returns null if outside provider
 * Useful for components that may be rendered outside the provider
 */
export function useTrackingSafe(): TrackingContextType | null {
  return useContext(TrackingContext)
}
