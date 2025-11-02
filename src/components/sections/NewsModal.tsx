import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Search, Calendar, Tag, ExternalLink, ChevronLeft, ChevronRight, Filter } from 'lucide-react';
import { useTranslations } from '../../contexts/TranslationContext';
import { getAllNews, getAllTags, getNewsById } from '../../integrations/supabase/client';
import type { NewsItem, LatestNews } from '../../integrations/supabase/types';

interface NewsModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedNewsId?: string;
}

export const NewsModal = ({ isOpen, onClose, selectedNewsId }: NewsModalProps) => {
  const { t, currentLanguage } = useTranslations();
  const [news, setNews] = useState<LatestNews[]>([]);
  const [selectedNews, setSelectedNews] = useState<NewsItem | null>(null);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState<string>('');
  const [selectedDateFrom, setSelectedDateFrom] = useState<string>('');
  const [selectedDateTo, setSelectedDateTo] = useState<string>('');
  const [allTags, setAllTags] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [showFilters, setShowFilters] = useState(false);
  const itemsPerPage = 9;

  useEffect(() => {
    if (isOpen) {
      loadTags();
      if (selectedNewsId) {
        loadNewsDetail(selectedNewsId);
      } else {
        loadAllNews();
      }
    }
  }, [isOpen, selectedNewsId]);

  useEffect(() => {
    if (isOpen && !selectedNews) {
      loadAllNews();
    }
  }, [searchQuery, selectedTag, selectedDateFrom, selectedDateTo, currentPage]);

  const loadTags = async () => {
    try {
      const tags = await getAllTags();
      const uniqueTags = Array.from(new Set(tags.flatMap(t => t.tags || [])));
      setAllTags(uniqueTags);
    } catch (error) {
      console.error('Failed to load tags:', error);
    }
  };

  const loadAllNews = async () => {
    try {
      setLoading(true);
      const filters = {
        search: searchQuery || undefined,
        tags: selectedTag ? [selectedTag] : undefined,
        dateFrom: selectedDateFrom || undefined,
        dateTo: selectedDateTo || undefined,
        page: currentPage,
        limit: itemsPerPage,
      };
      const { data, count } = await getAllNews(filters);
      setNews(data);
      setTotalPages(Math.ceil(count / itemsPerPage));
    } catch (error) {
      console.error('Failed to load news:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadNewsDetail = async (id: string) => {
    try {
      setLoading(true);
      const newsDetail = await getNewsById(id);
      setSelectedNews(newsDetail);
    } catch (error) {
      console.error('Failed to load news detail:', error);
    } finally {
      setLoading(false);
    }
  };

  const getTranslatedContent = (newsItem: LatestNews | NewsItem) => {
    const lang = currentLanguage.toLowerCase() as 'en' | 'no' | 'ua';
    const description = newsItem[`description_${lang}` as keyof typeof newsItem] || newsItem.description_en || '';
    const content = 'content_en' in newsItem ? newsItem[`content_${lang}` as keyof typeof newsItem] || newsItem.content_en : description;
    return {
      title: newsItem[`title_${lang}` as keyof typeof newsItem] || newsItem.title_en || '',
      content: content as string,
      summary: description as string,
    };
  };

  const getNewsSlug = (newsItem: NewsItem | LatestNews): string | null => {
    const lang = currentLanguage.toLowerCase() as 'en' | 'no' | 'ua';
    const slugKey = `slug_${lang}`;
    const slug = newsItem[slugKey as keyof typeof newsItem] as string | null;
    const fallbackSlug = (newsItem as any).slug_en;
    console.log('🔍 getNewsSlug called:', {
      lang,
      slugKey,
      currentSlug: slug,
      fallbackSlug,
      finalResult: slug || fallbackSlug || null,
      allSlugs: {
        slug_en: (newsItem as any).slug_en,
        slug_no: (newsItem as any).slug_no,
        slug_ua: (newsItem as any).slug_ua
      }
    });
    // Fallback to English slug if current language slug doesn't exist
    return slug || fallbackSlug || null;
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

  const handleClose = () => {
    setSelectedNews(null);
    setSearchQuery('');
    setSelectedTag('');
    setSelectedDateFrom('');
    setSelectedDateTo('');
    setCurrentPage(1);
    onClose();
  };

  const handleNewsClick = (newsItem: LatestNews) => {
    loadNewsDetail(newsItem.id);
  };

  const handleBackToList = () => {
    setSelectedNews(null);
    loadAllNews();
  };

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedTag('');
    setSelectedDateFrom('');
    setSelectedDateTo('');
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
              {selectedNews && (
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={handleBackToList}
                  className="p-2 hover:bg-muted rounded-lg transition-colors"
                >
                  <ChevronLeft className="h-5 w-5" />
                </motion.button>
              )}
              <h2 className="text-2xl font-bold">{t('news')}</h2>
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
            {selectedNews ? (
              // Detail View
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="max-w-4xl mx-auto"
              >
                {(() => {
                  console.log('📰 NewsModal Detail View - selectedNews:', selectedNews);
                  console.log('🎥 Video URL:', (selectedNews as any).video_url);
                  console.log('🖼️ Image URL:', selectedNews.image_url);
                  console.log('🔗 SEO Slug:', getNewsSlug(selectedNews));
                  console.log('📱 Window width:', window.innerWidth, 'CSS float applies at >640px');
                  return null;
                })()}
                <style>{`
                  .news-media-float {
                    width: 100%;
                    margin-bottom: 1rem;
                    background-color: rgba(255, 0, 0, 0.1); /* Debug red tint */
                  }
                  @media (min-width: 640px) {
                    .news-media-float {
                      width: 448px;
                      float: left;
                      margin-right: 1.5rem;
                      margin-bottom: 1rem;
                      background-color: rgba(0, 255, 0, 0.1); /* Debug green tint on desktop */
                    }
                  }
                `}</style>

                {/* Video Player (if video exists) - Floated left with text wrapping on desktop */}
                {(() => { console.log('🎬 Video check - has video_url?', !!(selectedNews as any).video_url); return null; })()}
                {(selectedNews as any).video_url && (
                  <div className="news-media-float rounded-xl overflow-hidden bg-black shadow-lg">
                    {(() => { console.log('✅ Rendering VIDEO - type:', (selectedNews as any).video_type, 'url:', (selectedNews as any).video_url); return null; })()}
                    {(selectedNews as any).video_type === 'youtube' ? (
                      // YouTube embed
                      <iframe
                        src={(selectedNews as any).video_url}
                        className="w-full aspect-video"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                        title="Video"
                      />
                    ) : (selectedNews as any).video_type === 'telegram_embed' ? (
                      // Telegram embed
                      <iframe
                        src={(selectedNews as any).video_url}
                        className="w-full aspect-video"
                        frameBorder="0"
                        scrolling="no"
                        title="Telegram Video"
                      />
                    ) : (
                      // Direct video URL (HTML5)
                      <video
                        src={(selectedNews as any).video_url}
                        controls
                        className="w-full aspect-video"
                        playsInline
                        preload="metadata"
                      >
                        <source src={(selectedNews as any).video_url} type="video/mp4" />
                        Your browser does not support the video tag.
                      </video>
                    )}
                  </div>
                )}

                {/* Image (only if no video) - Floated left with text wrapping on desktop */}
                {(() => { console.log('🖼️ Image check - no video?', !((selectedNews as any).video_url), 'has image_url?', !!selectedNews.image_url); return null; })()}
                {!((selectedNews as any).video_url) && selectedNews.image_url && (
                  <div className="news-media-float rounded-xl overflow-hidden shadow-lg">
                    {(() => { console.log('✅ Rendering IMAGE - url:', selectedNews.image_url); return null; })()}
                    <img
                      src={selectedNews.image_url as string}
                      alt={String(getTranslatedContent(selectedNews).title)}
                      className="w-full h-auto object-cover"
                      style={{ aspectRatio: '16/9' }}
                    />
                  </div>
                )}

                {/* Title */}
                <h1 className="text-3xl font-bold mb-4">
                  {getTranslatedContent(selectedNews).title}
                </h1>

                {/* Meta */}
                <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground mb-6">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    <span>{selectedNews.published_at ? formatDate(selectedNews.published_at) : ''}</span>
                  </div>
                  {selectedNews.tags && selectedNews.tags.length > 0 && (
                    <div className="flex items-center gap-2 flex-wrap">
                      <Tag className="h-4 w-4" />
                      {selectedNews.tags.map((tag, index) => (
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

                {/* Content - Text wraps around floated media */}
                {(() => { console.log('📝 Content length:', getTranslatedContent(selectedNews).content?.length, 'chars'); return null; })()}
                <div className="prose prose-lg dark:prose-invert max-w-none mb-6">
                  <p className="whitespace-pre-wrap">{getTranslatedContent(selectedNews).content}</p>
                </div>

                {/* Clear float to ensure links appear below all content */}
                <div className="clear-both"></div>

                {/* SEO Link - View full article on separate page */}
                {(() => {
                  const slug = getNewsSlug(selectedNews);
                  console.log('🔍 SEO Link Check:', {
                    hasSlug: !!slug,
                    slug: slug,
                    slug_en: (selectedNews as any).slug_en,
                    slug_no: (selectedNews as any).slug_no,
                    slug_ua: (selectedNews as any).slug_ua,
                    currentLanguage: currentLanguage,
                    translationKey: t('news_view_full_article')
                  });
                  if (slug) {
                    console.log('✅ Rendering SEO Link for slug:', slug);
                    return (
                      <div className="mt-6 pt-6 border-t border-border">
                        <Link
                          to={`/news/${slug}`}
                          className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-medium"
                        >
                          {t('news_view_full_article')}
                          <ExternalLink className="h-4 w-4" />
                        </Link>
                      </div>
                    );
                  } else {
                    console.log('❌ NO SEO Link - slug is null/undefined');
                    return null;
                  }
                })()}

                {/* Source Link */}
                {selectedNews.original_url && (
                  <div className={getNewsSlug(selectedNews) ? "mt-4" : "mt-6 pt-6 border-t border-border"}>
                    <a
                      href={selectedNews.original_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors text-sm"
                    >
                      {t('news_read_more')}
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                )}
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
                      placeholder={t('news_search_placeholder')}
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
                        className="grid grid-cols-1 md:grid-cols-3 gap-4"
                      >
                        {/* Tag Filter */}
                        <div>
                          <label className="block text-sm font-medium mb-2">
                            {t('news_filter_by_tag')}
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

                        {/* Date From */}
                        <div>
                          <label className="block text-sm font-medium mb-2">From Date</label>
                          <input
                            type="date"
                            value={selectedDateFrom}
                            onChange={(e) => {
                              setSelectedDateFrom(e.target.value);
                              setCurrentPage(1);
                            }}
                            className="w-full px-3 py-2 bg-muted/50 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                          />
                        </div>

                        {/* Date To */}
                        <div>
                          <label className="block text-sm font-medium mb-2">To Date</label>
                          <input
                            type="date"
                            value={selectedDateTo}
                            onChange={(e) => {
                              setSelectedDateTo(e.target.value);
                              setCurrentPage(1);
                            }}
                            className="w-full px-3 py-2 bg-muted/50 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                          />
                        </div>

                        {/* Clear Filters */}
                        <div className="md:col-span-3">
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
                ) : news.length === 0 ? (
                  <div className="text-center py-12">
                    <p className="text-muted-foreground">{t('news_no_items')}</p>
                  </div>
                ) : (
                  <>
                    {/* News Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                      {news.map((newsItem, index) => {
                        const content = getTranslatedContent(newsItem);
                        const slug = getNewsSlug(newsItem);
                        return (
                          <motion.div
                            key={newsItem.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.05 }}
                            className="group"
                          >
                            <Link
                              to={slug ? `/news/${slug}` : '#'}
                              onClick={(e) => {
                                if (!slug) {
                                  e.preventDefault();
                                  handleNewsClick(newsItem);
                                }
                              }}
                              className="block bg-card rounded-lg overflow-hidden border border-border hover:border-primary/50 transition-all duration-300 hover:shadow-lg h-full flex flex-col cursor-pointer"
                            >
                              {/* Image */}
                              {newsItem.image_url && (
                                <div className="relative w-full h-48 overflow-hidden">
                                  <img
                                    src={newsItem.image_url as string}
                                    alt={String(content.title)}
                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                  />
                                </div>
                              )}

                              {/* Content */}
                              <div className="p-4 flex-1 flex flex-col">
                                <h3 className="font-semibold text-lg mb-2 line-clamp-2 group-hover:text-primary transition-colors">
                                  {content.title}
                                </h3>
                                {content.summary && (
                                  <p className="text-sm text-muted-foreground mb-4 line-clamp-3 flex-1">
                                    {content.summary}
                                  </p>
                                )}
                                <div className="flex items-center justify-between text-xs text-muted-foreground">
                                  <div className="flex items-center gap-1">
                                    <Calendar className="h-3 w-3" />
                                    <span>{newsItem.published_at ? formatDate(newsItem.published_at) : ''}</span>
                                  </div>
                                  <motion.div
                                    className="text-primary"
                                    whileHover={{ x: 3 }}
                                  >
                                    →
                                  </motion.div>
                                </div>
                              </div>
                            </Link>
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
