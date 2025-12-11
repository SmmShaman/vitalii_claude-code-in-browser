'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { TranslationProvider } from '@/components/contexts/TranslationContext'
import { useState, type ReactNode } from 'react'

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient())

  return (
    <QueryClientProvider client={queryClient}>
      <TranslationProvider>
        {children}
      </TranslationProvider>
    </QueryClientProvider>
  )
}
