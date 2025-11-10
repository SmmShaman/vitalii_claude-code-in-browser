import { notFound } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import type { Metadata } from 'next'
import { getNewsBySlug, getLocalizedNews, getPublishedNews, type Locale } from '@/lib/supabase'

export const revalidate = 60 // ISR - revalidate every 60 seconds

type Props = {
  params: Promise<{ locale: Locale; slug: string }>
}

// Generate metadata for SEO
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params
  const news = await getNewsBySlug(slug, locale)

  if (!news) {
    return {
      title: 'News Not Found',
    }
  }

  const localized = getLocalizedNews(news, locale)
  const baseUrl = 'https://vitalii-berbeha.com'

  return {
    title: localized.title,
    description: localized.description,
    authors: [{ name: 'Vitalii Berbeha' }],
    openGraph: {
      title: localized.title || undefined,
      description: localized.description || undefined,
      type: 'article',
      publishedTime: news.published_at || news.created_at,
      modifiedTime: news.updated_at,
      images: news.image_url ? [
        {
          url: news.image_url,
          width: 1200,
          height: 630,
          alt: localized.title || 'News image',
        }
      ] : [],
      url: `${baseUrl}/${locale}/${slug}`,
      locale: locale === 'ua' ? 'uk_UA' : locale === 'no' ? 'nb_NO' : 'en_US',
    },
    twitter: {
      card: 'summary_large_image',
      title: localized.title || undefined,
      description: localized.description || undefined,
      images: news.image_url ? [news.image_url] : [],
    },
    alternates: {
      canonical: `${baseUrl}/${locale}/${slug}`,
      languages: {
        en: news.slug_en ? `${baseUrl}/en/${news.slug_en}` : undefined,
        uk: news.slug_ua ? `${baseUrl}/ua/${news.slug_ua}` : undefined,
        nb: news.slug_no ? `${baseUrl}/no/${news.slug_no}` : undefined,
      },
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        'max-image-preview': 'large',
        'max-snippet': -1,
      },
    },
  }
}

// Generate static paths for all published news (ISR)
export async function generateStaticParams() {
  const news = await getPublishedNews()
  const paths: { locale: Locale; slug: string }[] = []

  news.forEach((item) => {
    if (item.slug_en) paths.push({ locale: 'en', slug: item.slug_en })
    if (item.slug_ua) paths.push({ locale: 'ua', slug: item.slug_ua })
    if (item.slug_no) paths.push({ locale: 'no', slug: item.slug_no })
  })

  return paths
}

export default async function NewsArticlePage({ params }: Props) {
  const { locale, slug } = await params
  const news = await getNewsBySlug(slug, locale)

  if (!news) {
    notFound()
  }

  const localized = getLocalizedNews(news, locale)

  // Schema.org JSON-LD
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'NewsArticle',
    headline: localized.title,
    description: localized.description,
    image: news.image_url || undefined,
    datePublished: news.published_at || news.created_at,
    dateModified: news.updated_at,
    author: {
      '@type': 'Person',
      name: 'Vitalii Berbeha',
      url: 'https://vitalii-berbeha.com',
    },
    publisher: {
      '@type': 'Organization',
      name: 'Vitalii Berbeha',
      url: 'https://vitalii-berbeha.com',
    },
    inLanguage: locale === 'ua' ? 'uk' : locale,
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': `https://vitalii-berbeha.com/${locale}/${slug}`,
    },
  }

  return (
    <>
      {/* JSON-LD Schema */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <article className="max-w-4xl mx-auto px-4 py-12">
        {/* Back link */}
        <Link
          href="/"
          className="inline-flex items-center text-white/90 hover:text-white mb-6 transition hover:underline"
        >
          ← Back to News
        </Link>

        {/* Language switcher */}
        <div className="mb-6 flex gap-4 flex-wrap">
          <span className="text-white/80 font-medium">Read in:</span>
          {news.slug_en && (
            <Link 
              href={`/en/${news.slug_en}`} 
              className={locale === 'en' ? 'font-bold text-white' : 'text-white/80 hover:text-white hover:underline transition'}
            >
              English
            </Link>
          )}
          {news.slug_ua && (
            <Link 
              href={`/ua/${news.slug_ua}`} 
              className={locale === 'ua' ? 'font-bold text-white' : 'text-white/80 hover:text-white hover:underline transition'}
            >
              Українська
            </Link>
          )}
          {news.slug_no && (
            <Link 
              href={`/no/${news.slug_no}`} 
              className={locale === 'no' ? 'font-bold text-white' : 'text-white/80 hover:text-white hover:underline transition'}
            >
              Norsk
            </Link>
          )}
        </div>

        {/* Article header */}
        <header className="mb-8">
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-4 drop-shadow-lg">
            {localized.title}
          </h1>

          <div className="flex items-center gap-4 text-white/70 text-sm">
            <time dateTime={news.created_at}>
              {new Date(news.created_at).toLocaleDateString(
                locale === 'ua' ? 'uk-UA' : locale === 'no' ? 'nb-NO' : 'en-US',
                { year: 'numeric', month: 'long', day: 'numeric' }
              )}
            </time>
            <span>•</span>
            <span>{news.views_count} views</span>
          </div>
        </header>

        {/* Featured image */}
        {news.image_url && (
          <div className="relative w-full h-[300px] sm:h-[400px] mb-8 rounded-2xl overflow-hidden shadow-2xl border border-white/20">
            <Image
              src={news.image_url}
              alt={localized.title || 'News image'}
              fill
              className="object-cover"
              priority
            />
          </div>
        )}

        {/* Video */}
        {news.video_url && (
          <div className="mb-8">
            <video
              src={news.video_url}
              controls
              className="w-full rounded-2xl shadow-2xl border border-white/20"
            >
              Your browser does not support the video tag.
            </video>
          </div>
        )}

        {/* Article content */}
        <div className="mb-8">
          <div className="bg-white/10 backdrop-blur-md rounded-2xl shadow-2xl border border-white/20 p-6 sm:p-8">
            <div className="prose prose-lg max-w-none text-white/90 leading-relaxed whitespace-pre-wrap">
              {localized.content}
            </div>
          </div>
        </div>

        {/* Tags */}
        {news.tags && news.tags.length > 0 && (
          <div className="mb-8 flex flex-wrap gap-2">
            {news.tags.map((tag, index) => (
              <span
                key={index}
                className="px-3 py-1 bg-white/10 backdrop-blur-sm text-white/90 rounded-full text-sm font-medium border border-white/20"
              >
                #{tag}
              </span>
            ))}
          </div>
        )}

        {/* Original source */}
        {news.original_url && (
          <div className="p-4 bg-white/5 backdrop-blur-sm rounded-lg border border-white/10">
            <p className="text-sm text-white/70">
              Original source:{' '}
              <a
                href={news.original_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-white/90 hover:text-white underline"
              >
                {news.original_url}
              </a>
            </p>
          </div>
        )}
      </article>
    </>
  )
}
