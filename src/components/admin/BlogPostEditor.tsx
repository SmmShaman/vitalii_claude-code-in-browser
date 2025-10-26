import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Edit, Trash2, Eye, EyeOff, Save, FileText } from 'lucide-react';
import type { BlogPost } from '../../integrations/supabase/types';
import { supabase } from '../../integrations/supabase/client';

export const BlogPostEditor = () => {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingPost, setEditingPost] = useState<BlogPost | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    title_en: '',
    title_no: '',
    title_ua: '',
    content_en: '',
    content_no: '',
    content_ua: '',
    excerpt_en: '',
    excerpt_no: '',
    excerpt_ua: '',
    slug: '',
    featured_image: '',
    category: '',
    tags: [] as string[],
    is_published: false,
  });

  const [tagInput, setTagInput] = useState('');

  useEffect(() => {
    loadPosts();
  }, []);

  const loadPosts = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('blog_posts')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      setPosts(data || []);
    } catch (error) {
      console.error('Failed to load blog posts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const postData = {
        ...formData,
        published_at: formData.is_published ? new Date().toISOString() : null,
      };

      if (editingPost) {
        // Update existing post
        const { error } = await supabase
          .from('blog_posts')
          .update(postData)
          .eq('id', editingPost.id);

        if (error) throw error;
      } else {
        // Create new post
        const { error } = await supabase
          .from('blog_posts')
          .insert([postData]);

        if (error) throw error;
      }

      // Reset form
      resetForm();

      // Reload posts
      loadPosts();
    } catch (error) {
      console.error('Failed to save blog post:', error);
    }
  };

  const resetForm = () => {
    setFormData({
      title_en: '',
      title_no: '',
      title_ua: '',
      content_en: '',
      content_no: '',
      content_ua: '',
      excerpt_en: '',
      excerpt_no: '',
      excerpt_ua: '',
      slug: '',
      featured_image: '',
      category: '',
      tags: [],
      is_published: false,
    });
    setTagInput('');
    setEditingPost(null);
    setShowForm(false);
  };

  const handleEdit = (post: BlogPost) => {
    setEditingPost(post);
    setFormData({
      title_en: post.title_en,
      title_no: post.title_no || '',
      title_ua: post.title_ua || '',
      content_en: post.content_en,
      content_no: post.content_no || '',
      content_ua: post.content_ua || '',
      excerpt_en: post.excerpt_en || '',
      excerpt_no: post.excerpt_no || '',
      excerpt_ua: post.excerpt_ua || '',
      slug: post.slug,
      featured_image: post.featured_image || '',
      category: post.category || '',
      tags: post.tags || [],
      is_published: post.is_published,
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this blog post?')) return;

    try {
      const { error } = await supabase
        .from('blog_posts')
        .delete()
        .eq('id', id);

      if (error) throw error;

      loadPosts();
    } catch (error) {
      console.error('Failed to delete blog post:', error);
    }
  };

  const togglePublished = async (post: BlogPost) => {
    try {
      const { error } = await supabase
        .from('blog_posts')
        .update({
          is_published: !post.is_published,
          published_at: !post.is_published ? new Date().toISOString() : null,
        })
        .eq('id', post.id);

      if (error) throw error;

      loadPosts();
    } catch (error) {
      console.error('Failed to toggle published status:', error);
    }
  };

  const addTag = () => {
    if (tagInput.trim() && !formData.tags.includes(tagInput.trim())) {
      setFormData({
        ...formData,
        tags: [...formData.tags, tagInput.trim()],
      });
      setTagInput('');
    }
  };

  const removeTag = (tag: string) => {
    setFormData({
      ...formData,
      tags: formData.tags.filter((t) => t !== tag),
    });
  };

  const generateSlug = (title: string) => {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white mb-2">Blog Posts</h2>
          <p className="text-gray-400">Create and manage blog posts in multiple languages</p>
        </div>

        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => {
            setShowForm(!showForm);
            if (showForm) resetForm();
          }}
          className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-lg transition-colors"
        >
          <Plus className="h-5 w-5" />
          New Post
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
            <h3 className="text-xl font-bold text-white mb-6">
              {editingPost ? 'Edit Blog Post' : 'Create New Blog Post'}
            </h3>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* English Version */}
              <div className="space-y-4">
                <h4 className="text-lg font-semibold text-white flex items-center gap-2">
                  <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                  English Version
                </h4>

                <div>
                  <label className="block text-sm font-medium text-gray-200 mb-2">Title</label>
                  <input
                    type="text"
                    value={formData.title_en}
                    onChange={(e) => {
                      setFormData({ ...formData, title_en: e.target.value });
                      if (!editingPost && !formData.slug) {
                        setFormData({ ...formData, title_en: e.target.value, slug: generateSlug(e.target.value) });
                      }
                    }}
                    required
                    className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="Enter post title in English"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-200 mb-2">Excerpt</label>
                  <textarea
                    value={formData.excerpt_en}
                    onChange={(e) => setFormData({ ...formData, excerpt_en: e.target.value })}
                    rows={2}
                    className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="Short summary (2-3 sentences)"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-200 mb-2">Content</label>
                  <textarea
                    value={formData.content_en}
                    onChange={(e) => setFormData({ ...formData, content_en: e.target.value })}
                    required
                    rows={8}
                    className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="Write your blog post content here..."
                  />
                </div>
              </div>

              {/* Norwegian Version */}
              <div className="space-y-4 pt-4 border-t border-white/10">
                <h4 className="text-lg font-semibold text-white flex items-center gap-2">
                  <span className="w-2 h-2 bg-red-500 rounded-full"></span>
                  Norwegian Version
                </h4>

                <div>
                  <label className="block text-sm font-medium text-gray-200 mb-2">Title</label>
                  <input
                    type="text"
                    value={formData.title_no}
                    onChange={(e) => setFormData({ ...formData, title_no: e.target.value })}
                    className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="Tittel på norsk"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-200 mb-2">Excerpt</label>
                  <textarea
                    value={formData.excerpt_no}
                    onChange={(e) => setFormData({ ...formData, excerpt_no: e.target.value })}
                    rows={2}
                    className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="Kort sammendrag"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-200 mb-2">Content</label>
                  <textarea
                    value={formData.content_no}
                    onChange={(e) => setFormData({ ...formData, content_no: e.target.value })}
                    rows={8}
                    className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="Innholdet her..."
                  />
                </div>
              </div>

              {/* Ukrainian Version */}
              <div className="space-y-4 pt-4 border-t border-white/10">
                <h4 className="text-lg font-semibold text-white flex items-center gap-2">
                  <span className="w-2 h-2 bg-yellow-500 rounded-full"></span>
                  Ukrainian Version
                </h4>

                <div>
                  <label className="block text-sm font-medium text-gray-200 mb-2">Title</label>
                  <input
                    type="text"
                    value={formData.title_ua}
                    onChange={(e) => setFormData({ ...formData, title_ua: e.target.value })}
                    className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="Заголовок українською"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-200 mb-2">Excerpt</label>
                  <textarea
                    value={formData.excerpt_ua}
                    onChange={(e) => setFormData({ ...formData, excerpt_ua: e.target.value })}
                    rows={2}
                    className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="Короткий опис"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-200 mb-2">Content</label>
                  <textarea
                    value={formData.content_ua}
                    onChange={(e) => setFormData({ ...formData, content_ua: e.target.value })}
                    rows={8}
                    className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="Вміст тут..."
                  />
                </div>
              </div>

              {/* Metadata */}
              <div className="space-y-4 pt-4 border-t border-white/10">
                <h4 className="text-lg font-semibold text-white">Metadata</h4>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-200 mb-2">Slug (URL)</label>
                    <input
                      type="text"
                      value={formData.slug}
                      onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                      required
                      className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary"
                      placeholder="post-url-slug"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-200 mb-2">Category</label>
                    <input
                      type="text"
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary"
                      placeholder="e.g., Web Development"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-200 mb-2">Featured Image URL</label>
                    <input
                      type="url"
                      value={formData.featured_image}
                      onChange={(e) => setFormData({ ...formData, featured_image: e.target.value })}
                      className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary"
                      placeholder="https://example.com/image.jpg"
                    />
                  </div>
                </div>

                {/* Tags */}
                <div>
                  <label className="block text-sm font-medium text-gray-200 mb-2">Tags</label>
                  <div className="flex gap-2 mb-2">
                    <input
                      type="text"
                      value={tagInput}
                      onChange={(e) => setTagInput(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                      className="flex-1 px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary"
                      placeholder="Add a tag and press Enter"
                    />
                    <button
                      type="button"
                      onClick={addTag}
                      className="px-4 py-2 bg-primary/20 hover:bg-primary/30 text-primary rounded-lg transition-colors"
                    >
                      Add
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {formData.tags.map((tag, index) => (
                      <span
                        key={index}
                        className="px-3 py-1 bg-primary/20 text-primary rounded-full text-sm flex items-center gap-2"
                      >
                        {tag}
                        <button
                          type="button"
                          onClick={() => removeTag(tag)}
                          className="hover:text-red-400 transition-colors"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                </div>

                {/* Publish Toggle */}
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="is_published"
                    checked={formData.is_published}
                    onChange={(e) => setFormData({ ...formData, is_published: e.target.checked })}
                    className="w-4 h-4 rounded border-white/10 bg-white/5 text-primary focus:ring-primary"
                  />
                  <label htmlFor="is_published" className="text-sm text-gray-200">
                    Publish immediately (visible to visitors)
                  </label>
                </div>
              </div>

              {/* Buttons */}
              <div className="flex gap-3 pt-4 border-t border-white/10">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  type="submit"
                  className="flex items-center gap-2 px-6 py-3 bg-primary hover:bg-primary/90 text-white rounded-lg transition-colors font-semibold"
                >
                  <Save className="h-5 w-5" />
                  {editingPost ? 'Update Post' : 'Create Post'}
                </motion.button>

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  type="button"
                  onClick={resetForm}
                  className="px-6 py-3 bg-white/5 hover:bg-white/10 text-white rounded-lg transition-colors"
                >
                  Cancel
                </motion.button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Posts List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
        </div>
      ) : posts.length === 0 ? (
        <div className="bg-white/10 backdrop-blur-lg rounded-xl p-12 border border-white/20 text-center">
          <FileText className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-400">No blog posts yet. Create your first post to get started!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {posts.map((post, index) => (
            <motion.div
              key={post.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20 hover:border-primary/50 transition-all"
            >
              <div className="flex items-start gap-4">
                {/* Featured Image */}
                {post.featured_image && (
                  <img
                    src={post.featured_image}
                    alt={post.title_en}
                    className="w-24 h-24 object-cover rounded-lg"
                  />
                )}

                {/* Content */}
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-white mb-1">{post.title_en}</h3>
                  {post.excerpt_en && (
                    <p className="text-sm text-gray-400 mb-3 line-clamp-2">{post.excerpt_en}</p>
                  )}
                  <div className="flex items-center gap-3 text-xs text-gray-500">
                    <span className={`px-2 py-1 rounded ${post.is_published ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'}`}>
                      {post.is_published ? '● Published' : '○ Draft'}
                    </span>
                    {post.category && <span className="px-2 py-1 bg-white/5 rounded">{post.category}</span>}
                    {post.published_at && (
                      <span>{new Date(post.published_at).toLocaleDateString()}</span>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => togglePublished(post)}
                    className={`p-2 rounded-lg transition-colors ${
                      post.is_published
                        ? 'bg-gray-500/20 text-gray-400 hover:bg-gray-500/30'
                        : 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
                    }`}
                  >
                    {post.is_published ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </motion.button>

                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => handleEdit(post)}
                    className="p-2 rounded-lg bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 transition-colors"
                  >
                    <Edit className="h-5 w-5" />
                  </motion.button>

                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => handleDelete(post.id)}
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
