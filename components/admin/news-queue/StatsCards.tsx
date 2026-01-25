'use client'

import { NewsStats } from './types'

interface StatsCardsProps {
  stats: NewsStats
}

export function StatsCards({ stats }: StatsCardsProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
      <div className="bg-white/10 rounded-lg p-3 text-center">
        <div className="text-2xl font-bold text-white">{stats.total}</div>
        <div className="text-xs text-gray-400">Всього</div>
      </div>
      <div className="bg-yellow-500/20 rounded-lg p-3 text-center border border-yellow-500/30">
        <div className="text-2xl font-bold text-yellow-400">{stats.pendingAI}</div>
        <div className="text-xs text-yellow-300">AI Pending</div>
      </div>
      <div className="bg-red-500/20 rounded-lg p-3 text-center border border-red-500/30">
        <div className="text-2xl font-bold text-red-400">{stats.rejectedAI}</div>
        <div className="text-xs text-red-300">AI Rejected</div>
      </div>
      <div className="bg-blue-500/20 rounded-lg p-3 text-center border border-blue-500/30">
        <div className="text-2xl font-bold text-blue-400">{stats.waitingApproval}</div>
        <div className="text-xs text-blue-300">В Telegram</div>
      </div>
      <div className="bg-green-500/20 rounded-lg p-3 text-center border border-green-500/30">
        <div className="text-2xl font-bold text-green-400">{stats.published}</div>
        <div className="text-xs text-green-300">Опубліковано</div>
      </div>
      <div className="bg-cyan-500/20 rounded-lg p-3 text-center border border-cyan-500/30">
        <div className="text-2xl font-bold text-cyan-400">{stats.linkedin}</div>
        <div className="text-xs text-cyan-300">LinkedIn</div>
      </div>
      <div className="bg-purple-500/20 rounded-lg p-3 text-center border border-purple-500/30">
        <div className="text-2xl font-bold text-purple-400">{stats.blog}</div>
        <div className="text-xs text-purple-300">Блог</div>
      </div>
    </div>
  )
}
