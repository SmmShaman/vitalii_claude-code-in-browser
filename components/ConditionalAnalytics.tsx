'use client'

import { GoogleTagManager } from '@next/third-parties/google'
import { GoogleAnalytics } from '@next/third-parties/google'
import { GTM_ID } from '@/utils/gtm'
import { useCookieConsent } from '@/contexts/CookieConsentContext'

const GA_ID = 'G-1G5BSRBZT9'

/**
 * Conditionally loads GTM and GA4 based on cookie consent.
 * Only renders tracking scripts when analytics consent is granted.
 */
export function ConditionalAnalytics() {
  const { consent } = useCookieConsent()

  if (!consent.analytics) {
    return null
  }

  return (
    <>
      {GTM_ID && <GoogleTagManager gtmId={GTM_ID} />}
      <GoogleAnalytics gaId={GA_ID} />
    </>
  )
}
