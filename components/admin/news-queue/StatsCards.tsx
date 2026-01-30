'use client'

import { NewsStats, TimeFilter, TIME_FILTERS, StatusFilter } from './types'

interface StatsCardsProps {
  stats: NewsStats
  timeFilter: TimeFilter
  onTimeFilterChange: (filter: TimeFilter) => void
  activeFilter: StatusFilter
  onFilterChange: (filter: StatusFilter) => void
}

interface StatItemProps {
  value: number
  label: string
  emoji?: string
  filterKey: StatusFilter
  isActive: boolean
  onClick: (filter: StatusFilter) => void
}

function StatItem({ value, label, emoji, filterKey, isActive, onClick }: StatItemProps) {
  return (
    <button
      onClick={() => onClick(filterKey)}
      className={`w-full flex items-center justify-between py-0.5 px-1 rounded transition-colors cursor-pointer ${
        isActive
          ? 'bg-white/20 text-white'
          : 'hover:bg-white/10'
      }`}
    >
      <span className="text-[10px] text-gray-400">{emoji && `${emoji} `}{label}</span>
      <span className="text-xs font-semibold text-white">{value}</span>
    </button>
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

export function StatsCards({ stats, timeFilter, onTimeFilterChange, activeFilter, onFilterChange }: StatsCardsProps) {
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
          <StatItem value={stats.total} label="Всього" filterKey="all" isActive={activeFilter === 'all'} onClick={onFilterChange} />
          <StatItem value={stats.telegram} label="Telegram" emoji="📱" filterKey="telegram" isActive={activeFilter === 'telegram'} onClick={onFilterChange} />
          <StatItem value={stats.rss} label="RSS" emoji="📡" filterKey="rss" isActive={activeFilter === 'rss'} onClick={onFilterChange} />
        </StatSection>

        {/* Pipeline Section */}
        <StatSection title="Обробка" color="border-yellow-600/30">
          <StatItem value={stats.pendingAI} label="AI Pending" emoji="⏳" filterKey="pending_ai" isActive={activeFilter === 'pending_ai'} onClick={onFilterChange} />
          <StatItem value={stats.waiting48h} label="Очікує 48г" emoji="🕐" filterKey="waiting_48h" isActive={activeFilter === 'waiting_48h'} onClick={onFilterChange} />
          <StatItem value={stats.inTelegramBot} label="В боті" emoji="🤖" filterKey="waiting_approval" isActive={activeFilter === 'waiting_approval'} onClick={onFilterChange} />
          <StatItem value={stats.rejected} label="Відхилено" emoji="❌" filterKey="rejected_ai" isActive={activeFilter === 'rejected_ai'} onClick={onFilterChange} />
        </StatSection>

        {/* Published Section */}
        <StatSection title="Опубліковано" color="border-green-600/30">
          <StatItem value={stats.publishedNews} label="Новини" emoji="📰" filterKey="published_news" isActive={activeFilter === 'published_news'} onClick={onFilterChange} />
          <StatItem value={stats.publishedBlog} label="Блог" emoji="📝" filterKey="published_blog" isActive={activeFilter === 'published_blog'} onClick={onFilterChange} />
        </StatSection>

        {/* Social Media Section */}
        <StatSection title="Соцмережі" color="border-cyan-600/30">
          <StatItem value={stats.linkedin} label="LinkedIn" emoji="🔗" filterKey="published_linkedin" isActive={activeFilter === 'published_linkedin'} onClick={onFilterChange} />
          <StatItem value={stats.facebook} label="Facebook" emoji="📘" filterKey="published_facebook" isActive={activeFilter === 'published_facebook'} onClick={onFilterChange} />
          <StatItem value={stats.instagram} label="Instagram" emoji="📸" filterKey="published_instagram" isActive={activeFilter === 'published_instagram'} onClick={onFilterChange} />
        </StatSection>
      </div>
    </div>
  )
}
