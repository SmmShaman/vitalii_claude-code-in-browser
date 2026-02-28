'use client'

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react'
import {
  getConsent,
  saveConsent,
  clearConsent as clearConsentStorage,
  clearAnalyticsCookies,
  type CookieConsentState,
} from '@/utils/cookieConsent'

interface CookieConsentContextType {
  /** Current consent state */
  consent: CookieConsentState
  /** Whether user has made any consent decision */
  hasDecided: boolean
  /** Whether the consent banner should be visible */
  showBanner: boolean
  /** Show/hide the banner */
  setShowBanner: (show: boolean) => void
  /** Save consent choice (analytics on/off) */
  updateConsent: (analytics: boolean) => void
  /** Reset consent to show banner again ("Administrer cookies") */
  resetConsent: () => void
}

const DEFAULT_STATE: CookieConsentState = {
  necessary: true,
  analytics: false,
  timestamp: 0,
}

const CookieConsentContext = createContext<CookieConsentContextType | null>(null)

export function CookieConsentProvider({ children }: { children: ReactNode }) {
  const [consent, setConsent] = useState<CookieConsentState>(DEFAULT_STATE)
  const [hasDecided, setHasDecided] = useState(false)
  const [showBanner, setShowBanner] = useState(false)

  // On mount: read localStorage
  useEffect(() => {
    const stored = getConsent()
    if (stored) {
      setConsent(stored)
      setHasDecided(true)
      setShowBanner(false)
    } else {
      setShowBanner(true)
    }
  }, [])

  const updateConsent = useCallback((analytics: boolean) => {
    saveConsent(analytics)
    const newState: CookieConsentState = {
      necessary: true,
      analytics,
      timestamp: Date.now(),
    }
    setConsent(newState)
    setHasDecided(true)
    setShowBanner(false)

    // If revoking analytics, clear existing cookies
    if (!analytics) {
      clearAnalyticsCookies()
    }
  }, [])

  const resetConsent = useCallback(() => {
    clearConsentStorage()
    clearAnalyticsCookies()
    setConsent(DEFAULT_STATE)
    setHasDecided(false)
    setShowBanner(true)
  }, [])

  const value: CookieConsentContextType = {
    consent,
    hasDecided,
    showBanner,
    setShowBanner,
    updateConsent,
    resetConsent,
  }

  return (
    <CookieConsentContext.Provider value={value}>
      {children}
    </CookieConsentContext.Provider>
  )
}

/**
 * Hook to access cookie consent state and actions.
 * Must be used within CookieConsentProvider.
 */
export function useCookieConsent(): CookieConsentContextType {
  const context = useContext(CookieConsentContext)
  if (!context) {
    throw new Error('useCookieConsent must be used within CookieConsentProvider')
  }
  return context
}
