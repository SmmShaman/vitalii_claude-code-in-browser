'use client'

import { useState, useEffect, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, Tag, ExternalLink, Clock, ChevronLeft } from 'lucide-react';
import { useTranslations } from '@/contexts/TranslationContext';
import { getLatestBlogPosts, getBlogPostById } from '@/integrations/supabase/client';
import type { LatestBlogPost, BlogPost } from '@/integrations/supabase/types';

interface BlogSectionProps {
  isExpanded?: boolean;
  selectedBlogId?: string | null;
  onBlogSelect?: (blogId: string) => void;
  onBack?: () => void;
}

const BlogSectionComponent = ({
  isExpanded = false,
  selectedBlogId = null,
  onBlogSelect,
  onBack
}: BlogSectionProps) => {
  const { t, currentLanguage } = useTranslations();
  const [posts, setPosts] = useState<LatestBlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPost, setSelectedPost] = useState<BlogPost | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  useEffect(() => {
    loadPosts();
  }, []);

  useEffect(() => {
    if (selectedBlogId) {
      loadBlogDetail(selectedBlogId);
    } else {
      setSelectedPost(null);
    }
  }, [selectedBlogId]);

  // Update URL with SEO-friendly slug when blog post is selected
  useEffect(() => {
    if (selectedPost && selectedBlogId) {
      const slug = getBlogSlug(selectedPost);
      if (slug) {
        // Replace URL with slug instead of ID for SEO
        window.history.replaceState({}, '', `/blog/${slug}`);
      }
    }
  }, [selectedPost, selectedBlogId, currentLanguage]);

  const loadBlogDetail = async (id: string) => {
    try {
      setLoadingDetail(true);
      const blogDetail = await getBlogPostById(id);
      setSelectedPost(blogDetail);
    } catch (error) {
      console.error('Failed to load blog detail:', error);
    } finally {
      setLoadingDetail(false);
    }
  };

  const loadPosts = async () => {
    try {
      setLoading(true);
      const data = await getLatestBlogPosts(3);
      setPosts(data);
    } catch (error) {
      console.error('Failed to load blog posts:', error);
    } finally {
      setLoading(false);
    }
  };

  const getTranslatedContent = (post: LatestBlogPost | BlogPost) => {
    const lang = currentLanguage.toLowerCase() as 'en' | 'no' | 'ua';
    const description = post[`description_${lang}` as keyof typeof post] || post.description_en || '';
    const content = 'content_en' in post ? post[`content_${lang}` as keyof typeof post] || post.content_en : description;
    return {
      title: post[`title_${lang}` as keyof typeof post] || post.title_en || '',
      content: content as string,
      excerpt: description as string,
      category: post.category || '',
    };
  };

  const getBlogSlug = (post: LatestBlogPost | BlogPost): string | null => {
    const lang = currentLanguage.toLowerCase() as 'en' | 'no' | 'ua';
    const slugKey = `slug_${lang}`;
    const slug = (post as any)[slugKey] as string | null;
    const fallbackSlug = (post as any).slug_en;
    return slug || fallbackSlug || null;
  };

  const handlePostClick = (post: LatestBlogPost, e: React.MouseEvent) => {
    // If section is not expanded, let the event bubble to card to expand it first
    if (!isExpanded) {
      // Don't stop propagation - allow card onClick to expand Blog
      return;
    }

    // Section is expanded, stop bubbling and open fullscreen
    e.stopPropagation();

    // Call the callback to notify parent
    if (onBlogSelect) {
      onBlogSelect(post.id);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const lang = currentLanguage.toLowerCase();
    return new Intl.DateTimeFormat(lang === 'ua' ? 'uk-UA' : lang === 'no' ? 'nb-NO' : 'en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
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

  // Show full blog detail if selected
  if (selectedPost) {
    const content = getTranslatedContent(selectedPost);
    return (
      <div className="h-full flex flex-col overflow-y-auto p-6">
        {/* Back Button */}
        <div className="flex-shrink-0 mb-4">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onBack}
            className="flex items-center gap-2 text-primary hover:text-primary/80 transition-colors"
          >
            <ChevronLeft className="h-5 w-5" />
            <span className="font-medium">Back to blog</span>
          </motion.button>
        </div>

        {loadingDetail ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex-1"
          >
            {/* Category Badge */}
            {content.category && (
              <div className="mb-4">
                <span className="px-3 py-1 bg-primary/10 text-primary rounded-full text-sm font-medium">
                  {content.category}
                </span>
              </div>
            )}

            {/* Title */}
            <h1 className="text-4xl font-bold mb-4 text-foreground">
              {content.title}
            </h1>

            {/* Meta */}
            <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground mb-6 pb-6 border-b">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                <span>{selectedPost.published_at ? formatDate(selectedPost.published_at) : ''}</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                <span>{calculateReadingTime(content.content)} min read</span>
              </div>
              {selectedPost.tags && selectedPost.tags.length > 0 && (
                <div className="flex items-center gap-2 flex-wrap">
                  <Tag className="h-4 w-4" />
                  {selectedPost.tags.map((tag, index) => (
                    <span
                      key={index}
                      className="px-2 py-1 bg-primary/10 text-primary rounded-full text-xs"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Content */}
            <div className="prose prose-lg dark:prose-invert max-w-none mb-6 text-foreground">
              <p className="whitespace-pre-wrap leading-relaxed">{content.content}</p>
            </div>

            {/* Source Link */}
            {(selectedPost as any).original_url && (
              <a
                href={(selectedPost as any).original_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-primary hover:underline font-medium"
              >
                Read original article
                <ExternalLink className="h-4 w-4" />
              </a>
            )}
          </motion.div>
        )}
      </div>
    );
  }

  return (
      <div className="h-full flex flex-col">
        {/* Blog Posts Grid */}
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
                    {/* Featured Image */}
                    {((post as any).processed_image_url || post.image_url) && (
                      <div className="relative w-full h-32 mb-3 rounded-md overflow-hidden">
                        <img
                          src={(post as any).processed_image_url || post.image_url}
                          alt={String(content.title)}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                      </div>
                    )}

                    {/* Category Badge */}
                    {content.category && (
                      <span className="inline-block px-2 py-1 bg-primary/10 text-primary rounded-full text-xs font-medium mb-2">
                        {content.category}
                      </span>
                    )}

                    {/* Title */}
                    <h4 className="font-semibold text-sm mb-2 line-clamp-2 group-hover:text-primary transition-colors">
                      {content.title}
                    </h4>

                    {/* Excerpt */}
                    {content.excerpt && (
                      <p className="text-xs text-muted-foreground mb-3 line-clamp-2">
                        {content.excerpt}
                      </p>
                    )}

                    {/* Meta Information */}
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

// Optimize re-renders by only updating when key props change
export const BlogSection = memo(BlogSectionComponent, (prevProps, nextProps) => {
  // Only re-render if these props actually changed
  return (
    prevProps.isExpanded === nextProps.isExpanded &&
    prevProps.selectedBlogId === nextProps.selectedBlogId
  );
});
