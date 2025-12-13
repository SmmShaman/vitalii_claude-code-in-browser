import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Activity, CheckCircle, XCircle, Clock, Send, Newspaper, Radio, RefreshCw } from 'lucide-react';
import { supabase } from '../../integrations/supabase/client';

interface NewsSource {
  id: string;
  name: string;
  source_type: 'rss' | 'telegram' | 'web';
  is_active: boolean;
  fetch_interval: number;
  last_fetched_at: string | null;
  url: string;
}

interface SourceStats {
  source: NewsSource;
  todayTotal: number;
  todayApproved: number;
  todayRejected: number;
  sentToBot: number;
  nextFetchIn: string;
}

interface RecentNews {
  id: string;
  original_title: string;
  source_name: string;
  source_type: string;
  created_at: string;
  pre_moderation_status: 'pending' | 'approved' | 'rejected';
  rejection_reason: string | null;
  is_published: boolean;
  original_url: string;
}

export const ActivityMonitor = () => {
  const [sourceStats, setSourceStats] = useState<SourceStats[]>([]);
  const [recentNews, setRecentNews] = useState<RecentNews[]>([]);
  const [botQueue, setBotQueue] = useState<RecentNews[]>([]);
  const [rejectedNews, setRejectedNews] = useState<RecentNews[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState<number>(() => {
    // Load from localStorage or default to 30 seconds
    const saved = localStorage.getItem('activityMonitorRefreshInterval');
    return saved ? parseInt(saved) : 30;
  });
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  useEffect(() => {
    loadActivityData();

    // Refresh based on user-selected interval
    // refreshInterval is in seconds, convert to milliseconds
    // If interval is 0, don't auto-refresh
    let interval: number | null = null;

    if (refreshInterval > 0) {
      interval = setInterval(() => {
        loadActivityData();
        setLastRefresh(new Date());
      }, refreshInterval * 1000);
    }

    // Listen for news queue updates (when "Почати роботу" completes)
    const handleNewsUpdate = () => {
      loadActivityData();
      setLastRefresh(new Date());
    };
    window.addEventListener('news-queue-updated', handleNewsUpdate);

    return () => {
      if (interval) clearInterval(interval);
      window.removeEventListener('news-queue-updated', handleNewsUpdate);
    };
  }, [refreshInterval]);

  const loadActivityData = async () => {
    try {
      setLoading(true);

      // Get today's start (used for filtering news from today)
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      // Load all sources
      const { data: sources, error: sourcesError } = await supabase
        .from('news_sources')
        .select('*')
        .order('name');

      if (sourcesError) throw sourcesError;

      // Calculate stats for each source
      const stats: SourceStats[] = await Promise.all(
        (sources || []).map(async (source) => {
          // Count today's news
          const { count: totalCount } = await supabase
            .from('news')
            .select('*', { count: 'exact', head: true })
            .eq('source_id', source.id)
            .gte('created_at', todayStart.toISOString());

          // Count approved
          const { count: approvedCount } = await supabase
            .from('news')
            .select('*', { count: 'exact', head: true })
            .eq('source_id', source.id)
            .eq('pre_moderation_status', 'approved')
            .gte('created_at', todayStart.toISOString());

          // Count rejected
          const { count: rejectedCount } = await supabase
            .from('news')
            .select('*', { count: 'exact', head: true })
            .eq('source_id', source.id)
            .eq('pre_moderation_status', 'rejected')
            .gte('created_at', todayStart.toISOString());

          // Count sent to bot (approved but not published)
          const { count: sentToBotCount } = await supabase
            .from('news')
            .select('*', { count: 'exact', head: true })
            .eq('source_id', source.id)
            .eq('pre_moderation_status', 'approved')
            .eq('is_published', false)
            .gte('created_at', todayStart.toISOString());

          // Calculate next fetch time
          let nextFetchIn = 'Невідомо';
          if (source.last_fetched_at && source.fetch_interval) {
            const lastFetch = new Date(source.last_fetched_at).getTime();
            const intervalMs = source.fetch_interval * 1000;
            const nextFetch = lastFetch + intervalMs;
            const now = Date.now();

            if (now >= nextFetch) {
              nextFetchIn = 'Готовий до перевірки';
            } else {
              const diffMs = nextFetch - now;
              const diffMins = Math.ceil(diffMs / 60000);

              if (diffMins < 60) {
                nextFetchIn = `${diffMins} хв`;
              } else if (diffMins < 1440) {
                const hours = Math.floor(diffMins / 60);
                nextFetchIn = `${hours} год`;
              } else {
                const days = Math.floor(diffMins / 1440);
                nextFetchIn = `${days} дн`;
              }
            }
          } else if (!source.last_fetched_at) {
            nextFetchIn = 'Не перевірялось';
          }

          return {
            source,
            todayTotal: totalCount || 0,
            todayApproved: approvedCount || 0,
            todayRejected: rejectedCount || 0,
            sentToBot: sentToBotCount || 0,
            nextFetchIn,
          };
        })
      );

      setSourceStats(stats);

      // Load recent news (last 20)
      const { data: recent, error: recentError } = await supabase
        .from('news')
        .select(`
          id,
          original_title,
          original_url,
          created_at,
          pre_moderation_status,
          rejection_reason,
          is_published,
          news_sources (
            name,
            source_type
          )
        `)
        .order('created_at', { ascending: false })
        .limit(20);

      if (recentError) throw recentError;

      const formattedRecent = (recent || []).map((item: any) => ({
        id: item.id,
        original_title: item.original_title,
        original_url: item.original_url,
        source_name: item.news_sources?.name || 'Unknown',
        source_type: item.news_sources?.source_type || 'unknown',
        created_at: item.created_at,
        pre_moderation_status: item.pre_moderation_status,
        rejection_reason: item.rejection_reason,
        is_published: item.is_published,
      }));

      setRecentNews(formattedRecent);

      // Load bot queue (approved but not published)
      const { data: queue, error: queueError } = await supabase
        .from('news')
        .select(`
          id,
          original_title,
          original_url,
          created_at,
          pre_moderation_status,
          rejection_reason,
          is_published,
          news_sources (
            name,
            source_type
          )
        `)
        .eq('pre_moderation_status', 'approved')
        .eq('is_published', false)
        .order('created_at', { ascending: false })
        .limit(15);

      if (queueError) throw queueError;

      const formattedQueue = (queue || []).map((item: any) => ({
        id: item.id,
        original_title: item.original_title,
        original_url: item.original_url,
        source_name: item.news_sources?.name || 'Unknown',
        source_type: item.news_sources?.source_type || 'unknown',
        created_at: item.created_at,
        pre_moderation_status: item.pre_moderation_status,
        rejection_reason: item.rejection_reason,
        is_published: item.is_published,
      }));

      setBotQueue(formattedQueue);

      // Load rejected news (today only, using todayStart from above)
      const { data: rejected, error: rejectedError } = await supabase
        .from('news')
        .select(`
          id,
          original_title,
          original_url,
          created_at,
          pre_moderation_status,
          rejection_reason,
          is_published,
          news_sources (
            name,
            source_type
          )
        `)
        .eq('pre_moderation_status', 'rejected')
        .gte('created_at', todayStart.toISOString())
        .order('created_at', { ascending: false })
        .limit(50);

      if (rejectedError) throw rejectedError;

      const formattedRejected = (rejected || []).map((item: any) => ({
        id: item.id,
        original_title: item.original_title,
        original_url: item.original_url,
        source_name: item.news_sources?.name || 'Unknown',
        source_type: item.news_sources?.source_type || 'unknown',
        created_at: item.created_at,
        pre_moderation_status: item.pre_moderation_status,
        rejection_reason: item.rejection_reason,
        is_published: item.is_published,
      }));

      setRejectedNews(formattedRejected);

      // Update last refresh time on successful load
      setLastRefresh(new Date());

    } catch (error) {
      console.error('Failed to load activity data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getSourceTypeIcon = (type: string) => {
    switch (type) {
      case 'telegram':
        return '📱';
      case 'rss':
        return '📰';
      case 'web':
        return '🌐';
      default:
        return '📄';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'text-green-400';
      case 'rejected':
        return 'text-red-400';
      case 'pending':
        return 'text-yellow-400';
      default:
        return 'text-gray-400';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
        return <CheckCircle className="h-4 w-4" />;
      case 'rejected':
        return <XCircle className="h-4 w-4" />;
      case 'pending':
        return <Clock className="h-4 w-4" />;
      default:
        return <Newspaper className="h-4 w-4" />;
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'Щойно';
    if (diffMins < 60) return `${diffMins} хв тому`;

    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours} год тому`;

    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays} дн тому`;
  };

  const extractMessageId = (url: string): string => {
    // Extract message ID from Telegram URL (e.g., t.me/channel/123 -> 123)
    const match = url.match(/\/(\d+)$/);
    return match ? match[1] : '';
  };

  const shortenUrl = (url: string): string => {
    try {
      const urlObj = new URL(url);
      // For Telegram: show t.me/channel/id
      if (urlObj.hostname.includes('t.me')) {
        const pathParts = urlObj.pathname.split('/').filter(p => p);
        if (pathParts.length >= 2) {
          return `t.me/${pathParts[0]}/${pathParts[1]}`;
        }
      }
      // For other URLs: show domain + path
      return urlObj.hostname + (urlObj.pathname.length > 20 ? urlObj.pathname.substring(0, 20) + '...' : urlObj.pathname);
    } catch {
      return url.length > 40 ? url.substring(0, 40) + '...' : url;
    }
  };

  const handleIntervalChange = (newInterval: number) => {
    setRefreshInterval(newInterval);
    localStorage.setItem('activityMonitorRefreshInterval', newInterval.toString());
    setLastRefresh(new Date());
  };

  const handleManualRefresh = () => {
    loadActivityData();
    setLastRefresh(new Date());
  };

  const formatLastRefresh = (): string => {
    const now = new Date();
    const diffMs = now.getTime() - lastRefresh.getTime();
    const diffSec = Math.floor(diffMs / 1000);

    if (diffSec < 5) return 'Щойно';
    if (diffSec < 60) return `${diffSec} сек тому`;

    const diffMin = Math.floor(diffSec / 60);
    return `${diffMin} хв тому`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
          <p className="text-white">Завантаження моніторингу...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-500/20 to-purple-500/20 backdrop-blur-lg rounded-xl p-6 border border-blue-500/30">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-500/30 rounded-lg">
              <Activity className="h-6 w-6 text-blue-300" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">Моніторинг Активності</h2>
              <p className="text-gray-300 text-sm">Відстежуйте роботу джерел в реальному часі</p>
            </div>
          </div>

          {/* Refresh Controls */}
          <div className="flex items-center gap-3">
            {/* Last Refresh */}
            <div className="text-sm text-gray-400">
              <span className="text-gray-500">Оновлено:</span> {formatLastRefresh()}
            </div>

            {/* Refresh Interval Selector */}
            <select
              value={refreshInterval}
              onChange={(e) => handleIntervalChange(Number(e.target.value))}
              className="px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white text-sm focus:outline-none focus:border-blue-400 transition-colors"
            >
              <option value="0" className="bg-gray-800">Вимкнено</option>
              <option value="10" className="bg-gray-800">Кожні 10 сек</option>
              <option value="30" className="bg-gray-800">Кожні 30 сек</option>
              <option value="60" className="bg-gray-800">Кожну хвилину</option>
              <option value="120" className="bg-gray-800">Кожні 2 хв</option>
              <option value="300" className="bg-gray-800">Кожні 5 хв</option>
            </select>

            {/* Manual Refresh Button */}
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleManualRefresh}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Оновити
            </motion.button>
          </div>
        </div>
      </div>

      {/* Sources Status Grid */}
      <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
        <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
          <Radio className="h-5 w-5 text-green-400" />
          Статус Джерел
        </h3>
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
          {sourceStats.map((stat) => (
            <motion.div
              key={stat.source.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className={`bg-white/5 rounded-lg p-4 border ${
                stat.source.is_active ? 'border-green-500/30' : 'border-gray-500/30'
              }`}
            >
              {/* Source Header */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{getSourceTypeIcon(stat.source.source_type)}</span>
                  <div>
                    <h4 className="text-white font-medium">{stat.source.name}</h4>
                    <p className="text-xs text-gray-400 uppercase">{stat.source.source_type}</p>
                  </div>
                </div>
                {stat.source.is_active ? (
                  <span className="px-2 py-1 bg-green-500/20 text-green-400 text-xs rounded-full">
                    Активне
                  </span>
                ) : (
                  <span className="px-2 py-1 bg-gray-500/20 text-gray-400 text-xs rounded-full">
                    Вимкнено
                  </span>
                )}
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 gap-2 mb-3">
                <div className="bg-black/20 rounded p-2">
                  <p className="text-xs text-gray-400">Сьогодні</p>
                  <p className="text-lg font-bold text-white">{stat.todayTotal}</p>
                </div>
                <div className="bg-black/20 rounded p-2">
                  <p className="text-xs text-gray-400">В боті</p>
                  <p className="text-lg font-bold text-blue-400">{stat.sentToBot}</p>
                </div>
              </div>

              {/* AI Moderation */}
              {stat.todayTotal > 0 && (
                <div className="flex items-center gap-2 text-xs mb-3">
                  <span className="text-gray-400">AI:</span>
                  <span className="text-green-400">✅ {stat.todayApproved}</span>
                  <span className="text-red-400">❌ {stat.todayRejected}</span>
                </div>
              )}

              {/* Next Fetch */}
              <div className="flex items-center gap-2 text-xs">
                <Clock className="h-3 w-3 text-gray-400" />
                <span className="text-gray-400">Наступна перевірка:</span>
                <span className={`font-medium ${
                  stat.nextFetchIn === 'Готовий до перевірки' ? 'text-green-400' :
                  stat.nextFetchIn === 'Не перевірялось' ? 'text-yellow-400' :
                  'text-white'
                }`}>
                  {stat.nextFetchIn}
                </span>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Bot Queue */}
        <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
          <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
            <Send className="h-5 w-5 text-blue-400" />
            Черга в Telegram Боті
            <span className="text-sm font-normal text-gray-400">({botQueue.length})</span>
          </h3>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {botQueue.length === 0 ? (
              <p className="text-gray-400 text-center py-8">Немає новин в черзі</p>
            ) : (
              botQueue.map((news) => (
                <motion.div
                  key={news.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="bg-white/5 rounded-lg p-3 border border-blue-500/20"
                >
                  <div className="flex items-start gap-2">
                    <span className="text-lg flex-shrink-0">{getSourceTypeIcon(news.source_type)}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm font-medium truncate">
                        {news.original_title}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-gray-400">{news.source_name}</span>
                        <span className="text-xs text-gray-500">•</span>
                        <span className="text-xs text-gray-400">{formatTime(news.created_at)}</span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))
            )}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
          <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
            <Newspaper className="h-5 w-5 text-purple-400" />
            Остання Активність
          </h3>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {recentNews.length === 0 ? (
              <p className="text-gray-400 text-center py-8">Немає останньої активності</p>
            ) : (
              recentNews.map((news) => (
                <motion.div
                  key={news.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className={`bg-white/5 rounded-lg p-3 border ${
                    news.pre_moderation_status === 'approved' ? 'border-green-500/20' :
                    news.pre_moderation_status === 'rejected' ? 'border-red-500/20' :
                    'border-yellow-500/20'
                  }`}
                >
                  <div className="flex items-start gap-2">
                    <span className="text-lg flex-shrink-0">{getSourceTypeIcon(news.source_type)}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm font-medium truncate">
                        {news.original_title}
                      </p>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <span className="text-xs text-gray-400">{news.source_name}</span>
                        <span className="text-xs text-gray-500">•</span>
                        <div className={`flex items-center gap-1 ${getStatusColor(news.pre_moderation_status)}`}>
                          {getStatusIcon(news.pre_moderation_status)}
                          <span className="text-xs capitalize">{news.pre_moderation_status}</span>
                        </div>
                        <span className="text-xs text-gray-500">•</span>
                        <span className="text-xs text-gray-400">{formatTime(news.created_at)}</span>
                      </div>
                      {news.rejection_reason && (
                        <p className="text-xs text-red-400 mt-1 truncate">
                          {news.rejection_reason}
                        </p>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Rejected by AI Section */}
      <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
        <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
          <XCircle className="h-5 w-5 text-red-400" />
          Відхилено AI Модерацією (Сьогодні)
          <span className="text-sm font-normal text-gray-400">({rejectedNews.length})</span>
        </h3>
        <div className="space-y-3 max-h-[600px] overflow-y-auto">
          {rejectedNews.length === 0 ? (
            <p className="text-gray-400 text-center py-8">Сьогодні немає відхилених новин</p>
          ) : (
            rejectedNews.map((news) => {
              const messageId = extractMessageId(news.original_url);
              const shortUrl = shortenUrl(news.original_url);

              return (
                <motion.div
                  key={news.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="bg-red-500/5 rounded-lg p-4 border border-red-500/30"
                >
                  <div className="flex items-start gap-3">
                    <span className="text-2xl flex-shrink-0">{getSourceTypeIcon(news.source_type)}</span>
                    <div className="flex-1 min-w-0">
                      {/* Title */}
                      <h4 className="text-white font-medium mb-2">
                        {news.original_title}
                      </h4>

                      {/* Source and Time */}
                      <div className="flex items-center gap-2 mb-3 flex-wrap text-sm">
                        <span className="text-gray-300">{news.source_name}</span>
                        <span className="text-gray-500">•</span>
                        <span className="text-gray-400">{formatTime(news.created_at)}</span>
                      </div>

                      {/* URL and Message ID */}
                      <div className="bg-black/30 rounded p-2 mb-3">
                        <div className="flex items-center gap-2 text-xs">
                          <span className="text-gray-400">URL:</span>
                          <a
                            href={news.original_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-400 hover:text-blue-300 underline"
                          >
                            {shortUrl}
                          </a>
                          {messageId && (
                            <>
                              <span className="text-gray-500">|</span>
                              <span className="text-gray-400">ID:</span>
                              <span className="text-gray-300 font-mono">{messageId}</span>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Rejection Reason */}
                      {news.rejection_reason && (
                        <div className="bg-red-500/10 rounded-lg p-3 border border-red-500/30">
                          <div className="flex items-start gap-2">
                            <XCircle className="h-4 w-4 text-red-400 flex-shrink-0 mt-0.5" />
                            <div>
                              <p className="text-xs text-gray-400 mb-1">Причина відхилення:</p>
                              <p className="text-sm text-red-300">{news.rejection_reason}</p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
