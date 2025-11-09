import Link from 'next/link'
import Image from 'next/image'
import { getPublishedNews, getLocalizedNews, type NewsItem } from '@/lib/supabase'

export const revalidate = 60 // Revalidate every 60 seconds (ISR)

export default async function NewsPage() {
  const news = await getPublishedNews()

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="mb-12">
          <Link
            href="/"
            className="inline-flex items-center text-purple-600 hover:text-purple-800 mb-6 transition"
          >
            ← Back to Home
          </Link>
          <h1 className="text-5xl font-bold text-gray-900 mb-4">
            Latest News
          </h1>
          <p className="text-xl text-gray-600">
            Stay updated with the latest insights and updates
          </p>
        </div>

        {/* Language switcher */}
        <div className="mb-8 flex gap-4">
          <span className="text-gray-700 font-medium">Language:</span>
          <Link href="/en" className="text-blue-600 hover:underline">English</Link>
          <Link href="/ua" className="text-blue-600 hover:underline">Українська</Link>
          <Link href="/no" className="text-blue-600 hover:underline">Norsk</Link>
        </div>

        {/* News grid */}
        {news.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-2xl text-gray-500">No news available yet</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {news.map((item: NewsItem) => {
              const localized = getLocalizedNews(item, 'en')
              const hasTranslation = !!localized.slug

              return (
                <article
                  key={item.id}
                  className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-xl transition-shadow duration-300"
                >
                  {/* Image */}
                  {item.image_url && (
                    <div className="relative h-48 w-full bg-gray-200">
                      <Image
                        src={item.image_url}
                        alt={localized.title || 'News image'}
                        fill
                        className="object-cover"
                      />
                    </div>
                  )}

                  {/* Content */}
                  <div className="p-6">
                    <h2 className="text-xl font-bold text-gray-900 mb-2 line-clamp-2">
                      {localized.title}
                    </h2>
                    <p className="text-gray-600 mb-4 line-clamp-3">
                      {localized.description}
                    </p>

                    {/* Meta */}
                    <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
                      <time dateTime={item.created_at}>
                        {new Date(item.created_at).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </time>
                      <span>{item.views_count} views</span>
                    </div>

                    {/* Read more link */}
                    {hasTranslation ? (
                      <Link
                        href={`/en/${localized.slug}`}
                        className="inline-block px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition"
                      >
                        Read more →
                      </Link>
                    ) : (
                      <span className="inline-block px-4 py-2 bg-gray-300 text-gray-600 rounded-lg cursor-not-allowed">
                        Translation pending
                      </span>
                    )}
                  </div>
                </article>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
