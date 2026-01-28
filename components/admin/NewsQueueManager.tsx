'use client'

import { useState } from 'react'
import { AnimatePresence } from 'framer-motion'
import { motion } from 'framer-motion'
import { List, Search, RefreshCw, Filter, ChevronsUp } from 'lucide-react'
import { useNewsQueue } from '@/hooks/useNewsQueue'
import { StatusFilter, STATUS_FILTERS } from './news-queue/types'
import { filterNews } from './news-queue/utils'
import { StatsCards } from './news-queue/StatsCards'
import { NewsItemRow } from './news-queue/NewsItemRow'

export const NewsQueueManager = () => {
  const { news, stats, loading, loadNews, deleteNews } = useNewsQueue()
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
      <div className="flex items-center justify-center p-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-3">
            <List className="h-7 w-7" />
            News Pipeline
          </h2>
          <p className="text-gray-300 text-sm mt-1">
            Всі новини зі скрапінгу та їхній статус
          </p>
        </div>
        <div className="flex items-center gap-2">
          {expandedIds.size > 0 && (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setExpandedIds(new Set())}
              className="flex items-center gap-2 px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors font-medium"
            >
              <ChevronsUp className="h-4 w-4" />
              Згорнути все ({expandedIds.size})
            </motion.button>
          )}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={loadNews}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 text-white rounded-lg transition-colors font-medium"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Оновити
          </motion.button>
        </div>
      </div>

      {/* Stats */}
      <StatsCards stats={stats} />

      {/* Filters */}
      <div className="bg-white/10 backdrop-blur-lg rounded-lg p-4 border border-white/20">
        <div className="flex flex-wrap items-center gap-4">
          {/* Search */}
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Пошук за заголовком..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-gray-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
              className="px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              {STATUS_FILTERS.map(filter => (
                <option key={filter.value} value={filter.value} className="bg-gray-800">
                  {filter.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* News List */}
      <div className="space-y-3">
        <div className="text-sm text-gray-400 px-2">
          Показано: {filteredNews.length} з {news.length}
        </div>

        {filteredNews.length === 0 ? (
          <div className="text-center py-12 bg-white/5 rounded-lg">
            <List className="h-12 w-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-300">Немає новин з таким фільтром</p>
          </div>
        ) : (
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
        )}
      </div>
    </div>
  )
}
