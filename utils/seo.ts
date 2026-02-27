// ============================================
// SEO Utilities for Blog and News Pages
// JSON-LD Schema generators and metadata helpers
// ============================================

import { BlogPost, NewsItem } from '@/integrations/supabase/types'

// Base URL for the site
export const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://vitalii-berbeha.netlify.app'

// Author information
export const AUTHOR = {
  name: 'Vitalii Berbeha',
  url: BASE_URL,
  jobTitle: 'E-commerce & Marketing Expert',
  description: 'AI project leader and entrepreneur specializing in e-commerce, marketing, and EdTech solutions',
}

// Site information
export const SITE_INFO = {
  name: 'Vitalii Berbeha',
  description: 'Professional portfolio of Vitalii Berbeha - AI project leader and entrepreneur',
  logo: `${BASE_URL}/logo.png`,
}

// ============================================
// JSON-LD Schema Generators
// ============================================

/**
 * Generate BlogPosting JSON-LD schema
 */
export function generateBlogPostSchema(post: BlogPost, language: 'en' | 'no' | 'ua' = 'en') {
  const slug = language === 'en' ? post.slug_en : language === 'no' ? post.slug_no : post.slug_ua
  const title = language === 'en' ? post.title_en : language === 'no' ? post.title_no : post.title_ua
  const description = language === 'en' ? post.description_en : language === 'no' ? post.description_no : post.description_ua
  const content = language === 'en' ? post.content_en : language === 'no' ? post.content_no : post.content_ua

  const wordCount = content?.split(/\s+/).length || 0
  const readingTimeMinutes = Math.ceil(wordCount / 200)

  return {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: title || post.title_en,
    description: description || post.description_en,
    image: post.image_url || post.cover_image_url,
    datePublished: post.published_at,
    dateModified: post.updated_at || post.published_at,
    author: {
      '@type': 'Person',
      name: AUTHOR.name,
      url: AUTHOR.url,
      jobTitle: AUTHOR.jobTitle,
    },
    publisher: {
      '@type': 'Person',
      name: AUTHOR.name,
      url: AUTHOR.url,
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': `${BASE_URL}/blog/${slug || post.id}`,
    },
    wordCount,
    timeRequired: `PT${readingTimeMinutes}M`,
    keywords: post.tags?.join(', ') || '',
    articleSection: post.category || 'Blog',
    inLanguage: language === 'ua' ? 'uk' : language,
  }
}

/**
 * Generate NewsArticle JSON-LD schema
 */
export function generateNewsArticleSchema(news: NewsItem, language: 'en' | 'no' | 'ua' = 'en') {
  const slug = language === 'en' ? news.slug_en : language === 'no' ? news.slug_no : news.slug_ua
  const title = language === 'en' ? news.title_en : language === 'no' ? news.title_no : news.title_ua
  const description = language === 'en' ? news.description_en : language === 'no' ? news.description_no : news.description_ua
  const content = language === 'en' ? (news as any).content_en : language === 'no' ? (news as any).content_no : (news as any).content_ua

  const wordCount = content?.split(/\s+/).length || 0
  const readingTimeMinutes = Math.ceil(wordCount / 200)

  return {
    '@context': 'https://schema.org',
    '@type': 'NewsArticle',
    headline: title || news.title_en,
    description: description || news.description_en,
    image: news.image_url,
    datePublished: news.published_at,
    dateModified: news.updated_at || news.published_at,
    author: {
      '@type': 'Person',
      name: AUTHOR.name,
      url: AUTHOR.url,
    },
    publisher: {
      '@type': 'Person',
      name: AUTHOR.name,
      url: AUTHOR.url,
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': `${BASE_URL}/news/${slug || news.id}`,
    },
    wordCount,
    timeRequired: `PT${readingTimeMinutes}M`,
    keywords: news.tags?.join(', ') || '',
    articleSection: 'News',
    inLanguage: language === 'ua' ? 'uk' : language,
  }
}

/**
 * Generate BreadcrumbList JSON-LD schema
 */
export function generateBreadcrumbSchema(
  items: Array<{ name: string; url?: string }>
) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      ...(item.url && { item: item.url }),
    })),
  }
}

/**
 * Generate Person JSON-LD schema for author page
 */
export function generatePersonSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: AUTHOR.name,
    url: AUTHOR.url,
    jobTitle: AUTHOR.jobTitle,
    description: AUTHOR.description,
    sameAs: [
      'https://linkedin.com/in/smmshaman',
      'https://github.com/SmmShaman',
      'https://twitter.com/SmmShaman',
      'https://instagram.com/smmshaman',
      'https://facebook.com/smm.shaman',
    ],
  }
}

/**
 * Generate WebSite JSON-LD schema
 */
export function generateWebsiteSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: SITE_INFO.name,
    description: SITE_INFO.description,
    url: BASE_URL,
    author: {
      '@type': 'Person',
      name: AUTHOR.name,
    },
  }
}

// ============================================
// Language Detection
// ============================================

/**
 * Detect which language a slug belongs to by matching against all slug variants.
 * Used by server-side generateMetadata to serve localized titles/descriptions.
 */
export function detectSlugLanguage(
  slugs: { slug_en?: string | null; slug_no?: string | null; slug_ua?: string | null },
  currentSlug: string
): 'en' | 'no' | 'ua' {
  if (slugs.slug_en === currentSlug) return 'en'
  if (slugs.slug_no === currentSlug) return 'no'
  if (slugs.slug_ua === currentSlug) return 'ua'
  return 'en'
}

// ============================================
// Metadata Helpers
// ============================================

/**
 * Generate alternates for multilingual content
 */
export function generateAlternates(
  type: 'blog' | 'news',
  slugs: { en?: string | null; no?: string | null; ua?: string | null },
  currentSlug: string
) {
  const basePath = type === 'blog' ? 'blog' : 'news'

  const languages: Record<string, string> = {
    'x-default': slugs.en ? `${BASE_URL}/${basePath}/${slugs.en}` : `${BASE_URL}/${basePath}/${currentSlug}`,
  }
  if (slugs.en) languages['en'] = `${BASE_URL}/${basePath}/${slugs.en}`
  if (slugs.no) languages['no'] = `${BASE_URL}/${basePath}/${slugs.no}`
  if (slugs.ua) languages['uk'] = `${BASE_URL}/${basePath}/${slugs.ua}`

  return {
    canonical: `${BASE_URL}/${basePath}/${currentSlug}`,
    languages,
  }
}

/**
 * Generate Open Graph metadata for articles
 */
export function generateOpenGraph(
  title: string,
  description: string,
  imageUrl: string | null,
  url: string,
  type: 'article' | 'website' = 'article',
  articleData?: {
    publishedTime?: string | null
    modifiedTime?: string | null
    authors?: string[]
    tags?: string[] | null
    section?: string | null
  },
  language: 'en' | 'no' | 'ua' = 'en'
) {
  const localeMap = { en: 'en_US', no: 'nb_NO', ua: 'uk_UA' }
  const allLocales = ['en_US', 'nb_NO', 'uk_UA']
  const currentLocale = localeMap[language]

  return {
    title,
    description,
    type,
    url,
    siteName: SITE_INFO.name,
    locale: currentLocale,
    alternateLocale: allLocales.filter(l => l !== currentLocale),
    images: imageUrl
      ? [
          {
            url: imageUrl,
            width: 1200,
            height: 630,
            alt: title,
          },
        ]
      : [],
    ...(type === 'article' && articleData && {
      publishedTime: articleData.publishedTime,
      modifiedTime: articleData.modifiedTime,
      authors: articleData.authors || [AUTHOR.name],
      tags: articleData.tags || [],
      section: articleData.section,
    }),
  }
}

/**
 * Generate Twitter Card metadata
 */
export function generateTwitterCard(
  title: string,
  description: string,
  imageUrl: string | null
) {
  return {
    card: 'summary_large_image' as const,
    title,
    description,
    images: imageUrl ? [imageUrl] : [],
    creator: '@vitalii_berbeha',
    site: '@vitalii_berbeha',
  }
}

/**
 * Generate robots metadata
 */
export function generateRobots(index: boolean = true, follow: boolean = true) {
  return {
    index,
    follow,
    googleBot: {
      index,
      follow,
      'max-video-preview': -1,
      'max-image-preview': 'large' as const,
      'max-snippet': -1,
    },
  }
}

/**
 * Truncate text for meta description (max 160 chars)
 */
export function truncateDescription(text: string | null | undefined, maxLength: number = 160): string {
  if (!text) return ''
  if (text.length <= maxLength) return text
  return text.substring(0, maxLength - 3).trim() + '...'
}

/**
 * Format date for display
 */
export function formatDate(date: string | null | undefined, locale: string = 'en-US'): string {
  if (!date) return ''
  return new Date(date).toLocaleDateString(locale, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

/**
 * Calculate reading time in minutes
 */
export function calculateReadingTime(content: string | null | undefined, wordsPerMinute: number = 200): number {
  if (!content) return 0
  const wordCount = content.split(/\s+/).filter(word => word.length > 0).length
  return Math.ceil(wordCount / wordsPerMinute)
}
