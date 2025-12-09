import { notFound } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import type { Metadata } from 'next'
import { getBlogPostBySlug, getLocalizedBlogPost, getPublishedBlogPosts, type Locale } from '@/lib/supabase'

export const revalidate = 60

type Props = {
  params: Promise<{ locale: Locale; slug: string }>
}

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
  }
}

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
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <article className="max-w-4xl mx-auto px-4 py-12">
        <a
          href="https://vitalii.no"
          className="inline-flex items-center text-white/90 hover:text-white mb-6 transition hover:underline"
        >
          ← Back to Portfolio
        </a>

        <div className="mb-6 flex gap-4 flex-wrap">
          <span className="text-white/80 font-medium">Read in:</span>
          {post.slug_en && (
            <Link 
              href={`/blog/en/${post.slug_en}`} 
              className={locale === 'en' ? 'font-bold text-white' : 'text-white/80 hover:text-white hover:underline transition'}
            >
              English
            </Link>
          )}
          {post.slug_ua && (
            <Link 
              href={`/blog/ua/${post.slug_ua}`} 
              className={locale === 'ua' ? 'font-bold text-white' : 'text-white/80 hover:text-white hover:underline transition'}
            >
              Українська
            </Link>
          )}
          {post.slug_no && (
            <Link 
              href={`/blog/no/${post.slug_no}`} 
              className={locale === 'no' ? 'font-bold text-white' : 'text-white/80 hover:text-white hover:underline transition'}
            >
              Norsk
            </Link>
          )}
        </div>

        <header className="mb-8">
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-4 drop-shadow-lg">
            {localized.title}
          </h1>

          <div className="flex items-center gap-4 text-white/70 text-sm">
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

        {post.image_url && (
          <div className="relative w-full h-[300px] sm:h-[400px] mb-8 rounded-2xl overflow-hidden shadow-2xl border border-white/20">
            <Image
              src={post.image_url}
              alt={localized.title || 'Blog post image'}
              fill
              className="object-cover"
              priority
            />
          </div>
        )}

        <div className="mb-8">
          <div className="bg-white/10 backdrop-blur-md rounded-2xl shadow-2xl border border-white/20 p-6 sm:p-8">
            <div className="prose prose-lg max-w-none text-white/90 leading-relaxed whitespace-pre-wrap">
              {localized.content}
            </div>
          </div>
        </div>

        {post.tags && post.tags.length > 0 && (
          <div className="mb-8 flex flex-wrap gap-2">
            {post.tags.map((tag, index) => (
              <span
                key={index}
                className="px-3 py-1 bg-white/10 backdrop-blur-sm text-white/90 rounded-full text-sm font-medium border border-white/20"
              >
                #{tag}
              </span>
            ))}
          </div>
        )}
      </article>
    </>
  )
}
