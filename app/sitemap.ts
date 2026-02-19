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

  // News pages with multilingual support
  let newsPages: MetadataRoute.Sitemap = []
  try {
    const news = await getLatestNews(1000)
    newsPages = news.flatMap((item: any) => {
      const pages: MetadataRoute.Sitemap = []
      const lastModified = new Date(item.published_at || item.created_at)

      // English version (primary)
      if (item.slug_en) {
        pages.push({
          url: `${baseUrl}/news/${item.slug_en}`,
          lastModified,
          changeFrequency: 'weekly' as const,
          priority: 0.8,
          alternates: {
            languages: {
              en: `${baseUrl}/news/${item.slug_en}`,
              ...(item.slug_no && { no: `${baseUrl}/news/${item.slug_no}` }),
              ...(item.slug_ua && { uk: `${baseUrl}/news/${item.slug_ua}` }),
            },
          },
        })
      }

      // Norwegian version
      if (item.slug_no && item.slug_no !== item.slug_en) {
        pages.push({
          url: `${baseUrl}/news/${item.slug_no}`,
          lastModified,
          changeFrequency: 'weekly' as const,
          priority: 0.7,
          alternates: {
            languages: {
              ...(item.slug_en && { en: `${baseUrl}/news/${item.slug_en}` }),
              no: `${baseUrl}/news/${item.slug_no}`,
              ...(item.slug_ua && { uk: `${baseUrl}/news/${item.slug_ua}` }),
            },
          },
        })
      }

      // Ukrainian version
      if (item.slug_ua && item.slug_ua !== item.slug_en && item.slug_ua !== item.slug_no) {
        pages.push({
          url: `${baseUrl}/news/${item.slug_ua}`,
          lastModified,
          changeFrequency: 'weekly' as const,
          priority: 0.7,
          alternates: {
            languages: {
              ...(item.slug_en && { en: `${baseUrl}/news/${item.slug_en}` }),
              ...(item.slug_no && { no: `${baseUrl}/news/${item.slug_no}` }),
              uk: `${baseUrl}/news/${item.slug_ua}`,
            },
          },
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

      // English version (primary)
      if (post.slug_en) {
        pages.push({
          url: `${baseUrl}/blog/${post.slug_en}`,
          lastModified,
          changeFrequency: 'weekly' as const,
          priority: 0.8,
          alternates: {
            languages: {
              en: `${baseUrl}/blog/${post.slug_en}`,
              ...(post.slug_no && { no: `${baseUrl}/blog/${post.slug_no}` }),
              ...(post.slug_ua && { uk: `${baseUrl}/blog/${post.slug_ua}` }),
            },
          },
        })
      }

      // Norwegian version
      if (post.slug_no && post.slug_no !== post.slug_en) {
        pages.push({
          url: `${baseUrl}/blog/${post.slug_no}`,
          lastModified,
          changeFrequency: 'weekly' as const,
          priority: 0.7,
          alternates: {
            languages: {
              ...(post.slug_en && { en: `${baseUrl}/blog/${post.slug_en}` }),
              no: `${baseUrl}/blog/${post.slug_no}`,
              ...(post.slug_ua && { uk: `${baseUrl}/blog/${post.slug_ua}` }),
            },
          },
        })
      }

      // Ukrainian version
      if (post.slug_ua && post.slug_ua !== post.slug_en && post.slug_ua !== post.slug_no) {
        pages.push({
          url: `${baseUrl}/blog/${post.slug_ua}`,
          lastModified,
          changeFrequency: 'weekly' as const,
          priority: 0.7,
          alternates: {
            languages: {
              ...(post.slug_en && { en: `${baseUrl}/blog/${post.slug_en}` }),
              ...(post.slug_no && { no: `${baseUrl}/blog/${post.slug_no}` }),
              uk: `${baseUrl}/blog/${post.slug_ua}`,
            },
          },
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
