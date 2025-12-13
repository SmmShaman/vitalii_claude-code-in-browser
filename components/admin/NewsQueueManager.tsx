'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  List, CheckCircle, XCircle, Star,
  Search, Trash2, ChevronUp, ChevronDown, Clock, RefreshCw
} from 'lucide-react'
import { supabase } from '@/integrations/supabase/client'

interface QueuedNews {
  id: string
  title: string
  content: string
  image_url: string | null
  source_url: string | null
  created_at: string
  is_published: boolean
  is_rewritten: boolean
  priority: 'high' | 'medium' | 'low' | null
  scheduled_publish_at: string | null
  pre_moderation_status: string | null
  rejection_reason: string | null
}

type SortBy = 'created_at' | 'priority' | 'title'
type FilterBy = 'all' | 'high' | 'medium' | 'low'

export const NewsQueueManager = () => {
  const [queue, setQueue] = useState<QueuedNews[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [searchTerm, setSearchTerm] = useState('')
  const [sortBy, setSortBy] = useState<SortBy>('created_at')
  const [filterBy, setFilterBy] = useState<FilterBy>('all')

  useEffect(() => {
    loadQueue()

    const handleQueueUpdate = () => {
      console.log('News queue update event received, reloading...')
      loadQueue()
    }

    window.addEventListener('news-queue-updated', handleQueueUpdate)

    return () => {
      window.removeEventListener('news-queue-updated', handleQueueUpdate)
    }
  }, [])

  const loadQueue = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('news')
        .select('id, title, content, image_url, source_url, created_at, is_published, is_rewritten, priority, scheduled_publish_at, pre_moderation_status, rejection_reason')
        .eq('is_published', false)
        .order('created_at', { ascending: false })

      if (error) throw error

      setQueue(data || [])
    } catch (error) {
      console.error('Failed to load queue:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleToggleSelect = (id: string) => {
    const newSelected = new Set(selectedIds)
    if (newSelected.has(id)) {
      newSelected.delete(id)
    } else {
      newSelected.add(id)
    }
    setSelectedIds(newSelected)
  }

  const handleSelectAll = () => {
    if (selectedIds.size === filteredQueue.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(filteredQueue.map(n => n.id)))
    }
  }

  const handlePublish = async (ids: string[]) => {
    try {
      const { error } = await supabase
        .from('news')
        .update({
          is_published: true,
          published_at: new Date().toISOString()
        })
        .in('id', ids)

      if (error) throw error

      alert(`${ids.length} news published!`)
      loadQueue()
      setSelectedIds(new Set())
    } catch (error) {
      console.error('Failed to publish:', error)
      alert('Error publishing')
    }
  }

  const handleReject = async (ids: string[]) => {
    if (!confirm(`Delete ${ids.length} news from queue?`)) return

    try {
      const { error } = await supabase
        .from('news')
        .delete()
        .in('id', ids)

      if (error) throw error

      alert(`${ids.length} news deleted!`)
      loadQueue()
      setSelectedIds(new Set())
    } catch (error) {
      console.error('Failed to reject:', error)
      alert('Error deleting')
    }
  }

  const handleSetPriority = async (ids: string[], priority: 'high' | 'medium' | 'low') => {
    try {
      const { error } = await supabase
        .from('news')
        .update({ priority })
        .in('id', ids)

      if (error) throw error

      loadQueue()
    } catch (error) {
      console.error('Failed to set priority:', error)
      alert('Error setting priority')
    }
  }

  const handleMoveUp = (index: number) => {
    if (index === 0) return
    const newQueue = [...filteredQueue];
    [newQueue[index - 1], newQueue[index]] = [newQueue[index], newQueue[index - 1]]
    setQueue(newQueue)
  }

  const handleMoveDown = (index: number) => {
    if (index === filteredQueue.length - 1) return
    const newQueue = [...filteredQueue];
    [newQueue[index], newQueue[index + 1]] = [newQueue[index + 1], newQueue[index]]
    setQueue(newQueue)
  }

  const filteredQueue = queue
    .filter(news => {
      if (searchTerm && !news.title?.toLowerCase().includes(searchTerm.toLowerCase())) {
        return false
      }
      if (filterBy !== 'all' && news.priority !== filterBy) {
        return false
      }
      return true
    })
    .sort((a, b) => {
      if (sortBy === 'priority') {
        const priorityOrder: Record<string, number> = { high: 3, medium: 2, low: 1 }
        return (priorityOrder[b.priority || ''] || 0) - (priorityOrder[a.priority || ''] || 0)
      } else if (sortBy === 'title') {
        return (a.title || '').localeCompare(b.title || '')
      } else {
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      }
    })

  const getPriorityColor = (priority: string | null) => {
    switch (priority) {
      case 'high': return 'text-red-400 bg-red-500/20 border-red-500/50'
      case 'medium': return 'text-yellow-400 bg-yellow-500/20 border-yellow-500/50'
      case 'low': return 'text-green-400 bg-green-500/20 border-green-500/50'
      default: return 'text-gray-400 bg-gray-500/20 border-gray-500/50'
    }
  }

  const getPriorityLabel = (priority: string | null) => {
    switch (priority) {
      case 'high': return 'High'
      case 'medium': return 'Medium'
      case 'low': return 'Low'
      default: return 'No priority'
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
            Publish Queue
          </h2>
          <p className="text-gray-300 text-sm mt-1">
            {queue.length} news waiting to be published
          </p>
        </div>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={loadQueue}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 text-white rounded-lg transition-colors font-medium"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </motion.button>
      </div>

      {/* Filters and Search */}
      <div className="bg-white/10 backdrop-blur-lg rounded-lg p-4 border border-white/20">
        <div className="flex flex-wrap items-center gap-4">
          {/* Search */}
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search by title..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
          </div>

          {/* Sort */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortBy)}
            className="px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
          >
            <option value="created_at" className="bg-gray-800">Sort: Newest</option>
            <option value="priority" className="bg-gray-800">Sort: Priority</option>
            <option value="title" className="bg-gray-800">Sort: Title</option>
          </select>

          {/* Filter */}
          <select
            value={filterBy}
            onChange={(e) => setFilterBy(e.target.value as FilterBy)}
            className="px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
          >
            <option value="all" className="bg-gray-800">All priorities</option>
            <option value="high" className="bg-gray-800">High</option>
            <option value="medium" className="bg-gray-800">Medium</option>
            <option value="low" className="bg-gray-800">Low</option>
          </select>
        </div>
      </div>

      {/* Bulk Actions */}
      {selectedIds.size > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-purple-600/20 backdrop-blur-lg rounded-lg p-4 border border-purple-500/50"
        >
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="text-white font-medium">
              Selected: {selectedIds.size} news
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              <button
                onClick={() => handleSetPriority(Array.from(selectedIds), 'high')}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors flex items-center gap-2"
              >
                <Star className="h-4 w-4" />
                High priority
              </button>
              <button
                onClick={() => handleSetPriority(Array.from(selectedIds), 'medium')}
                className="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg transition-colors flex items-center gap-2"
              >
                <Star className="h-4 w-4" />
                Medium
              </button>
              <button
                onClick={() => handleSetPriority(Array.from(selectedIds), 'low')}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors flex items-center gap-2"
              >
                <Star className="h-4 w-4" />
                Low
              </button>
              <button
                onClick={() => handlePublish(Array.from(selectedIds))}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors flex items-center gap-2"
              >
                <CheckCircle className="h-4 w-4" />
                Publish
              </button>
              <button
                onClick={() => handleReject(Array.from(selectedIds))}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors flex items-center gap-2"
              >
                <Trash2 className="h-4 w-4" />
                Delete
              </button>
            </div>
          </div>
        </motion.div>
      )}

      {/* Queue List */}
      <div className="space-y-3">
        {/* Select All */}
        <div className="flex items-center gap-2 px-4 py-2 bg-white/5 rounded-lg">
          <input
            type="checkbox"
            checked={selectedIds.size === filteredQueue.length && filteredQueue.length > 0}
            onChange={handleSelectAll}
            className="w-4 h-4 rounded border-white/20 bg-white/10"
          />
          <span className="text-sm text-gray-300">Select all ({filteredQueue.length})</span>
        </div>

        {filteredQueue.length === 0 ? (
          <div className="text-center py-12 bg-white/5 rounded-lg">
            <List className="h-12 w-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-300">Queue is empty</p>
          </div>
        ) : (
          <AnimatePresence>
            {filteredQueue.map((news, index) => (
              <motion.div
                key={news.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -100 }}
                className="bg-white/10 backdrop-blur-lg rounded-lg p-4 border border-white/20 hover:border-purple-500/50 transition-colors"
              >
                <div className="flex items-start gap-4">
                  {/* Checkbox */}
                  <input
                    type="checkbox"
                    checked={selectedIds.has(news.id)}
                    onChange={() => handleToggleSelect(news.id)}
                    className="mt-1 w-5 h-5 rounded border-white/20 bg-white/10"
                  />

                  {/* Image */}
                  {news.image_url && (
                    <img
                      src={news.image_url}
                      alt={news.title}
                      className="w-20 h-20 object-cover rounded-lg"
                    />
                  )}

                  {/* Content */}
                  <div className="flex-1">
                    <div className="flex items-start justify-between gap-4 mb-2">
                      <div className="flex-1">
                        <h3 className="text-white font-semibold mb-1">{news.title}</h3>
                        <p className="text-sm text-gray-400 line-clamp-2">{news.content}</p>
                      </div>

                      <div className="flex flex-col gap-2">
                        {/* AI Moderation Status Badge */}
                        {news.pre_moderation_status && (
                          <div className={`px-3 py-1 rounded-full text-xs font-medium border ${
                            news.pre_moderation_status === 'approved'
                              ? 'text-green-400 bg-green-500/20 border-green-500/50'
                              : news.pre_moderation_status === 'rejected'
                              ? 'text-red-400 bg-red-500/20 border-red-500/50'
                              : 'text-yellow-400 bg-yellow-500/20 border-yellow-500/50'
                          }`}>
                            {news.pre_moderation_status === 'approved' && 'AI: Approved'}
                            {news.pre_moderation_status === 'rejected' && 'AI: Rejected'}
                            {news.pre_moderation_status === 'pending' && 'AI: Pending'}
                          </div>
                        )}

                        {/* Priority Badge */}
                        <div className={`px-3 py-1 rounded-full text-xs font-medium border ${getPriorityColor(news.priority)}`}>
                          {getPriorityLabel(news.priority)}
                        </div>
                      </div>
                    </div>

                    {/* Rejection Reason */}
                    {news.pre_moderation_status === 'rejected' && news.rejection_reason && (
                      <div className="mb-2 p-2 bg-red-500/10 border border-red-500/30 rounded text-xs text-red-300">
                        <strong>Rejection reason:</strong> {news.rejection_reason}
                      </div>
                    )}

                    <div className="flex items-center gap-4 text-xs text-gray-400">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {new Date(news.created_at).toLocaleString()}
                      </span>
                      {news.source_url && (
                        <span className="truncate max-w-[200px]">
                          Source: {news.source_url}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col gap-2">
                    {/* Move Up/Down */}
                    <div className="flex gap-1">
                      <button
                        onClick={() => handleMoveUp(index)}
                        disabled={index === 0}
                        className="p-1 hover:bg-white/10 rounded disabled:opacity-30"
                        title="Move up"
                      >
                        <ChevronUp className="h-4 w-4 text-gray-400" />
                      </button>
                      <button
                        onClick={() => handleMoveDown(index)}
                        disabled={index === filteredQueue.length - 1}
                        className="p-1 hover:bg-white/10 rounded disabled:opacity-30"
                        title="Move down"
                      >
                        <ChevronDown className="h-4 w-4 text-gray-400" />
                      </button>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-2">
                      <button
                        onClick={() => handlePublish([news.id])}
                        className="p-2 bg-green-600 hover:bg-green-700 rounded-lg transition-colors"
                        title="Publish"
                      >
                        <CheckCircle className="h-4 w-4 text-white" />
                      </button>
                      <button
                        onClick={() => handleReject([news.id])}
                        className="p-2 bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
                        title="Delete"
                      >
                        <XCircle className="h-4 w-4 text-white" />
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>
    </div>
  )
}
