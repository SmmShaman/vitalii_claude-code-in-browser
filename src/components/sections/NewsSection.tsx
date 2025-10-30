import { useState, useEffect, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, Newspaper, ChevronLeft, Tag, ExternalLink } from 'lucide-react';
import { useTranslations } from '../../contexts/TranslationContext';
import { getLatestNews, getNewsById } from '../../integrations/supabase/client';
import type { LatestNews, NewsItem } from '../../integrations/supabase/types';

interface NewsSectionProps {
  isExpanded?: boolean;
  selectedNewsId?: string | null;
  onNewsSelect?: (newsId: string) => void;
  onBack?: () => void;
}

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

  useEffect(() => {
    loadNews();
  }, []);

  useEffect(() => {
    if (selectedNewsId) {
      loadNewsDetail(selectedNewsId);
    } else {
      setSelectedNews(null);
    }
  }, [selectedNewsId]);

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
      const data = await getLatestNews(8); // Increased from 3 to 8
      setNews(data);
    } catch (error) {
      console.error('Failed to load news:', error);
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
    return (
      <div className="h-full flex flex-col overflow-y-auto">
        {/* Back Button */}
        <div className="flex-shrink-0 mb-4">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onBack}
            className="flex items-center gap-2 text-primary hover:text-primary/80 transition-colors"
          >
            <ChevronLeft className="h-5 w-5" />
            <span className="font-medium">Back to news</span>
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
            {/* Video Player (if video exists) */}
            {(selectedNews as any).video_url && (
              <div className="w-full mb-6 rounded-xl overflow-hidden bg-black">
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

            {/* Image (only if no video) */}
            {!((selectedNews as any).video_url) && selectedNews.image_url && (
              <div className="w-full h-64 rounded-xl overflow-hidden mb-6">
                <img
                  src={selectedNews.image_url as string}
                  alt={String(content.title)}
                  className="w-full h-full object-cover"
                />
              </div>
            )}

            {/* Title */}
            <h1 className="text-3xl font-bold mb-4 text-foreground">
              {content.title}
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

            {/* Content */}
            <div className="prose prose-lg dark:prose-invert max-w-none mb-6 text-foreground">
              <p className="whitespace-pre-wrap">{content.content}</p>
            </div>

            {/* Source Link */}
            {selectedNews.original_url && (
              <a
                href={selectedNews.original_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-primary hover:underline"
              >
                {t('news_read_more')}
                <ExternalLink className="h-4 w-4" />
              </a>
            )}
          </motion.div>
        )}
      </div>
    );
  }

  return (
    <div className="h-full flex gap-3">
      {/* Vertical Section Title */}
      <div className="flex items-center">
        <div className="relative flex flex-col items-center">
          {t('news').split('').map((letter: string, i: number) => (
            <span
              key={i}
              className="text-xl font-bold text-primary/60 uppercase leading-tight"
            >
              {letter}
            </span>
          ))}
        </div>
      </div>

      {/* News List */}
      <div className="flex-1 flex flex-col gap-2 overflow-y-auto pr-2">
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
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Calendar className="h-3 w-3 flex-shrink-0" />
                            <span>{newsItem.published_at ? formatDate(newsItem.published_at) : ''}</span>
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
                      {(newsItem.image_url || (newsItem as any).video_url) && (
                        <div className="relative w-24 h-24 flex-shrink-0 rounded-lg overflow-hidden">
                          <img
                            src={newsItem.image_url || 'https://via.placeholder.com/96x96?text=Video'}
                            alt={String(content.title)}
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                          />
                          {(newsItem as any).video_url && (
                            <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                              <div className="w-10 h-10 rounded-full bg-white/90 flex items-center justify-center">
                                <svg className="w-5 h-5 text-black ml-0.5" fill="currentColor" viewBox="0 0 16 16">
                                  <path d="M4 2v12l10-6L4 2z"/>
                                </svg>
                              </div>
                            </div>
                          )}
                          <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                        </div>
                      )}
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
export const NewsSection = memo(NewsSectionComponent, (prevProps, nextProps) => {
  // Only re-render if these props actually changed
  return (
    prevProps.isExpanded === nextProps.isExpanded &&
    prevProps.selectedNewsId === nextProps.selectedNewsId
  );
});
