'use client'

import { useState, useMemo, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import { Search, Brain, Video, Bot, Palette, Server, Layers, Check, X, RefreshCw, Globe } from 'lucide-react'
import { categories, getCategoryInfo } from '@/data/features'
import type { FeatureCategory, ProjectId } from '@/data/features'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  Brain, Video, Bot, Palette, Server, Layers,
}

interface DbFeature {
  id: string
  feature_id: string
  project_id: string
  category: string
  title_en: string
  title_no: string
  title_ua: string
  short_description_en: string
  tech_stack: string[]
  hashtags: string[]
  source_commits: string[] | null
  status: 'pending' | 'published' | 'rejected'
  discovered_at: string | null
  published_at: string | null
  created_at: string
  feature_projects?: { repo_url: string | null } | null
}

const statusColors: Record<string, string> = {
  published: 'bg-white/10 text-white',
  pending: 'bg-white/20 text-white font-bold',
  rejected: 'bg-white/5 text-white/40 line-through',
}

export const FeaturesManager = () => {
  const [features, setFeatures] = useState<DbFeature[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<FeatureCategory | 'all'>('all')
  const [projectFilter, setProjectFilter] = useState<ProjectId | 'all'>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [updating, setUpdating] = useState<string | null>(null)

  const supabase = useMemo(() => createClient(supabaseUrl, supabaseAnonKey), [])

  const loadFeatures = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('features')
      .select('*, feature_projects(repo_url)')
      .order('project_id', { ascending: false })
      .order('feature_id', { ascending: true })

    if (!error && data) setFeatures(data)
    setLoading(false)
  }, [supabase])

  useEffect(() => { loadFeatures() }, [loadFeatures])

  const updateStatus = async (id: string, status: 'published' | 'rejected') => {
    setUpdating(id)
    await supabase.from('features').update({
      status,
      published_at: status === 'published' ? new Date().toISOString() : null,
    }).eq('id', id)
    await loadFeatures()
    setUpdating(null)
  }

  const filtered = useMemo(() => {
    return features.filter((f) => {
      if (categoryFilter !== 'all' && f.category !== categoryFilter) return false
      if (projectFilter !== 'all' && f.project_id !== projectFilter) return false
      if (statusFilter !== 'all' && f.status !== statusFilter) return false
      if (search) {
        const q = search.toLowerCase()
        return f.title_en.toLowerCase().includes(q) || f.tech_stack.some(t => t.toLowerCase().includes(q))
      }
      return true
    })
  }, [features, search, categoryFilter, projectFilter, statusFilter])

  const counts = useMemo(() => ({
    total: features.length,
    published: features.filter(f => f.status === 'published').length,
    pending: features.filter(f => f.status === 'pending').length,
    rejected: features.filter(f => f.status === 'rejected').length,
  }), [features])

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-white">
          Features ({counts.total})
          <span className="text-sm font-normal text-white/40 ml-2">
            {counts.published} published · {counts.pending} pending · {counts.rejected} rejected
          </span>
        </h2>
        <button onClick={loadFeatures} className="p-2 hover:bg-white/10 rounded-lg transition-colors" title="Refresh">
          <RefreshCw className={`w-4 h-4 text-white/60 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search features..."
            className="w-full pl-9 pr-3 py-2 bg-black rounded-lg text-white text-sm border border-white/20 focus:border-white/50 outline-none"
          />
        </div>

        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 bg-black rounded-lg text-white text-sm border border-white/20">
          <option value="all">All Status</option>
          <option value="published">Published</option>
          <option value="pending">Pending</option>
          <option value="rejected">Rejected</option>
        </select>

        <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value as FeatureCategory | 'all')}
          className="px-3 py-2 bg-black rounded-lg text-white text-sm border border-white/20">
          <option value="all">All Categories</option>
          {categories.map((cat) => (
            <option key={cat.id} value={cat.id}>{cat.label.en}</option>
          ))}
        </select>

        <select value={projectFilter} onChange={(e) => setProjectFilter(e.target.value as ProjectId | 'all')}
          className="px-3 py-2 bg-black rounded-lg text-white text-sm border border-white/20">
          <option value="all">All Projects</option>
          <option value="portfolio">Portfolio</option>
          <option value="jobbot">JobBot</option>
        </select>
      </div>

      {/* Category summary */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
        {categories.map((cat) => {
          const count = features.filter((f) => f.category === cat.id && f.status === 'published').length
          const pendingCount = features.filter((f) => f.category === cat.id && f.status === 'pending').length
          const Icon = iconMap[cat.icon]
          return (
            <button
              key={cat.id}
              onClick={() => setCategoryFilter(categoryFilter === cat.id ? 'all' : cat.id)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                categoryFilter === cat.id
                  ? 'bg-white text-black border border-white'
                  : 'bg-white/5 text-white/60 hover:bg-white/10 border border-white/10'
              }`}
            >
              {Icon && <Icon className="w-3.5 h-3.5" />}
              <span>{cat.label.en}</span>
              <span className="text-white/30">({count}{pendingCount > 0 ? `+${pendingCount}` : ''})</span>
            </button>
          )
        })}
      </div>

      {/* Features list */}
      <div className="space-y-2 max-h-[60vh] overflow-y-auto">
        {filtered.map((feature) => {
          const catInfo = getCategoryInfo(feature.category as FeatureCategory)
          return (
            <motion.div
              key={feature.id}
              layout
              className={`flex items-start gap-3 p-3 rounded-lg border ${
                feature.status === 'pending'
                  ? 'bg-white/5 border-white/30'
                  : feature.status === 'rejected'
                    ? 'bg-black border-white/5 opacity-50'
                    : 'bg-black border-white/10'
              }`}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className="text-[10px] text-white/50 font-mono font-bold">{feature.feature_id.toUpperCase()}</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded border border-white/20 ${statusColors[feature.status]}`}>
                    {feature.status}
                  </span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/10 text-white/70">
                    {feature.project_id}
                  </span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/5 text-white/50">
                    {catInfo.label.en}
                  </span>
                </div>
                <h4 className="text-sm font-medium text-white">{feature.title_en}</h4>
                <p className="text-xs text-white/40 mt-0.5 line-clamp-1">{feature.short_description_en}</p>
                {/* Meta: date, commits with links */}
                <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1.5 text-[10px] text-white/30">
                  <span>📅 {new Date(feature.created_at).toLocaleDateString('no-NO')} {new Date(feature.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  {feature.discovered_at && <span className="text-white/50">🤖 AI discovered</span>}
                  {feature.source_commits?.length ? (
                    feature.source_commits.slice(0, 3).map(hash => {
                      const repoUrl = feature.feature_projects?.repo_url
                      const shortHash = hash.slice(0, 7)
                      return repoUrl ? (
                        <a key={hash} href={`${repoUrl}/commit/${hash}`} target="_blank" rel="noopener noreferrer"
                          className="font-mono text-white/50 hover:text-white underline decoration-white/20 hover:decoration-white/60 transition-colors"
                          title={`Commit ${hash}`}
                        >⌗ {shortHash}</a>
                      ) : (
                        <span key={hash} className="font-mono text-white/40">⌗ {shortHash}</span>
                      )
                    })
                  ) : null}
                </div>
                <div className="flex gap-1 mt-1.5 flex-wrap">
                  {feature.tech_stack.slice(0, 5).map((tech) => (
                    <span key={tech} className="text-[9px] px-1.5 py-0.5 rounded bg-white/5 text-white/40 border border-white/10">
                      {tech}
                    </span>
                  ))}
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex flex-col gap-1 flex-shrink-0">
                {feature.status === 'pending' && (
                  <>
                    <button
                      onClick={() => updateStatus(feature.id, 'published')}
                      disabled={updating === feature.id}
                      className="flex items-center gap-1 px-2 py-1 bg-white text-black hover:bg-white/80 rounded text-xs transition-colors font-medium"
                      title="Approve & Publish"
                    >
                      <Check className="w-3 h-3" /> Approve
                    </button>
                    <button
                      onClick={() => updateStatus(feature.id, 'rejected')}
                      disabled={updating === feature.id}
                      className="flex items-center gap-1 px-2 py-1 bg-white/10 hover:bg-white/20 text-white/60 rounded text-xs transition-colors"
                      title="Reject"
                    >
                      <X className="w-3 h-3" /> Reject
                    </button>
                  </>
                )}
                {feature.status === 'rejected' && (
                  <button
                    onClick={() => updateStatus(feature.id, 'published')}
                    disabled={updating === feature.id}
                    className="flex items-center gap-1 px-2 py-1 bg-white/10 hover:bg-white/20 text-white/60 rounded text-xs transition-colors"
                  >
                    <Check className="w-3 h-3" /> Restore
                  </button>
                )}
                {feature.status === 'published' && (
                  <span className="flex items-center gap-1 px-2 py-1 text-white/20 text-xs">
                    <Globe className="w-3 h-3" /> Live
                  </span>
                )}
              </div>
            </motion.div>
          )
        })}

        {filtered.length === 0 && (
          <div className="text-center py-8 text-white/40 text-sm">
            {loading ? 'Loading...' : 'No features match your filters'}
          </div>
        )}
      </div>
    </div>
  )
}
