'use client'

import { GoogleTagManager } from '@next/third-parties/google'
import { GTM_ID } from '@/utils/gtm'

/**
 * Google Tag Manager Script Component
 *
 * This component loads the GTM container script and noscript fallback.
 * GTM then manages all tracking pixels (GA4, Meta Pixel, LinkedIn, etc.)
 *
 * Environment Variables:
 * - NEXT_PUBLIC_GTM_ID: GTM Container ID (e.g., GTM-5XBL8L8S)
 */
export function GTMScript() {
  // Don't render if GTM_ID is not configured
  if (!GTM_ID) {
    return null
  }

  return <GoogleTagManager gtmId={GTM_ID} />
}

/**
 * GTM NoScript fallback for browsers with JavaScript disabled
 * Should be placed right after opening <body> tag
 */
export function GTMNoScript() {
  if (!GTM_ID) {
    return null
  }

  return (
    <noscript>
      <iframe
        src={`https://www.googletagmanager.com/ns.html?id=${GTM_ID}`}
        height="0"
        width="0"
        style={{ display: 'none', visibility: 'hidden' }}
        title="Google Tag Manager"
      />
    </noscript>
  )
}
