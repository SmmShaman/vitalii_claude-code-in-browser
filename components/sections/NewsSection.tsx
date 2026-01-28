'use client'

import { useState, useEffect, memo, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, Newspaper, ChevronLeft, Tag, ExternalLink, Video, Image, Loader2 } from 'lucide-react';
import { useTranslations } from '@/contexts/TranslationContext';
import { getLatestNews, getNewsById, getAllNews } from '@/integrations/supabase/client';
import type { LatestNews, NewsItem } from '@/integrations/supabase/types';

interface NewsSectionProps {
  isExpanded?: boolean;
  selectedNewsId?: string | null;
  onNewsSelect?: (newsId: string) => void;
  onBack?: () => void;
}

// Helper function to extract YouTube video ID from URL
const getYouTubeVideoId = (url: string): string | null => {
  if (!url) return null;

  // Handle different YouTube URL formats
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\s]+)/,
    /^([a-zA-Z0-9_-]{11})$/ // Direct video ID
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }

  return null;
};

// Helper function to get YouTube thumbnail URL
const getYouTubeThumbnail = (videoUrl: string): string | null => {
  const videoId = getYouTubeVideoId(videoUrl);
  if (!videoId) return null;

  // Use high quality thumbnail (hqdefault = 480x360)
  return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
};

const NewsSectionComponent = ({
  isExpanded = false,
  selectedNewsId = null,
  onNewsSelect,
  onBack
}: NewsSectionProps) => {
  const { t, currentLanguage } = useTranslations();
  const [news, setNews] = useState<LatestNews[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedNews, setSelectedNews] = useState<NewsItem | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [hasMoreNews, setHasMoreNews] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadNews();
  }, []);

  // Reload news when expanded state changes for optimization
  useEffect(() => {
    if (news.length > 0) {
      loadNews();
    }
  }, [isExpanded]);

  useEffect(() => {
    if (selectedNewsId) {
      loadNewsDetail(selectedNewsId);
    } else {
      setSelectedNews(null);
    }
  }, [selectedNewsId]);

  // Update URL with SEO-friendly slug when news data loads
  useEffect(() => {
    if (selectedNews && selectedNewsId) {
      const lang = currentLanguage.toLowerCase() as 'en' | 'no' | 'ua';
      const slug = (selectedNews as any)[`slug_${lang}`] || (selectedNews as any).slug_en;

      console.log('🔗 URL SLUG DEBUG:');
      console.log('📰 Selected news:', selectedNews);
      console.log('🌍 Current language:', lang);
      console.log('🔗 Slug for language:', slug);
      console.log('🔗 All slugs:', {
        slug_en: (selectedNews as any).slug_en,
        slug_no: (selectedNews as any).slug_no,
        slug_ua: (selectedNews as any).slug_ua
      });

      if (slug) {
        // Replace URL with slug instead of ID for SEO
        console.log('✅ Replacing URL with slug:', `/news/${slug}`);
        window.history.replaceState({}, '', `/news/${slug}`);
      } else {
        console.warn('⚠️ No slug found for this news article!');
      }
    }
  }, [selectedNews, selectedNewsId, currentLanguage]);

  const loadNewsDetail = async (id: string) => {
    try {
      setLoadingDetail(true);
      const newsDetail = await getNewsById(id);
      setSelectedNews(newsDetail);
    } catch (error) {
      console.error('Failed to load news detail:', error);
    } finally {
      setLoadingDetail(false);
    }
  };

  const loadNews = async () => {
    try {
      setLoading(true);
      // Load fewer items when not expanded for better performance
      const limit = isExpanded ? 8 : 3;
      const data = await getLatestNews(limit);
      setNews(data);
      setHasMoreNews(true); // Reset when reloading
    } catch (error) {
      console.error('Failed to load news:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadMoreNews = useCallback(async () => {
    if (loadingMore || !hasMoreNews || !isExpanded) return;
    setLoadingMore(true);

    try {
      const offset = news.length;
      const { data, count } = await getAllNews({ limit: 8, offset });

      if (data.length === 0 || news.length + data.length >= (count || 0)) {
        setHasMoreNews(false);
      }

      // Transform data to match LatestNews type
      const transformedData: LatestNews[] = data.map((item: any) => ({
        id: item.id,
        title_en: item.title_en,
        title_no: item.title_no,
        title_ua: item.title_ua,
        description_en: item.description_en,
        description_no: item.description_no,
        description_ua: item.description_ua,
        image_url: item.image_url,
        original_url: item.original_url,
        source_link: item.source_link,
        tags: item.tags,
        published_at: item.published_at,
        views_count: item.views_count ?? 0,
        source_name: item.source_name ?? null,
        source_category: item.source_category ?? null,
        video_url: item.video_url,
        video_type: item.video_type,
      }));

      setNews(prev => [...prev, ...transformedData]);
    } catch (error) {
      console.error('Failed to load more news:', error);
    } finally {
      setLoadingMore(false);
    }
  }, [loadingMore, hasMoreNews, isExpanded, news.length]);

  // Scroll handler for infinite scroll
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container || !isExpanded) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container;
      const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;

      if (isNearBottom && hasMoreNews && !loadingMore) {
        loadMoreNews();
      }
    };

    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, [isExpanded, hasMoreNews, loadingMore, loadMoreNews]);

  const getTranslatedContent = (newsItem: LatestNews | NewsItem) => {
    const lang = currentLanguage.toLowerCase() as 'en' | 'no' | 'ua';
    const description = newsItem[`description_${lang}` as keyof typeof newsItem] || newsItem.description_en || '';

    // Fallback chain for content: translated -> english -> original content
    const content = 'content_en' in newsItem
      ? newsItem[`content_${lang}` as keyof typeof newsItem] || newsItem.content_en || (newsItem as any).original_content || description
      : description;

    // Fallback chain for title: translated -> english -> original title
    const title = newsItem[`title_${lang}` as keyof typeof newsItem]
      || newsItem.title_en
      || (newsItem as any).original_title
      || '';

    return {
      title: title as string,
      content: content as string,
      summary: description as string,
    };
  };

  const handleNewsClick = (newsItem: LatestNews, e: React.MouseEvent) => {
    // If section is not expanded, let the event bubble to card to expand it first
    if (!isExpanded) {
      // Don't stop propagation - allow card onClick to expand News
      return;
    }

    // Section is expanded, stop bubbling and open fullscreen
    e.stopPropagation();

    // Call the callback to notify parent
    if (onNewsSelect) {
      onNewsSelect(newsItem.id);
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

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          <p className="text-sm text-muted-foreground">{t('news_loading')}</p>
        </div>
      </div>
    );
  }

  if (news.length === 0) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <Newspaper className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">{t('news_no_items')}</p>
        </div>
      </div>
    );
  }

  // Show full news detail if selected
  if (selectedNews) {
    const content = getTranslatedContent(selectedNews);
    console.log('📰 NewsSection Detail View - selectedNews:', selectedNews);
    console.log('🎥 Video URL:', (selectedNews as any).video_url);
    console.log('🖼️ Image URL:', selectedNews.image_url);
    console.log('📝 Content:', content);
    return (
      <div className="h-full flex flex-col overflow-y-auto">
        {/* Floating Back Button - Sticky at top-right */}
        <div className="sticky top-0 right-0 z-50 flex justify-end pointer-events-none -mb-14">
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={onBack}
            className="pointer-events-auto m-2 sm:m-4 w-11 h-11 sm:w-12 sm:h-12 min-w-[44px] min-h-[44px] rounded-full bg-white/95 dark:bg-slate-800/95 backdrop-blur-sm shadow-lg flex items-center justify-center text-slate-700 dark:text-slate-200 hover:bg-white dark:hover:bg-slate-800 transition-all duration-300 border border-slate-200 dark:border-slate-700 active:scale-95"
            title="Back to news"
            aria-label="Back to news list"
          >
            <ChevronLeft className="h-5 w-5 sm:h-6 sm:w-6" />
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
            <style>{`
              /* Mobile: Stack layout */
              .news-section-detail-grid {
                display: flex;
                flex-direction: column;
                gap: 0.75rem;
              }

              .news-section-media-container {
                width: 100%;
                max-width: 100%;
              }

              /* Tablet: Responsive grid layout */
              @media (min-width: 640px) {
                .news-section-detail-grid {
                  display: grid;
                  grid-template-columns: 1fr;
                  gap: 1rem;
                  grid-template-areas:
                    "media"
                    "title"
                    "meta"
                    "content"
                    "links";
                }

                .news-section-media-container {
                  grid-area: media;
                  width: 100%;
                  max-width: 100%;
                }
              }

              /* Medium screens: Side-by-side layout */
              @media (min-width: 768px) {
                .news-section-detail-grid {
                  grid-template-columns: minmax(280px, 45%) 1fr;
                  gap: 1.5rem;
                  grid-template-areas:
                    "media title"
                    "media meta"
                    "content content"
                    "links links";
                }

                .news-section-media-container {
                  grid-area: media;
                  width: 100%;
                }

                .news-section-title {
                  grid-area: title;
                }

                .news-section-meta {
                  grid-area: meta;
                }

                .news-section-content {
                  grid-area: content;
                }

                .news-section-links {
                  grid-area: links;
                }
              }

              /* Large screens: Fixed media width */
              @media (min-width: 1024px) {
                .news-section-detail-grid {
                  grid-template-columns: 400px 1fr;
                }

                .news-section-media-container {
                  width: 400px;
                }
              }
            `}</style>

            <div className="news-section-detail-grid">
              {/* Video Player or Image */}
              {((selectedNews as any).video_url || (selectedNews as any).processed_image_url || selectedNews.image_url) && (
                <div className="news-section-media-container rounded-xl overflow-hidden shadow-lg">
                  {(selectedNews as any).video_url ? (
                    <div className="bg-black">
                      {(() => {
                        const videoUrl = (selectedNews as any).video_url;
                        const videoType = (selectedNews as any).video_type;

                        if (videoType === 'youtube') {
                          return (
                            <iframe
                              src={videoUrl}
                              className="w-full aspect-video"
                              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                              allowFullScreen
                              title="Video"
                            />
                          );
                        } else if (videoType === 'telegram_embed') {
                          // Extract channel name from URL like https://t.me/channel/123?embed=1
                          const channelMatch = videoUrl.match(/t\.me\/([^/]+)\/(\d+)/);
                          const channelName = channelMatch ? channelMatch[1] : 'Telegram';
                          const messageId = channelMatch ? channelMatch[2] : '';
                          // Direct link to Telegram post (without embed params)
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
                        } else {
                          return (
                            <video
                              src={videoUrl}
                              controls
                              controlsList="nodownload"
                              className="w-full aspect-video"
                              playsInline
                              preload="metadata"
                            >
                              <source src={videoUrl} type="video/mp4" />
                              Your browser does not support the video tag.
                            </video>
                          );
                        }
                      })()}
                    </div>
                  ) : ((selectedNews as any).processed_image_url || selectedNews.image_url) && (
                    <img
                      src={((selectedNews as any).processed_image_url || selectedNews.image_url) as string}
                      alt={String(content.title)}
                      loading="eager"
                      className="w-full h-auto object-cover"
                      style={{ aspectRatio: '16/9' }}
                    />
                  )}
                </div>
              )}

              {/* Title */}
              <h1 className="news-section-title text-3xl font-bold mb-4 text-foreground">
                {content.title}
              </h1>

              {/* Meta */}
              <div className="news-section-meta flex flex-wrap items-center gap-4 text-sm text-muted-foreground mb-6">
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
              <div className="news-section-content prose prose-lg dark:prose-invert max-w-none mb-6 text-foreground">
                <p className="whitespace-pre-wrap">{content.content}</p>
              </div>

              {/* Links Section - prefer source_link over original_url */}
              <div className="news-section-links">
                {((selectedNews as any).source_link || selectedNews.original_url) && (
                  <a
                    href={(selectedNews as any).source_link || selectedNews.original_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-primary hover:underline"
                  >
                    {t('news_read_more')}
                    <ExternalLink className="h-4 w-4" />
                  </a>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </div>
    );
  }

  return (
    <div className="h-full flex">
      {/* News List */}
      <div ref={scrollContainerRef} className="flex-1 flex flex-col gap-2 overflow-y-auto pr-2">
          <AnimatePresence mode="popLayout">
            {news.map((newsItem, index) => {
              const content = getTranslatedContent(newsItem);
              return (
                <motion.div
                  key={newsItem.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ delay: index * 0.1 }}
                  onClick={(e) => handleNewsClick(newsItem, e)}
                  className="group cursor-pointer"
                >
                  <div className="bg-card/50 backdrop-blur-sm rounded-lg p-3 border border-border/50 hover:border-primary/50 transition-all duration-300 hover:shadow-lg">
                    <div className="flex gap-3">
                      {/* Content - Left Side */}
                      <div className="flex-1 flex flex-col justify-between min-w-0">
                        {/* Title */}
                        <div>
                          <h4 className="font-bold text-sm mb-1.5 line-clamp-2 group-hover:text-primary transition-colors leading-tight">
                            {content.title}
                          </h4>

                          {/* Summary */}
                          {content.summary && (
                            <p className="text-xs text-muted-foreground mb-2 line-clamp-2 leading-snug">
                              {content.summary}
                            </p>
                          )}
                        </div>

                        {/* Meta Information - Bottom */}
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <Calendar className="h-3 w-3 flex-shrink-0" />
                              <span>{newsItem.published_at ? formatDate(newsItem.published_at) : ''}</span>
                            </div>
                            {/* Video or Image icon indicator */}
                            {newsItem.video_url && (
                              <div className="flex items-center gap-1 text-primary">
                                <Video className="h-3 w-3 flex-shrink-0" />
                                <span className="text-xs">Video</span>
                              </div>
                            )}
                            {!newsItem.video_url && ((newsItem as any).processed_image_url || newsItem.image_url) && (
                              <div className="flex items-center gap-1">
                                <Image className="h-3 w-3 flex-shrink-0" />
                              </div>
                            )}
                          </div>

                          {newsItem.tags && newsItem.tags.length > 0 && (
                            <div className="flex items-center gap-1.5 flex-wrap">
                              {newsItem.tags.slice(0, 3).map((tag, i) => (
                                <span
                                  key={i}
                                  className="px-1.5 py-0.5 bg-primary/10 text-primary text-xs rounded-full"
                                >
                                  {tag}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Square Image/Video Thumbnail - Right Side */}
                      {((newsItem as any).processed_image_url || newsItem.image_url || newsItem.video_url) && (
                        <div className="relative w-24 h-24 flex-shrink-0 rounded-lg overflow-hidden bg-slate-900">
                          {(() => {
                            // Priority 1: Use custom uploaded image if available
                            const imageUrl = (newsItem as any).processed_image_url || newsItem.image_url;
                            if (imageUrl) {
                              return (
                                <img
                                  src={imageUrl}
                                  alt={String(content.title)}
                                  loading="lazy"
                                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                                />
                              );
                            }

                            // Priority 2: Generate thumbnail from video
                            if (newsItem.video_url) {
                              // For YouTube videos - use YouTube thumbnail
                              if (newsItem.video_type === 'youtube' || newsItem.video_url.includes('youtube.com') || newsItem.video_url.includes('youtu.be')) {
                                const thumbnailUrl = getYouTubeThumbnail(newsItem.video_url);
                                if (thumbnailUrl) {
                                  return (
                                    <img
                                      src={thumbnailUrl}
                                      alt={String(content.title)}
                                      loading="lazy"
                                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                                    />
                                  );
                                }
                              }

                              // For direct video URLs and Telegram - use video element as thumbnail
                              if (newsItem.video_type === 'direct_url' || newsItem.video_url.includes('.mp4') || newsItem.video_url.includes('telesco.pe')) {
                                return (
                                  <video
                                    src={newsItem.video_url}
                                    className="w-full h-full object-cover"
                                    preload={isExpanded ? "metadata" : "none"}
                                    muted
                                    playsInline
                                  />
                                );
                              }
                            }

                            // Fallback: gradient placeholder
                            return (
                              <div className="w-full h-full bg-gradient-to-br from-slate-700 via-slate-600 to-slate-700 flex items-center justify-center">
                                <Video className="w-8 h-8 text-white/30" />
                              </div>
                            );
                          })()}

                          {/* Play button overlay for videos */}
                          {newsItem.video_url && (
                            <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                              <div className="w-10 h-10 rounded-full bg-white/90 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                                <svg className="w-5 h-5 text-black ml-0.5" fill="currentColor" viewBox="0 0 16 16">
                                  <path d="M4 2v12l10-6L4 2z"/>
                                </svg>
                              </div>
                            </div>
                          )}

                          {/* Hover overlay gradient */}
                          <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>

          {/* Loading indicator for infinite scroll */}
          {isExpanded && loadingMore && (
            <div className="flex justify-center py-4">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          )}

          {/* End of list indicator */}
          {isExpanded && !hasMoreNews && news.length > 8 && (
            <div className="text-center py-4 text-sm text-muted-foreground">
              {t('news_scroll_for_more')}
            </div>
          )}
        </div>
      </div>
  );
};

// Optimize re-renders by only updating when key props change
export const NewsSection = memo(NewsSectionComponent, (prevProps, nextProps) => {
  // Only re-render if these props actually changed
  return (
    prevProps.isExpanded === nextProps.isExpanded &&
    prevProps.selectedNewsId === nextProps.selectedNewsId
  );
});
