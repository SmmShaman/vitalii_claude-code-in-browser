'use client'

import { useState, useEffect, useMemo } from 'react'
import { projects as staticProjects } from '@/data/features'
import type { ProjectInfo } from '@/data/features'

interface ProjectWithFeatureCount extends ProjectInfo {
  featureCount?: number
  imageUrl?: string
}

interface CarouselProject {
  title: string
  short: string
  full: string
  image?: string
  projectId: string
}

export function useProjects(): ProjectInfo[] {
  const [projects, setProjects] = useState<ProjectWithFeatureCount[]>(staticProjects)

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

export function useProjectsCarousel(lang: 'en' | 'no' | 'ua'): { carousel: CarouselProject[]; projects: ProjectWithFeatureCount[] } {
  const [projects, setProjects] = useState<ProjectWithFeatureCount[]>(staticProjects)

  useEffect(() => {
    let cancelled = false
    fetch('/api/projects')
      .then(res => res.json())
      .then(data => {
        if (!cancelled && data.projects?.length > 0) {
          setProjects(data.projects)
        }
      })
      .catch(() => {})
    return () => { cancelled = true }
  }, [])

  const carousel = useMemo(() => {
    return projects.map(p => {
      const name = typeof p.name === 'string' ? p.name : (p.name as Record<string, string>)?.[lang] || (p.name as Record<string, string>)?.en || String(p.name)
      const desc = typeof p.description === 'string' ? p.description : (p.description as Record<string, string>)?.[lang] || (p.description as Record<string, string>)?.en || ''
      const count = (p as ProjectWithFeatureCount).featureCount || 0
      const countText = count > 0 ? ` (${count} features)` : ''

      return {
        title: name,
        short: desc.length > 120 ? desc.slice(0, 117) + '...' : desc,
        full: desc + countText,
        image: (p as ProjectWithFeatureCount).imageUrl,
        projectId: p.id,
      }
    })
  }, [projects, lang])

  return { carousel, projects }
}
