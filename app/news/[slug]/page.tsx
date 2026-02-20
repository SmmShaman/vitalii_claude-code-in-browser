import { Metadata } from 'next'
import { getNewsBySlug, getLatestNews } from '@/integrations/supabase/client'
import { NewsArticle } from './NewsArticle'
import { ArticleLayout } from '@/components/ArticleLayout'
import {
  BASE_URL,
  detectSlugLanguage,
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

  const lang = detectSlugLanguage({ slug_en: news.slug_en, slug_no: news.slug_no, slug_ua: news.slug_ua }, slug)
  const title = news[`title_${lang}`] || news.title_en || 'News'
  const description = truncateDescription(news[`description_${lang}`] || news.description_en)
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
      news.processed_image_url || news.image_url,
      url,
      'article',
      {
        publishedTime: news.published_at,
        modifiedTime: news.updated_at,
        authors: ['Vitalii Berbeha'],
        tags: news.tags,
        section: 'News',
      },
      lang
    ),
    twitter: generateTwitterCard(title, description, news.processed_image_url || news.image_url),
    robots: generateRobots(true, true),
  }
}

// Dynamic rendering to avoid build timeouts and missing items
// generateStaticParams removed - all pages rendered on-demand
export const dynamic = 'force-dynamic'
export const dynamicParams = true

export default async function NewsPage({ params }: Props) {
  const { slug } = await params
  const news = await getNewsBySlug(slug)
  const lang = news ? detectSlugLanguage({ slug_en: news.slug_en, slug_no: news.slug_no, slug_ua: news.slug_ua }, slug) : 'en'

  return (
    <ArticleLayout>
      <NewsArticle slug={slug} initialLanguage={lang} initialData={news} />
    </ArticleLayout>
  )
}
