'use client'

import { TranslationProvider } from '@/contexts/TranslationContext'
import { TrackingProvider } from '@/contexts/TrackingContext'
import { ToastProvider } from '@/components/ui/Toast'

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <TrackingProvider>
      <TranslationProvider>
        <ToastProvider>
          {children}
        </ToastProvider>
      </TranslationProvider>
    </TrackingProvider>
  )
}
