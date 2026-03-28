'use client'

import { useState, useEffect } from 'react'
import { projects as staticProjects } from '@/data/features'
import type { ProjectInfo } from '@/data/features'

export function useProjects(): ProjectInfo[] {
  const [projects, setProjects] = useState<ProjectInfo[]>(staticProjects)

  useEffect(() => {
    let cancelled = false
    fetch('/api/projects')
      .then(res => res.json())
      .then(data => {
        if (!cancelled && data.projects?.length > 0) {
          setProjects(data.projects)
        }
      })
      .catch(() => {
        // Keep static fallback on error
      })
    return () => { cancelled = true }
  }, [])

  return projects
}
