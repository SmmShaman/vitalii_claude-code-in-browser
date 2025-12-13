import { Metadata } from 'next'
import { getNewsBySlug, getLatestNews } from '@/integrations/supabase/client'
import { NewsArticle } from './NewsArticle'

interface Props {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const news = await getNewsBySlug(slug)

  if (!news) {
    return {
      title: 'News Not Found',
      description: 'The requested news article could not be found.',
    }
  }

  return {
    title: `${news.title_en} | Vitalii Berbeha`,
    description: news.description_en?.substring(0, 160) || '',
    openGraph: {
      title: news.title_en,
      description: news.description_en?.substring(0, 160) || '',
      type: 'article',
      images: news.image_url ? [news.image_url] : [],
    },
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
