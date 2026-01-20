'use client'

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import { X, Search, Calendar, Tag, ChevronLeft, ChevronRight, Filter, Clock, BookOpen, ExternalLink } from 'lucide-react';
import { useTranslations } from '@/contexts/TranslationContext';
import { getAllBlogPosts, getAllTags, getBlogPostById } from '@/integrations/supabase/client';
import type { BlogPost, LatestBlogPost } from '@/integrations/supabase/types';

interface BlogModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedPostId?: string;
}

export const BlogModal = ({ isOpen, onClose, selectedPostId }: BlogModalProps) => {
  const { t, currentLanguage } = useTranslations();
  const [posts, setPosts] = useState<LatestBlogPost[]>([]);
  const [selectedPost, setSelectedPost] = useState<BlogPost | null>(null);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [allTags, setAllTags] = useState<string[]>([]);
  const [allCategories, setAllCategories] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [showFilters, setShowFilters] = useState(false);
  const itemsPerPage = 9;

  useEffect(() => {
    if (isOpen) {
      loadTags();
      if (selectedPostId) {
        loadPostDetail(selectedPostId);
      } else {
        loadAllPosts();
      }
    }
  }, [isOpen, selectedPostId]);

  useEffect(() => {
    if (isOpen && !selectedPost) {
      loadAllPosts();
    }
  }, [searchQuery, selectedTag, selectedCategory, currentPage]);

  const loadTags = async () => {
    try {
      const tags = await getAllTags();
      const uniqueTags = Array.from(new Set(tags.flatMap(t => t.tags || [])));
      setAllTags(uniqueTags);

      // Extract unique categories from blog posts
      const { data } = await getAllBlogPosts({ limit: 1000 });
      const categories = Array.from(new Set(data.map(p => p.category).filter(Boolean))) as string[];
      setAllCategories(categories);
    } catch (error) {
      console.error('Failed to load tags:', error);
    }
  };

  const loadAllPosts = async () => {
    try {
      setLoading(true);
      const filters = {
        search: searchQuery || undefined,
        tags: selectedTag ? [selectedTag] : undefined,
        category: selectedCategory || undefined,
        page: currentPage,
        limit: itemsPerPage,
      };
      const { data, count } = await getAllBlogPosts(filters);
      setPosts(data);
      setTotalPages(Math.ceil(count / itemsPerPage));
    } catch (error) {
      console.error('Failed to load blog posts:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadPostDetail = async (id: string) => {
    try {
      setLoading(true);
      const postDetail = await getBlogPostById(id);
      setSelectedPost(postDetail);
    } catch (error) {
      console.error('Failed to load blog post detail:', error);
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

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const lang = currentLanguage.toLowerCase();
    return new Intl.DateTimeFormat(lang === 'ua' ? 'uk-UA' : lang === 'no' ? 'nb-NO' : 'en-US', {
      year: 'numeric',
      month: 'long',
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

  const getBlogSlug = (post: LatestBlogPost | BlogPost): string | null => {
    const lang = currentLanguage.toLowerCase() as 'en' | 'no' | 'ua';
    const slugKey = `slug_${lang}`;
    const slug = post[slugKey as keyof typeof post] as string | null;
    const fallbackSlug = (post as any).slug_en;
    return slug || fallbackSlug || null;
  };

  const handleClose = () => {
    setSelectedPost(null);
    setSearchQuery('');
    setSelectedTag('');
    setSelectedCategory('');
    setCurrentPage(1);
    onClose();
  };

  const handlePostClick = (post: LatestBlogPost) => {
    loadPostDetail(post.id);
  };

  const handleBackToList = () => {
    setSelectedPost(null);
    loadAllPosts();
  };

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedTag('');
    setSelectedCategory('');
    setCurrentPage(1);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
        onClick={handleClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-background border border-border rounded-xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-border">
            <div className="flex items-center gap-3">
              {selectedPost && (
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={handleBackToList}
                  className="p-2 hover:bg-muted rounded-lg transition-colors"
                >
                  <ChevronLeft className="h-5 w-5" />
                </motion.button>
              )}
              <BookOpen className="h-6 w-6 text-primary" />
              <h2 className="text-2xl font-bold">{t('blog')}</h2>
            </div>
            <motion.button
              whileHover={{ scale: 1.1, rotate: 90 }}
              whileTap={{ scale: 0.9 }}
              onClick={handleClose}
              className="p-2 hover:bg-muted rounded-lg transition-colors"
            >
              <X className="h-5 w-5" />
            </motion.button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {selectedPost ? (
              // Detail View
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="max-w-4xl mx-auto"
              >
                {/* Featured Image */}
                {((selectedPost as any).processed_image_url || selectedPost.image_url) && (
                  <div className="w-full h-96 rounded-xl overflow-hidden mb-6">
                    <img
                      src={((selectedPost as any).processed_image_url || selectedPost.image_url) as string}
                      alt={String(getTranslatedContent(selectedPost).title)}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}

                {/* Category Badge */}
                {getTranslatedContent(selectedPost).category && (
                  <span className="inline-block px-3 py-1 bg-primary/10 text-primary rounded-full text-sm font-medium mb-4">
                    {getTranslatedContent(selectedPost).category}
                  </span>
                )}

                {/* Title */}
                <h1 className="text-3xl font-bold mb-4">
                  {getTranslatedContent(selectedPost).title}
                </h1>

                {/* Meta */}
                <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground mb-6 pb-6 border-b border-border">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    <span>{selectedPost.published_at ? formatDate(selectedPost.published_at) : ""}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    <span>
                      {calculateReadingTime(getTranslatedContent(selectedPost).content)} {t('blog_reading_time')}
                    </span>
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
                <div className="prose prose-lg dark:prose-invert max-w-none">
                  <ReactMarkdown
                    components={{
                      a: ({ href, children }) => (
                        <a
                          href={href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:text-primary/80 underline"
                        >
                          {children}
                        </a>
                      ),
                      p: ({ children }) => (
                        <p className="leading-relaxed mb-4">{children}</p>
                      ),
                      strong: ({ children }) => (
                        <strong className="font-semibold">{children}</strong>
                      ),
                      ul: ({ children }) => (
                        <ul className="list-disc list-inside mb-4 space-y-1">{children}</ul>
                      ),
                      ol: ({ children }) => (
                        <ol className="list-decimal list-inside mb-4 space-y-1">{children}</ol>
                      ),
                      li: ({ children }) => (
                        <li>{children}</li>
                      ),
                      h1: ({ children }) => (
                        <h1 className="text-2xl font-bold mt-6 mb-4">{children}</h1>
                      ),
                      h2: ({ children }) => (
                        <h2 className="text-xl font-bold mt-5 mb-3">{children}</h2>
                      ),
                      h3: ({ children }) => (
                        <h3 className="text-lg font-semibold mt-4 mb-2">{children}</h3>
                      ),
                    }}
                  >
                    {getTranslatedContent(selectedPost).content}
                  </ReactMarkdown>
                </div>

                {/* SEO Link - View full article on separate page */}
                {(() => {
                  const slug = getBlogSlug(selectedPost);
                  if (slug) {
                    return (
                      <div className="mt-6 pt-6 border-t border-border">
                        <Link
                          href={`/blog/${slug}`}
                          className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-medium"
                        >
                          {t('blog_view_full_article') || 'View full article'}
                          <ExternalLink className="h-4 w-4" />
                        </Link>
                      </div>
                    );
                  }
                  return null;
                })()}
              </motion.div>
            ) : (
              // List View
              <>
                {/* Filters */}
                <div className="mb-6 space-y-4">
                  {/* Search */}
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <input
                      type="text"
                      placeholder={t('blog_search_placeholder')}
                      value={searchQuery}
                      onChange={(e) => {
                        setSearchQuery(e.target.value);
                        setCurrentPage(1);
                      }}
                      className="w-full pl-10 pr-4 py-3 bg-muted/50 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>

                  {/* Filter Toggle */}
                  <button
                    onClick={() => setShowFilters(!showFilters)}
                    className="flex items-center gap-2 text-sm text-primary hover:underline"
                  >
                    <Filter className="h-4 w-4" />
                    {showFilters ? 'Hide Filters' : 'Show Filters'}
                  </button>

                  {/* Advanced Filters */}
                  <AnimatePresence>
                    {showFilters && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="grid grid-cols-1 md:grid-cols-2 gap-4"
                      >
                        {/* Category Filter */}
                        <div>
                          <label className="block text-sm font-medium mb-2">
                            {t('blog_filter_by_category')}
                          </label>
                          <select
                            value={selectedCategory}
                            onChange={(e) => {
                              setSelectedCategory(e.target.value);
                              setCurrentPage(1);
                            }}
                            className="w-full px-3 py-2 bg-muted/50 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                          >
                            <option value="">All categories</option>
                            {allCategories.map((category) => (
                              <option key={category} value={category}>
                                {category}
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* Tag Filter */}
                        <div>
                          <label className="block text-sm font-medium mb-2">
                            {t('blog_filter_by_tag')}
                          </label>
                          <select
                            value={selectedTag}
                            onChange={(e) => {
                              setSelectedTag(e.target.value);
                              setCurrentPage(1);
                            }}
                            className="w-full px-3 py-2 bg-muted/50 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                          >
                            <option value="">All tags</option>
                            {allTags.map((tag) => (
                              <option key={tag} value={tag}>
                                {tag}
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* Clear Filters */}
                        <div className="md:col-span-2">
                          <button
                            onClick={clearFilters}
                            className="text-sm text-muted-foreground hover:text-primary"
                          >
                            Clear all filters
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Loading State */}
                {loading ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                  </div>
                ) : posts.length === 0 ? (
                  <div className="text-center py-12">
                    <p className="text-muted-foreground">{t('blog_no_posts')}</p>
                  </div>
                ) : (
                  <>
                    {/* Blog Posts Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                      {posts.map((post, index) => {
                        const content = getTranslatedContent(post);
                        const readingTime = calculateReadingTime(content.content);

                        return (
                          <motion.div
                            key={post.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.05 }}
                            onClick={() => handlePostClick(post)}
                            className="group cursor-pointer"
                          >
                            <div className="bg-card rounded-lg overflow-hidden border border-border hover:border-primary/50 transition-all duration-300 hover:shadow-lg h-full flex flex-col">
                              {/* Featured Image */}
                              {((post as any).processed_image_url || post.image_url) && (
                                <div className="relative w-full h-48 overflow-hidden">
                                  <img
                                    src={((post as any).processed_image_url || post.image_url) as string}
                                    alt={String(content.title)}
                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                  />
                                  {content.category && (
                                    <span className="absolute top-3 left-3 px-2 py-1 bg-primary text-primary-foreground rounded-full text-xs font-medium">
                                      {content.category}
                                    </span>
                                  )}
                                </div>
                              )}

                              {/* Content */}
                              <div className="p-4 flex-1 flex flex-col">
                                <h3 className="font-semibold text-lg mb-2 line-clamp-2 group-hover:text-primary transition-colors">
                                  {content.title}
                                </h3>
                                {content.excerpt && (
                                  <p className="text-sm text-muted-foreground mb-4 line-clamp-3 flex-1">
                                    {content.excerpt}
                                  </p>
                                )}
                                <div className="flex items-center justify-between text-xs text-muted-foreground">
                                  <div className="flex items-center gap-2">
                                    <Clock className="h-3 w-3" />
                                    <span>{readingTime} {t('blog_reading_time')}</span>
                                  </div>
                                  <motion.div
                                    className="text-primary"
                                    whileHover={{ x: 3 }}
                                  >
                                    →
                                  </motion.div>
                                </div>
                              </div>
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>

                    {/* Pagination */}
                    {totalPages > 1 && (
                      <div className="flex items-center justify-center gap-2">
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                          disabled={currentPage === 1}
                          className="p-2 rounded-lg border border-border hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <ChevronLeft className="h-5 w-5" />
                        </motion.button>

                        <span className="text-sm text-muted-foreground">
                          Page {currentPage} of {totalPages}
                        </span>

                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                          disabled={currentPage === totalPages}
                          className="p-2 rounded-lg border border-border hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <ChevronRight className="h-5 w-5" />
                        </motion.button>
                      </div>
                    )}
                  </>
                )}
              </>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
