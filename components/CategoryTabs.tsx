'use client'

import { useState, useRef, useEffect } from 'react'
import { ChevronDown } from 'lucide-react'
import { useIsMobile } from '@/hooks/useIsMobile'
import { useTranslations } from '@/contexts/TranslationContext'
import type { TagFrequency } from '@/integrations/supabase/client'

// Color palette for category tabs (index-based)
const CATEGORY_COLORS = [
  { bg: 'bg-[#6366F1]/15', text: 'text-[#818CF8]', activeBg: 'bg-[#6366F1]' },       // indigo
  { bg: 'bg-[#EC4899]/15', text: 'text-[#F472B6]', activeBg: 'bg-[#EC4899]' },       // pink
  { bg: 'bg-[#10B981]/15', text: 'text-[#34D399]', activeBg: 'bg-[#10B981]' },       // emerald
  { bg: 'bg-[#F59E0B]/15', text: 'text-[#FBBF24]', activeBg: 'bg-[#F59E0B]' },       // amber
  { bg: 'bg-[#3B82F6]/15', text: 'text-[#60A5FA]', activeBg: 'bg-[#3B82F6]' },       // blue
  { bg: 'bg-[#EF4444]/15', text: 'text-[#F87171]', activeBg: 'bg-[#EF4444]' },       // red
  { bg: 'bg-[#8B5CF6]/15', text: 'text-[#A78BFA]', activeBg: 'bg-[#8B5CF6]' },       // violet
  { bg: 'bg-[#14B8A6]/15', text: 'text-[#2DD4BF]', activeBg: 'bg-[#14B8A6]' },       // teal
  { bg: 'bg-[#F97316]/15', text: 'text-[#FB923C]', activeBg: 'bg-[#F97316]' },       // orange
]

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

  const getColor = (index: number) => CATEGORY_COLORS[index % CATEGORY_COLORS.length]

  return (
    <div className="flex flex-wrap items-center justify-center gap-2">
      {/* "All" tab */}
      <button
        onClick={() => onTagChange(null)}
        className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
          activeTag === null
            ? 'bg-[#6366F1] text-white shadow-md'
            : 'bg-[#3D3768] text-[#B0ABCA] hover:bg-[#4A4580]'
        }`}
      >
        {t('category_all')}
      </button>

      {/* Visible tag tabs — each with its own color */}
      {visibleTags.map((tag, index) => {
        const color = getColor(index)
        const isActive = activeTag === tag.tag_name

        return (
          <button
            key={tag.tag_name}
            onClick={() => onTagChange(tag.tag_name)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
              isActive
                ? `${color.activeBg} text-white shadow-md`
                : `${color.bg} ${color.text} hover:opacity-80`
            }`}
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
          className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
            isOtherActive
              ? 'bg-[#64748B] text-white shadow-md'
              : 'bg-[#64748B]/15 text-[#94A3B8] hover:opacity-80'
          }`}
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
                ? 'bg-[#6366F1] text-white'
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
                      ? 'bg-[#6366F1]/20 text-[#818CF8]'
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
