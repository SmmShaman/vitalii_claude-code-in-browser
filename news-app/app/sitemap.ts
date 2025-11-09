import { MetadataRoute } from 'next'
import { getPublishedNews } from '@/lib/supabase'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = 'https://vitalii-berbeha.com'
  const news = await getPublishedNews()

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

  return [...newsPages, ...newsArticles]
}
