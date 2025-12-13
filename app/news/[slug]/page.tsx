import { Metadata } from 'next'
import { getNewsBySlug, getLatestNews } from '@/integrations/supabase/client'
import { NewsArticle } from './NewsArticle'
import {
  BASE_URL,
  generateAlternates,
  generateOpenGraph,
  generateTwitterCard,
  generateRobots,
  truncateDescription,
} from '@/utils/seo'

interface Props {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const news = await getNewsBySlug(slug)

  if (!news) {
    return {
      title: 'News Not Found | Vitalii Berbeha',
      description: 'The requested news article could not be found.',
      robots: generateRobots(false, true),
    }
  }

  const title = news.title_en || 'News'
  const description = truncateDescription(news.description_en)
  const url = `${BASE_URL}/news/${slug}`

  return {
    title: `${title} | Vitalii Berbeha News`,
    description,
    keywords: news.tags?.join(', ') || '',
    authors: [{ name: 'Vitalii Berbeha', url: BASE_URL }],
    alternates: generateAlternates('news', {
      en: news.slug_en,
      no: news.slug_no,
      ua: news.slug_ua,
    }, slug),
    openGraph: generateOpenGraph(
      title,
      description,
      news.image_url,
      url,
      'article',
      {
        publishedTime: news.published_at,
        modifiedTime: news.updated_at,
        authors: ['Vitalii Berbeha'],
        tags: news.tags,
        section: 'News',
      }
    ),
    twitter: generateTwitterCard(title, description, news.image_url),
    robots: generateRobots(true, true),
  }
}

export async function generateStaticParams() {
  const news = await getLatestNews(100)
  return news.map((item: any) => ({
    slug: item.slug_en || item.id,
  }))
}

export default async function NewsPage({ params }: Props) {
  const { slug } = await params

  return <NewsArticle slug={slug} />
}
