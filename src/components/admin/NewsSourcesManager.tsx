import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Edit, Trash2, Globe, Rss, Send, X, ToggleLeft, ToggleRight } from 'lucide-react';
import { supabase } from '../../integrations/supabase/client';

interface NewsSource {
  id: string;
  name: string;
  url: string;
  rss_url: string | null;
  source_type: string;
  category: string | null;
  is_active: boolean;
  fetch_interval: number;
  last_fetched_at: string | null;
  created_at: string;
}

export const NewsSourcesManager = () => {
  const [sources, setSources] = useState<NewsSource[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingSource, setEditingSource] = useState<NewsSource | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    url: '',
    rss_url: '',
    source_type: 'rss',
    category: '',
    is_active: true,
    fetch_interval: 3600,
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

  const handleCreate = () => {
    setEditingSource(null);
    setFormData({
      name: '',
      url: '',
      rss_url: '',
      source_type: 'rss',
      category: '',
      is_active: true,
      fetch_interval: 3600,
    });
    setShowModal(true);
  };

  const handleEdit = (source: NewsSource) => {
    setEditingSource(source);
    setFormData({
      name: source.name,
      url: source.url,
      rss_url: source.rss_url || '',
      source_type: source.source_type,
      category: source.category || '',
      is_active: source.is_active,
      fetch_interval: source.fetch_interval,
    });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const sourceData = {
        ...formData,
        rss_url: formData.rss_url || null,
        category: formData.category || null,
      };

      if (editingSource) {
        const { error } = await supabase
          .from('news_sources')
          .update(sourceData)
          .eq('id', editingSource.id);

        if (error) throw error;
      } else {
        const { error } = await supabase.from('news_sources').insert([sourceData]);

        if (error) throw error;
      }

      setShowModal(false);
      loadSources();
    } catch (error) {
      console.error('Failed to save source:', error);
      alert('Failed to save news source');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this news source?')) return;

    try {
      const { error } = await supabase.from('news_sources').delete().eq('id', id);

      if (error) throw error;
      loadSources();
    } catch (error) {
      console.error('Failed to delete source:', error);
      alert('Failed to delete news source');
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
      console.error('Failed to toggle active status:', error);
    }
  };

  const getSourceIcon = (type: string) => {
    switch (type) {
      case 'rss':
        return <Rss className="h-5 w-5" />;
      case 'telegram':
        return <Send className="h-5 w-5" />;
      case 'web':
        return <Globe className="h-5 w-5" />;
      default:
        return <Globe className="h-5 w-5" />;
    }
  };

  if (loading && sources.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
          <p className="text-white">Loading sources...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white">News Sources</h2>
          <p className="text-gray-300 text-sm">Manage RSS feeds, websites, and Telegram channels</p>
        </div>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={handleCreate}
          className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
        >
          <Plus className="h-5 w-5" />
          Add Source
        </motion.button>
      </div>

      {/* Info Box */}
      <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
        <h3 className="text-white font-semibold mb-2">How it works:</h3>
        <ul className="text-gray-300 text-sm space-y-1">
          <li>• Add RSS feeds, websites, or Telegram channels as news sources</li>
          <li>• System will monitor these sources for new articles</li>
          <li>• New articles will be sent to your Telegram bot for moderation</li>
          <li>• Approve articles to automatically rewrite, translate, and publish</li>
        </ul>
      </div>

      {/* Sources List */}
      <div className="grid grid-cols-1 gap-4">
        <AnimatePresence>
          {sources.map((source) => (
            <motion.div
              key={source.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className={`bg-white/10 backdrop-blur-lg rounded-lg p-6 border ${
                source.is_active ? 'border-white/20' : 'border-gray-500/20'
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <div className={`p-2 rounded-lg ${
                      source.is_active ? 'bg-purple-500/20 text-purple-300' : 'bg-gray-500/20 text-gray-400'
                    }`}>
                      {getSourceIcon(source.source_type)}
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-white">{source.name}</h3>
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          source.is_active
                            ? 'bg-green-500/20 text-green-300'
                            : 'bg-gray-500/20 text-gray-300'
                        }`}>
                          {source.is_active ? 'Active' : 'Inactive'}
                        </span>
                        <span className="px-2 py-1 bg-blue-500/20 text-blue-300 text-xs rounded-full">
                          {source.source_type.toUpperCase()}
                        </span>
                        {source.category && (
                          <span className="px-2 py-1 bg-orange-500/20 text-orange-300 text-xs rounded-full">
                            {source.category}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="ml-14 space-y-1">
                    <p className="text-gray-300 text-sm">
                      <span className="text-gray-400">URL:</span> {source.url}
                    </p>
                    {source.rss_url && (
                      <p className="text-gray-300 text-sm">
                        <span className="text-gray-400">RSS:</span> {source.rss_url}
                      </p>
                    )}
                    <p className="text-gray-400 text-xs">
                      Fetch interval: {source.fetch_interval}s |
                      {source.last_fetched_at
                        ? ` Last fetched: ${new Date(source.last_fetched_at).toLocaleString()}`
                        : ' Never fetched'
                      }
                    </p>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => toggleActive(source)}
                    className={`p-2 transition-colors ${
                      source.is_active
                        ? 'text-green-400 hover:text-green-300'
                        : 'text-gray-400 hover:text-gray-300'
                    }`}
                    title={source.is_active ? 'Deactivate' : 'Activate'}
                  >
                    {source.is_active ? (
                      <ToggleRight className="h-5 w-5" />
                    ) : (
                      <ToggleLeft className="h-5 w-5" />
                    )}
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => handleEdit(source)}
                    className="p-2 text-blue-400 hover:text-blue-300 transition-colors"
                  >
                    <Edit className="h-5 w-5" />
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => handleDelete(source.id)}
                    className="p-2 text-red-400 hover:text-red-300 transition-colors"
                  >
                    <Trash2 className="h-5 w-5" />
                  </motion.button>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {sources.length === 0 && (
        <div className="text-center py-12">
          <Globe className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-400">No news sources configured</p>
          <p className="text-gray-500 text-sm">Add your first source to start collecting news</p>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-slate-900 rounded-xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-white/20"
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-bold text-white">
                {editingSource ? 'Edit News Source' : 'Add News Source'}
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="p-2 text-gray-400 hover:text-white transition-colors"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Source Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  placeholder="TechCrunch"
                  className="w-full px-4 py-2 bg-white/5 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Source Type *
                </label>
                <select
                  value={formData.source_type}
                  onChange={(e) => setFormData({ ...formData, source_type: e.target.value })}
                  className="w-full px-4 py-2 bg-white/5 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="rss">RSS Feed</option>
                  <option value="telegram">Telegram Channel</option>
                  <option value="web">Website</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Website URL *
                </label>
                <input
                  type="url"
                  value={formData.url}
                  onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                  required
                  placeholder="https://techcrunch.com"
                  className="w-full px-4 py-2 bg-white/5 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              {formData.source_type === 'rss' && (
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    RSS Feed URL
                  </label>
                  <input
                    type="url"
                    value={formData.rss_url}
                    onChange={(e) => setFormData({ ...formData, rss_url: e.target.value })}
                    placeholder="https://techcrunch.com/feed/"
                    className="w-full px-4 py-2 bg-white/5 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Category
                </label>
                <input
                  type="text"
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  placeholder="tech, business, etc."
                  className="w-full px-4 py-2 bg-white/5 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Fetch Interval (seconds)
                </label>
                <input
                  type="number"
                  value={formData.fetch_interval}
                  onChange={(e) => setFormData({ ...formData, fetch_interval: parseInt(e.target.value) })}
                  min="60"
                  placeholder="3600"
                  className="w-full px-4 py-2 bg-white/5 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
                <p className="text-gray-400 text-xs mt-1">
                  How often to check this source (default: 3600 = 1 hour)
                </p>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="is_active"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="w-4 h-4 rounded border-white/20 bg-white/5 text-purple-600 focus:ring-2 focus:ring-purple-500"
                />
                <label htmlFor="is_active" className="text-sm font-medium text-gray-300">
                  Active (start monitoring immediately)
                </label>
              </div>

              <div className="flex justify-end gap-4 mt-6">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-6 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors disabled:opacity-50"
                >
                  {loading ? 'Saving...' : editingSource ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
};
