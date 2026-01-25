import { LucideIcon } from 'lucide-react'

export interface NewsItem {
  id: string
  original_title: string
  original_content: string
  title_en: string | null
  description_en: string | null
  slug_en: string | null
  image_url: string | null
  images: string[] | null
  video_url: string | null
  video_type: string | null
  original_url: string | null
  source_link: string | null
  created_at: string
  is_published: boolean
  is_rewritten: boolean
  published_at: string | null
  pre_moderation_status: 'pending' | 'approved' | 'rejected' | null
  rejection_reason: string | null
  moderation_checked_at: string | null
  linkedin_post_id: string | null
  linkedin_posted_at: string | null
  linkedin_language: string | null
  source_id: string | null
  news_sources?: {
    name: string
    channel_username: string
  } | null
  blog_posts?: {
    id: string
    slug_en: string
  }[]
}

export interface NewsStats {
  total: number
  pendingAI: number
  rejectedAI: number
  waitingApproval: number
  published: number
  linkedin: number
  blog: number
}

export interface StatusBadge {
  label: string
  color: string
}

export interface TimelineEvent {
  label: string
  time: string | null
  icon: LucideIcon
  color: string
  details?: string
}

export type StatusFilter = 'all' | 'pending_ai' | 'rejected_ai' | 'waiting_approval' | 'published_news' | 'published_linkedin' | 'published_blog'

export const STATUS_FILTERS: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: '🔄 Всі' },
  { value: 'pending_ai', label: '⏳ Очікує AI' },
  { value: 'rejected_ai', label: '❌ AI відхилено' },
  { value: 'waiting_approval', label: '🤖 В Telegram боті' },
  { value: 'published_news', label: '📰 Опубліковано' },
  { value: 'published_linkedin', label: '🔗 LinkedIn' },
  { value: 'published_blog', label: '📝 Блог' },
]

export const INITIAL_STATS: NewsStats = {
  total: 0,
  pendingAI: 0,
  rejectedAI: 0,
  waitingApproval: 0,
  published: 0,
  linkedin: 0,
  blog: 0
}
