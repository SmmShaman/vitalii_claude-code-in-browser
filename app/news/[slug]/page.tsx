import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { getNewsBySlug, getAllNewsSlugs } from '@/lib/supabase';

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  const slugs = await getAllNewsSlugs();
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const news = await getNewsBySlug(slug);

  if (!news) {
    return {
      title: 'News Not Found',
    };
  }

  return {
    title: `${news.title_en} | Vitalii Berbeha`,
    description: news.description_en?.substring(0, 160),
    openGraph: {
      title: news.title_en,
      description: news.description_en,
      images: news.image_url ? [news.image_url] : [],
      type: 'article',
      publishedTime: news.published_at,
    },
    twitter: {
      card: 'summary_large_image',
      title: news.title_en,
      description: news.description_en,
      images: news.image_url ? [news.image_url] : [],
    },
  };
}

export default async function NewsPage({ params }: Props) {
  const { slug } = await params;
  const news = await getNewsBySlug(slug);

  if (!news) {
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
        {news.image_url && (
          <div className="relative w-full h-96 mb-8 rounded-xl overflow-hidden shadow-lg">
            <Image
              src={news.image_url}
              alt={news.title_en || ''}
              fill
              className="object-cover"
              priority
            />
          </div>
        )}

        <h1 className="text-4xl font-bold mb-4 text-gray-900 dark:text-white">
          {news.title_en}
        </h1>

        <div className="flex items-center gap-4 mb-8 text-gray-600 dark:text-gray-400">
          <time dateTime={news.published_at}>
            {new Date(news.published_at).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </time>
          {news.views_count && (
            <span>{news.views_count} views</span>
          )}
        </div>

        <div className="prose prose-lg dark:prose-invert max-w-none">
          {news.description_en}
        </div>

        {news.tags && news.tags.length > 0 && (
          <div className="mt-8 flex flex-wrap gap-2">
            {news.tags.map((tag: string) => (
              <span
                key={tag}
                className="px-3 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded-full text-sm"
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
