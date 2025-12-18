'use client'

import { useState, useEffect, memo } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, Tag, Clock } from 'lucide-react';
import { useTranslations } from '@/contexts/TranslationContext';
import { getLatestBlogPosts } from '@/integrations/supabase/client';
import type { LatestBlogPost } from '@/integrations/supabase/types';

interface BlogSectionProps {
  isExpanded?: boolean;
}

const BlogSectionComponent = ({ isExpanded = false }: BlogSectionProps) => {
  const router = useRouter();
  const { t, currentLanguage } = useTranslations();
  const [posts, setPosts] = useState<LatestBlogPost[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPosts();
  }, []);

  useEffect(() => {
    if (posts.length > 0) {
      loadPosts();
    }
  }, [isExpanded]);

  const loadPosts = async () => {
    try {
      setLoading(true);
      const limit = isExpanded ? 6 : 3;
      const data = await getLatestBlogPosts(limit);
      setPosts(data);
    } catch (error) {
      console.error('Failed to load blog posts:', error);
    } finally {
      setLoading(false);
    }
  };

  const getTranslatedContent = (post: LatestBlogPost) => {
    const lang = currentLanguage.toLowerCase() as 'en' | 'no' | 'ua';
    const description = post[`description_${lang}` as keyof typeof post] || post.description_en || '';
    const content = description;
    return {
      title: post[`title_${lang}` as keyof typeof post] || post.title_en || '',
      content: content as string,
      excerpt: description as string,
      category: post.category || '',
    };
  };

  const getSlug = (post: LatestBlogPost) => {
    const lang = currentLanguage.toLowerCase() as 'en' | 'no' | 'ua';
    return (post as any)[`slug_${lang}`] || (post as any).slug_en || post.id;
  };

  const handlePostClick = (post: LatestBlogPost, e: React.MouseEvent) => {
    e.stopPropagation();
    const slug = getSlug(post);
    router.push(`/blog/${slug}`);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const lang = currentLanguage.toLowerCase();
    return new Intl.DateTimeFormat(lang === 'ua' ? 'uk-UA' : lang === 'no' ? 'nb-NO' : 'en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }).format(date);
  };

  const calculateReadingTime = (content: string): number => {
    const wordsPerMinute = 200;
    const wordCount = content.split(/\s+/).length;
    return Math.ceil(wordCount / wordsPerMinute);
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          <p className="text-sm text-muted-foreground">{t('blog_loading')}</p>
        </div>
      </div>
    );
  }

  if (posts.length === 0) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground">{t('blog_no_posts')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 overflow-y-auto space-y-4 pr-2">
        <AnimatePresence mode="popLayout">
          {posts.map((post, index) => {
            const content = getTranslatedContent(post);
            const readingTime = calculateReadingTime(content.content);

            return (
              <motion.div
                key={post.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ delay: index * 0.1 }}
                onClick={(e) => handlePostClick(post, e)}
                className="group cursor-pointer"
              >
                <div className="bg-card/50 backdrop-blur-sm rounded-lg p-4 border border-border/50 hover:border-primary/50 transition-all duration-300 hover:shadow-lg">
                  {post.image_url && (
                    <div className="relative w-full h-32 mb-3 rounded-md overflow-hidden">
                      <img
                        src={post.image_url}
                        alt={String(content.title)}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    </div>
                  )}

                  {content.category && (
                    <span className="inline-block px-2 py-1 bg-primary/10 text-primary rounded-full text-xs font-medium mb-2">
                      {content.category}
                    </span>
                  )}

                  <h4 className="font-semibold text-sm mb-2 line-clamp-2 group-hover:text-primary transition-colors">
                    {content.title}
                  </h4>

                  {content.excerpt && (
                    <p className="text-xs text-muted-foreground mb-3 line-clamp-2">
                      {content.excerpt}
                    </p>
                  )}

                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        <span>{post.published_at ? formatDate(post.published_at) : ''}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        <span>{readingTime} {t('blog_reading_time')}</span>
                      </div>
                      {post.tags && post.tags.length > 0 && (
                        <div className="flex items-center gap-1">
                          <Tag className="h-3 w-3" />
                          <span className="line-clamp-1">{post.tags[0]}</span>
                        </div>
                      )}
                    </div>
                    <motion.div
                      className="text-primary"
                      whileHover={{ x: 3 }}
                    >
                      →
                    </motion.div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
};

export const BlogSection = memo(BlogSectionComponent, (prevProps, nextProps) => {
  return prevProps.isExpanded === nextProps.isExpanded;
});
