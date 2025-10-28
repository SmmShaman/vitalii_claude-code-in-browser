import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Edit, Trash2, Eye, EyeOff, Search, X } from 'lucide-react';
import { supabase } from '../../integrations/supabase/client';

interface NewsItem {
  id: string;
  title_en: string | null;
  title_no: string | null;
  title_ua: string | null;
  description_en: string | null;
  description_no: string | null;
  description_ua: string | null;
  content_en: string | null;
  content_no: string | null;
  content_ua: string | null;
  image_url: string | null;
  original_url: string | null;
  tags: string[] | null;
  is_published: boolean | null;
  published_at: string | null;
  created_at: string;
}

export const NewsManager = () => {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingNews, setEditingNews] = useState<NewsItem | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    title_en: '',
    title_no: '',
    title_ua: '',
    description_en: '',
    description_no: '',
    description_ua: '',
    content_en: '',
    content_no: '',
    content_ua: '',
    image_url: '',
    original_url: '',
    tags: '',
    is_published: true,
  });

  useEffect(() => {
    loadNews();
  }, []);

  const loadNews = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('news')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setNews(data || []);
    } catch (error) {
      console.error('Failed to load news:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setEditingNews(null);
    setFormData({
      title_en: '',
      title_no: '',
      title_ua: '',
      description_en: '',
      description_no: '',
      description_ua: '',
      content_en: '',
      content_no: '',
      content_ua: '',
      image_url: '',
      original_url: '',
      tags: '',
      is_published: true,
    });
    setShowModal(true);
  };

  const handleEdit = (newsItem: NewsItem) => {
    setEditingNews(newsItem);
    setFormData({
      title_en: newsItem.title_en || '',
      title_no: newsItem.title_no || '',
      title_ua: newsItem.title_ua || '',
      description_en: newsItem.description_en || '',
      description_no: newsItem.description_no || '',
      description_ua: newsItem.description_ua || '',
      content_en: newsItem.content_en || '',
      content_no: newsItem.content_no || '',
      content_ua: newsItem.content_ua || '',
      image_url: newsItem.image_url || '',
      original_url: newsItem.original_url || '',
      tags: newsItem.tags?.join(', ') || '',
      is_published: newsItem.is_published ?? true,
    });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const tagsArray = formData.tags
        .split(',')
        .map((tag) => tag.trim())
        .filter((tag) => tag);

      const newsData = {
        ...formData,
        tags: tagsArray,
        published_at: formData.is_published ? new Date().toISOString() : null,
      };

      if (editingNews) {
        const { error } = await supabase
          .from('news')
          .update(newsData)
          .eq('id', editingNews.id);

        if (error) throw error;
      } else {
        const { error } = await supabase.from('news').insert([newsData]);

        if (error) throw error;
      }

      setShowModal(false);
      loadNews();
    } catch (error) {
      console.error('Failed to save news:', error);
      alert('Failed to save news');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this news item?')) return;

    try {
      const { error } = await supabase.from('news').delete().eq('id', id);

      if (error) throw error;
      loadNews();
    } catch (error) {
      console.error('Failed to delete news:', error);
      alert('Failed to delete news');
    }
  };

  const togglePublished = async (newsItem: NewsItem) => {
    try {
      const { error } = await supabase
        .from('news')
        .update({ is_published: !newsItem.is_published })
        .eq('id', newsItem.id);

      if (error) throw error;
      loadNews();
    } catch (error) {
      console.error('Failed to toggle publish status:', error);
    }
  };

  const filteredNews = news.filter((item) =>
    item.title_en?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading && news.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
          <p className="text-white">Loading news...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h2 className="text-2xl font-bold text-white">News Management</h2>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={handleCreate}
          className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
        >
          <Plus className="h-5 w-5" />
          Add News
        </motion.button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
        <input
          type="text"
          placeholder="Search news..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
        />
      </div>

      {/* News List */}
      <div className="grid grid-cols-1 gap-4">
        <AnimatePresence>
          {filteredNews.map((newsItem) => (
            <motion.div
              key={newsItem.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="bg-white/10 backdrop-blur-lg rounded-lg p-6 border border-white/20"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="text-lg font-semibold text-white">
                      {newsItem.title_en || 'Untitled'}
                    </h3>
                    {newsItem.is_published ? (
                      <span className="px-2 py-1 bg-green-500/20 text-green-300 text-xs rounded-full">
                        Published
                      </span>
                    ) : (
                      <span className="px-2 py-1 bg-gray-500/20 text-gray-300 text-xs rounded-full">
                        Draft
                      </span>
                    )}
                  </div>
                  <p className="text-gray-300 text-sm line-clamp-2 mb-2">
                    {newsItem.description_en}
                  </p>
                  {newsItem.tags && newsItem.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-2">
                      {newsItem.tags.map((tag, index) => (
                        <span
                          key={index}
                          className="px-2 py-1 bg-purple-500/20 text-purple-300 text-xs rounded-full"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                  <p className="text-gray-400 text-xs">
                    Created: {new Date(newsItem.created_at).toLocaleDateString()}
                  </p>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => togglePublished(newsItem)}
                    className="p-2 text-gray-300 hover:text-white transition-colors"
                    title={newsItem.is_published ? 'Unpublish' : 'Publish'}
                  >
                    {newsItem.is_published ? (
                      <Eye className="h-5 w-5" />
                    ) : (
                      <EyeOff className="h-5 w-5" />
                    )}
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => handleEdit(newsItem)}
                    className="p-2 text-blue-400 hover:text-blue-300 transition-colors"
                  >
                    <Edit className="h-5 w-5" />
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => handleDelete(newsItem.id)}
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

      {filteredNews.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-400">No news items found</p>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-slate-900 rounded-xl p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto border border-white/20"
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-bold text-white">
                {editingNews ? 'Edit News' : 'Add News'}
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="p-2 text-gray-400 hover:text-white transition-colors"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* English */}
              <div className="space-y-4 border border-white/10 rounded-lg p-4">
                <h4 className="text-lg font-semibold text-white">English</h4>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Title (EN)
                  </label>
                  <input
                    type="text"
                    value={formData.title_en}
                    onChange={(e) => setFormData({ ...formData, title_en: e.target.value })}
                    required
                    className="w-full px-4 py-2 bg-white/5 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Description (EN)
                  </label>
                  <textarea
                    value={formData.description_en}
                    onChange={(e) => setFormData({ ...formData, description_en: e.target.value })}
                    rows={2}
                    className="w-full px-4 py-2 bg-white/5 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Content (EN)
                  </label>
                  <textarea
                    value={formData.content_en}
                    onChange={(e) => setFormData({ ...formData, content_en: e.target.value })}
                    rows={4}
                    className="w-full px-4 py-2 bg-white/5 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </div>

              {/* Norwegian */}
              <div className="space-y-4 border border-white/10 rounded-lg p-4">
                <h4 className="text-lg font-semibold text-white">Norwegian</h4>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Title (NO)
                  </label>
                  <input
                    type="text"
                    value={formData.title_no}
                    onChange={(e) => setFormData({ ...formData, title_no: e.target.value })}
                    className="w-full px-4 py-2 bg-white/5 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Description (NO)
                  </label>
                  <textarea
                    value={formData.description_no}
                    onChange={(e) => setFormData({ ...formData, description_no: e.target.value })}
                    rows={2}
                    className="w-full px-4 py-2 bg-white/5 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Content (NO)
                  </label>
                  <textarea
                    value={formData.content_no}
                    onChange={(e) => setFormData({ ...formData, content_no: e.target.value })}
                    rows={4}
                    className="w-full px-4 py-2 bg-white/5 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </div>

              {/* Ukrainian */}
              <div className="space-y-4 border border-white/10 rounded-lg p-4">
                <h4 className="text-lg font-semibold text-white">Ukrainian</h4>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Title (UA)
                  </label>
                  <input
                    type="text"
                    value={formData.title_ua}
                    onChange={(e) => setFormData({ ...formData, title_ua: e.target.value })}
                    className="w-full px-4 py-2 bg-white/5 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Description (UA)
                  </label>
                  <textarea
                    value={formData.description_ua}
                    onChange={(e) => setFormData({ ...formData, description_ua: e.target.value })}
                    rows={2}
                    className="w-full px-4 py-2 bg-white/5 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Content (UA)
                  </label>
                  <textarea
                    value={formData.content_ua}
                    onChange={(e) => setFormData({ ...formData, content_ua: e.target.value })}
                    rows={4}
                    className="w-full px-4 py-2 bg-white/5 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </div>

              {/* Other Fields */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Image URL
                  </label>
                  <input
                    type="url"
                    value={formData.image_url}
                    onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                    className="w-full px-4 py-2 bg-white/5 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Original URL
                  </label>
                  <input
                    type="url"
                    value={formData.original_url}
                    onChange={(e) => setFormData({ ...formData, original_url: e.target.value })}
                    className="w-full px-4 py-2 bg-white/5 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Tags (comma-separated)
                  </label>
                  <input
                    type="text"
                    value={formData.tags}
                    onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                    placeholder="react, typescript, web development"
                    className="w-full px-4 py-2 bg-white/5 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="is_published"
                    checked={formData.is_published}
                    onChange={(e) =>
                      setFormData({ ...formData, is_published: e.target.checked })
                    }
                    className="w-4 h-4 rounded border-white/20 bg-white/5 text-purple-600 focus:ring-2 focus:ring-purple-500"
                  />
                  <label htmlFor="is_published" className="text-sm font-medium text-gray-300">
                    Publish immediately
                  </label>
                </div>
              </div>

              {/* Submit */}
              <div className="flex justify-end gap-4">
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
                  {loading ? 'Saving...' : editingNews ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
};
