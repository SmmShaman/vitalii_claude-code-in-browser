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
  source_type: 'telegram' | 'rss' | null
  rss_source_url: string | null
  news_sources?: {
    name: string
    channel_username: string
  } | null
  blog_posts?: {
    id: string
    slug_en: string
  }[]
  social_media_posts?: {
    platform: string
    status: string
  }[]
}

export interface NewsStats {
  // Sources
  total: number
  telegram: number
  rss: number

  // Pipeline
  pendingAI: number
  waiting48h: number     // Approved, not published, < 48 hours
  inTelegramBot: number  // Approved, not published (all)
  rejected: number

  // Published
  publishedNews: number
  publishedBlog: number

  // Social Media
  linkedin: number
  facebook: number
  instagram: number
}

export type TimeFilter = 'today' | 'week' | 'month' | 'all'

export const TIME_FILTERS: { value: TimeFilter; label: string }[] = [
  { value: 'today', label: 'Сьогодні' },
  { value: 'week', label: 'Тиждень' },
  { value: 'month', label: 'Місяць' },
  { value: 'all', label: 'Весь час' },
]

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

export type StatusFilter =
  | 'all'                // Всього
  | 'telegram'           // 📱 Telegram
  | 'rss'                // 📡 RSS
  | 'pending_ai'         // ⏳ AI Pending
  | 'waiting_48h'        // 🕐 Очікує 48г
  | 'waiting_approval'   // 🤖 В боті
  | 'rejected_ai'        // ❌ Відхилено
  | 'published_news'     // 📰 Новини
  | 'published_blog'     // 📝 Блог
  | 'published_linkedin' // 🔗 LinkedIn
  | 'published_facebook' // 📘 Facebook
  | 'published_instagram' // 📸 Instagram

export const INITIAL_STATS: NewsStats = {
  // Sources
  total: 0,
  telegram: 0,
  rss: 0,

  // Pipeline
  pendingAI: 0,
  waiting48h: 0,
  inTelegramBot: 0,
  rejected: 0,

  // Published
  publishedNews: 0,
  publishedBlog: 0,

  // Social Media
  linkedin: 0,
  facebook: 0,
  instagram: 0,
}
