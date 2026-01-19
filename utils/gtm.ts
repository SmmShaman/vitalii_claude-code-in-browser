/**
 * Google Tag Manager utility functions
 *
 * This module provides functions for interacting with GTM's dataLayer.
 * All tracking goes through GTM, which can then dispatch to GA4, Meta Pixel,
 * LinkedIn Insight Tag, Hotjar, etc.
 */

// Extend Window interface for dataLayer
declare global {
  interface Window {
    dataLayer: Record<string, unknown>[]
  }
}

export const GTM_ID = process.env.NEXT_PUBLIC_GTM_ID

/**
 * Check if tracking is enabled
 */
export const isTrackingEnabled = (): boolean => {
  if (typeof window === 'undefined') return false
  if (!GTM_ID) return false
  if (process.env.NEXT_PUBLIC_ENABLE_TRACKING === 'false') return false
  return true
}

/**
 * Initialize dataLayer if not present
 */
export const initDataLayer = (): void => {
  if (typeof window === 'undefined') return
  window.dataLayer = window.dataLayer || []
}

/**
 * Push a page view event to dataLayer
 */
export const pageview = (url: string, title?: string): void => {
  if (!isTrackingEnabled()) return

  initDataLayer()
  window.dataLayer.push({
    event: 'page_view',
    page_path: url,
    page_title: title || document.title,
    page_location: typeof window !== 'undefined' ? window.location.href : '',
  })
}

/**
 * Push a custom event to dataLayer
 */
export const trackEvent = (
  eventName: string,
  data: Record<string, unknown> = {}
): void => {
  if (!isTrackingEnabled()) return

  initDataLayer()
  window.dataLayer.push({
    event: eventName,
    ...data,
  })
}

/**
 * Track form submission
 */
export const trackFormSubmit = (
  formName: string,
  formData?: Record<string, unknown>
): void => {
  trackEvent('form_submit', {
    form_name: formName,
    ...formData,
  })
}

/**
 * Track article view (news or blog)
 */
export const trackArticleView = (
  contentType: 'news' | 'blog',
  contentId: string,
  contentTitle: string,
  language?: string,
  additionalData?: Record<string, unknown>
): void => {
  trackEvent('article_view', {
    content_type: contentType,
    content_id: contentId,
    content_title: contentTitle,
    language,
    ...additionalData,
  })
}

/**
 * Track social sharing
 */
export const trackShare = (
  platform: 'linkedin' | 'twitter' | 'copy',
  contentUrl: string,
  contentTitle?: string
): void => {
  trackEvent('share', {
    method: platform,
    content_url: contentUrl,
    content_title: contentTitle,
  })
}

/**
 * Track language change
 */
export const trackLanguageChange = (
  newLanguage: string,
  previousLanguage?: string
): void => {
  trackEvent('language_change', {
    language: newLanguage,
    previous_language: previousLanguage,
  })
}

/**
 * Track section interaction (BentoGrid sections)
 */
export const trackSectionClick = (sectionName: string): void => {
  trackEvent('section_click', {
    section_name: sectionName,
  })
}

/**
 * Track outbound link click
 */
export const trackOutboundLink = (linkUrl: string, linkText?: string): void => {
  let linkDomain = ''
  try {
    linkDomain = new URL(linkUrl).hostname
  } catch {}

  trackEvent('outbound_link', {
    link_url: linkUrl,
    link_text: linkText,
    link_domain: linkDomain,
  })
}

/**
 * Track scroll depth
 */
export const trackScrollDepth = (percentage: number, pagePath: string): void => {
  trackEvent('scroll_depth', {
    scroll_percentage: percentage,
    page_path: pagePath,
  })
}

/**
 * Track video interaction
 */
export const trackVideoInteraction = (
  action: 'play' | 'pause' | 'complete',
  videoUrl: string,
  videoTitle?: string
): void => {
  trackEvent('video_interaction', {
    video_action: action,
    video_url: videoUrl,
    video_title: videoTitle,
  })
}
