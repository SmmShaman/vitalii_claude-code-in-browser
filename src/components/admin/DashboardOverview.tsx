import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Newspaper, FileText, Rss, TrendingUp } from 'lucide-react';
import { supabase } from '../../integrations/supabase/client';

interface Stats {
  newsCount: number;
  blogCount: number;
  sourcesCount: number;
  recentNews: number;
}

export const DashboardOverview = () => {
  const [stats, setStats] = useState<Stats>({
    newsCount: 0,
    blogCount: 0,
    sourcesCount: 0,
    recentNews: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      setLoading(true);

      // Get news count
      const { count: newsCount } = await supabase
        .from('news')
        .select('*', { count: 'exact', head: true });

      // Get blog posts count
      const { count: blogCount } = await supabase
        .from('blog_posts')
        .select('*', { count: 'exact', head: true })
        .eq('is_published', true);

      // Get news sources count
      const { count: sourcesCount } = await supabase
        .from('news_sources')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true);

      // Get recent news (last 24 hours)
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      const { count: recentNews } = await supabase
        .from('news')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', yesterday.toISOString());

      setStats({
        newsCount: newsCount || 0,
        blogCount: blogCount || 0,
        sourcesCount: sourcesCount || 0,
        recentNews: recentNews || 0,
      });
    } catch (error) {
      console.error('Failed to load stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    {
      label: 'Total News',
      value: stats.newsCount,
      icon: Newspaper,
      color: 'from-blue-500 to-blue-600',
      bgColor: 'bg-blue-500/10',
      borderColor: 'border-blue-500/20',
    },
    {
      label: 'Published Blogs',
      value: stats.blogCount,
      icon: FileText,
      color: 'from-green-500 to-green-600',
      bgColor: 'bg-green-500/10',
      borderColor: 'border-green-500/20',
    },
    {
      label: 'Active Sources',
      value: stats.sourcesCount,
      icon: Rss,
      color: 'from-purple-500 to-purple-600',
      bgColor: 'bg-purple-500/10',
      borderColor: 'border-purple-500/20',
    },
    {
      label: 'Recent News (24h)',
      value: stats.recentNews,
      icon: TrendingUp,
      color: 'from-orange-500 to-orange-600',
      bgColor: 'bg-orange-500/10',
      borderColor: 'border-orange-500/20',
    },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome Message */}
      <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
        <h2 className="text-2xl font-bold text-white mb-2">Welcome to Admin Panel</h2>
        <p className="text-gray-400">
          Manage your news sources, AI prompts, and blog posts from this dashboard.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((card, index) => {
          const Icon = card.icon;

          return (
            <motion.div
              key={card.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className={`${card.bgColor} ${card.borderColor} backdrop-blur-lg rounded-xl p-6 border`}
            >
              <div className="flex items-center justify-between mb-4">
                <div className={`bg-gradient-to-br ${card.color} rounded-lg p-3`}>
                  <Icon className="h-6 w-6 text-white" />
                </div>
              </div>

              <p className="text-gray-400 text-sm mb-1">{card.label}</p>
              <p className="text-3xl font-bold text-white">{card.value}</p>
            </motion.div>
          );
        })}
      </div>

      {/* Quick Actions */}
      <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
        <h3 className="text-xl font-bold text-white mb-4">Quick Actions</h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 rounded-lg p-4 text-left transition-all group"
          >
            <Newspaper className="h-8 w-8 text-blue-400 mb-3" />
            <h4 className="text-white font-semibold mb-1">Add News Source</h4>
            <p className="text-sm text-gray-400">
              Configure new RSS feeds or web sources
            </p>
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="bg-green-500/10 hover:bg-green-500/20 border border-green-500/20 rounded-lg p-4 text-left transition-all group"
          >
            <FileText className="h-8 w-8 text-green-400 mb-3" />
            <h4 className="text-white font-semibold mb-1">Write Blog Post</h4>
            <p className="text-sm text-gray-400">
              Create new blog content in all languages
            </p>
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/20 rounded-lg p-4 text-left transition-all group"
          >
            <TrendingUp className="h-8 w-8 text-purple-400 mb-3" />
            <h4 className="text-white font-semibold mb-1">Edit AI Prompts</h4>
            <p className="text-sm text-gray-400">
              Customize AI rewriting prompts
            </p>
          </motion.button>
        </div>
      </div>

      {/* Info Section */}
      <div className="bg-gradient-to-br from-primary/10 to-purple-500/10 backdrop-blur-lg rounded-xl p-6 border border-primary/20">
        <h3 className="text-xl font-bold text-white mb-2">System Information</h3>
        <ul className="space-y-2 text-gray-300">
          <li>✓ Supabase database connected</li>
          <li>✓ Authentication enabled</li>
          <li>✓ News & Blog sections active</li>
          <li>⏳ Azure OpenAI integration - coming soon</li>
          <li>⏳ Automatic news fetching - coming soon</li>
        </ul>
      </div>
    </div>
  );
};
