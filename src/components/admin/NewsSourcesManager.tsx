import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Edit, Trash2, ToggleLeft, ToggleRight, Rss, Globe, Send } from 'lucide-react';
import type { NewsSource } from '../../integrations/supabase/types';
import { supabase } from '../../integrations/supabase/client';

type SourceType = 'rss' | 'web' | 'telegram';

export const NewsSourcesManager = () => {
  const [sources, setSources] = useState<NewsSource[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingSource, setEditingSource] = useState<NewsSource | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    type: 'rss' as SourceType,
    url: '',
    update_frequency: 60,
    is_active: true,
  });

  useEffect(() => {
    loadSources();
  }, []);

  const loadSources = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('news_sources')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      setSources(data || []);
    } catch (error) {
      console.error('Failed to load sources:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (editingSource) {
        // Update existing source
        const { error } = await supabase
          .from('news_sources')
          .update(formData)
          .eq('id', editingSource.id);

        if (error) throw error;
      } else {
        // Create new source
        const { error } = await supabase
          .from('news_sources')
          .insert([formData]);

        if (error) throw error;
      }

      // Reset form
      setFormData({
        name: '',
        type: 'rss',
        url: '',
        update_frequency: 60,
        is_active: true,
      });
      setEditingSource(null);
      setShowForm(false);

      // Reload sources
      loadSources();
    } catch (error) {
      console.error('Failed to save source:', error);
    }
  };

  const handleEdit = (source: NewsSource) => {
    setEditingSource(source);
    setFormData({
      name: source.name,
      type: source.type as SourceType,
      url: source.url,
      update_frequency: source.update_frequency || 60,
      is_active: source.is_active,
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this source?')) return;

    try {
      const { error } = await supabase
        .from('news_sources')
        .delete()
        .eq('id', id);

      if (error) throw error;

      loadSources();
    } catch (error) {
      console.error('Failed to delete source:', error);
    }
  };

  const toggleActive = async (source: NewsSource) => {
    try {
      const { error } = await supabase
        .from('news_sources')
        .update({ is_active: !source.is_active })
        .eq('id', source.id);

      if (error) throw error;

      loadSources();
    } catch (error) {
      console.error('Failed to toggle source:', error);
    }
  };

  const getSourceIcon = (type: string) => {
    switch (type) {
      case 'rss':
        return <Rss className="h-5 w-5" />;
      case 'web':
        return <Globe className="h-5 w-5" />;
      case 'telegram':
        return <Send className="h-5 w-5" />;
      default:
        return <Rss className="h-5 w-5" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white mb-2">News Sources</h2>
          <p className="text-gray-400">Manage RSS feeds, web scrapers, and Telegram channels</p>
        </div>

        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => {
            setShowForm(!showForm);
            setEditingSource(null);
            setFormData({
              name: '',
              type: 'rss',
              url: '',
              update_frequency: 60,
              is_active: true,
            });
          }}
          className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-lg transition-colors"
        >
          <Plus className="h-5 w-5" />
          Add Source
        </motion.button>
      </div>

      {/* Form */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20"
          >
            <h3 className="text-xl font-bold text-white mb-4">
              {editingSource ? 'Edit Source' : 'Add New Source'}
            </h3>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-200 mb-2">
                    Source Name
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                    className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="e.g., TechCrunch"
                  />
                </div>

                {/* Type */}
                <div>
                  <label className="block text-sm font-medium text-gray-200 mb-2">
                    Source Type
                  </label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value as SourceType })}
                    className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="rss">RSS Feed</option>
                    <option value="web">Web Scraper</option>
                    <option value="telegram">Telegram Channel</option>
                  </select>
                </div>

                {/* URL */}
                <div>
                  <label className="block text-sm font-medium text-gray-200 mb-2">
                    URL / Channel ID
                  </label>
                  <input
                    type="text"
                    value={formData.url}
                    onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                    required
                    className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="https://example.com/feed.xml"
                  />
                </div>

                {/* Update Frequency */}
                <div>
                  <label className="block text-sm font-medium text-gray-200 mb-2">
                    Update Frequency (minutes)
                  </label>
                  <input
                    type="number"
                    value={formData.update_frequency}
                    onChange={(e) => setFormData({ ...formData, update_frequency: parseInt(e.target.value) })}
                    required
                    min="15"
                    className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>

              {/* Active Toggle */}
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="is_active"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="w-4 h-4 rounded border-white/10 bg-white/5 text-primary focus:ring-primary"
                />
                <label htmlFor="is_active" className="text-sm text-gray-200">
                  Active (fetch news from this source)
                </label>
              </div>

              {/* Buttons */}
              <div className="flex gap-3">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  type="submit"
                  className="px-6 py-2 bg-primary hover:bg-primary/90 text-white rounded-lg transition-colors"
                >
                  {editingSource ? 'Update Source' : 'Add Source'}
                </motion.button>

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    setEditingSource(null);
                  }}
                  className="px-6 py-2 bg-white/5 hover:bg-white/10 text-white rounded-lg transition-colors"
                >
                  Cancel
                </motion.button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Sources List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
        </div>
      ) : sources.length === 0 ? (
        <div className="bg-white/10 backdrop-blur-lg rounded-xl p-12 border border-white/20 text-center">
          <Rss className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-400">No news sources yet. Add your first source to get started!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {sources.map((source, index) => (
            <motion.div
              key={source.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20 hover:border-primary/50 transition-all"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4 flex-1">
                  <div className={`p-3 rounded-lg ${source.is_active ? 'bg-primary/20 text-primary' : 'bg-gray-500/20 text-gray-400'}`}>
                    {getSourceIcon(source.type)}
                  </div>

                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-white mb-1">{source.name}</h3>
                    <p className="text-sm text-gray-400 mb-2">{source.url}</p>
                    <div className="flex items-center gap-4 text-xs text-gray-500">
                      <span className="px-2 py-1 bg-white/5 rounded">
                        {source.type.toUpperCase()}
                      </span>
                      <span>Updates every {source.update_frequency} min</span>
                      {source.last_fetched_at && (
                        <span>Last: {new Date(source.last_fetched_at).toLocaleDateString()}</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => toggleActive(source)}
                    className={`p-2 rounded-lg transition-colors ${
                      source.is_active
                        ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
                        : 'bg-gray-500/20 text-gray-400 hover:bg-gray-500/30'
                    }`}
                  >
                    {source.is_active ? <ToggleRight className="h-5 w-5" /> : <ToggleLeft className="h-5 w-5" />}
                  </motion.button>

                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => handleEdit(source)}
                    className="p-2 rounded-lg bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 transition-colors"
                  >
                    <Edit className="h-5 w-5" />
                  </motion.button>

                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => handleDelete(source.id)}
                    className="p-2 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors"
                  >
                    <Trash2 className="h-5 w-5" />
                  </motion.button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};
