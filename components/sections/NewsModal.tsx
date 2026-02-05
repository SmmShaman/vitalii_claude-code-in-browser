'use client'

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import { X, Search, Calendar, Tag, ExternalLink, ChevronLeft, ChevronRight, Filter } from 'lucide-react';
import { useTranslations } from '@/contexts/TranslationContext';
import { getAllNews, getAllTags, getNewsById } from '@/integrations/supabase/client';
import { ImageLightbox, useLightbox, LightboxImage } from '@/components/ui/ImageLightbox';
import type { NewsItem, LatestNews } from '@/integrations/supabase/types';

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
  const { isOpen: lightboxOpen, currentIndex, images: lightboxImages, openWithImage, closeLightbox, setImages } = useLightbox();

  // Get all images for the selected news item
  const getNewsImages = useCallback((newsItem: NewsItem | null): LightboxImage[] => {
    if (!newsItem) return [];
    const imageList: LightboxImage[] = [];
    const heroImage = (newsItem as any).processed_image_url || newsItem.image_url;
    const title = newsItem.title_en || 'News';
    if (heroImage) {
      imageList.push({ src: heroImage, alt: title });
    }
    // Add additional images if available
    if ((newsItem as any).images && Array.isArray((newsItem as any).images)) {
      (newsItem as any).images.forEach((img: string, index: number) => {
        if (img !== heroImage) {
          imageList.push({ src: img, alt: `${title} - Image ${index + 1}` });
        }
      });
    }
    return imageList;
  }, []);

  // Handle image click for lightbox
  const handleImageClick = useCallback((imageSrc: string, newsItem: NewsItem | null) => {
    const images = getNewsImages(newsItem);
    setImages(images);
    openWithImage(imageSrc, images);
  }, [getNewsImages, openWithImage, setImages]);

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

  console.log('🔍 NewsModal RENDER - isOpen:', isOpen, 'selectedNews:', !!selectedNews, 'selectedNewsId:', selectedNewsId);

  if (!isOpen) {
    console.log('❌ NewsModal NOT RENDERING - isOpen is false');
    return null;
  }

  console.log('✅ NewsModal IS RENDERING - isOpen is true');

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
                  console.log('🔍 NEWS LAYOUT DEBUG:');
                  console.log('📱 Window width:', window.innerWidth);
                  console.log('📱 Window height:', window.innerHeight);
                  console.log('🖥️ Is Desktop (≥640px)?', window.innerWidth >= 640);
                  console.log('📰 Selected news:', selectedNews);
                  console.log('🎥 Has video?', !!(selectedNews as any).video_url);
                  console.log('🖼️ Has image?', !!selectedNews.image_url);
                  return null;
                })()}
                <style>{`
                  /* Mobile: Stack layout */
                  .news-detail-grid {
                    display: flex;
                    flex-direction: column;
                    gap: 1rem;
                    border: 2px solid red; /* DEBUG */
                  }

                  .news-media-container {
                    width: 100%;
                    border: 2px solid blue; /* DEBUG */
                  }

                  .news-title {
                    border: 2px solid green; /* DEBUG */
                  }

                  .news-meta {
                    border: 2px solid orange; /* DEBUG */
                  }

                  .news-content {
                    border: 2px solid purple; /* DEBUG */
                  }

                  .news-links {
                    border: 2px solid yellow; /* DEBUG */
                  }

                  /* Desktop: Grid layout with media on left, content on right */
                  @media (min-width: 640px) {
                    .news-detail-grid {
                      display: grid;
                      grid-template-columns: 448px 1fr;
                      gap: 1.5rem;
                      grid-template-areas:
                        "media title"
                        "media meta"
                        "media content"
                        "links links";
                      border: 2px solid lime; /* DEBUG - grid active */
                    }

                    .news-media-container {
                      grid-area: media;
                      width: 448px;
                      border: 2px solid cyan; /* DEBUG */
                    }

                    .news-title {
                      grid-area: title;
                      border: 2px solid magenta; /* DEBUG */
                    }

                    .news-meta {
                      grid-area: meta;
                      border: 2px solid pink; /* DEBUG */
                    }

                    .news-content {
                      grid-area: content;
                      grid-column: 1 / -1; /* Span both columns after media ends */
                      border: 2px solid brown; /* DEBUG */
                    }

                    .news-links {
                      grid-area: links;
                      border: 2px solid teal; /* DEBUG */
                    }
                  }
                `}</style>

                <div className="news-detail-grid" onClick={() => {
                  console.log('🖱️ CLICKED on grid container');
                  console.log('📐 Grid container width:', document.querySelector('.news-detail-grid')?.clientWidth);
                  console.log('📐 Grid computed style:', window.getComputedStyle(document.querySelector('.news-detail-grid')!).display);
                }}>
                  {/* Video Player or Image */}
                  {((selectedNews as any).video_url || (selectedNews as any).processed_image_url || selectedNews.image_url) && (
                    <div className="news-media-container rounded-xl overflow-hidden shadow-lg">
                      {(selectedNews as any).video_url ? (
                        <div className="bg-black">
                          {(selectedNews as any).video_type === 'youtube' ? (
                            <iframe
                              src={(selectedNews as any).video_url}
                              className="w-full aspect-video"
                              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                              allowFullScreen
                              title="Video"
                            />
                          ) : (selectedNews as any).video_type === 'telegram_embed' ? (
                            (() => {
                              const videoUrl = (selectedNews as any).video_url;
                              const channelMatch = videoUrl.match(/t\.me\/([^/]+)\/(\d+)/);
                              const channelName = channelMatch ? channelMatch[1] : 'Telegram';
                              const messageId = channelMatch ? channelMatch[2] : '';
                              const telegramDirectUrl = `https://t.me/${channelName}/${messageId}`;

                              return (
                                <div className="w-full aspect-video bg-gradient-to-br from-[#2AABEE] to-[#229ED9] flex flex-col items-center justify-center relative overflow-hidden">
                                  {/* Background pattern */}
                                  <div className="absolute inset-0 opacity-10">
                                    <div className="absolute top-4 left-4 w-20 h-20 rounded-full bg-white/20" />
                                    <div className="absolute bottom-8 right-8 w-32 h-32 rounded-full bg-white/10" />
                                    <div className="absolute top-1/2 left-1/4 w-16 h-16 rounded-full bg-white/15" />
                                  </div>

                                  {/* Telegram logo */}
                                  <div className="relative z-10 mb-4">
                                    <svg className="w-16 h-16 text-white" viewBox="0 0 24 24" fill="currentColor">
                                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.74-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z"/>
                                    </svg>
                                  </div>

                                  {/* Channel name */}
                                  <p className="relative z-10 text-white/90 text-sm mb-4 font-medium">
                                    @{channelName}
                                  </p>

                                  {/* Watch button */}
                                  <a
                                    href={telegramDirectUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="relative z-10 inline-flex items-center gap-2 px-6 py-3 bg-white text-[#2AABEE] font-semibold rounded-full hover:bg-white/90 transition-all duration-200 shadow-lg hover:shadow-xl hover:scale-105"
                                  >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    Дивитись в Telegram
                                  </a>
                                </div>
                              );
                            })()
                          ) : (
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
                      ) : ((selectedNews as any).processed_image_url || selectedNews.image_url) && (
                        <button
                          type="button"
                          onClick={() => handleImageClick(
                            ((selectedNews as any).processed_image_url || selectedNews.image_url) as string,
                            selectedNews
                          )}
                          className="w-full cursor-zoom-in focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                          aria-label={`View ${getTranslatedContent(selectedNews).title} image in fullscreen`}
                        >
                          <img
                            src={((selectedNews as any).processed_image_url || selectedNews.image_url) as string}
                            alt={String(getTranslatedContent(selectedNews).title)}
                            className="w-full h-auto object-cover hover:opacity-95 transition-opacity"
                            style={{ aspectRatio: '16/9' }}
                          />
                        </button>
                      )}
                    </div>
                  )}

                  {/* Title */}
                  <h1 className="news-title text-3xl font-bold mb-4">
                    {getTranslatedContent(selectedNews).title}
                  </h1>

                  {/* Meta */}
                  <div className="news-meta flex flex-wrap items-center gap-4 text-sm text-muted-foreground mb-6">
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

                  {/* Content */}
                  <div className="news-content prose prose-lg dark:prose-invert max-w-none mb-6">
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
                      {getTranslatedContent(selectedNews).content}
                    </ReactMarkdown>
                  </div>

                  {/* Links Section */}
                  <div className="news-links">
                    {/* SEO Link - View full article on separate page */}
                    {(() => {
                      const slug = getNewsSlug(selectedNews);
                      if (slug) {
                        return (
                          <div className="mt-6 pt-6 border-t border-border">
                            <Link
                              href={`/news/${slug}`}
                              className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-medium"
                            >
                              {t('news_view_full_article')}
                              <ExternalLink className="h-4 w-4" />
                            </Link>
                          </div>
                        );
                      }
                      return null;
                    })()}

                    {/* Source Link - prefer source_link over original_url */}
                    {((selectedNews as any).source_link || selectedNews.original_url) && (
                      <div className={getNewsSlug(selectedNews) ? "mt-4" : "mt-6 pt-6 border-t border-border"}>
                        <a
                          href={(selectedNews as any).source_link || selectedNews.original_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors text-sm"
                        >
                          {t('news_read_more')}
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      </div>
                    )}
                  </div>
                </div>
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
                              href={slug ? `/news/${slug}` : '#'}
                              onClick={(e) => {
                                if (!slug) {
                                  e.preventDefault();
                                  handleNewsClick(newsItem);
                                }
                              }}
                              className="block bg-card rounded-lg overflow-hidden border border-border hover:border-primary/50 transition-all duration-300 hover:shadow-lg h-full flex flex-col cursor-pointer"
                            >
                              {/* Image */}
                              {((newsItem as any).processed_image_url || newsItem.image_url) && (
                                <div className="relative w-full h-48 overflow-hidden">
                                  <img
                                    src={((newsItem as any).processed_image_url || newsItem.image_url) as string}
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

        {/* Lightbox for fullscreen image viewing */}
        <ImageLightbox
          images={lightboxImages}
          isOpen={lightboxOpen}
          onClose={closeLightbox}
          currentIndex={currentIndex}
        />
      </motion.div>
    </AnimatePresence>
  );
};
