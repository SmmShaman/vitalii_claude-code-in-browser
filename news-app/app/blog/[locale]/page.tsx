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
  const blogPosts = await getPublishedBlogPosts()

  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      {/* Header */}
      <div className="mb-12 animate-fadeIn">
        <Link
          href="/"
          className="inline-flex items-center text-white/90 hover:text-white mb-6 transition hover:underline"
        >
          ← Back to Home
        </Link>
        <h1 className="text-4xl sm:text-5xl font-bold text-white mb-4 drop-shadow-lg">
          {locale === 'ua' ? 'Блог' : locale === 'no' ? 'Blogg' : 'Blog'}
        </h1>
        <p className="text-lg sm:text-xl text-white/80 drop-shadow">
          {localeNames[locale]}
        </p>
      </div>

      {/* Blog grid */}
      {blogPosts.length === 0 ? (
        <div className="text-center py-20 bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10">
          <p className="text-xl sm:text-2xl text-white/60">
            {locale === 'ua' ? 'Постів поки немає' : locale === 'no' ? 'Ingen innlegg ennå' : 'No blog posts available yet'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {blogPosts.map((post: BlogPost) => {
            const localized = getLocalizedBlogPost(post, locale)
            const hasTranslation = !!localized.slug

            return (
              <article
                key={post.id}
                className="bg-white/10 backdrop-blur-md rounded-2xl overflow-hidden hover:bg-white/15 transition-all duration-300 shadow-xl border border-white/20 hover:scale-105 hover:shadow-2xl"
              >
                {post.image_url && (
                  <div className="relative h-48 w-full bg-gradient-to-br from-indigo-500/20 to-purple-500/20">
                    <Image
                      src={post.image_url}
                      alt={localized.title || 'Blog post image'}
                      fill
                      className="object-cover"
                    />
                  </div>
                )}

                <div className="p-6">
                  <h2 className="text-xl font-bold text-white mb-2 line-clamp-2 drop-shadow">
                    {localized.title}
                  </h2>
                  <p className="text-white/80 mb-4 line-clamp-3 text-sm">
                    {localized.description}
                  </p>

                  <div className="flex items-center justify-between text-xs text-white/60 mb-4">
                    <time dateTime={post.created_at}>
                      {new Date(post.created_at).toLocaleDateString(
                        locale === 'ua' ? 'uk-UA' : locale === 'no' ? 'nb-NO' : 'en-US',
                        { year: 'numeric', month: 'short', day: 'numeric' }
                      )}
                    </time>
                    <span>{post.views_count} views</span>
                  </div>

                  {hasTranslation ? (
                    <Link
                      href={`/blog/${locale}/${localized.slug}`}
                      className="inline-block px-4 py-2 bg-white/20 text-white rounded-lg hover:bg-white/30 transition-all duration-300 text-sm font-medium"
                    >
                      {locale === 'ua' ? 'Читати далі →' : locale === 'no' ? 'Les mer →' : 'Read more →'}
                    </Link>
                  ) : (
                    <span className="inline-block px-4 py-2 bg-white/5 text-white/40 rounded-lg cursor-not-allowed text-sm">
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
  )
}
