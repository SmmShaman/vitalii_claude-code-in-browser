'use client'

import { useState, useRef, useEffect } from 'react'
import { ChevronDown } from 'lucide-react'
import { useIsMobile } from '@/hooks/useIsMobile'
import { useTranslations } from '@/contexts/TranslationContext'
import type { TagFrequency } from '@/integrations/supabase/client'

// Color scheme: pill text, pill bg, active pill bg, page background tint
export const CATEGORY_COLORS = [
  { text: '#06B6D4', pillBg: 'rgba(6,182,212,0.12)',  activeBg: '#0891B2', pageBg: 'rgba(6,182,212,0.06)' },   // cyan
  { text: '#3B82F6', pillBg: 'rgba(59,130,246,0.12)', activeBg: '#2563EB', pageBg: 'rgba(59,130,246,0.06)' },   // blue
  { text: '#A78BFA', pillBg: 'rgba(167,139,250,0.12)', activeBg: '#7C3AED', pageBg: 'rgba(139,92,246,0.06)' },  // violet
  { text: '#F472B6', pillBg: 'rgba(244,114,182,0.12)', activeBg: '#DB2777', pageBg: 'rgba(236,72,153,0.06)' },  // pink
  { text: '#34D399', pillBg: 'rgba(52,211,153,0.12)', activeBg: '#059669', pageBg: 'rgba(16,185,129,0.06)' },   // emerald
  { text: '#FB923C', pillBg: 'rgba(251,146,60,0.12)', activeBg: '#EA580C', pageBg: 'rgba(249,115,22,0.06)' },   // orange
  { text: '#F87171', pillBg: 'rgba(248,113,113,0.12)', activeBg: '#DC2626', pageBg: 'rgba(239,68,68,0.06)' },   // red
  { text: '#FBBF24', pillBg: 'rgba(251,191,36,0.12)', activeBg: '#D97706', pageBg: 'rgba(245,158,11,0.06)' },   // amber
  { text: '#2DD4BF', pillBg: 'rgba(45,212,191,0.12)', activeBg: '#0D9488', pageBg: 'rgba(20,184,166,0.06)' },   // teal
]

export const OTHER_COLOR = {
  text: '#94A3B8', pillBg: 'rgba(148,163,184,0.10)', activeBg: '#64748B', pageBg: 'rgba(139,92,246,0.05)',
}

export const ALL_PAGE_BG = 'transparent'

export function getCategoryColor(index: number) {
  return CATEGORY_COLORS[index % CATEGORY_COLORS.length]
}

/** Returns the page background tint for the currently active tag */
export function getActivePageBg(activeTag: string | null, tags: TagFrequency[], visibleCount: number): string {
  if (!activeTag) return ALL_PAGE_BG
  if (activeTag === '__other__') return OTHER_COLOR.pageBg
  const idx = tags.slice(0, visibleCount).findIndex(t => t.tag_name === activeTag)
  if (idx >= 0) return getCategoryColor(idx).pageBg
  return ALL_PAGE_BG
}

interface CategoryTabsProps {
  tags: TagFrequency[]
  activeTag: string | null
  onTagChange: (tag: string | null) => void
}

export function CategoryTabs({ tags, activeTag, onTagChange }: CategoryTabsProps) {
  const isMobile = useIsMobile()
  const { t } = useTranslations()
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const visibleCount = isMobile ? 4 : 7
  const visibleTags = tags.slice(0, visibleCount)
  const hiddenTags = tags.slice(visibleCount)

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const isOtherActive = activeTag === '__other__'

  return (
    <div className="flex flex-wrap items-center justify-center gap-2">
      {/* Visible tag tabs — each with its own color */}
      {visibleTags.map((tag, index) => {
        const color = getCategoryColor(index)
        const isActive = activeTag === tag.tag_name

        return (
          <button
            key={tag.tag_name}
            onClick={() => onTagChange(tag.tag_name)}
            style={isActive
              ? { backgroundColor: color.activeBg, color: '#fff' }
              : { backgroundColor: color.pillBg, color: color.text }
            }
            className="px-3 py-1.5 rounded-full text-sm font-medium transition-all hover:opacity-80 shadow-sm"
          >
            {tag.tag_name}
            <span className="ml-1 text-xs opacity-60">{tag.article_count}</span>
          </button>
        )
      })}

      {/* "Other" tab */}
      {hiddenTags.length > 0 && (
        <button
          onClick={() => onTagChange('__other__')}
          style={isOtherActive
            ? { backgroundColor: OTHER_COLOR.activeBg, color: '#fff' }
            : { backgroundColor: OTHER_COLOR.pillBg, color: OTHER_COLOR.text }
          }
          className="px-3 py-1.5 rounded-full text-sm font-medium transition-all hover:opacity-80 shadow-sm"
        >
          {t('category_other')}
        </button>
      )}

      {/* Dropdown for hidden tags on mobile */}
      {isMobile && hiddenTags.length > 0 && (
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors flex items-center gap-1 ${
              hiddenTags.some(t => t.tag_name === activeTag)
                ? 'bg-brand text-white'
                : 'bg-[#3D3768] text-[#B0ABCA] hover:bg-[#4A4580]'
            }`}
          >
            <ChevronDown className={`w-4 h-4 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
          </button>

          {dropdownOpen && (
            <div className="absolute top-full mt-1 right-0 z-50 bg-[#2D2850] border border-[#443D6E] rounded-xl shadow-xl py-1 min-w-[160px] max-h-[240px] overflow-y-auto">
              {hiddenTags.map((tag) => (
                <button
                  key={tag.tag_name}
                  onClick={() => {
                    onTagChange(tag.tag_name)
                    setDropdownOpen(false)
                  }}
                  className={`w-full text-left px-3 py-2 text-sm transition-colors ${
                    activeTag === tag.tag_name
                      ? 'bg-brand/20 text-brand-light'
                      : 'text-[#B0ABCA] hover:bg-[#3D3768]'
                  }`}
                >
                  {tag.tag_name}
                  <span className="ml-1 text-xs opacity-70">{tag.article_count}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
