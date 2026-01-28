export interface RSSSource {
  id: string
  name: string
  url: string | null
  rssUrl: string
  tier: 1 | 2 | 3 | 4
  isActive: boolean
  isDefault: boolean
  createdAt: string
  updatedAt: string
}

export interface RSSArticle {
  id: string
  title: string
  description: string
  url: string
  pubDate: string
  imageUrl: string | null
  sourceName?: string
}

export interface TierConfig {
  id: 1 | 2 | 3 | 4
  name: string
  description: string
  color: string
  bgColor: string
  borderColor: string
}

export interface ViewerSettings {
  refreshInterval: number
  articlesPerSource: number
  autoRefresh: boolean
  autoAnalyze: boolean
  expandedSources: string[]
}

export interface SourceState {
  loading: boolean
  error: string | null
  articles: RSSArticle[]
  lastFetched: Date | null
}

export interface FetchRSSResponse {
  articles: RSSArticle[]
  cached: boolean
  total: number
  error?: string
}

// Database types (snake_case to match Supabase)
export interface DBNewsMonitorSource {
  id: string
  name: string
  url: string | null
  rss_url: string
  tier: number
  is_active: boolean
  is_default: boolean
  created_at: string
  updated_at: string
}

export interface DBNewsMonitorSettings {
  id: string
  user_id: string
  refresh_interval: number
  articles_per_source: number
  auto_refresh: boolean
  auto_analyze: boolean
  expanded_sources: string[]
  created_at: string
  updated_at: string
}
