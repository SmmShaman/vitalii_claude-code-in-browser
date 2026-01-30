import { Send, Bot, Clock, CheckCircle, Linkedin, BookOpen, Rss } from 'lucide-react'
import { NewsItem, StatusBadge, TimelineEvent, StatusFilter } from './types'

export function getStatusBadges(item: NewsItem): StatusBadge[] {
  const badges: StatusBadge[] = []

  // Source type badge (first)
  if (item.source_type === 'rss') {
    badges.push({ label: '📡 RSS', color: 'bg-orange-500/20 text-orange-400 border-orange-500/30' })
  } else {
    badges.push({ label: '📱 Telegram', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' })
  }

  if (item.pre_moderation_status === 'pending') {
    badges.push({ label: '⏳ AI Pending', color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50' })
  } else if (item.pre_moderation_status === 'rejected') {
    badges.push({ label: '❌ AI Rejected', color: 'bg-red-500/20 text-red-400 border-red-500/50' })
  } else if (item.pre_moderation_status === 'approved' && !item.is_published) {
    badges.push({ label: '🤖 In Telegram', color: 'bg-blue-500/20 text-blue-400 border-blue-500/50' })
  }

  if (item.is_published) {
    badges.push({ label: '📰 Published', color: 'bg-green-500/20 text-green-400 border-green-500/50' })
  }

  // LinkedIn badge - check both direct field and social_media_posts
  if (item.linkedin_post_id || item.social_media_posts?.some(p => p.platform === 'linkedin' && p.status === 'posted')) {
    badges.push({ label: `🔗 LinkedIn ${item.linkedin_language?.toUpperCase() || ''}`, color: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/50' })
  }

  // Facebook badge
  if (item.social_media_posts?.some(p => p.platform === 'facebook' && p.status === 'posted')) {
    badges.push({ label: '📘 Facebook', color: 'bg-blue-600/20 text-blue-400 border-blue-600/50' })
  }

  // Instagram badge
  if (item.social_media_posts?.some(p => p.platform === 'instagram' && p.status === 'posted')) {
    badges.push({ label: '📸 Instagram', color: 'bg-pink-500/20 text-pink-400 border-pink-500/50' })
  }

  if (item.blog_posts && item.blog_posts.length > 0) {
    badges.push({ label: '📝 Blog', color: 'bg-purple-500/20 text-purple-400 border-purple-500/50' })
  }

  return badges
}

export function getTimelineEvents(item: NewsItem): TimelineEvent[] {
  const events: TimelineEvent[] = []

  // Scraped - different label for RSS vs Telegram
  if (item.source_type === 'rss') {
    events.push({
      label: 'Отримано з RSS',
      time: item.created_at,
      icon: Rss,
      color: 'text-orange-400',
      details: item.news_sources?.channel_username || item.rss_source_url || 'RSS джерело'
    })
  } else {
    events.push({
      label: 'Скраплено з Telegram',
      time: item.created_at,
      icon: Send,
      color: 'text-gray-400',
      details: item.news_sources?.channel_username ? `@${item.news_sources.channel_username}` : 'Unknown source'
    })
  }

  // AI Pre-moderation
  if (item.moderation_checked_at) {
    events.push({
      label: item.pre_moderation_status === 'approved' ? 'AI: Схвалено' : 'AI: Відхилено',
      time: item.moderation_checked_at,
      icon: Bot,
      color: item.pre_moderation_status === 'approved' ? 'text-green-400' : 'text-red-400',
      details: item.rejection_reason || undefined
    })
  } else if (item.pre_moderation_status === 'pending') {
    events.push({
      label: 'Очікує AI перевірки',
      time: null,
      icon: Clock,
      color: 'text-yellow-400',
      details: undefined
    })
  }

  // Sent to Telegram bot (approved but not published)
  if (item.pre_moderation_status === 'approved' && !item.is_published) {
    events.push({
      label: 'Відправлено в Telegram бот',
      time: item.moderation_checked_at,
      icon: Bot,
      color: 'text-blue-400',
      details: 'Очікує схвалення модератором'
    })
  }

  // Published to News
  if (item.is_published && item.published_at) {
    events.push({
      label: 'Опубліковано в новини',
      time: item.published_at,
      icon: CheckCircle,
      color: 'text-green-400',
      details: item.title_en?.substring(0, 50) + '...'
    })
  }

  // Published to LinkedIn
  if (item.linkedin_posted_at) {
    events.push({
      label: `Опубліковано в LinkedIn (${item.linkedin_language?.toUpperCase()})`,
      time: item.linkedin_posted_at,
      icon: Linkedin,
      color: 'text-cyan-400',
      details: item.linkedin_post_id || undefined
    })
  }

  // Published to Blog
  if (item.blog_posts && item.blog_posts.length > 0) {
    events.push({
      label: 'Створено блог-пост',
      time: item.published_at,
      icon: BookOpen,
      color: 'text-purple-400',
      details: `/blog/${item.blog_posts[0].slug_en}`
    })
  }

  return events
}

export function filterNews(items: NewsItem[], statusFilter: StatusFilter): NewsItem[] {
  const fortyEightHoursAgo = Date.now() - 48 * 60 * 60 * 1000

  return items.filter(item => {
    switch (statusFilter) {
      case 'all':
        return true
      case 'telegram':
        return item.source_type === 'telegram'
      case 'rss':
        return item.source_type === 'rss'
      case 'pending_ai':
        return item.pre_moderation_status === 'pending'
      case 'waiting_48h':
        return item.pre_moderation_status === 'approved' &&
               !item.is_published &&
               new Date(item.created_at).getTime() > fortyEightHoursAgo
      case 'waiting_approval':
        return item.pre_moderation_status === 'approved' && !item.is_published
      case 'rejected_ai':
        return item.pre_moderation_status === 'rejected'
      case 'published_news':
        return item.is_published
      case 'published_blog':
        return item.blog_posts && item.blog_posts.length > 0
      case 'published_linkedin':
        return !!item.linkedin_post_id ||
               item.social_media_posts?.some(p => p.platform === 'linkedin' && p.status === 'posted')
      case 'published_facebook':
        return item.social_media_posts?.some(p => p.platform === 'facebook' && p.status === 'posted')
      case 'published_instagram':
        return item.social_media_posts?.some(p => p.platform === 'instagram' && p.status === 'posted')
      default:
        return true
    }
  })
}
