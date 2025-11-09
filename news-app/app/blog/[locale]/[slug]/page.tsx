import { notFound } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import type { Metadata } from 'next'
import { getBlogPostBySlug, getLocalizedBlogPost, getPublishedBlogPosts, type Locale } from '@/lib/supabase'

export const revalidate = 60 // ISR - revalidate every 60 seconds

type Props = {
  params: Promise<{ locale: Locale; slug: string }>
}

// Generate metadata for SEO
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params
  const post = await getBlogPostBySlug(slug, locale)

  if (!post) {
    return {
      title: 'Blog Post Not Found',
    }
  }

  const localized = getLocalizedBlogPost(post, locale)
  const baseUrl = 'https://vitalii-berbeha.com'

  return {
    title: localized.title,
    description: localized.description,
    authors: [{ name: 'Vitalii Berbeha' }],
    openGraph: {
      title: localized.title || undefined,
      description: localized.description || undefined,
      type: 'article',
      publishedTime: post.published_at || post.created_at,
      modifiedTime: post.updated_at,
      images: post.image_url ? [
        {
          url: post.image_url,
          width: 1200,
          height: 630,
          alt: localized.title || 'Blog post image',
        }
      ] : [],
      url: `${baseUrl}/blog/${locale}/${slug}`,
      locale: locale === 'ua' ? 'uk_UA' : locale === 'no' ? 'nb_NO' : 'en_US',
    },
    twitter: {
      card: 'summary_large_image',
      title: localized.title || undefined,
      description: localized.description || undefined,
      images: post.image_url ? [post.image_url] : [],
    },
    alternates: {
      canonical: `${baseUrl}/blog/${locale}/${slug}`,
      languages: {
        en: post.slug_en ? `${baseUrl}/blog/en/${post.slug_en}` : undefined,
        uk: post.slug_ua ? `${baseUrl}/blog/ua/${post.slug_ua}` : undefined,
        nb: post.slug_no ? `${baseUrl}/blog/no/${post.slug_no}` : undefined,
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

// Generate static paths for all published blog posts (ISR)
export async function generateStaticParams() {
  const posts = await getPublishedBlogPosts()
  const paths: { locale: Locale; slug: string }[] = []

  posts.forEach((post) => {
    if (post.slug_en) paths.push({ locale: 'en', slug: post.slug_en })
    if (post.slug_ua) paths.push({ locale: 'ua', slug: post.slug_ua })
    if (post.slug_no) paths.push({ locale: 'no', slug: post.slug_no })
  })

  return paths
}

export default async function BlogPostPage({ params }: Props) {
  const { locale, slug } = await params
  const post = await getBlogPostBySlug(slug, locale)

  if (!post) {
    notFound()
  }

  const localized = getLocalizedBlogPost(post, locale)

  // Schema.org JSON-LD
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: localized.title,
    description: localized.description,
    image: post.image_url || undefined,
    datePublished: post.published_at || post.created_at,
    dateModified: post.updated_at,
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
      '@id': `https://vitalii-berbeha.com/blog/${locale}/${slug}`,
    },
  }

  return (
    <>
      {/* JSON-LD Schema */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <article className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          {/* Back link */}
          <Link
            href="/blog/en"
            className="inline-flex items-center text-indigo-600 hover:text-indigo-800 mb-6 transition"
          >
            ← Back to Blog
          </Link>

          {/* Language switcher */}
          <div className="mb-6 flex gap-4">
            <span className="text-gray-700 font-medium">Read in:</span>
            {post.slug_en && (
              <Link href={`/blog/en/${post.slug_en}`} className={locale === 'en' ? 'font-bold' : 'text-blue-600 hover:underline'}>
                English
              </Link>
            )}
            {post.slug_ua && (
              <Link href={`/blog/ua/${post.slug_ua}`} className={locale === 'ua' ? 'font-bold' : 'text-blue-600 hover:underline'}>
                Українська
              </Link>
            )}
            {post.slug_no && (
              <Link href={`/blog/no/${post.slug_no}`} className={locale === 'no' ? 'font-bold' : 'text-blue-600 hover:underline'}>
                Norsk
              </Link>
            )}
          </div>

          {/* Article header */}
          <header className="mb-8">
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              {localized.title}
            </h1>

            <div className="flex items-center gap-4 text-gray-600">
              <time dateTime={post.created_at}>
                {new Date(post.created_at).toLocaleDateString(
                  locale === 'ua' ? 'uk-UA' : locale === 'no' ? 'nb-NO' : 'en-US',
                  { year: 'numeric', month: 'long', day: 'numeric' }
                )}
              </time>
              <span>•</span>
              <span>{post.views_count} views</span>
            </div>
          </header>

          {/* Featured image */}
          {post.image_url && (
            <div className="relative w-full h-[400px] mb-8 rounded-lg overflow-hidden shadow-xl">
              <Image
                src={post.image_url}
                alt={localized.title || 'Blog post image'}
                fill
                className="object-cover"
                priority
              />
            </div>
          )}

          {/* Article content */}
          <div className="prose prose-lg max-w-none">
            <div className="bg-white rounded-lg shadow-md p-8">
              <div className="whitespace-pre-wrap text-gray-800 leading-relaxed">
                {localized.content}
              </div>
            </div>
          </div>

          {/* Tags */}
          {post.tags && post.tags.length > 0 && (
            <div className="mt-8 flex flex-wrap gap-2">
              {post.tags.map((tag, index) => (
                <span
                  key={index}
                  className="px-3 py-1 bg-indigo-100 text-indigo-800 rounded-full text-sm font-medium"
                >
                  #{tag}
                </span>
              ))}
            </div>
          )}
        </div>
      </article>
    </>
  )
}
