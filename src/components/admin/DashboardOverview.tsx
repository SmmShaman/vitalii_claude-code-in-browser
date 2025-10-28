import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Newspaper, BookOpen, Eye, TrendingUp } from 'lucide-react';
import { supabase } from '../../integrations/supabase/client';

interface Stats {
  totalNews: number;
  totalBlogPosts: number;
  publishedNews: number;
  publishedBlogPosts: number;
}

export const DashboardOverview = () => {
  const [stats, setStats] = useState<Stats>({
    totalNews: 0,
    totalBlogPosts: 0,
    publishedNews: 0,
    publishedBlogPosts: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      setLoading(true);

      // Get news stats
      const { count: totalNews } = await supabase
        .from('news')
        .select('*', { count: 'exact', head: true });

      const { count: publishedNews } = await supabase
        .from('news')
        .select('*', { count: 'exact', head: true })
        .eq('is_published', true);

      // Get blog stats
      const { count: totalBlogPosts } = await supabase
        .from('blog_posts')
        .select('*', { count: 'exact', head: true });

      const { count: publishedBlogPosts } = await supabase
        .from('blog_posts')
        .select('*', { count: 'exact', head: true })
        .eq('is_published', true);

      setStats({
        totalNews: totalNews || 0,
        totalBlogPosts: totalBlogPosts || 0,
        publishedNews: publishedNews || 0,
        publishedBlogPosts: publishedBlogPosts || 0,
      });
    } catch (error) {
      console.error('Failed to load stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    {
      title: 'Total News',
      value: stats.totalNews,
      icon: Newspaper,
      color: 'from-blue-500 to-blue-600',
      bgColor: 'bg-blue-500/20',
    },
    {
      title: 'Published News',
      value: stats.publishedNews,
      icon: Eye,
      color: 'from-green-500 to-green-600',
      bgColor: 'bg-green-500/20',
    },
    {
      title: 'Total Blog Posts',
      value: stats.totalBlogPosts,
      icon: BookOpen,
      color: 'from-purple-500 to-purple-600',
      bgColor: 'bg-purple-500/20',
    },
    {
      title: 'Published Posts',
      value: stats.publishedBlogPosts,
      icon: TrendingUp,
      color: 'from-orange-500 to-orange-600',
      bgColor: 'bg-orange-500/20',
    },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
          <p className="text-white">Loading statistics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
        <h2 className="text-2xl font-bold text-white mb-2">Welcome to Admin Panel</h2>
        <p className="text-gray-300">Manage your portfolio content from here</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((card, index) => {
          const Icon = card.icon;
          return (
            <motion.div
              key={card.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20 hover:border-white/40 transition-all"
            >
              <div className="flex items-center justify-between mb-4">
                <div className={`p-3 rounded-lg ${card.bgColor}`}>
                  <Icon className="h-6 w-6 text-white" />
                </div>
              </div>
              <h3 className="text-gray-300 text-sm font-medium mb-1">{card.title}</h3>
              <p className="text-3xl font-bold text-white">{card.value}</p>
            </motion.div>
          );
        })}
      </div>

      {/* Quick Actions */}
      <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
        <h3 className="text-xl font-bold text-white mb-4">Quick Actions</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white/5 rounded-lg p-4 border border-white/10">
            <h4 className="text-white font-medium mb-2">News Management</h4>
            <p className="text-gray-400 text-sm">Create, edit, and publish news articles</p>
          </div>
          <div className="bg-white/5 rounded-lg p-4 border border-white/10">
            <h4 className="text-white font-medium mb-2">Blog Management</h4>
            <p className="text-gray-400 text-sm">Write and manage blog posts</p>
          </div>
        </div>
      </div>
    </div>
  );
};
