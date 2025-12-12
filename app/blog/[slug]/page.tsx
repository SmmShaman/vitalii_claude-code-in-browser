import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { getBlogPostBySlug, getAllBlogSlugs } from '@/lib/supabase';

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  const slugs = await getAllBlogSlugs();
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = await getBlogPostBySlug(slug);

  if (!post) {
    return {
      title: 'Blog Post Not Found',
    };
  }

  return {
    title: `${post.title_en} | Vitalii Berbeha Blog`,
    description: post.description_en?.substring(0, 160),
    openGraph: {
      title: post.title_en,
      description: post.description_en,
      images: post.image_url ? [post.image_url] : [],
      type: 'article',
      publishedTime: post.published_at,
    },
    twitter: {
      card: 'summary_large_image',
      title: post.title_en,
      description: post.description_en,
      images: post.image_url ? [post.image_url] : [],
    },
  };
}

export default async function BlogPage({ params }: Props) {
  const { slug } = await params;
  const post = await getBlogPostBySlug(slug);

  if (!post) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <header className="bg-white dark:bg-gray-800 shadow">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <Link
            href="/"
            className="inline-flex items-center text-blue-600 hover:text-blue-800 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Home
          </Link>
        </div>
      </header>

      <article className="max-w-4xl mx-auto px-4 py-8">
        {post.image_url && (
          <div className="relative w-full h-96 mb-8 rounded-xl overflow-hidden shadow-lg">
            <Image
              src={post.image_url}
              alt={post.title_en || ''}
              fill
              className="object-cover"
              priority
            />
          </div>
        )}

        <h1 className="text-4xl font-bold mb-4 text-gray-900 dark:text-white">
          {post.title_en}
        </h1>

        <div className="flex items-center gap-4 mb-8 text-gray-600 dark:text-gray-400">
          <time dateTime={post.published_at}>
            {new Date(post.published_at).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </time>
          {post.reading_time && (
            <span>{post.reading_time} min read</span>
          )}
          {post.views_count && (
            <span>{post.views_count} views</span>
          )}
        </div>

        <div className="prose prose-lg dark:prose-invert max-w-none">
          {post.content_en || post.description_en}
        </div>

        {post.tags && post.tags.length > 0 && (
          <div className="mt-8 flex flex-wrap gap-2">
            {post.tags.map((tag: string) => (
              <span
                key={tag}
                className="px-3 py-1 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 rounded-full text-sm"
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </article>
    </div>
  );
}
