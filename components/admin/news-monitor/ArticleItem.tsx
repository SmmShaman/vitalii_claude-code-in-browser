'use client'

import { motion } from 'framer-motion'
import { ExternalLink, Clock } from 'lucide-react'
import { RSSArticle } from './types'

interface ArticleItemProps {
  article: RSSArticle
  index: number
}

function formatDate(dateString: string): string {
  if (!dateString) return ''

  try {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMins / 60)
    const diffDays = Math.floor(diffHours / 24)

    if (diffMins < 60) {
      return `${diffMins}m ago`
    } else if (diffHours < 24) {
      return `${diffHours}h ago`
    } else if (diffDays < 7) {
      return `${diffDays}d ago`
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    }
  } catch {
    return ''
  }
}

export function ArticleItem({ article, index }: ArticleItemProps) {
  return (
    <motion.a
      href={article.url}
      target="_blank"
      rel="noopener noreferrer"
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.05 }}
      className="block group"
    >
      <div className="flex items-start gap-2 py-2 px-2 rounded-lg hover:bg-white/5 transition-colors">
        <span className="text-gray-500 text-xs mt-1 shrink-0">
          {index + 1}.
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-sm text-gray-200 group-hover:text-white transition-colors line-clamp-2">
            {article.title}
          </p>
          {article.pubDate && (
            <div className="flex items-center gap-1 mt-1">
              <Clock className="h-3 w-3 text-gray-500" />
              <span className="text-xs text-gray-500">
                {formatDate(article.pubDate)}
              </span>
            </div>
          )}
        </div>
        <ExternalLink className="h-3 w-3 text-gray-500 group-hover:text-gray-400 shrink-0 mt-1 opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
    </motion.a>
  )
}
