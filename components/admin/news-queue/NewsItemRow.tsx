'use client'

import { motion, AnimatePresence } from 'framer-motion'
import {
  Trash2, Clock, Linkedin, BookOpen,
  ChevronDown, ChevronUp, ExternalLink,
  Image as ImageIcon, Video, AlertCircle, Rss
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
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -50 }}
      className="bg-white/5 rounded-md border border-white/10 hover:border-purple-500/30 transition-colors overflow-hidden"
    >
      {/* Main Row - Compact */}
      <div className="px-2.5 py-2">
        <div className="flex items-center gap-2.5">
          {/* Media Preview - Smaller */}
          <div className="relative w-12 h-12 flex-shrink-0">
            {item.video_url ? (
              <div className="w-full h-full bg-gray-700 rounded flex items-center justify-center">
                <Video className="h-5 w-5 text-gray-400" />
              </div>
            ) : item.image_url ? (
              <img
                src={item.image_url}
                alt=""
                className="w-full h-full object-cover rounded"
              />
            ) : (
              <div className="w-full h-full bg-gray-700 rounded flex items-center justify-center">
                <ImageIcon className="h-5 w-5 text-gray-400" />
              </div>
            )}
            {item.images && item.images.length > 1 && (
              <div className="absolute -top-0.5 -right-0.5 bg-purple-600 text-white text-[9px] px-1 rounded-full leading-tight">
                +{item.images.length - 1}
              </div>
            )}
          </div>

          {/* Content - Compact */}
          <div className="flex-1 min-w-0">
            {/* Title + Badges in one line */}
            <div className="flex items-center gap-2 mb-1">
              <h3 className="text-xs text-white font-medium truncate flex-1">
                {item.title_en || item.original_title || 'Без заголовку'}
              </h3>
              {/* Inline Badges */}
              <div className="flex gap-1 flex-shrink-0">
                {badges.slice(0, 3).map((badge, idx) => (
                  <span
                    key={idx}
                    className={`px-1.5 py-0.5 rounded text-[10px] font-medium border ${badge.color}`}
                  >
                    {badge.label}
                  </span>
                ))}
                {badges.length > 3 && (
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-white/10 text-gray-400">
                    +{badges.length - 3}
                  </span>
                )}
              </div>
            </div>

            {/* Meta - Single Line */}
            <div className="flex items-center gap-2 text-[10px] text-gray-400">
              <span className="flex items-center gap-0.5">
                <Clock className="h-2.5 w-2.5" />
                {new Date(item.created_at).toLocaleDateString('uk-UA')}
              </span>
              {item.source_type === 'rss' ? (
                <span className="flex items-center gap-0.5 text-orange-400">
                  <Rss className="h-2.5 w-2.5" />
                  {item.news_sources?.channel_username || 'RSS'}
                </span>
              ) : item.news_sources?.channel_username && (
                <span className="text-blue-400">
                  @{item.news_sources.channel_username}
                </span>
              )}
              {item.original_url && (
                <a
                  href={item.original_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-0.5 text-blue-400 hover:text-blue-300"
                >
                  <ExternalLink className="h-2.5 w-2.5" />
                </a>
              )}
              {item.pre_moderation_status === 'rejected' && item.rejection_reason && (
                <span className="text-red-400 truncate max-w-[150px]" title={item.rejection_reason}>
                  ⚠️ {item.rejection_reason}
                </span>
              )}
            </div>
          </div>

          {/* Actions - Compact */}
          <div className="flex items-center gap-1 flex-shrink-0">
            <button
              onClick={onToggleExpand}
              className="p-1 hover:bg-white/10 rounded transition-colors"
              title="Деталі"
            >
              {isExpanded ? (
                <ChevronUp className="h-3.5 w-3.5 text-gray-400" />
              ) : (
                <ChevronDown className="h-3.5 w-3.5 text-gray-400" />
              )}
            </button>
            <button
              onClick={onDelete}
              className="p-1 hover:bg-red-500/20 rounded transition-colors"
              title="Видалити"
            >
              <Trash2 className="h-3.5 w-3.5 text-red-400" />
            </button>
          </div>
        </div>
      </div>

      {/* Expanded Timeline - Compact */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-t border-white/10"
          >
            <div className="px-2.5 py-2 bg-white/5">
              {/* Timeline - Horizontal compact */}
              <div className="flex flex-wrap gap-2 mb-2">
                {timelineEvents.map((event, idx) => {
                  const Icon = event.icon
                  return (
                    <div key={idx} className="flex items-center gap-1 text-[10px]">
                      <Icon className={`h-3 w-3 ${event.color}`} />
                      <span className="text-gray-300">{event.label}</span>
                      {event.time && (
                        <span className="text-gray-500">
                          {new Date(event.time).toLocaleDateString('uk-UA')}
                        </span>
                      )}
                    </div>
                  )
                })}
              </div>

              {/* Content Preview */}
              <p className="text-[10px] text-gray-400 line-clamp-2 mb-2">
                {item.original_content || item.description_en || 'Немає контенту'}
              </p>

              {/* Links - Compact */}
              <div className="flex flex-wrap gap-2">
                {item.is_published && item.slug_en && (
                  <a
                    href={`/news/${item.slug_en}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[10px] text-green-400 hover:text-green-300 flex items-center gap-0.5"
                  >
                    <ExternalLink className="h-2.5 w-2.5" />
                    News
                  </a>
                )}
                {item.linkedin_post_id && (
                  <a
                    href={`https://www.linkedin.com/feed/update/${item.linkedin_post_id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[10px] text-cyan-400 hover:text-cyan-300 flex items-center gap-0.5"
                  >
                    <Linkedin className="h-2.5 w-2.5" />
                    LinkedIn
                  </a>
                )}
                {item.blog_posts && item.blog_posts.length > 0 && (
                  <a
                    href={`/blog/${item.blog_posts[0].slug_en}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[10px] text-purple-400 hover:text-purple-300 flex items-center gap-0.5"
                  >
                    <BookOpen className="h-2.5 w-2.5" />
                    Blog
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
