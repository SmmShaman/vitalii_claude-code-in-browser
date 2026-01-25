'use client'

import { motion, AnimatePresence } from 'framer-motion'
import {
  Trash2, Clock, Linkedin, BookOpen,
  ChevronDown, ChevronUp, ExternalLink,
  Image as ImageIcon, Video, AlertCircle
} from 'lucide-react'
import { NewsItem } from './types'
import { getStatusBadges, getTimelineEvents } from './utils'

interface NewsItemRowProps {
  item: NewsItem
  isExpanded: boolean
  onToggleExpand: () => void
  onDelete: () => void
}

export function NewsItemRow({ item, isExpanded, onToggleExpand, onDelete }: NewsItemRowProps) {
  const badges = getStatusBadges(item)
  const timelineEvents = getTimelineEvents(item)

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -100 }}
      className="bg-white/10 backdrop-blur-lg rounded-lg border border-white/20 hover:border-purple-500/50 transition-colors overflow-hidden"
    >
      {/* Main Row */}
      <div className="p-4">
        <div className="flex items-start gap-4">
          {/* Media Preview */}
          <div className="relative w-20 h-20 flex-shrink-0">
            {item.video_url ? (
              <div className="w-full h-full bg-gray-700 rounded-lg flex items-center justify-center">
                <Video className="h-8 w-8 text-gray-400" />
              </div>
            ) : item.image_url ? (
              <img
                src={item.image_url}
                alt=""
                className="w-full h-full object-cover rounded-lg"
              />
            ) : (
              <div className="w-full h-full bg-gray-700 rounded-lg flex items-center justify-center">
                <ImageIcon className="h-8 w-8 text-gray-400" />
              </div>
            )}
            {item.images && item.images.length > 1 && (
              <div className="absolute -top-1 -right-1 bg-purple-600 text-white text-xs px-1.5 py-0.5 rounded-full">
                +{item.images.length - 1}
              </div>
            )}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2 mb-2">
              <h3 className="text-white font-medium line-clamp-2">
                {item.title_en || item.original_title || 'Без заголовку'}
              </h3>
            </div>

            {/* Status Badges */}
            <div className="flex flex-wrap gap-2 mb-2">
              {badges.map((badge, idx) => (
                <span
                  key={idx}
                  className={`px-2 py-0.5 rounded-full text-xs font-medium border ${badge.color}`}
                >
                  {badge.label}
                </span>
              ))}
            </div>

            {/* Meta */}
            <div className="flex flex-wrap items-center gap-3 text-xs text-gray-400">
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {new Date(item.created_at).toLocaleString('uk-UA')}
              </span>
              {item.news_sources?.channel_username && (
                <span className="text-blue-400">
                  @{item.news_sources.channel_username}
                </span>
              )}
              {item.original_url && (
                <a
                  href={item.original_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-blue-400 hover:text-blue-300"
                >
                  <ExternalLink className="h-3 w-3" />
                  Оригінал
                </a>
              )}
            </div>

            {/* Rejection Reason */}
            {item.pre_moderation_status === 'rejected' && item.rejection_reason && (
              <div className="mt-2 p-2 bg-red-500/10 border border-red-500/30 rounded text-xs text-red-300 flex items-start gap-2">
                <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                <span><strong>Причина:</strong> {item.rejection_reason}</span>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <button
              onClick={onToggleExpand}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              title="Деталі"
            >
              {isExpanded ? (
                <ChevronUp className="h-5 w-5 text-gray-400" />
              ) : (
                <ChevronDown className="h-5 w-5 text-gray-400" />
              )}
            </button>
            <button
              onClick={onDelete}
              className="p-2 hover:bg-red-500/20 rounded-lg transition-colors"
              title="Видалити"
            >
              <Trash2 className="h-5 w-5 text-red-400" />
            </button>
          </div>
        </div>
      </div>

      {/* Expanded Timeline */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-t border-white/10"
          >
            <div className="p-4 bg-white/5">
              <h4 className="text-sm font-medium text-white mb-4">📋 Історія обробки:</h4>
              <div className="space-y-4">
                {timelineEvents.map((event, idx) => {
                  const Icon = event.icon
                  return (
                    <div key={idx} className="flex items-start gap-3">
                      <div className={`p-1.5 rounded-full bg-white/10 ${event.color}`}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-white">{event.label}</span>
                          {event.time && (
                            <span className="text-xs text-gray-500">
                              {new Date(event.time).toLocaleString('uk-UA')}
                            </span>
                          )}
                        </div>
                        {event.details && (
                          <p className="text-xs text-gray-400 mt-0.5">{event.details}</p>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Full Content Preview */}
              <div className="mt-4 pt-4 border-t border-white/10">
                <h4 className="text-sm font-medium text-white mb-2">📄 Оригінальний контент:</h4>
                <p className="text-sm text-gray-300 whitespace-pre-wrap line-clamp-6">
                  {item.original_content || item.description_en || 'Немає контенту'}
                </p>
              </div>

              {/* Links */}
              <div className="mt-4 pt-4 border-t border-white/10 flex flex-wrap gap-3">
                {item.is_published && item.slug_en && (
                  <a
                    href={`/news/${item.slug_en}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-green-400 hover:text-green-300 flex items-center gap-1"
                  >
                    <ExternalLink className="h-4 w-4" />
                    Переглянути новину
                  </a>
                )}
                {item.linkedin_post_id && (
                  <a
                    href={`https://www.linkedin.com/feed/update/${item.linkedin_post_id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
                  >
                    <Linkedin className="h-4 w-4" />
                    Переглянути в LinkedIn
                  </a>
                )}
                {item.blog_posts && item.blog_posts.length > 0 && (
                  <a
                    href={`/blog/${item.blog_posts[0].slug_en}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-purple-400 hover:text-purple-300 flex items-center gap-1"
                  >
                    <BookOpen className="h-4 w-4" />
                    Переглянути блог-пост
                  </a>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
