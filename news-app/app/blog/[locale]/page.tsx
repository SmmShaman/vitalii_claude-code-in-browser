import Link from 'next/link'
import Image from 'next/image'
import { getPublishedBlogPosts, getLocalizedBlogPost, type Locale, type BlogPost } from '@/lib/supabase'

export const revalidate = 60

type Props = {
  params: Promise<{ locale: Locale }>
}

const localeNames = {
  en: 'English',
  ua: 'Українська',
  no: 'Norsk',
}

export default async function LocaleBlogPage({ params }: Props) {
  const { locale } = await params
  const posts = await getPublishedBlogPosts()

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="mb-12">
          <Link
            href="/"
            className="inline-flex items-center text-indigo-600 hover:text-indigo-800 mb-6 transition"
          >
            ← Back to Home
          </Link>
          <h1 className="text-5xl font-bold text-gray-900 mb-4">
            {locale === 'ua' ? 'Блог' : locale === 'no' ? 'Blogg' : 'Blog'}
          </h1>
          <p className="text-xl text-gray-600">
            {localeNames[locale]}
          </p>
        </div>

        {/* Language switcher */}
        <div className="mb-8 flex gap-4">
          <span className="text-gray-700 font-medium">Language:</span>
          {Object.entries(localeNames).map(([code, name]) => (
            <Link
              key={code}
              href={`/blog/${code}`}
              className={locale === code ? 'font-bold' : 'text-blue-600 hover:underline'}
            >
              {name}
            </Link>
          ))}
        </div>

        {/* Blog posts grid */}
        {posts.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-2xl text-gray-500">
              {locale === 'ua' ? 'Постів поки немає' : locale === 'no' ? 'Ingen innlegg ennå' : 'No blog posts available yet'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {posts.map((post: BlogPost) => {
              const localized = getLocalizedBlogPost(post, locale)
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
                    <h2 className="text-xl font-bold text-gray-900 mb-2 line-clamp-2">
                      {localized.title}
                    </h2>
                    <p className="text-gray-600 mb-4 line-clamp-3">
                      {localized.description}
                    </p>

                    <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
                      <time dateTime={post.created_at}>
                        {new Date(post.created_at).toLocaleDateString(
                          locale === 'ua' ? 'uk-UA' : locale === 'no' ? 'nb-NO' : 'en-US',
                          { year: 'numeric', month: 'long', day: 'numeric' }
                        )}
                      </time>
                      <span>{post.views_count} views</span>
                    </div>

                    {hasTranslation ? (
                      <Link
                        href={`/blog/${locale}/${localized.slug}`}
                        className="inline-block px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
                      >
                        {locale === 'ua' ? 'Читати далі →' : locale === 'no' ? 'Les mer →' : 'Read more →'}
                      </Link>
                    ) : (
                      <span className="inline-block px-4 py-2 bg-gray-300 text-gray-600 rounded-lg cursor-not-allowed">
                        {locale === 'ua' ? 'Переклад в процесі' : locale === 'no' ? 'Oversettelse venter' : 'Translation pending'}
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
