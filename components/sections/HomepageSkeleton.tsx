'use client'

import { Skeleton } from '@/components/ui/Skeleton'

// Lightweight homepage skeleton — no framer-motion, GSAP, Supabase, or heavy deps.
// Renders for ~1 frame while real BentoGrid / BentoGridMobile mounts.

/** Mobile skeleton matching BentoGridMobile layout */
export function MobileSkeleton() {
  return (
    <div className="flex flex-col h-[100dvh] bg-surface" role="status" aria-label="Loading homepage">
      {/* Header bar */}
      <div className="h-12 flex items-center px-4 border-b border-surface-border">
        <Skeleton className="h-6 w-28 rounded-md" />
        <div className="ml-auto flex gap-2">
          <Skeleton className="h-6 w-6 rounded-full" />
          <Skeleton className="h-6 w-6 rounded-full" />
        </div>
      </div>

      {/* Scrollable section cards */}
      <div className="flex-1 overflow-hidden px-4 py-4 space-y-4">
        {/* Card 1 — About */}
        <div className="rounded-2xl bg-surface-elevated animate-pulse h-44 p-4 flex flex-col justify-end gap-2">
          <Skeleton className="h-5 w-24 rounded-md" />
          <Skeleton className="h-3 w-40 rounded-md" />
        </div>

        {/* Card 2 — Services */}
        <div className="rounded-2xl bg-surface-elevated animate-pulse h-36 p-4 flex flex-col justify-end gap-2">
          <Skeleton className="h-5 w-20 rounded-md" />
          <Skeleton className="h-3 w-36 rounded-md" />
        </div>

        {/* Card 3 — Projects */}
        <div className="rounded-2xl bg-surface-elevated animate-pulse h-40 p-4 flex flex-col justify-end gap-2">
          <Skeleton className="h-5 w-28 rounded-md" />
          <Skeleton className="h-3 w-32 rounded-md" />
        </div>

        {/* Card 4 — News */}
        <div className="rounded-2xl bg-surface-elevated animate-pulse h-36 p-4 flex flex-col justify-end gap-2">
          <Skeleton className="h-5 w-16 rounded-md" />
          <Skeleton className="h-3 w-44 rounded-md" />
        </div>

        {/* Card 5 — Blog */}
        <div className="rounded-2xl bg-surface-elevated animate-pulse h-40 p-4 flex flex-col justify-end gap-2">
          <Skeleton className="h-5 w-20 rounded-md" />
          <Skeleton className="h-3 w-36 rounded-md" />
        </div>
      </div>

      {/* Bottom navigation bar — 6 tab dots */}
      <div className="h-16 border-t border-surface-border flex items-center justify-around px-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-8 w-8 rounded-full" />
        ))}
      </div>

      <span className="sr-only">Loading homepage...</span>
    </div>
  )
}

/** Desktop skeleton matching BentoGrid 3x2 layout */
export function DesktopSkeleton() {
  return (
    <div className="flex flex-col h-[100dvh] bg-surface" role="status" aria-label="Loading homepage">
      {/* Header bar */}
      <div className="h-12 flex items-center px-6 border-b border-surface-border">
        <Skeleton className="h-6 w-32 rounded-md" />
        <div className="ml-auto flex gap-3">
          <Skeleton className="h-6 w-16 rounded-md" />
          <Skeleton className="h-6 w-16 rounded-md" />
          <Skeleton className="h-6 w-6 rounded-full" />
        </div>
      </div>

      {/* 3-column x 2-row grid */}
      <div className="flex-1 grid grid-cols-3 grid-rows-2 gap-3 p-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="rounded-xl bg-surface-elevated animate-pulse p-5 flex flex-col justify-end gap-2"
          >
            <Skeleton className="h-5 w-24 rounded-md" />
            <Skeleton className="h-3 w-40 rounded-md" />
            <Skeleton className="h-3 w-32 rounded-md" />
          </div>
        ))}
      </div>

      {/* Footer bar */}
      <div className="h-10 flex items-center justify-center px-6 border-t border-surface-border">
        <Skeleton className="h-3 w-48 rounded-md" />
      </div>

      <span className="sr-only">Loading homepage...</span>
    </div>
  )
}
