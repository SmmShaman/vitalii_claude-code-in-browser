import { Modal } from '@/components/modal/Modal';
import { getBlogPostBySlug } from '@/lib/supabase';
import { notFound } from 'next/navigation';
import Image from 'next/image';

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function BlogModal({ params }: Props) {
  const { slug } = await params;
  const post = await getBlogPostBySlug(slug);

  if (!post) {
    notFound();
  }

  return (
    <Modal>
      <article className="p-6">
        {post.image_url && (
          <div className="relative w-full h-64 mb-6 rounded-lg overflow-hidden">
            <Image
              src={post.image_url}
              alt={post.title_en || ''}
              fill
              className="object-cover"
            />
          </div>
        )}
        <h1 className="text-3xl font-bold mb-4 text-gray-900 dark:text-white">
          {post.title_en}
        </h1>
        <p className="text-gray-600 dark:text-gray-300 mb-4">
          {new Date(post.published_at).toLocaleDateString()}
        </p>
        <div className="prose dark:prose-invert max-w-none">
          {post.content_en || post.description_en}
        </div>
      </article>
    </Modal>
  );
}
