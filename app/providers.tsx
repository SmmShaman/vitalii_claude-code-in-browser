'use client'

import { TranslationProvider } from '@/contexts/TranslationContext'
import { ToastProvider } from '@/components/ui/Toast'

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <TranslationProvider>
      <ToastProvider>
        {children}
      </ToastProvider>
    </TranslationProvider>
  )
}
