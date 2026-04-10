import { useState, useEffect } from 'react'

export type Viewport = 'mobile' | 'desktop'

/**
 * Resolves viewport type using matchMedia (aligned with Tailwind md: breakpoint).
 * Returns null during SSR and before hydration.
 */
export function useViewport(): Viewport | null {
  const [viewport, setViewport] = useState<Viewport | null>(null)

  useEffect(() => {
    const mql = window.matchMedia('(min-width: 768px)')
    setViewport(mql.matches ? 'desktop' : 'mobile')

    const handler = (e: MediaQueryListEvent) => {
      setViewport(e.matches ? 'desktop' : 'mobile')
    }
    mql.addEventListener('change', handler)
    return () => mql.removeEventListener('change', handler)
  }, [])

  return viewport
}
