import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Newspaper, Calendar, Tag, ExternalLink } from 'lucide-react';
import { useTranslations } from '../../contexts/TranslationContext';
import { getLatestNews } from '../../integrations/supabase/client';
import type { LatestNews } from '../../integrations/supabase/types';
import { NewsModal } from './NewsModal';

export const NewsSection = () => {
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
      const data = await getLatestNews(3);
      setNews(data);
    } catch (error) {
      console.error('Failed to load news:', error);
    } finally {
      setLoading(false);
    }
  };

  const getTranslatedContent = (newsItem: LatestNews) => {
    const lang = currentLanguage.toLowerCase() as 'en' | 'no' | 'ua';
    return {
      title: newsItem[`title_${lang}`] || newsItem.title_en,
      content: newsItem[`content_${lang}`] || newsItem.content_en,
      summary: newsItem[`summary_${lang}`] || newsItem.summary_en,
    };
  };

  const handleNewsClick = (newsItem: LatestNews) => {
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
      <div className="h-full flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Newspaper className="h-5 w-5 text-primary" />
            <h3 className="text-xl font-bold">{t('news')}</h3>
          </div>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowModal(true)}
            className="text-sm text-primary hover:underline flex items-center gap-1"
          >
            {t('news_view_all')}
            <ExternalLink className="h-3 w-3" />
          </motion.button>
        </div>

        {/* News Grid */}
        <div className="flex-1 overflow-y-auto space-y-4 pr-2">
          <AnimatePresence mode="popLayout">
            {news.map((newsItem, index) => {
              const content = getTranslatedContent(newsItem);
              return (
                <motion.div
                  key={newsItem.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ delay: index * 0.1 }}
                  onClick={() => handleNewsClick(newsItem)}
                  className="group cursor-pointer"
                >
                  <div className="bg-card/50 backdrop-blur-sm rounded-lg p-4 border border-border/50 hover:border-primary/50 transition-all duration-300 hover:shadow-lg">
                    {/* Image */}
                    {newsItem.image_url && (
                      <div className="relative w-full h-32 mb-3 rounded-md overflow-hidden">
                        <img
                          src={newsItem.image_url}
                          alt={content.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                      </div>
                    )}

                    {/* Title */}
                    <h4 className="font-semibold text-sm mb-2 line-clamp-2 group-hover:text-primary transition-colors">
                      {content.title}
                    </h4>

                    {/* Summary */}
                    {content.summary && (
                      <p className="text-xs text-muted-foreground mb-3 line-clamp-2">
                        {content.summary}
                      </p>
                    )}

                    {/* Meta Information */}
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          <span>{formatDate(newsItem.published_at)}</span>
                        </div>
                        {newsItem.tags && newsItem.tags.length > 0 && (
                          <div className="flex items-center gap-1">
                            <Tag className="h-3 w-3" />
                            <span className="line-clamp-1">{newsItem.tags[0]}</span>
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
