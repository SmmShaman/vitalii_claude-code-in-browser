import { Metadata } from 'next'
import { getBlogPostBySlug, getLatestBlogPosts } from '@/integrations/supabase/client'
import { BlogArticle } from './BlogArticle'

interface Props {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const post = await getBlogPostBySlug(slug)

  if (!post) {
    return {
      title: 'Blog Post Not Found',
      description: 'The requested blog post could not be found.',
    }
  }

  return {
    title: `${post.title_en} | Vitalii Berbeha Blog`,
    description: post.description_en?.substring(0, 160) || '',
    openGraph: {
      title: post.title_en,
      description: post.description_en?.substring(0, 160) || '',
      type: 'article',
      images: post.image_url ? [post.image_url] : [],
    },
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

  return <BlogArticle slug={slug} />
}
