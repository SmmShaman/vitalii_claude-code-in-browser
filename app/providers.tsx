'use client'

import { CookieConsentProvider } from '@/contexts/CookieConsentContext'
import { ConditionalAnalytics } from '@/components/ConditionalAnalytics'
import { CookieConsentBanner } from '@/components/CookieConsentBanner'
import { TranslationProvider } from '@/contexts/TranslationContext'
import { TrackingProvider } from '@/contexts/TrackingContext'
import { ToastProvider } from '@/components/ui/Toast'

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <CookieConsentProvider>
      <ConditionalAnalytics />
      <TrackingProvider>
        <TranslationProvider>
          <ToastProvider>
            {children}
            <CookieConsentBanner />
          </ToastProvider>
        </TranslationProvider>
      </TrackingProvider>
    </CookieConsentProvider>
  )
}
