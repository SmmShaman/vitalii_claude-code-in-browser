'use client'

import Script from 'next/script'
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

  return (
    <>
      {/* GTM Script - loads after page becomes interactive */}
      <Script
        id="gtm-script"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: `
            (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
            new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
            j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
            'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
            })(window,document,'script','dataLayer','${GTM_ID}');
          `,
        }}
      />
    </>
  )
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
