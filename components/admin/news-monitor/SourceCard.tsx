'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown, ChevronUp, Trash2, ToggleLeft, ToggleRight, RefreshCw, AlertCircle, Loader2, ExternalLink, Rss } from 'lucide-react'
import { RSSSource, SourceState } from './types'
import { ArticleItem } from './ArticleItem'

interface SourceCardProps {
  source: RSSSource
  state: SourceState | undefined
  onDelete?: (id: string) => void
  onToggleActive: (id: string) => void
  onRefresh: (id: string) => void
}

export function SourceCard({ source, state, onDelete, onToggleActive, onRefresh }: SourceCardProps) {
  const [isExpanded, setIsExpanded] = useState(true)

  const hasArticles = state?.articles && state.articles.length > 0
  const isLoading = state?.loading
  const hasError = state?.error

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className={`rounded-lg border transition-colors ${
        source.isActive
          ? 'bg-white/5 border-white/10 hover:border-white/20'
          : 'bg-gray-900/50 border-gray-700/30'
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-3">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1 text-gray-400 hover:text-white transition-colors shrink-0"
          >
            {isExpanded ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </button>

          <div className={`p-1.5 rounded ${source.isActive ? 'bg-white/10' : 'bg-gray-800'}`}>
            <Rss className={`h-3.5 w-3.5 ${source.isActive ? 'text-white' : 'text-gray-500'}`} />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className={`font-medium text-sm truncate ${source.isActive ? 'text-white' : 'text-gray-500'}`}>
                {source.name}
              </span>
              {source.url && (
                <a
                  href={source.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-500 hover:text-gray-400 shrink-0"
                  onClick={e => e.stopPropagation()}
                >
                  <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              {isLoading && (
                <span className="text-xs text-blue-400 flex items-center gap-1">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Loading...
                </span>
              )}
              {hasError && (
                <span className="text-xs text-red-400 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  Error
                </span>
              )}
              {!isLoading && !hasError && hasArticles && (
                <span className="text-xs text-gray-500">
                  {state?.articles.length} articles
                </span>
              )}
              {!source.isActive && (
                <span className="text-xs text-gray-500">Disabled</span>
              )}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 shrink-0">
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => onRefresh(source.id)}
            disabled={isLoading || !source.isActive}
            className="p-1.5 text-gray-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            title="Refresh"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => onToggleActive(source.id)}
            className={`p-1.5 transition-colors ${
              source.isActive
                ? 'text-green-400 hover:text-green-300'
                : 'text-gray-500 hover:text-gray-400'
            }`}
            title={source.isActive ? 'Disable' : 'Enable'}
          >
            {source.isActive ? (
              <ToggleRight className="h-4 w-4" />
            ) : (
              <ToggleLeft className="h-4 w-4" />
            )}
          </motion.button>

          {!source.isDefault && onDelete && (
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => onDelete(source.id)}
              className="p-1.5 text-red-400 hover:text-red-300 transition-colors"
              title="Delete"
            >
              <Trash2 className="h-4 w-4" />
            </motion.button>
          )}
        </div>
      </div>

      {/* Articles */}
      <AnimatePresence>
        {isExpanded && source.isActive && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-3 pb-3 pt-1 border-t border-white/5">
              {isLoading && !hasArticles && (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
                </div>
              )}

              {hasError && (
                <div className="flex items-center gap-2 py-3 text-red-400 text-sm">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span className="line-clamp-2">{state.error}</span>
                </div>
              )}

              {!isLoading && !hasError && !hasArticles && (
                <p className="text-gray-500 text-sm py-3 text-center">
                  No articles yet
                </p>
              )}

              {hasArticles && (
                <div className="space-y-0.5">
                  {state.articles.map((article, idx) => (
                    <ArticleItem key={article.id} article={article} index={idx} />
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
