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
      <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
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
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'bg-gray-100 text-gray-600 hover:bg-purple-50 hover:text-purple-700'
              }`}
            >
              #{tag.name}
              <span className={`text-[10px] ${isActive ? 'text-purple-200' : 'text-gray-400'}`}>
                {tag.usage_count}
              </span>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
