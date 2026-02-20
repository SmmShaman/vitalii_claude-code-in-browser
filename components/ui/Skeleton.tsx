'use client'

import { cn } from '@/lib/utils'

interface SkeletonProps {
  className?: string
}

export function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      className={cn(
        'animate-pulse rounded-md bg-gray-200 dark:bg-gray-700',
        className
      )}
    />
  )
}

// Article skeleton for loading states
export function ArticleSkeleton() {
  return (
    <div className="animate-pulse" role="status" aria-label="Loading article">
      {/* Hero skeleton — matches aspect-[16/9] max-h-[300px] md:max-h-[400px] lg:max-h-[500px] */}
      <div className="w-full aspect-[16/9] max-h-[300px] md:max-h-[400px] lg:max-h-[500px] bg-gray-200 dark:bg-gray-800" />

      {/* Content container — matches max-w-2xl */}
      <div className="max-w-2xl mx-auto px-4 py-8 md:py-12">
        {/* Title skeleton FIRST (editorial order) */}
        <Skeleton className="h-10 md:h-12 w-full mb-3" />
        <Skeleton className="h-10 md:h-12 w-3/4 mb-4" />

        {/* Meta info skeleton AFTER title */}
        <div className="flex gap-4 mb-6">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-20" />
        </div>

        {/* Tags skeleton */}
        <div className="flex gap-2 mb-8">
          <Skeleton className="h-6 w-16 rounded-full" />
          <Skeleton className="h-6 w-20 rounded-full" />
          <Skeleton className="h-6 w-14 rounded-full" />
        </div>

        {/* Content skeleton - multiple paragraphs */}
        <div className="space-y-4 mb-8">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-4/5" />
        </div>

        <div className="space-y-4 mb-8">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </div>

        {/* Button skeleton */}
        <Skeleton className="h-12 w-48 rounded-lg mb-8" />

        {/* Share buttons skeleton */}
        <div className="py-6 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <Skeleton className="h-4 w-12" />
            <Skeleton className="h-10 w-10 rounded-lg" />
            <Skeleton className="h-10 w-10 rounded-lg" />
            <Skeleton className="h-10 w-10 rounded-lg" />
          </div>
        </div>
      </div>

      {/* Related section skeleton */}
      <div className="bg-gray-50 dark:bg-gray-900 py-12">
        <div className="max-w-5xl mx-auto px-4">
          <Skeleton className="h-8 w-48 mb-6" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white dark:bg-gray-800 rounded-xl overflow-hidden shadow-sm">
                <Skeleton className="w-full aspect-video" />
                <div className="p-4">
                  <Skeleton className="h-5 w-full mb-2" />
                  <Skeleton className="h-5 w-3/4 mb-2" />
                  <div className="flex gap-1 mt-2">
                    <Skeleton className="h-5 w-12 rounded-full" />
                    <Skeleton className="h-5 w-14 rounded-full" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <span className="sr-only">Loading article content...</span>
    </div>
  )
}

// News card skeleton for list views
export function NewsCardSkeleton() {
  return (
    <div className="animate-pulse bg-white dark:bg-gray-800 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
      <Skeleton className="w-full h-48" />
      <div className="p-4">
        <Skeleton className="h-5 w-full mb-2" />
        <Skeleton className="h-5 w-3/4 mb-4" />
        <Skeleton className="h-4 w-full mb-2" />
        <Skeleton className="h-4 w-5/6 mb-4" />
        <div className="flex justify-between items-center">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-3 w-4" />
        </div>
      </div>
    </div>
  )
}
