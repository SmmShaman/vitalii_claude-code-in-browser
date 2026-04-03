'use client'

import Link from 'next/link'
import { useTranslations } from '@/contexts/TranslationContext'

interface Tag {
  id: string
  name: string
  slug: string
  usage_count: number
}

interface TagCloudProps {
  tags: Tag[]
  activeTag?: string
}

export function TagCloud({ tags, activeTag }: TagCloudProps) {
  const { t } = useTranslations()

  if (!tags || tags.length === 0) return null

  return (
    <div className="mb-6">
      <h2 className="text-xs font-semibold text-[#8A8478] uppercase tracking-wider mb-3">
        {t('search_popular_tags')}
      </h2>
      <div className="flex flex-wrap gap-2">
        {tags.slice(0, 20).map((tag) => {
          const isActive = activeTag === tag.name
          return (
            <Link
              key={tag.id}
              href={isActive ? '/search' : `/search?tag=${encodeURIComponent(tag.name)}`}
              className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                isActive
                  ? 'bg-brand text-white shadow-sm'
                  : 'bg-[#35302A] text-[#B0AB9A] hover:bg-[#3D3730] hover:text-brand-light'
              }`}
            >
              #{tag.name}
              <span className={`text-[10px] ${isActive ? 'text-brand-lighter' : 'text-[#8A8478]'}`}>
                {tag.usage_count}
              </span>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
