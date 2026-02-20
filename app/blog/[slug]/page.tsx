import { Metadata } from 'next'
import { getBlogPostBySlug, getLatestBlogPosts } from '@/integrations/supabase/client'
import { BlogArticle } from './BlogArticle'
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
  const post = await getBlogPostBySlug(slug)

  if (!post) {
    return {
      title: 'Blog Post Not Found | Vitalii Berbeha',
      description: 'The requested blog post could not be found.',
      robots: generateRobots(false, true),
    }
  }

  const lang = detectSlugLanguage({ slug_en: post.slug_en, slug_no: post.slug_no, slug_ua: post.slug_ua }, slug)
  const title = post[`title_${lang}`] || post.title_en || 'Blog Post'
  const description = truncateDescription(post[`description_${lang}`] || post.description_en)
  const url = `${BASE_URL}/blog/${slug}`

  return {
    title: `${title} | Vitalii Berbeha Blog`,
    description,
    keywords: post.tags?.join(', ') || '',
    authors: [{ name: 'Vitalii Berbeha', url: BASE_URL }],
    alternates: generateAlternates('blog', {
      en: post.slug_en,
      no: post.slug_no,
      ua: post.slug_ua,
    }, slug),
    openGraph: generateOpenGraph(
      title,
      description,
      (post as any).processed_image_url || post.image_url || post.cover_image_url,
      url,
      'article',
      {
        publishedTime: post.published_at,
        modifiedTime: post.updated_at,
        authors: ['Vitalii Berbeha'],
        tags: post.tags,
        section: post.category,
      },
      lang
    ),
    twitter: generateTwitterCard(title, description, (post as any).processed_image_url || post.image_url || post.cover_image_url),
    robots: generateRobots(true, true),
  }
}

// Dynamic rendering to avoid build timeouts and missing items
// generateStaticParams removed - all pages rendered on-demand
export const dynamic = 'force-dynamic'
export const dynamicParams = true

export default async function BlogPage({ params }: Props) {
  const { slug } = await params
  const post = await getBlogPostBySlug(slug)
  const lang = post ? detectSlugLanguage({ slug_en: post.slug_en, slug_no: post.slug_no, slug_ua: post.slug_ua }, slug) : 'en'

  return (
    <ArticleLayout>
      <BlogArticle slug={slug} initialLanguage={lang} initialData={post} />
    </ArticleLayout>
  )
}
