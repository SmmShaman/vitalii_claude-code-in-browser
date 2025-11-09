import Link from 'next/link'
import Image from 'next/image'
import { getPublishedNews, getPublishedBlogPosts, getLocalizedNews, getLocalizedBlogPost, type NewsItem, type BlogPost } from '@/lib/supabase'

export const revalidate = 60 // Revalidate every 60 seconds (ISR)

export default async function HomePage() {
  const news = await getPublishedNews()
  const blogPosts = await getPublishedBlogPosts()

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="mb-12 text-center">
          <h1 className="text-6xl font-bold text-gray-900 mb-4">
            Vitalii Berbeha
          </h1>
          <p className="text-2xl text-gray-600 mb-8">
            E-commerce & Marketing Expert
          </p>
          <div className="flex justify-center gap-6">
            <Link
              href="/en"
              className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition shadow-md"
            >
              Latest News
            </Link>
            <Link
              href="/blog/en"
              className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition shadow-md"
            >
              Blog
            </Link>
          </div>
        </div>

        {/* Latest News Section */}
        <section className="mb-16">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-4xl font-bold text-gray-900">Latest News</h2>
            <Link href="/en" className="text-purple-600 hover:text-purple-800 font-medium">
              View all →
            </Link>
          </div>

          {news.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-xl text-gray-500">No news available yet</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {news.slice(0, 3).map((item: NewsItem) => {
                const localized = getLocalizedNews(item, 'en')
                const hasTranslation = !!localized.slug

                return (
                  <article
                    key={item.id}
                    className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-xl transition-shadow duration-300"
                  >
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

                    <div className="p-6">
                      <h3 className="text-xl font-bold text-gray-900 mb-2 line-clamp-2">
                        {localized.title}
                      </h3>
                      <p className="text-gray-600 mb-4 line-clamp-3">
                        {localized.description}
                      </p>

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
        </section>

        {/* Latest Blog Posts Section */}
        <section>
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-4xl font-bold text-gray-900">Latest Blog Posts</h2>
            <Link href="/blog/en" className="text-indigo-600 hover:text-indigo-800 font-medium">
              View all →
            </Link>
          </div>

          {blogPosts.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-xl text-gray-500">No blog posts available yet</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {blogPosts.slice(0, 3).map((post: BlogPost) => {
                const localized = getLocalizedBlogPost(post, 'en')
                const hasTranslation = !!localized.slug

                return (
                  <article
                    key={post.id}
                    className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-xl transition-shadow duration-300"
                  >
                    {post.image_url && (
                      <div className="relative h-48 w-full bg-gray-200">
                        <Image
                          src={post.image_url}
                          alt={localized.title || 'Blog post image'}
                          fill
                          className="object-cover"
                        />
                      </div>
                    )}

                    <div className="p-6">
                      <h3 className="text-xl font-bold text-gray-900 mb-2 line-clamp-2">
                        {localized.title}
                      </h3>
                      <p className="text-gray-600 mb-4 line-clamp-3">
                        {localized.description}
                      </p>

                      <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
                        <time dateTime={post.created_at}>
                          {new Date(post.created_at).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          })}
                        </time>
                        <span>{post.views_count} views</span>
                      </div>

                      {hasTranslation ? (
                        <Link
                          href={`/blog/en/${localized.slug}`}
                          className="inline-block px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
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
        </section>
      </div>
    </div>
  )
}
