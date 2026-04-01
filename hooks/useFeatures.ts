'use client'

import { useState, useEffect } from 'react'
import { allFeatures } from '@/data/features'
import type { Feature } from '@/data/features'

export function useFeatures(): Feature[] {
  const [features, setFeatures] = useState<Feature[]>(allFeatures)

  useEffect(() => {
    let cancelled = false
    fetch('/api/features')
      .then(res => res.json())
      .then(data => {
        if (!cancelled && data.features?.length > 0) {
          setFeatures(data.features)
        }
      })
      .catch((err) => {
        console.warn('⚠️ useFeatures: API fetch failed, using static fallback:', err.message || err)
      })
    return () => { cancelled = true }
  }, [])

  return features
}
