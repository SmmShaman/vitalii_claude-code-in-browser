import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

// Only initialize Supabase if credentials are provided
export const supabase = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null

export const isSupabaseConfigured = (): boolean => {
  return supabase !== null
}

export interface ContactFormData {
  name: string
  email: string
  message: string
}

export const submitContactForm = async (data: ContactFormData) => {
  // If Supabase is not configured, simulate success for demo purposes
  if (!supabase) {
    console.log('Contact form submission (Supabase not configured):', data)
    return {
      success: true,
      demo: true,
      message: 'Form submitted successfully! (Demo mode - configure Supabase to store submissions)'
    }
  }

  const { error } = await supabase
    .from('contact_forms')
    .insert([
      {
        name: data.name,
        email: data.email,
        message: data.message,
        created_at: new Date().toISOString(),
      }
    ])

  if (error) {
    throw new Error(error.message)
  }

  return { success: true, demo: false }
}

// Types for news
export interface NewsItem {
  id: string
  original_title: string
  original_content: string
  original_url: string
  image_url: string | null

  title_en: string | null
  content_en: string | null
  description_en: string | null
  slug_en: string | null

  title_ua: string | null
  content_ua: string | null
  description_ua: string | null
  slug_ua: string | null

  title_no: string | null
  content_no: string | null
  description_no: string | null
  slug_no: string | null

  tags: string[] | null
  published_at: string | null
  created_at: string
  updated_at: string
  is_published: boolean
  views_count: number
  video_url: string | null
}

export type Locale = 'en' | 'ua' | 'no'

// Fetch all published news
export async function getPublishedNews() {
  if (!supabase) return []

  const { data, error } = await supabase
    .from('news')
    .select('*')
    .eq('is_published', true)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching news:', error)
    return []
  }

  return data as NewsItem[]
}

// Fetch single news by slug
export async function getNewsBySlug(slug: string, locale: Locale) {
  if (!supabase) return null

  const slugColumn = `slug_${locale}`

  const { data, error } = await supabase
    .from('news')
    .select('*')
    .eq(slugColumn, slug)
    .eq('is_published', true)
    .single()

  if (error) {
    console.error('Error fetching news:', error)
    return null
  }

  return data as NewsItem
}

// Get locale-specific fields from news item
export function getLocalizedNews(news: NewsItem, locale: Locale) {
  return {
    title: news[`title_${locale}`] || news.original_title,
    content: news[`content_${locale}`] || news.original_content,
    description: news[`description_${locale}`] || news.original_content?.substring(0, 160),
    slug: news[`slug_${locale}`],
  }
}

// Types for blog posts (similar structure to news)
export interface BlogPost {
  id: string
  original_title: string
  original_content: string
  image_url: string | null

  title_en: string | null
  content_en: string | null
  description_en: string | null
  slug_en: string | null

  title_ua: string | null
  content_ua: string | null
  description_ua: string | null
  slug_ua: string | null

  title_no: string | null
  content_no: string | null
  description_no: string | null
  slug_no: string | null

  tags: string[] | null
  published_at: string | null
  created_at: string
  updated_at: string
  is_published: boolean
  views_count: number
}

// Fetch all published blog posts
export async function getPublishedBlogPosts() {
  if (!supabase) return []

  const { data, error } = await supabase
    .from('blog_posts')
    .select('*')
    .eq('is_published', true)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching blog posts:', error)
    return []
  }

  return data as BlogPost[]
}

// Fetch single blog post by slug
export async function getBlogPostBySlug(slug: string, locale: Locale) {
  if (!supabase) return null

  const slugColumn = `slug_${locale}`

  const { data, error } = await supabase
    .from('blog_posts')
    .select('*')
    .eq(slugColumn, slug)
    .eq('is_published', true)
    .single()

  if (error) {
    console.error('Error fetching blog post:', error)
    return null
  }

  return data as BlogPost
}

// Get locale-specific fields from blog post
export function getLocalizedBlogPost(post: BlogPost, locale: Locale) {
  return {
    title: post[`title_${locale}`] || post.original_title,
    content: post[`content_${locale}`] || post.original_content,
    description: post[`description_${locale}`] || post.original_content?.substring(0, 160),
    slug: post[`slug_${locale}`],
  }
}
