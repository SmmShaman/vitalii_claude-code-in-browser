import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BookOpen, Calendar, Tag, ExternalLink, Clock } from 'lucide-react';
import { useTranslations } from '../../contexts/TranslationContext';
import { getLatestBlogPosts } from '../../integrations/supabase/client';
import type { LatestBlogPost } from '../../integrations/supabase/types';
import { BlogModal } from './BlogModal';

export const BlogSection = () => {
  const { t, currentLanguage } = useTranslations();
  const [posts, setPosts] = useState<LatestBlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedPost, setSelectedPost] = useState<LatestBlogPost | null>(null);

  useEffect(() => {
    loadPosts();
  }, []);

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

  const getTranslatedContent = (post: LatestBlogPost) => {
    const lang = currentLanguage.toLowerCase() as 'en' | 'no' | 'ua';
    const description = post[`description_${lang}`] || post.description_en || '';
    return {
      title: post[`title_${lang}`] || post.title_en || '',
      content: description,
      excerpt: description,
      category: post.category || '',
    };
  };

  const handlePostClick = (post: LatestBlogPost) => {
    setSelectedPost(post);
    setShowModal(true);
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
          <BookOpen className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">{t('blog_no_posts')}</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="h-full flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-primary" />
            <h3 className="text-xl font-bold">{t('blog')}</h3>
          </div>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowModal(true)}
            className="text-sm text-primary hover:underline flex items-center gap-1"
          >
            {t('blog_view_all')}
            <ExternalLink className="h-3 w-3" />
          </motion.button>
        </div>

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
                  onClick={() => handlePostClick(post)}
                  className="group cursor-pointer"
                >
                  <div className="bg-card/50 backdrop-blur-sm rounded-lg p-4 border border-border/50 hover:border-primary/50 transition-all duration-300 hover:shadow-lg">
                    {/* Featured Image */}
                    {post.image_url && (
                      <div className="relative w-full h-32 mb-3 rounded-md overflow-hidden">
                        <img
                          src={post.image_url}
                          alt={content.title}
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

      {/* Blog Modal */}
      <BlogModal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
          setSelectedPost(null);
        }}
        selectedPostId={selectedPost?.id}
      />
    </>
  );
};
