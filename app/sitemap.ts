import { MetadataRoute } from 'next'
import { getPublishedNews, getPublishedBlogPosts } from '@/lib/supabase'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = 'https://vitalii-berbeha.com'

  // Static pages
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 1,
    },
  ]

  // News pages
  const news = await getPublishedNews()
  const newsPages: MetadataRoute.Sitemap = []

  news.forEach((item) => {
    const locales = ['en', 'ua', 'no'] as const

    locales.forEach((locale) => {
      const slug = item[`slug_${locale}`]
      if (slug) {
        newsPages.push({
          url: `${baseUrl}/news/${slug}?locale=${locale}`,
          lastModified: new Date(item.updated_at),
          changeFrequency: 'weekly',
          priority: 0.8,
        })
      }
    })
  })

  // Blog pages
  const blogPosts = await getPublishedBlogPosts()
  const blogPages: MetadataRoute.Sitemap = []

  blogPosts.forEach((item) => {
    const locales = ['en', 'ua', 'no'] as const

    locales.forEach((locale) => {
      const slug = item[`slug_${locale}`]
      if (slug) {
        blogPages.push({
          url: `${baseUrl}/blog/${slug}?locale=${locale}`,
          lastModified: new Date(item.updated_at),
          changeFrequency: 'weekly',
          priority: 0.8,
        })
      }
    })
  })

  return [...staticPages, ...newsPages, ...blogPages]
}
