'use client'

import { useEffect } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown, ChevronUp, Trash2, ToggleLeft, ToggleRight, RefreshCw, AlertCircle, Loader2, ExternalLink, GripVertical, Shield, ShieldOff } from 'lucide-react'
import { RSSSource, SourceState } from './types'
import { ArticleItem } from './ArticleItem'

interface SourceStats {
  total: number
  published: number
  lastArticle: Date | null
}

// Format time since last article
function formatTimeSince(date: Date | null): string {
  if (!date) return '—'

  const now = new Date()
  const diff = now.getTime() - date.getTime()

  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)

  if (minutes < 1) return 'щойно'
  if (minutes < 60) return `${minutes}хв`
  if (hours < 24) {
    const remainingMinutes = minutes % 60
    return remainingMinutes > 0 ? `${hours}г ${remainingMinutes}хв` : `${hours}г`
  }
  if (days < 7) {
    const remainingHours = hours % 24
    return remainingHours > 0 ? `${days}д ${remainingHours}г` : `${days}д`
  }
  const weeks = Math.floor(days / 7)
  const remainingDays = days % 7
  return remainingDays > 0 ? `${weeks}т ${remainingDays}д` : `${weeks}т`
}

interface SortableSourceCardProps {
  source: RSSSource
  state: SourceState | undefined
  stats?: SourceStats
  isExpanded: boolean
  onToggleExpand: () => void
  onDelete?: (id: string) => void
  onToggleActive: (id: string) => void
  onTogglePreModeration?: (id: string) => void
  onRefresh: (id: string) => void
  isDraggable?: boolean
}

export function SortableSourceCard({
  source,
  state,
  stats,
  isExpanded,
  onToggleExpand,
  onDelete,
  onToggleActive,
  onTogglePreModeration,
  onRefresh,
  isDraggable = true,
}: SortableSourceCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: source.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  const hasArticles = state?.articles && state.articles.length > 0
  const isLoading = state?.loading
  const hasError = state?.error

  // Auto-fetch articles when expanded with no articles loaded yet
  useEffect(() => {
    if (isExpanded && source.isActive && !hasArticles && !isLoading) {
      onRefresh(source.id)
    }
  }, [isExpanded]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <motion.div
      ref={setNodeRef}
      style={style}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: isDragging ? 0.8 : 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className={`rounded-lg border transition-colors ${
        isDragging
          ? 'bg-white/10 border-white/30 shadow-lg z-50'
          : source.isActive
            ? 'bg-white/5 border-white/10 hover:border-white/20'
            : 'bg-gray-900/50 border-gray-700/30'
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-3">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {/* Drag Handle */}
          {isDraggable && (
            <button
              {...attributes}
              {...listeners}
              className="p-1 text-gray-500 hover:text-gray-300 cursor-grab active:cursor-grabbing shrink-0 touch-none"
              title="Drag to reorder"
            >
              <GripVertical className="h-4 w-4" />
            </button>
          )}

          <button
            onClick={onToggleExpand}
            className="p-1 text-gray-400 hover:text-white transition-colors shrink-0"
          >
            {isExpanded ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </button>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className={`font-medium text-sm ${source.isActive ? 'text-white' : 'text-gray-500'}`}>
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
              {isLoading && (
                <span className="text-xs text-blue-400 flex items-center gap-1">
                  <Loader2 className="h-3 w-3 animate-spin" />
                </span>
              )}
              {hasError && (
                <span className="text-xs text-red-400 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                </span>
              )}
              {!source.isActive && (
                <span className="text-xs text-gray-500">(off)</span>
              )}
            </div>
            {stats && source.isActive && (
              <div className="flex items-center gap-3 text-[10px] mt-0.5">
                <span className="text-cyan-400" title="Час з останньої статті">
                  ⏱ {formatTimeSince(stats.lastArticle)}
                </span>
                <span className="text-amber-400" title="Всього статей">
                  📊 {stats.total}
                </span>
                <span className="text-emerald-400" title="Опубліковано">
                  ✅ {stats.published}
                </span>
                {!isLoading && !hasError && hasArticles && (
                  <span className="text-gray-500" title="Завантажено статей">
                    📰 {state?.articles.length}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-0.5 shrink-0">
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => onRefresh(source.id)}
            disabled={isLoading || !source.isActive}
            className="p-1 text-gray-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            title="Refresh"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          </motion.button>

          {onTogglePreModeration && (
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => onTogglePreModeration(source.id)}
              className={`p-1 transition-colors ${
                source.skipPreModeration
                  ? 'text-yellow-400 hover:text-yellow-300'
                  : 'text-emerald-400 hover:text-emerald-300'
              }`}
              title={source.skipPreModeration ? 'Pre-moderation OFF (click to enable)' : 'Pre-moderation ON (click to disable)'}
            >
              {source.skipPreModeration ? (
                <ShieldOff className="h-3.5 w-3.5" />
              ) : (
                <Shield className="h-3.5 w-3.5" />
              )}
            </motion.button>
          )}

          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => onToggleActive(source.id)}
            className={`p-1 transition-colors ${
              source.isActive
                ? 'text-green-400 hover:text-green-300'
                : 'text-gray-500 hover:text-gray-400'
            }`}
            title={source.isActive ? 'Disable' : 'Enable'}
          >
            {source.isActive ? (
              <ToggleRight className="h-3.5 w-3.5" />
            ) : (
              <ToggleLeft className="h-3.5 w-3.5" />
            )}
          </motion.button>

          {onDelete && (
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => onDelete(source.id)}
              className="p-1 text-red-400 hover:text-red-300 transition-colors"
              title="Delete"
            >
              <Trash2 className="h-3.5 w-3.5" />
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
