import { useState, useEffect } from 'react';
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
      const { data, total } = await getAllNews(filters);
      setNews(data);
      setTotalPages(Math.ceil(total / itemsPerPage));
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
    return {
      title: newsItem[`title_${lang}`] || newsItem.title_en,
      content: newsItem[`content_${lang}`] || newsItem.content_en,
      summary: 'summary_en' in newsItem ? newsItem[`summary_${lang}`] || newsItem.summary_en : '',
    };
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const lang = currentLanguage.toLowerCase();
    return new Intl.DateTimeFormat(lang === 'ua' ? 'uk-UA' : lang === 'no' ? 'nb-NO' : 'en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
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
                {/* Image */}
                {selectedNews.image_url && (
                  <div className="w-full h-96 rounded-xl overflow-hidden mb-6">
                    <img
                      src={selectedNews.image_url}
                      alt={getTranslatedContent(selectedNews).title}
                      className="w-full h-full object-cover"
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
                    <span>{formatDate(selectedNews.published_at)}</span>
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

                {/* Content */}
                <div className="prose prose-lg dark:prose-invert max-w-none mb-6">
                  <p className="whitespace-pre-wrap">{getTranslatedContent(selectedNews).content}</p>
                </div>

                {/* Source Link */}
                {selectedNews.source_url && (
                  <a
                    href={selectedNews.source_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-primary hover:underline"
                  >
                    {t('news_read_more')}
                    <ExternalLink className="h-4 w-4" />
                  </a>
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
                        return (
                          <motion.div
                            key={newsItem.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.05 }}
                            onClick={() => handleNewsClick(newsItem)}
                            className="group cursor-pointer"
                          >
                            <div className="bg-card rounded-lg overflow-hidden border border-border hover:border-primary/50 transition-all duration-300 hover:shadow-lg h-full flex flex-col">
                              {/* Image */}
                              {newsItem.image_url && (
                                <div className="relative w-full h-48 overflow-hidden">
                                  <img
                                    src={newsItem.image_url}
                                    alt={content.title}
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
                                    <span>{formatDate(newsItem.published_at)}</span>
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
