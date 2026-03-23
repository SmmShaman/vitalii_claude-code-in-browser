'use client'

import { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import { Search, Brain, Video, Bot, Palette, Server, Layers } from 'lucide-react'
import { allFeatures, categories, getCategoryInfo, getProjectInfo } from '@/data/features'
import type { FeatureCategory, ProjectId } from '@/data/features'

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  Brain, Video, Bot, Palette, Server, Layers,
}

export const FeaturesManager = () => {
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<FeatureCategory | 'all'>('all')
  const [projectFilter, setProjectFilter] = useState<ProjectId | 'all'>('all')

  const filtered = useMemo(() => {
    return allFeatures.filter((f) => {
      if (categoryFilter !== 'all' && f.category !== categoryFilter) return false
      if (projectFilter !== 'all' && f.projectId !== projectFilter) return false
      if (search) {
        const q = search.toLowerCase()
        return (
          f.title.en.toLowerCase().includes(q) ||
          f.title.ua.toLowerCase().includes(q) ||
          f.techStack.some((t) => t.toLowerCase().includes(q))
        )
      }
      return true
    })
  }, [search, categoryFilter, projectFilter])

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-white">Features ({allFeatures.length})</h2>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search features..."
            className="w-full pl-9 pr-3 py-2 bg-white/10 rounded-lg text-white text-sm border border-white/20 focus:border-white/40 outline-none"
          />
        </div>

        {/* Category filter */}
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value as FeatureCategory | 'all')}
          className="px-3 py-2 bg-white/10 rounded-lg text-white text-sm border border-white/20"
        >
          <option value="all">All Categories</option>
          {categories.map((cat) => (
            <option key={cat.id} value={cat.id}>{cat.label.en}</option>
          ))}
        </select>

        {/* Project filter */}
        <select
          value={projectFilter}
          onChange={(e) => setProjectFilter(e.target.value as ProjectId | 'all')}
          className="px-3 py-2 bg-white/10 rounded-lg text-white text-sm border border-white/20"
        >
          <option value="all">All Projects</option>
          <option value="portfolio">Portfolio</option>
          <option value="jobbot">JobBot</option>
        </select>
      </div>

      {/* Category summary */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
        {categories.map((cat) => {
          const count = allFeatures.filter((f) => f.category === cat.id).length
          const Icon = iconMap[cat.icon]
          return (
            <button
              key={cat.id}
              onClick={() => setCategoryFilter(categoryFilter === cat.id ? 'all' : cat.id)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                categoryFilter === cat.id
                  ? `${cat.color.bg} ${cat.color.text} border border-current/30`
                  : 'bg-white/5 text-white/60 hover:bg-white/10 border border-transparent'
              }`}
            >
              {Icon && <Icon className="w-3.5 h-3.5" />}
              <span>{cat.label.en}</span>
              <span className="text-white/30">({count})</span>
            </button>
          )
        })}
      </div>

      {/* Features list */}
      <div className="space-y-2 max-h-[60vh] overflow-y-auto">
        {filtered.map((feature) => {
          const catInfo = getCategoryInfo(feature.category)
          const project = getProjectInfo(feature.projectId)
          return (
            <motion.div
              key={feature.id}
              layout
              className="flex items-start gap-3 p-3 bg-white/5 rounded-lg border border-white/10"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] text-white/30 font-mono">{feature.id.toUpperCase()}</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                    feature.projectId === 'portfolio'
                      ? 'bg-emerald-500/20 text-emerald-400'
                      : 'bg-amber-500/20 text-amber-400'
                  }`}>
                    {project.name.en}
                  </span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded ${catInfo.color.bg} ${catInfo.color.text}`}>
                    {catInfo.label.en}
                  </span>
                </div>
                <h4 className="text-sm font-medium text-white">{feature.title.en}</h4>
                <p className="text-xs text-white/40 mt-0.5 line-clamp-1">{feature.shortDescription.en}</p>
                <div className="flex gap-1 mt-1.5">
                  {feature.techStack.slice(0, 4).map((tech) => (
                    <span key={tech} className="text-[9px] px-1.5 py-0.5 rounded bg-white/5 text-white/40">
                      {tech}
                    </span>
                  ))}
                </div>
              </div>
            </motion.div>
          )
        })}

        {filtered.length === 0 && (
          <div className="text-center py-8 text-white/40 text-sm">
            No features match your filters
          </div>
        )}
      </div>
    </div>
  )
}
