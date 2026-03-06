'use client'

import { useState } from 'react'
import { AnimatePresence } from 'framer-motion'
import { motion } from 'framer-motion'
import { List, RefreshCw, ChevronsUp, Loader2, Calendar } from 'lucide-react'
import { useNewsQueue } from '@/hooks/useNewsQueue'
import { StatusFilter } from './news-queue/types'
import { filterNews } from './news-queue/utils'
import { StatsCards } from './news-queue/StatsCards'
import { NewsItemRow } from './news-queue/NewsItemRow'
import { ScheduleTimeline } from './news-queue/ScheduleTimeline'

type QueueTab = 'pipeline' | 'schedule'

export const NewsQueueManager = () => {
  const { news, stats, loading, loadNews, deleteNews, timeFilter, setTimeFilter } = useNewsQueue()
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())
  const [activeTab, setActiveTab] = useState<QueueTab>('pipeline')

  const filteredNews = filterNews(news, statusFilter)

  const handleDelete = async (id: string) => {
    if (!confirm('Видалити цю новину?')) return
    const success = await deleteNews(id)
    if (!success) {
      alert('Помилка видалення')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-10 w-10 animate-spin text-purple-400" />
          <p className="text-gray-400">Loading news...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-[calc(100vh-180px)] min-h-[500px] bg-purple-500/10 border border-purple-500/30 rounded-xl p-4 flex flex-col overflow-hidden">
      {/* Tab Switcher + Header */}
      <div className="flex items-center justify-between mb-3 flex-shrink-0">
        <div className="flex items-center gap-1">
          <button
            onClick={() => setActiveTab('pipeline')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'pipeline'
                ? 'bg-purple-500/30 text-white border border-purple-500/50'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <List className="h-3.5 w-3.5" />
            Pipeline
            <span className="text-[10px] text-gray-500">({filteredNews.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('schedule')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'schedule'
                ? 'bg-blue-500/30 text-white border border-blue-500/50'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Calendar className="h-3.5 w-3.5" />
            Schedule
            {stats.scheduledTotal > 0 && (
              <span className="px-1.5 py-0.5 rounded-full bg-blue-500/30 text-blue-300 text-[10px]">
                {stats.scheduledTotal}
              </span>
            )}
          </button>
        </div>
        <div className="flex items-center gap-2">
          {activeTab === 'pipeline' && expandedIds.size > 0 && (
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => setExpandedIds(new Set())}
              className="p-1.5 rounded-lg bg-gray-500/20 hover:bg-gray-500/30 transition-colors"
              title={`Collapse all (${expandedIds.size})`}
            >
              <ChevronsUp className="h-3.5 w-3.5 text-gray-400" />
            </motion.button>
          )}
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={loadNews}
            disabled={loading}
            className="p-1.5 rounded-lg bg-purple-500/20 hover:bg-purple-500/30 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 text-purple-400 ${loading ? 'animate-spin' : ''}`} />
          </motion.button>
        </div>
      </div>

      {activeTab === 'pipeline' ? (
        <>
          {/* Compact Stats with clickable filters */}
          <div className="mb-3 flex-shrink-0">
            <StatsCards
              stats={stats}
              timeFilter={timeFilter}
              onTimeFilterChange={setTimeFilter}
              activeFilter={statusFilter}
              onFilterChange={setStatusFilter}
            />
          </div>

          {/* News List - Scrollable */}
          <div className="flex-1 overflow-y-auto pr-1">
            {filteredNews.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                <List className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-xs">No news</p>
              </div>
            ) : (
              <div className="space-y-1.5">
                <AnimatePresence>
                  {filteredNews.map((item) => (
                    <NewsItemRow
                      key={item.id}
                      item={item}
                      isExpanded={expandedIds.has(item.id)}
                      onToggleExpand={() => {
                        setExpandedIds(prev => {
                          const next = new Set(prev)
                          if (next.has(item.id)) {
                            next.delete(item.id)
                          } else {
                            next.add(item.id)
                          }
                          return next
                        })
                      }}
                      onDelete={() => handleDelete(item.id)}
                    />
                  ))}
                </AnimatePresence>
              </div>
            )}
          </div>
        </>
      ) : (
        <div className="flex-1 overflow-y-auto pr-1">
          <ScheduleTimeline />
        </div>
      )}
    </div>
  )
}
