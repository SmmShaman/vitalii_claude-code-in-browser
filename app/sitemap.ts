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
      alternates: {
        languages: {
          'x-default': baseUrl,
          en: baseUrl,
          no: baseUrl,
          uk: baseUrl,
        },
      },
    },
  ]

  // News pages with multilingual support
  let newsPages: MetadataRoute.Sitemap = []
  try {
    const news = await getLatestNews(1000)
    newsPages = news.flatMap((item: any) => {
      const pages: MetadataRoute.Sitemap = []
      const lastModified = new Date(item.published_at || item.created_at)

      // Build shared alternates for this news item
      const newsAlternates: Record<string, string> = {}
      if (item.slug_en) {
        newsAlternates['x-default'] = `${baseUrl}/news/${item.slug_en}`
        newsAlternates.en = `${baseUrl}/news/${item.slug_en}`
      }
      if (item.slug_no) newsAlternates.no = `${baseUrl}/news/${item.slug_no}`
      if (item.slug_ua) newsAlternates.uk = `${baseUrl}/news/${item.slug_ua}`

      // English version (primary)
      if (item.slug_en) {
        pages.push({
          url: `${baseUrl}/news/${item.slug_en}`,
          lastModified,
          changeFrequency: 'weekly' as const,
          priority: 0.8,
          alternates: { languages: newsAlternates },
        })
      }

      // Norwegian version
      if (item.slug_no && item.slug_no !== item.slug_en) {
        pages.push({
          url: `${baseUrl}/news/${item.slug_no}`,
          lastModified,
          changeFrequency: 'weekly' as const,
          priority: 0.7,
          alternates: { languages: newsAlternates },
        })
      }

      // Ukrainian version
      if (item.slug_ua && item.slug_ua !== item.slug_en && item.slug_ua !== item.slug_no) {
        pages.push({
          url: `${baseUrl}/news/${item.slug_ua}`,
          lastModified,
          changeFrequency: 'weekly' as const,
          priority: 0.7,
          alternates: { languages: newsAlternates },
        })
      }

      // Fallback to ID if no slugs
      if (!item.slug_en && !item.slug_no && !item.slug_ua) {
        pages.push({
          url: `${baseUrl}/news/${item.id}`,
          lastModified,
          changeFrequency: 'weekly' as const,
          priority: 0.6,
        })
      }

      return pages
    })
  } catch (error) {
    console.error('Error fetching news for sitemap:', error)
  }

  // Blog pages with multilingual support
  let blogPages: MetadataRoute.Sitemap = []
  try {
    const posts = await getLatestBlogPosts(1000)
    blogPages = posts.flatMap((post: any) => {
      const pages: MetadataRoute.Sitemap = []
      const lastModified = new Date(post.published_at || post.created_at)

      // Build shared alternates for this blog post
      const blogAlternates: Record<string, string> = {}
      if (post.slug_en) {
        blogAlternates['x-default'] = `${baseUrl}/blog/${post.slug_en}`
        blogAlternates.en = `${baseUrl}/blog/${post.slug_en}`
      }
      if (post.slug_no) blogAlternates.no = `${baseUrl}/blog/${post.slug_no}`
      if (post.slug_ua) blogAlternates.uk = `${baseUrl}/blog/${post.slug_ua}`

      // English version (primary)
      if (post.slug_en) {
        pages.push({
          url: `${baseUrl}/blog/${post.slug_en}`,
          lastModified,
          changeFrequency: 'weekly' as const,
          priority: 0.8,
          alternates: { languages: blogAlternates },
        })
      }

      // Norwegian version
      if (post.slug_no && post.slug_no !== post.slug_en) {
        pages.push({
          url: `${baseUrl}/blog/${post.slug_no}`,
          lastModified,
          changeFrequency: 'weekly' as const,
          priority: 0.7,
          alternates: { languages: blogAlternates },
        })
      }

      // Ukrainian version
      if (post.slug_ua && post.slug_ua !== post.slug_en && post.slug_ua !== post.slug_no) {
        pages.push({
          url: `${baseUrl}/blog/${post.slug_ua}`,
          lastModified,
          changeFrequency: 'weekly' as const,
          priority: 0.7,
          alternates: { languages: blogAlternates },
        })
      }

      // Fallback to ID if no slugs
      if (!post.slug_en && !post.slug_no && !post.slug_ua) {
        pages.push({
          url: `${baseUrl}/blog/${post.id}`,
          lastModified,
          changeFrequency: 'weekly' as const,
          priority: 0.6,
        })
      }

      return pages
    })
  } catch (error) {
    console.error('Error fetching blog posts for sitemap:', error)
  }

  return [...staticPages, ...newsPages, ...blogPages]
}
