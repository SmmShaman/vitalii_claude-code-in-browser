import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, Newspaper } from 'lucide-react';
import { useTranslations } from '../../contexts/TranslationContext';
import { getLatestNews } from '../../integrations/supabase/client';
import type { LatestNews } from '../../integrations/supabase/types';
import { NewsModal } from './NewsModal';

interface NewsSectionProps {
  isExpanded?: boolean;
}

export const NewsSection = ({ isExpanded = false }: NewsSectionProps) => {
  const { t, currentLanguage } = useTranslations();
  const [news, setNews] = useState<LatestNews[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedNews, setSelectedNews] = useState<LatestNews | null>(null);

  useEffect(() => {
    loadNews();
  }, []);

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

  const getTranslatedContent = (newsItem: LatestNews) => {
    const lang = currentLanguage.toLowerCase() as 'en' | 'no' | 'ua';
    const description = newsItem[`description_${lang}`] || newsItem.description_en || '';
    return {
      title: newsItem[`title_${lang}`] || newsItem.title_en || '',
      content: description,
      summary: description,
    };
  };

  const handleNewsClick = (newsItem: LatestNews) => {
    // Only open modal if section is expanded
    if (!isExpanded) return;

    setSelectedNews(newsItem);
    setShowModal(true);
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

  return (
    <>
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
                  onClick={() => handleNewsClick(newsItem)}
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
                            alt={content.title}
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

      {/* News Modal */}
      <NewsModal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
          setSelectedNews(null);
        }}
        selectedNewsId={selectedNews?.id}
      />
    </>
  );
};
