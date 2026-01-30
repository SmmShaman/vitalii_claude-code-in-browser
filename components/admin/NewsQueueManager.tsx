'use client'

import { useState } from 'react'
import { AnimatePresence } from 'framer-motion'
import { motion } from 'framer-motion'
import { List, Search, RefreshCw, Filter, ChevronsUp, Loader2 } from 'lucide-react'
import { useNewsQueue } from '@/hooks/useNewsQueue'
import { StatusFilter, STATUS_FILTERS } from './news-queue/types'
import { filterNews } from './news-queue/utils'
import { StatsCards } from './news-queue/StatsCards'
import { NewsItemRow } from './news-queue/NewsItemRow'

export const NewsQueueManager = () => {
  const { news, stats, loading, loadNews, deleteNews, timeFilter, setTimeFilter } = useNewsQueue()
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())

  const filteredNews = filterNews(news, statusFilter, searchTerm)

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
      {/* Compact Header */}
      <div className="flex items-center justify-between mb-3 flex-shrink-0">
        <div className="flex items-center gap-2">
          <List className="h-4 w-4 text-purple-400" />
          <span className="text-sm font-bold text-white">News Pipeline</span>
          <span className="text-xs text-gray-400">({filteredNews.length}/{news.length})</span>
        </div>
        <div className="flex items-center gap-2">
          {expandedIds.size > 0 && (
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => setExpandedIds(new Set())}
              className="p-1.5 rounded-lg bg-gray-500/20 hover:bg-gray-500/30 transition-colors"
              title={`Згорнути все (${expandedIds.size})`}
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

      {/* Compact Stats */}
      <div className="mb-3 flex-shrink-0">
        <StatsCards stats={stats} timeFilter={timeFilter} onTimeFilterChange={setTimeFilter} />
      </div>

      {/* Compact Filters */}
      <div className="flex items-center gap-2 mb-3 flex-shrink-0">
        <div className="flex-1 relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
          <input
            type="text"
            placeholder="Пошук..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-7 pr-3 py-1.5 bg-white/10 border border-white/20 rounded-lg text-xs text-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-purple-500"
          />
        </div>
        <div className="flex items-center gap-1.5">
          <Filter className="h-3.5 w-3.5 text-gray-400" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
            className="px-2 py-1.5 bg-white/10 border border-white/20 rounded-lg text-xs text-white focus:outline-none focus:ring-1 focus:ring-purple-500"
          >
            {STATUS_FILTERS.map(filter => (
              <option key={filter.value} value={filter.value} className="bg-gray-800">
                {filter.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* News List - Scrollable */}
      <div className="flex-1 overflow-y-auto pr-1">
        {filteredNews.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <List className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-xs">Немає новин</p>
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
    </div>
  )
}
