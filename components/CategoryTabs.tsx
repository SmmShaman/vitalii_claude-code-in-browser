'use client'

import { useState, useRef, useEffect } from 'react'
import { ChevronDown } from 'lucide-react'
import { useIsMobile } from '@/hooks/useIsMobile'
import { useTranslations } from '@/contexts/TranslationContext'
import type { TagFrequency } from '@/integrations/supabase/client'

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

  // Close dropdown when clicking outside
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
    <div className="flex flex-wrap items-center gap-2">
      {/* "All" tab */}
      <button
        onClick={() => onTagChange(null)}
        className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
          activeTag === null
            ? 'bg-[#6366F1] text-white'
            : 'bg-[#3D3768] text-[#B0ABCA] hover:bg-[#4A4580]'
        }`}
      >
        {t('category_all')}
      </button>

      {/* Visible tag tabs */}
      {visibleTags.map((tag) => (
        <button
          key={tag.tag_name}
          onClick={() => onTagChange(tag.tag_name)}
          className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
            activeTag === tag.tag_name
              ? 'bg-[#6366F1] text-white'
              : 'bg-[#3D3768] text-[#B0ABCA] hover:bg-[#4A4580]'
          }`}
        >
          {tag.tag_name}
          <span className="ml-1 text-xs opacity-70">{tag.article_count}</span>
        </button>
      ))}

      {/* "Other" tab */}
      {hiddenTags.length > 0 && (
        <button
          onClick={() => onTagChange('__other__')}
          className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
            isOtherActive
              ? 'bg-[#6366F1] text-white'
              : 'bg-[#3D3768] text-[#B0ABCA] hover:bg-[#4A4580]'
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
