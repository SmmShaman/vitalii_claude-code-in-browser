'use client'

import { motion } from 'framer-motion'
import { ExternalLink, Clock, Bot } from 'lucide-react'
import { RSSArticle } from './types'

interface ArticleItemProps {
  article: RSSArticle
  index: number
}

function getScoreColor(score: number): string {
  if (score >= 7) return 'text-green-400'
  if (score >= 5) return 'text-yellow-400'
  return 'text-red-400'
}

function getScoreBgColor(score: number): string {
  if (score >= 7) return 'bg-green-500/20'
  if (score >= 5) return 'bg-yellow-500/20'
  return 'bg-red-500/20'
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
  const hasScore = article.relevanceScore !== undefined && article.relevanceScore !== null

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
          <div className="flex items-center gap-2">
            <p className="text-sm text-gray-200 group-hover:text-white transition-colors line-clamp-2 flex-1">
              {article.title}
            </p>
            {hasScore && (
              <span
                className={`shrink-0 flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium ${getScoreBgColor(article.relevanceScore!)} ${getScoreColor(article.relevanceScore!)}`}
                title={`AI Relevance Score: ${article.relevanceScore}/10`}
              >
                <Bot className="h-3 w-3" />
                {article.relevanceScore}
              </span>
            )}
          </div>
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
