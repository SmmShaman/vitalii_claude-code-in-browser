import { Metadata } from 'next'
import { getBlogPostBySlug, getLatestBlogPosts } from '@/integrations/supabase/client'
import { BlogArticle } from './BlogArticle'
import { ArticleLayout } from '@/components/ArticleLayout'
import {
  BASE_URL,
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

  const title = post.title_en || 'Blog Post'
  const description = truncateDescription(post.description_en)
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
      post.image_url || post.cover_image_url,
      url,
      'article',
      {
        publishedTime: post.published_at,
        modifiedTime: post.updated_at,
        authors: ['Vitalii Berbeha'],
        tags: post.tags,
        section: post.category,
      }
    ),
    twitter: generateTwitterCard(title, description, post.image_url || post.cover_image_url),
    robots: generateRobots(true, true),
  }
}

export async function generateStaticParams() {
  const posts = await getLatestBlogPosts(100)
  return posts.map((post: any) => ({
    slug: post.slug_en || post.id,
  }))
}

export default async function BlogPage({ params }: Props) {
  const { slug } = await params

  return (
    <ArticleLayout type="blog" slug={slug}>
      <BlogArticle slug={slug} />
    </ArticleLayout>
  )
}
