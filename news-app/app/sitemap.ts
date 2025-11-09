import { MetadataRoute } from 'next'
import { getPublishedNews, getPublishedBlogPosts } from '@/lib/supabase'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = 'https://vitalii-berbeha.com'
  const news = await getPublishedNews()
  const blogPosts = await getPublishedBlogPosts()

  // Main news pages
  const newsPages: MetadataRoute.Sitemap = [
    {
      url: `${baseUrl}/news`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/news/en`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.8,
      alternates: {
        languages: {
          en: `${baseUrl}/news/en`,
          uk: `${baseUrl}/news/ua`,
          nb: `${baseUrl}/news/no`,
        },
      },
    },
    {
      url: `${baseUrl}/news/ua`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.8,
      alternates: {
        languages: {
          en: `${baseUrl}/news/en`,
          uk: `${baseUrl}/news/ua`,
          nb: `${baseUrl}/news/no`,
        },
      },
    },
    {
      url: `${baseUrl}/news/no`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.8,
      alternates: {
        languages: {
          en: `${baseUrl}/news/en`,
          uk: `${baseUrl}/news/ua`,
          nb: `${baseUrl}/news/no`,
        },
      },
    },
  ]

  // Individual news articles
  const newsArticles: MetadataRoute.Sitemap = news.flatMap((item) => {
    const articles: MetadataRoute.Sitemap = []

    const alternates = {
      languages: {} as Record<string, string>,
    }

    if (item.slug_en) alternates.languages.en = `${baseUrl}/news/en/${item.slug_en}`
    if (item.slug_ua) alternates.languages.uk = `${baseUrl}/news/ua/${item.slug_ua}`
    if (item.slug_no) alternates.languages.nb = `${baseUrl}/news/no/${item.slug_no}`

    if (item.slug_en) {
      articles.push({
        url: `${baseUrl}/news/en/${item.slug_en}`,
        lastModified: new Date(item.updated_at),
        changeFrequency: 'weekly',
        priority: 0.7,
        alternates,
      })
    }

    if (item.slug_ua) {
      articles.push({
        url: `${baseUrl}/news/ua/${item.slug_ua}`,
        lastModified: new Date(item.updated_at),
        changeFrequency: 'weekly',
        priority: 0.7,
        alternates,
      })
    }

    if (item.slug_no) {
      articles.push({
        url: `${baseUrl}/news/no/${item.slug_no}`,
        lastModified: new Date(item.updated_at),
        changeFrequency: 'weekly',
        priority: 0.7,
        alternates,
      })
    }

    return articles
  })

  // Main blog pages
  const blogPages: MetadataRoute.Sitemap = [
    {
      url: `${baseUrl}/blog`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/blog/en`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.8,
      alternates: {
        languages: {
          en: `${baseUrl}/blog/en`,
          uk: `${baseUrl}/blog/ua`,
          nb: `${baseUrl}/blog/no`,
        },
      },
    },
    {
      url: `${baseUrl}/blog/ua`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.8,
      alternates: {
        languages: {
          en: `${baseUrl}/blog/en`,
          uk: `${baseUrl}/blog/ua`,
          nb: `${baseUrl}/blog/no`,
        },
      },
    },
    {
      url: `${baseUrl}/blog/no`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.8,
      alternates: {
        languages: {
          en: `${baseUrl}/blog/en`,
          uk: `${baseUrl}/blog/ua`,
          nb: `${baseUrl}/blog/no`,
        },
      },
    },
  ]

  // Individual blog posts
  const blogArticles: MetadataRoute.Sitemap = blogPosts.flatMap((post) => {
    const articles: MetadataRoute.Sitemap = []

    const alternates = {
      languages: {} as Record<string, string>,
    }

    if (post.slug_en) alternates.languages.en = `${baseUrl}/blog/en/${post.slug_en}`
    if (post.slug_ua) alternates.languages.uk = `${baseUrl}/blog/ua/${post.slug_ua}`
    if (post.slug_no) alternates.languages.nb = `${baseUrl}/blog/no/${post.slug_no}`

    if (post.slug_en) {
      articles.push({
        url: `${baseUrl}/blog/en/${post.slug_en}`,
        lastModified: new Date(post.updated_at),
        changeFrequency: 'weekly',
        priority: 0.7,
        alternates,
      })
    }

    if (post.slug_ua) {
      articles.push({
        url: `${baseUrl}/blog/ua/${post.slug_ua}`,
        lastModified: new Date(post.updated_at),
        changeFrequency: 'weekly',
        priority: 0.7,
        alternates,
      })
    }

    if (post.slug_no) {
      articles.push({
        url: `${baseUrl}/blog/no/${post.slug_no}`,
        lastModified: new Date(post.updated_at),
        changeFrequency: 'weekly',
        priority: 0.7,
        alternates,
      })
    }

    return articles
  })

  return [...newsPages, ...newsArticles, ...blogPages, ...blogArticles]
}
