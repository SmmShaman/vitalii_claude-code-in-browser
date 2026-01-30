'use client'

import { NewsStats } from './types'

interface StatsCardsProps {
  stats: NewsStats
}

export function StatsCards({ stats }: StatsCardsProps) {
  return (
    <div className="grid grid-cols-7 gap-1.5">
      <div className="bg-white/10 rounded-md px-2 py-1.5 text-center">
        <div className="text-sm font-bold text-white">{stats.total}</div>
        <div className="text-[10px] text-gray-400">Всього</div>
      </div>
      <div className="bg-yellow-500/20 rounded-md px-2 py-1.5 text-center border border-yellow-500/30">
        <div className="text-sm font-bold text-yellow-400">{stats.pendingAI}</div>
        <div className="text-[10px] text-yellow-300">Pending</div>
      </div>
      <div className="bg-red-500/20 rounded-md px-2 py-1.5 text-center border border-red-500/30">
        <div className="text-sm font-bold text-red-400">{stats.rejectedAI}</div>
        <div className="text-[10px] text-red-300">Rejected</div>
      </div>
      <div className="bg-blue-500/20 rounded-md px-2 py-1.5 text-center border border-blue-500/30">
        <div className="text-sm font-bold text-blue-400">{stats.waitingApproval}</div>
        <div className="text-[10px] text-blue-300">Telegram</div>
      </div>
      <div className="bg-green-500/20 rounded-md px-2 py-1.5 text-center border border-green-500/30">
        <div className="text-sm font-bold text-green-400">{stats.published}</div>
        <div className="text-[10px] text-green-300">Published</div>
      </div>
      <div className="bg-cyan-500/20 rounded-md px-2 py-1.5 text-center border border-cyan-500/30">
        <div className="text-sm font-bold text-cyan-400">{stats.linkedin}</div>
        <div className="text-[10px] text-cyan-300">LinkedIn</div>
      </div>
      <div className="bg-purple-500/20 rounded-md px-2 py-1.5 text-center border border-purple-500/30">
        <div className="text-sm font-bold text-purple-400">{stats.blog}</div>
        <div className="text-[10px] text-purple-300">Blog</div>
      </div>
    </div>
  )
}
