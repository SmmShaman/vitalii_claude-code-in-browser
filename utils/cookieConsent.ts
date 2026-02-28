/**
 * Cookie Consent Utilities
 *
 * Manages cookie consent state in localStorage.
 * Compliant with Norwegian ekomloven § 3-15.
 */

export const COOKIE_CONSENT_KEY = 'CookieConsent'
export const CONSENT_EXPIRY_DAYS = 90

export interface CookieConsentState {
  necessary: boolean   // Always true
  analytics: boolean   // GTM, GA4, Meta Pixel, LinkedIn
  timestamp: number    // When consent was given/updated
}

const DEFAULT_CONSENT: CookieConsentState = {
  necessary: true,
  analytics: false,
  timestamp: 0,
}

/**
 * Read consent from localStorage. Returns null if not set or expired (90 days).
 */
export function getConsent(): CookieConsentState | null {
  if (typeof window === 'undefined') return null

  try {
    const raw = localStorage.getItem(COOKIE_CONSENT_KEY)
    if (!raw) return null

    const state: CookieConsentState = JSON.parse(raw)

    // Check 90-day expiry
    const expiryMs = CONSENT_EXPIRY_DAYS * 24 * 60 * 60 * 1000
    if (Date.now() - state.timestamp > expiryMs) {
      localStorage.removeItem(COOKIE_CONSENT_KEY)
      return null
    }

    return state
  } catch {
    return null
  }
}

/**
 * Save consent to localStorage with current timestamp.
 */
export function saveConsent(analytics: boolean): void {
  if (typeof window === 'undefined') return

  const state: CookieConsentState = {
    necessary: true,
    analytics,
    timestamp: Date.now(),
  }

  localStorage.setItem(COOKIE_CONSENT_KEY, JSON.stringify(state))
}

/**
 * Quick check if analytics consent is granted and not expired.
 */
export function hasAnalyticsConsent(): boolean {
  const consent = getConsent()
  return consent?.analytics ?? false
}

/**
 * Remove consent from localStorage (for resetting).
 */
export function clearConsent(): void {
  if (typeof window === 'undefined') return
  localStorage.removeItem(COOKIE_CONSENT_KEY)
}

/**
 * Delete analytics cookies when consent is revoked.
 * Clears known GA4, Meta Pixel, and LinkedIn cookies.
 */
export function clearAnalyticsCookies(): void {
  if (typeof window === 'undefined') return

  const cookiesToClear = [
    '_ga', '_gid', '_gat',           // Google Analytics
    '_fbp', '_fbc',                   // Meta Pixel
    'li_sugr', 'bcookie', 'lidc',     // LinkedIn
    'UserMatchHistory', 'AnalyticsSyncHistory', // LinkedIn
  ]

  const domain = '.vitalii.no'

  cookiesToClear.forEach(name => {
    // Clear for current path
    document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`
    // Clear for domain
    document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=${domain};`
  })
}
