'use client'

import { NewsStats, TimeFilter, TIME_FILTERS } from './types'

interface StatsCardsProps {
  stats: NewsStats
  timeFilter: TimeFilter
  onTimeFilterChange: (filter: TimeFilter) => void
}

interface StatItemProps {
  value: number
  label: string
  emoji?: string
}

function StatItem({ value, label, emoji }: StatItemProps) {
  return (
    <div className="flex items-center justify-between py-0.5">
      <span className="text-[10px] text-gray-400">{emoji && `${emoji} `}{label}</span>
      <span className="text-xs font-semibold text-white">{value}</span>
    </div>
  )
}

interface StatSectionProps {
  title: string
  children: React.ReactNode
  color: string
}

function StatSection({ title, children, color }: StatSectionProps) {
  return (
    <div className={`bg-white/5 rounded-lg p-2 border ${color}`}>
      <div className="text-[10px] font-medium text-gray-300 mb-1 uppercase tracking-wide">{title}</div>
      <div className="space-y-0.5">{children}</div>
    </div>
  )
}

export function StatsCards({ stats, timeFilter, onTimeFilterChange }: StatsCardsProps) {
  return (
    <div className="space-y-2">
      {/* Time Filter */}
      <div className="flex items-center gap-1">
        {TIME_FILTERS.map((filter) => (
          <button
            key={filter.value}
            onClick={() => onTimeFilterChange(filter.value)}
            className={`px-2 py-0.5 text-[10px] rounded transition-colors ${
              timeFilter === filter.value
                ? 'bg-white/20 text-white font-medium'
                : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-gray-300'
            }`}
          >
            {filter.label}
          </button>
        ))}
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-4 gap-2">
        {/* Sources Section */}
        <StatSection title="Джерела" color="border-gray-600/50">
          <StatItem value={stats.total} label="Всього" />
          <StatItem value={stats.telegram} label="Telegram" emoji="📱" />
          <StatItem value={stats.rss} label="RSS" emoji="📡" />
        </StatSection>

        {/* Pipeline Section */}
        <StatSection title="Обробка" color="border-yellow-600/30">
          <StatItem value={stats.pendingAI} label="AI Pending" emoji="⏳" />
          <StatItem value={stats.waiting48h} label="Очікує 48г" emoji="🕐" />
          <StatItem value={stats.inTelegramBot} label="В боті" emoji="🤖" />
          <StatItem value={stats.rejected} label="Відхилено" emoji="❌" />
        </StatSection>

        {/* Published Section */}
        <StatSection title="Опубліковано" color="border-green-600/30">
          <StatItem value={stats.publishedNews} label="Новини" emoji="📰" />
          <StatItem value={stats.publishedBlog} label="Блог" emoji="📝" />
        </StatSection>

        {/* Social Media Section */}
        <StatSection title="Соцмережі" color="border-cyan-600/30">
          <StatItem value={stats.linkedin} label="LinkedIn" emoji="🔗" />
          <StatItem value={stats.facebook} label="Facebook" emoji="📘" />
          <StatItem value={stats.instagram} label="Instagram" emoji="📸" />
        </StatSection>
      </div>
    </div>
  )
}
