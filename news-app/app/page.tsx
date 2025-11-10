import Link from 'next/link'
import Image from 'next/image'
import { getPublishedNews, getLocalizedNews, type NewsItem } from '@/lib/supabase'

export const revalidate = 60 // Revalidate every 60 seconds (ISR)

export default async function HomePage() {
  const news = await getPublishedNews()

  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      {/* Back to Portfolio Link */}
      <div className="mb-8 animate-fadeIn">
        <a
          href="https://vitalii.no"
          className="inline-flex items-center text-white/90 hover:text-white transition hover:underline"
        >
          ← Back to Portfolio
        </a>
      </div>

      {/* Header */}
      <div className="mb-16 text-center animate-fadeIn">
        <h1 className="text-5xl sm:text-6xl font-bold text-white mb-4 drop-shadow-lg">
          Vitalii Berbeha
        </h1>
        <p className="text-xl sm:text-2xl text-white/90 drop-shadow">
          E-commerce & Marketing Expert
        </p>
      </div>

      {/* Latest News Section */}
      <section className="mb-16 animate-fadeIn">
        <div className="mb-8">
          <h2 className="text-3xl sm:text-4xl font-bold text-white drop-shadow-lg">Latest News</h2>
        </div>

        {news.length === 0 ? (
          <div className="text-center py-12 bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10">
            <p className="text-xl text-white/60">No news available yet</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {news.slice(0, 3).map((item: NewsItem) => {
              const localized = getLocalizedNews(item, 'en')
              const hasTranslation = !!localized.slug

              return (
                <article
                  key={item.id}
                  className="bg-white/10 backdrop-blur-md rounded-2xl overflow-hidden hover:bg-white/15 transition-all duration-300 shadow-xl border border-white/20 hover:scale-105 hover:shadow-2xl"
                >
                  {item.image_url && (
                    <div className="relative h-48 w-full bg-gradient-to-br from-purple-500/20 to-blue-500/20">
                      <Image
                        src={item.image_url}
                        alt={localized.title || 'News image'}
                        fill
                        className="object-cover"
                      />
                    </div>
                  )}

                  <div className="p-6">
                    <h3 className="text-xl font-bold text-white mb-2 line-clamp-2 drop-shadow">
                      {localized.title}
                    </h3>
                    <p className="text-white/80 mb-4 line-clamp-3 text-sm">
                      {localized.description}
                    </p>

                    <div className="flex items-center justify-between text-xs text-white/60 mb-4">
                      <time dateTime={item.created_at}>
                        {new Date(item.created_at).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric'
                        })}
                      </time>
                      <span>{item.views_count} views</span>
                    </div>

                    {hasTranslation ? (
                      <Link
                        href={`/en/${localized.slug}`}
                        className="inline-block px-4 py-2 bg-white/20 text-white rounded-lg hover:bg-white/30 transition-all duration-300 text-sm font-medium"
                      >
                        Read more →
                      </Link>
                    ) : (
                      <span className="inline-block px-4 py-2 bg-white/5 text-white/40 rounded-lg cursor-not-allowed text-sm">
                        Translation pending
                      </span>
                    )}
                  </div>
                </article>
              )
            })}
          </div>
        )}
      </section>
    </div>
  )
}
