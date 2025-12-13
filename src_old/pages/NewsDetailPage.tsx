import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Calendar, Tag, ExternalLink, ArrowLeft } from 'lucide-react';
import { useTranslations } from '../contexts/TranslationContext';
import { getNewsBySlug } from '../integrations/supabase/client';
import type { NewsItem } from '../integrations/supabase/types';

export const NewsDetailPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const { currentLanguage } = useTranslations();
  const [news, setNews] = useState<NewsItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const loadNews = async () => {
      if (!slug) {
        setError(true);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const lang = currentLanguage.toLowerCase() as 'en' | 'no' | 'ua';
        const data = await getNewsBySlug(slug, lang);

        if (!data) {
          setError(true);
        } else {
          setNews(data);
        }
      } catch (err) {
        console.error('Failed to load news:', err);
        setError(true);
      } finally {
        setLoading(false);
      }
    };

    loadNews();
  }, [slug, currentLanguage]);

  const getTranslatedContent = (newsItem: NewsItem) => {
    const lang = currentLanguage.toLowerCase() as 'en' | 'no' | 'ua';
    return {
      title: newsItem[`title_${lang}` as keyof NewsItem] || newsItem.title_en || '',
      content: newsItem[`content_${lang}` as keyof NewsItem] || newsItem.content_en || '',
      description: newsItem[`description_${lang}` as keyof NewsItem] || newsItem.description_en || '',
    };
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const lang = currentLanguage.toLowerCase();
    return new Intl.DateTimeFormat(
      lang === 'ua' ? 'uk-UA' : lang === 'no' ? 'nb-NO' : 'en-US',
      {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }
    ).format(date);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error || !news) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <h1 className="text-4xl font-bold mb-4">404</h1>
          <p className="text-xl text-muted-foreground mb-6">News article not found</p>
          <Link
            to="/"
            className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to home
          </Link>
        </div>
      </div>
    );
  }

  const content = getTranslatedContent(news);
  const siteUrl = window.location.origin;
  const newsUrl = `${siteUrl}/news/${slug}`;

  return (
    <>
      <Helmet>
        <title>{content.title} | Vitalii Berbeha</title>
        <meta name="description" content={content.description as string} />

        {/* Open Graph / Facebook */}
        <meta property="og:type" content="article" />
        <meta property="og:url" content={newsUrl} />
        <meta property="og:title" content={content.title as string} />
        <meta property="og:description" content={content.description as string} />
        {news.image_url && <meta property="og:image" content={news.image_url as string} />}

        {/* Twitter */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:url" content={newsUrl} />
        <meta name="twitter:title" content={content.title as string} />
        <meta name="twitter:description" content={content.description as string} />
        {news.image_url && <meta name="twitter:image" content={news.image_url as string} />}

        {/* Article metadata */}
        {news.published_at && (
          <meta property="article:published_time" content={news.published_at} />
        )}
        {news.tags && news.tags.map((tag, index) => (
          <meta key={index} property="article:tag" content={tag} />
        ))}

        {/* Canonical URL */}
        <link rel="canonical" href={newsUrl} />
      </Helmet>

      <div className="min-h-screen bg-background">
        {/* Header with back button */}
        <header className="bg-card border-b border-border">
          <div className="max-w-4xl mx-auto px-4 py-4">
            <Link
              to="/"
              className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to home
            </Link>
          </div>
        </header>

        {/* Article content */}
        <article className="max-w-4xl mx-auto px-4 py-8">
          <style>{`
            .news-media-float {
              width: 100%;
              margin-bottom: 1rem;
            }
            @media (min-width: 640px) {
              .news-media-float {
                width: 100%;
                max-width: 448px;
                float: left;
                margin-right: 1.5rem;
                margin-bottom: 1rem;
              }
            }
          `}</style>

          {/* Video Player */}
          {(news as any).video_url && (
            <div className="news-media-float rounded-xl overflow-hidden bg-black shadow-lg">
              {(news as any).video_type === 'youtube' ? (
                <iframe
                  src={(news as any).video_url}
                  className="w-full aspect-video"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  title="Video"
                />
              ) : (news as any).video_type === 'telegram_embed' ? (
                <iframe
                  src={(news as any).video_url}
                  className="w-full aspect-video"
                  frameBorder="0"
                  scrolling="no"
                  title="Telegram Video"
                />
              ) : (
                <video
                  src={(news as any).video_url}
                  controls
                  className="w-full aspect-video"
                  playsInline
                  preload="metadata"
                >
                  <source src={(news as any).video_url} type="video/mp4" />
                  Your browser does not support the video tag.
                </video>
              )}
            </div>
          )}

          {/* Image */}
          {!((news as any).video_url) && news.image_url && (
            <div className="news-media-float rounded-xl overflow-hidden shadow-lg">
              <img
                src={news.image_url as string}
                alt={String(content.title)}
                className="w-full h-auto object-cover"
                style={{ aspectRatio: '16/9' }}
              />
            </div>
          )}

          {/* Title */}
          <h1 className="text-4xl font-bold mb-4">{content.title}</h1>

          {/* Meta */}
          <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground mb-8">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              <time dateTime={news.published_at || undefined}>
                {news.published_at ? formatDate(news.published_at) : ''}
              </time>
            </div>
            {news.tags && news.tags.length > 0 && (
              <div className="flex items-center gap-2 flex-wrap">
                <Tag className="h-4 w-4" />
                {news.tags.map((tag, index) => (
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
          <div className="prose prose-lg dark:prose-invert max-w-none mb-8">
            <p className="whitespace-pre-wrap leading-relaxed">{content.content}</p>
          </div>

          {/* Clear float */}
          <div className="clear-both"></div>

          {/* Source Link */}
          {news.original_url && (
            <div className="mt-8 pt-8 border-t border-border">
              <a
                href={news.original_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-primary hover:underline"
              >
                Read original article
                <ExternalLink className="h-4 w-4" />
              </a>
            </div>
          )}
        </article>
      </div>
    </>
  );
};
