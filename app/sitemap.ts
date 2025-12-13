import { MetadataRoute } from 'next'
import { getLatestNews, getLatestBlogPosts } from '@/integrations/supabase/client'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://vitalii-berbeha.netlify.app'

  // Static pages
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1,
    },
  ]

  // News pages
  let newsPages: MetadataRoute.Sitemap = []
  try {
    const news = await getLatestNews(100)
    newsPages = news.map((item: any) => ({
      url: `${baseUrl}/news/${item.slug_en || item.id}`,
      lastModified: new Date(item.published_at || item.created_at),
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    }))
  } catch (error) {
    console.error('Error fetching news for sitemap:', error)
  }

  // Blog pages
  let blogPages: MetadataRoute.Sitemap = []
  try {
    const posts = await getLatestBlogPosts(100)
    blogPages = posts.map((post: any) => ({
      url: `${baseUrl}/blog/${post.slug_en || post.id}`,
      lastModified: new Date(post.published_at || post.created_at),
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    }))
  } catch (error) {
    console.error('Error fetching blog posts for sitemap:', error)
  }

  return [...staticPages, ...newsPages, ...blogPages]
}
