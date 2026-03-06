'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import { ChevronLeft, ChevronRight, RefreshCw, Clock, Zap, X, Calendar } from 'lucide-react'
import { supabase } from '@/integrations/supabase/client'

interface ScheduledArticle {
  id: string
  original_title: string
  scheduled_publish_at: string
  content_weight: string | null
  schedule_window: string | null
  auto_publish_status: string
  auto_publish_error: string | null
  source_type: string | null
}

interface ScheduleWindow {
  id: string
  start: string
  end: string
  types: string[]
  label: string
}

const WINDOW_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  morning: { bg: 'bg-green-500/20', border: 'border-green-500/40', text: 'text-green-400' },
  afternoon: { bg: 'bg-blue-500/20', border: 'border-blue-500/40', text: 'text-blue-400' },
  evening: { bg: 'bg-purple-500/20', border: 'border-purple-500/40', text: 'text-purple-400' },
  fallback: { bg: 'bg-gray-500/20', border: 'border-gray-500/40', text: 'text-gray-400' },
}

const STATUS_COLORS: Record<string, string> = {
  scheduled: 'bg-blue-500',
  pending: 'bg-yellow-500 animate-pulse',
  variant_selection: 'bg-yellow-500 animate-pulse',
  image_generation: 'bg-yellow-500 animate-pulse',
  content_rewrite: 'bg-yellow-500 animate-pulse',
  social_posting: 'bg-yellow-500 animate-pulse',
  completed: 'bg-green-500',
  failed: 'bg-red-500',
}

export const ScheduleTimeline = () => {
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [articles, setArticles] = useState<ScheduledArticle[]>([])
  const [windows, setWindows] = useState<ScheduleWindow[]>([])
  const [loading, setLoading] = useState(true)

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      // Load schedule windows config
      const { data: configData } = await supabase
        .from('api_settings')
        .select('key_value')
        .eq('key_name', 'PUBLISH_SCHEDULE_WINDOWS')
        .single()

      if (configData?.key_value) {
        try {
          const parsed = JSON.parse(configData.key_value)
          setWindows(parsed.windows || [])
        } catch { /* keep defaults */ }
      }

      // Load articles for selected date
      const dayStart = new Date(selectedDate)
      dayStart.setHours(0, 0, 0, 0)
      const dayEnd = new Date(selectedDate)
      dayEnd.setHours(23, 59, 59, 999)

      const { data: articlesData } = await supabase
        .from('news')
        .select('id, original_title, scheduled_publish_at, content_weight, schedule_window, auto_publish_status, auto_publish_error, source_type, source_id')
        .not('scheduled_publish_at', 'is', null)
        .gte('scheduled_publish_at', dayStart.toISOString())
        .lte('scheduled_publish_at', dayEnd.toISOString())
        .order('scheduled_publish_at', { ascending: true })

      setArticles((articlesData || []) as ScheduledArticle[])
    } catch (error) {
      console.error('Failed to load schedule data:', error)
    } finally {
      setLoading(false)
    }
  }, [selectedDate])

  useEffect(() => { loadData() }, [loadData])

  const navigateDay = (offset: number) => {
    const newDate = new Date(selectedDate)
    newDate.setDate(newDate.getDate() + offset)
    setSelectedDate(newDate)
  }

  const isToday = selectedDate.toDateString() === new Date().toDateString()

  const handlePublishNow = async (articleId: string) => {
    try {
      const { data: article } = await supabase
        .from('news')
        .select('preset_config, telegram_message_id')
        .eq('id', articleId)
        .single()

      // Check in-flight
      const { count } = await supabase
        .from('news')
        .select('id', { count: 'exact', head: true })
        .in('auto_publish_status', ['pending', 'variant_selection', 'image_generation', 'content_rewrite', 'social_posting'])

      if (count && count > 0) {
        alert(`${count} article(s) already processing. Wait until finished.`)
        return
      }

      await supabase.from('news').update({
        auto_publish_status: 'pending',
        auto_publish_started_at: new Date().toISOString(),
        scheduled_publish_at: null,
      }).eq('id', articleId)

      // Fire auto-publish
      const body: any = { newsId: articleId, telegramMessageId: article?.telegram_message_id }
      if (article?.preset_config) body.preset = article.preset_config

      await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/auto-publish-news`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      })

      loadData()
    } catch (error) {
      console.error('Publish now failed:', error)
    }
  }

  const handleCancel = async (articleId: string) => {
    if (!confirm('Cancel scheduled publishing?')) return
    await supabase.from('news').update({
      auto_publish_status: null,
      scheduled_publish_at: null,
      content_weight: null,
      schedule_window: null,
      preset_config: null,
    }).eq('id', articleId)
    loadData()
  }

  // Timeline: 8:00 to 22:00 = 14 hours
  const timelineStartHour = 7
  const timelineEndHour = 23
  const totalHours = timelineEndHour - timelineStartHour

  const getTimePosition = (dateStr: string): number => {
    const d = new Date(dateStr)
    const totalMin = (d.getHours() - timelineStartHour) * 60 + d.getMinutes()
    return Math.max(0, Math.min(100, (totalMin / (totalHours * 60)) * 100))
  }

  const getWindowPosition = (timeStr: string): number => {
    const [h, m] = timeStr.split(':').map(Number)
    const totalMin = (h - timelineStartHour) * 60 + m
    return Math.max(0, Math.min(100, (totalMin / (totalHours * 60)) * 100))
  }

  const formatDate = (date: Date) => {
    const options: Intl.DateTimeFormatOptions = { weekday: 'short', month: 'short', day: 'numeric' }
    return date.toLocaleDateString('uk-UA', options)
  }

  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr)
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  }

  return (
    <div className="space-y-4">
      {/* Date navigation */}
      <div className="flex items-center justify-between">
        <button onClick={() => navigateDay(-1)} className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors">
          <ChevronLeft className="h-4 w-4 text-gray-300" />
        </button>
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-purple-400" />
          <span className="text-sm font-bold text-white">
            {isToday ? 'Сьогодні' : ''} {formatDate(selectedDate)}
          </span>
          <span className="text-xs text-gray-400">({articles.length} articles)</span>
        </div>
        <div className="flex items-center gap-2">
          {!isToday && (
            <button onClick={() => setSelectedDate(new Date())} className="px-2 py-1 text-xs rounded bg-purple-500/30 text-purple-300 hover:bg-purple-500/50 transition-colors">
              Today
            </button>
          )}
          <button onClick={() => navigateDay(1)} className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors">
            <ChevronRight className="h-4 w-4 text-gray-300" />
          </button>
          <button onClick={loadData} className="p-2 rounded-lg bg-purple-500/20 hover:bg-purple-500/30 transition-colors">
            <RefreshCw className={`h-4 w-4 text-purple-400 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Timeline band */}
      <div className="relative bg-white/5 rounded-lg p-3 border border-white/10">
        {/* Hour markers */}
        <div className="flex justify-between mb-1 px-0.5">
          {Array.from({ length: totalHours + 1 }, (_, i) => timelineStartHour + i).filter((_, i) => i % 2 === 0).map(h => (
            <span key={h} className="text-[10px] text-gray-500" style={{ position: 'absolute', left: `${((h - timelineStartHour) / totalHours) * 100}%`, transform: 'translateX(-50%)' }}>
              {String(h).padStart(2, '0')}
            </span>
          ))}
        </div>

        {/* Timeline bar */}
        <div className="relative h-10 mt-4 bg-gray-800/50 rounded-md overflow-hidden">
          {/* Window bands */}
          {windows.map(win => {
            const left = getWindowPosition(win.start)
            const right = getWindowPosition(win.end)
            const width = right - left
            const colors = WINDOW_COLORS[win.id] || WINDOW_COLORS.fallback
            return (
              <div
                key={win.id}
                className={`absolute top-0 h-full ${colors.bg} border-x ${colors.border}`}
                style={{ left: `${left}%`, width: `${width}%` }}
                title={`${win.label}: ${win.start}-${win.end}`}
              />
            )
          })}

          {/* Article markers */}
          {articles.map(article => {
            if (!article.scheduled_publish_at) return null
            const pos = getTimePosition(article.scheduled_publish_at)
            const statusColor = STATUS_COLORS[article.auto_publish_status] || 'bg-gray-500'
            return (
              <div
                key={article.id}
                className={`absolute top-1 w-2.5 h-2.5 rounded-full ${statusColor} border border-white/30 cursor-pointer`}
                style={{ left: `${pos}%`, transform: 'translateX(-50%)' }}
                title={`${formatTime(article.scheduled_publish_at)} - ${article.original_title?.substring(0, 60)}`}
              />
            )
          })}

          {/* Current time marker */}
          {isToday && (() => {
            const now = new Date()
            const nowMin = (now.getHours() - timelineStartHour) * 60 + now.getMinutes()
            const pos = Math.max(0, Math.min(100, (nowMin / (totalHours * 60)) * 100))
            return (
              <div
                className="absolute top-0 h-full w-0.5 bg-red-500"
                style={{ left: `${pos}%` }}
              />
            )
          })()}
        </div>

        {/* Legend */}
        <div className="flex gap-3 mt-2 text-[10px] text-gray-400">
          {windows.map(win => {
            const colors = WINDOW_COLORS[win.id] || WINDOW_COLORS.fallback
            return (
              <span key={win.id} className="flex items-center gap-1">
                <span className={`w-2 h-2 rounded ${colors.bg} ${colors.border} border`} />
                {win.label} ({win.start}-{win.end})
              </span>
            )
          })}
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-blue-500" /> scheduled
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-yellow-500" /> processing
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-green-500" /> done
          </span>
        </div>
      </div>

      {/* Article list */}
      <div className="space-y-1.5 max-h-[400px] overflow-y-auto pr-1">
        {loading ? (
          <div className="text-center py-6 text-gray-400">
            <RefreshCw className="h-5 w-5 mx-auto animate-spin mb-2" />
            <p className="text-xs">Loading...</p>
          </div>
        ) : articles.length === 0 ? (
          <div className="text-center py-6 text-gray-400">
            <Clock className="h-6 w-6 mx-auto mb-2 opacity-50" />
            <p className="text-xs">No scheduled articles for this day</p>
          </div>
        ) : (
          articles.map(article => {
            const winColors = WINDOW_COLORS[article.schedule_window || ''] || WINDOW_COLORS.fallback
            const isActive = ['pending', 'variant_selection', 'image_generation', 'content_rewrite', 'social_posting'].includes(article.auto_publish_status)
            const isScheduled = article.auto_publish_status === 'scheduled'
            const isFailed = article.auto_publish_status === 'failed'
            const isDone = article.auto_publish_status === 'completed'

            return (
              <motion.div
                key={article.id}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex items-center gap-3 p-2.5 rounded-lg border transition-all ${
                  isActive ? 'bg-yellow-500/10 border-yellow-500/30' :
                  isFailed ? 'bg-red-500/10 border-red-500/30' :
                  isDone ? 'bg-green-500/10 border-green-500/30' :
                  'bg-white/5 border-white/10 hover:bg-white/10'
                }`}
              >
                {/* Time */}
                <div className="flex-shrink-0 w-12 text-center">
                  <span className="text-sm font-mono font-bold text-white">
                    {article.scheduled_publish_at ? formatTime(article.scheduled_publish_at) : '--:--'}
                  </span>
                </div>

                {/* Status dot */}
                <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${STATUS_COLORS[article.auto_publish_status] || 'bg-gray-500'}`} />

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-white truncate">{article.original_title || 'Untitled'}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className={`text-[10px] px-1.5 py-0.5 rounded ${winColors.bg} ${winColors.text}`}>
                      {article.schedule_window || '?'}
                    </span>
                    {article.content_weight && (
                      <span className={`text-[10px] px-1.5 py-0.5 rounded ${article.content_weight === 'heavy' ? 'bg-orange-500/20 text-orange-400' : 'bg-gray-500/20 text-gray-400'}`}>
                        {article.content_weight}
                      </span>
                    )}
                    {article.source_type && (
                      <span className="text-[10px] text-gray-500">{article.source_type === 'rss' ? 'RSS' : 'TG'}</span>
                    )}
                    {isFailed && article.auto_publish_error && (
                      <span className="text-[10px] text-red-400 truncate max-w-[150px]">{article.auto_publish_error}</span>
                    )}
                  </div>
                </div>

                {/* Actions */}
                {isScheduled && (
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      onClick={() => handlePublishNow(article.id)}
                      className="p-1.5 rounded bg-green-500/20 hover:bg-green-500/30 transition-colors"
                      title="Publish now"
                    >
                      <Zap className="h-3.5 w-3.5 text-green-400" />
                    </button>
                    <button
                      onClick={() => handleCancel(article.id)}
                      className="p-1.5 rounded bg-red-500/20 hover:bg-red-500/30 transition-colors"
                      title="Cancel"
                    >
                      <X className="h-3.5 w-3.5 text-red-400" />
                    </button>
                  </div>
                )}
                {isActive && (
                  <span className="text-[10px] text-yellow-400 animate-pulse flex-shrink-0">Processing...</span>
                )}
              </motion.div>
            )
          })
        )}
      </div>
    </div>
  )
}
