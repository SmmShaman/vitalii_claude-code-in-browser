'use client'

import { useState, useEffect, memo } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, Newspaper, Video, Image } from 'lucide-react';
import { useTranslations } from '@/contexts/TranslationContext';
import { getLatestNews } from '@/integrations/supabase/client';
import type { LatestNews } from '@/integrations/supabase/types';

interface NewsSectionProps {
  isExpanded?: boolean;
}

// Helper function to extract YouTube video ID from URL
const getYouTubeVideoId = (url: string): string | null => {
  if (!url) return null;
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\s]+)/,
    /^([a-zA-Z0-9_-]{11})$/
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
  return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
};

const NewsSectionComponent = ({ isExpanded = false }: NewsSectionProps) => {
  const router = useRouter();
  const { t, currentLanguage } = useTranslations();
  const [news, setNews] = useState<LatestNews[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadNews();
  }, []);

  useEffect(() => {
    if (news.length > 0) {
      loadNews();
    }
  }, [isExpanded]);

  const loadNews = async () => {
    try {
      setLoading(true);
      const limit = isExpanded ? 8 : 3;
      const data = await getLatestNews(limit);
      setNews(data);
    } catch (error) {
      console.error('Failed to load news:', error);
    } finally {
      setLoading(false);
    }
  };

  const getTranslatedContent = (newsItem: LatestNews) => {
    const lang = currentLanguage.toLowerCase() as 'en' | 'no' | 'ua';
    const description = newsItem[`description_${lang}` as keyof typeof newsItem] || newsItem.description_en || '';
    const title = newsItem[`title_${lang}` as keyof typeof newsItem] || newsItem.title_en || '';
    return {
      title: title as string,
      summary: description as string,
    };
  };

  const getSlug = (newsItem: LatestNews) => {
    const lang = currentLanguage.toLowerCase() as 'en' | 'no' | 'ua';
    return (newsItem as any)[`slug_${lang}`] || (newsItem as any).slug_en || newsItem.id;
  };

  const handleNewsClick = (newsItem: LatestNews, e: React.MouseEvent) => {
    e.stopPropagation();
    const slug = getSlug(newsItem);
    router.push(`/news/${slug}`);
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
    <div className="h-full flex">
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
                    <div className="flex-1 flex flex-col justify-between min-w-0">
                      <div>
                        <h4 className="font-bold text-sm mb-1.5 line-clamp-2 group-hover:text-primary transition-colors leading-tight">
                          {content.title}
                        </h4>
                        {content.summary && (
                          <p className="text-xs text-muted-foreground mb-2 line-clamp-2 leading-snug">
                            {content.summary}
                          </p>
                        )}
                      </div>
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3 flex-shrink-0" />
                            <span>{newsItem.published_at ? formatDate(newsItem.published_at) : ''}</span>
                          </div>
                          {newsItem.video_url && (
                            <div className="flex items-center gap-1 text-primary">
                              <Video className="h-3 w-3 flex-shrink-0" />
                              <span className="text-xs">Video</span>
                            </div>
                          )}
                          {!newsItem.video_url && newsItem.image_url && (
                            <div className="flex items-center gap-1">
                              <Image className="h-3 w-3 flex-shrink-0" />
                            </div>
                          )}
                        </div>
                        {newsItem.tags && newsItem.tags.length > 0 && (
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {newsItem.tags.slice(0, 3).map((tag, i) => (
                              <span key={i} className="px-1.5 py-0.5 bg-primary/10 text-primary text-xs rounded-full">
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                    {(newsItem.image_url || newsItem.video_url) && (
                      <div className="relative w-24 h-24 flex-shrink-0 rounded-lg overflow-hidden bg-slate-900">
                        {(() => {
                          if (newsItem.image_url) {
                            return (
                              <img
                                src={newsItem.image_url}
                                alt={String(content.title)}
                                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                              />
                            );
                          }
                          if (newsItem.video_url) {
                            if (newsItem.video_type === 'youtube' || newsItem.video_url.includes('youtube.com') || newsItem.video_url.includes('youtu.be')) {
                              const thumbnailUrl = getYouTubeThumbnail(newsItem.video_url);
                              if (thumbnailUrl) {
                                return (
                                  <img
                                    src={thumbnailUrl}
                                    alt={String(content.title)}
                                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                                  />
                                );
                              }
                            }
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
                          return (
                            <div className="w-full h-full bg-gradient-to-br from-slate-700 via-slate-600 to-slate-700 flex items-center justify-center">
                              <Video className="w-8 h-8 text-white/30" />
                            </div>
                          );
                        })()}
                        {newsItem.video_url && (
                          <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                            <div className="w-10 h-10 rounded-full bg-white/90 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
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

export const NewsSection = memo(NewsSectionComponent, (prevProps, nextProps) => {
  return prevProps.isExpanded === nextProps.isExpanded;
});
