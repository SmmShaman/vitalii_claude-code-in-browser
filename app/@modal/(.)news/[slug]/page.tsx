import { Modal } from '@/components/modal/Modal'
import { getNewsBySlug, getLocalizedNews, type Locale } from '@/lib/supabase'
import Image from 'next/image'
import Link from 'next/link'

interface Props {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ locale?: string }>
}

export default async function NewsModal({ params, searchParams }: Props) {
  const { slug } = await params
  const { locale: localeParam } = await searchParams
  const locale = (localeParam || 'en') as Locale

  const news = await getNewsBySlug(slug, locale)

  if (!news) {
    return (
      <Modal>
        <div className="p-8 text-center text-white">
          <h2 className="text-2xl font-bold mb-4">News Not Found</h2>
          <p>The requested article could not be found.</p>
        </div>
      </Modal>
    )
  }

  const localized = getLocalizedNews(news, locale)

  return (
    <Modal>
      <article className="p-6 sm:p-8">
        {/* Header */}
        <header className="mb-6">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white mb-4 drop-shadow-lg">
            {localized.title}
          </h1>

          <div className="flex items-center gap-4 text-white/70 text-sm">
            <time dateTime={news.created_at}>
              {new Date(news.created_at).toLocaleDateString(
                locale === 'ua' ? 'uk-UA' : locale === 'no' ? 'nb-NO' : 'en-US',
                { year: 'numeric', month: 'long', day: 'numeric' }
              )}
            </time>
            <span>|</span>
            <span>{news.views_count} views</span>
          </div>
        </header>

        {/* Featured image */}
        {news.image_url && (
          <div className="relative w-full h-[200px] sm:h-[300px] mb-6 rounded-xl overflow-hidden">
            <Image
              src={news.image_url}
              alt={localized.title || 'News image'}
              fill
              className="object-cover"
              priority
            />
          </div>
        )}

        {/* Content */}
        <div className="prose prose-lg prose-invert max-w-none text-white/90 leading-relaxed whitespace-pre-wrap mb-6">
          {localized.content}
        </div>

        {/* Tags */}
        {news.tags && news.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-6">
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

        {/* Link to full page for SEO */}
        <div className="pt-4 border-t border-white/20">
          <Link
            href={`/news/${slug}?locale=${locale}`}
            className="text-white/70 hover:text-white text-sm transition-colors"
          >
            Open full page &rarr;
          </Link>
        </div>
      </article>
    </Modal>
  )
}
