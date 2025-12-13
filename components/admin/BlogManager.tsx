'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Edit, Trash2, Eye, EyeOff, Search, X } from 'lucide-react'
import { supabase } from '@/integrations/supabase/client'

interface BlogPost {
  id: string
  title_en: string
  title_no: string | null
  title_ua: string | null
  content_en: string
  content_no: string | null
  content_ua: string | null
  description_en: string | null
  description_no: string | null
  description_ua: string | null
  slug_en: string | null
  image_url: string | null
  category: string | null
  tags: string[] | null
  is_published: boolean | null
  published_at: string | null
  created_at: string
}

export const BlogManager = () => {
  const [posts, setPosts] = useState<BlogPost[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editingPost, setEditingPost] = useState<BlogPost | null>(null)

  const [formData, setFormData] = useState({
    title_en: '',
    title_no: '',
    title_ua: '',
    content_en: '',
    content_no: '',
    content_ua: '',
    description_en: '',
    description_no: '',
    description_ua: '',
    slug_en: '',
    image_url: '',
    category: '',
    tags: '',
    is_published: true,
  })

  useEffect(() => {
    loadPosts()
  }, [])

  const loadPosts = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('blog_posts')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setPosts(data || [])
    } catch (error) {
      console.error('Failed to load posts:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = () => {
    setEditingPost(null)
    setFormData({
      title_en: '',
      title_no: '',
      title_ua: '',
      content_en: '',
      content_no: '',
      content_ua: '',
      description_en: '',
      description_no: '',
      description_ua: '',
      slug_en: '',
      image_url: '',
      category: '',
      tags: '',
      is_published: true,
    })
    setShowModal(true)
  }

  const handleEdit = (post: BlogPost) => {
    setEditingPost(post)
    setFormData({
      title_en: post.title_en || '',
      title_no: post.title_no || '',
      title_ua: post.title_ua || '',
      content_en: post.content_en || '',
      content_no: post.content_no || '',
      content_ua: post.content_ua || '',
      description_en: post.description_en || '',
      description_no: post.description_no || '',
      description_ua: post.description_ua || '',
      slug_en: post.slug_en || '',
      image_url: post.image_url || '',
      category: post.category || '',
      tags: post.tags?.join(', ') || '',
      is_published: post.is_published ?? true,
    })
    setShowModal(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const tagsArray = formData.tags
        .split(',')
        .map((tag) => tag.trim())
        .filter((tag) => tag)

      const postData = {
        ...formData,
        tags: tagsArray,
        published_at: formData.is_published ? new Date().toISOString() : null,
      }

      if (editingPost) {
        const { error } = await supabase
          .from('blog_posts')
          .update(postData)
          .eq('id', editingPost.id)

        if (error) throw error
      } else {
        const { error } = await supabase.from('blog_posts').insert([postData])

        if (error) throw error
      }

      setShowModal(false)
      loadPosts()
    } catch (error) {
      console.error('Failed to save post:', error)
      alert('Failed to save blog post')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this blog post?')) return

    try {
      const { error } = await supabase.from('blog_posts').delete().eq('id', id)

      if (error) throw error
      loadPosts()
    } catch (error) {
      console.error('Failed to delete post:', error)
      alert('Failed to delete blog post')
    }
  }

  const togglePublished = async (post: BlogPost) => {
    try {
      const { error } = await supabase
        .from('blog_posts')
        .update({ is_published: !post.is_published })
        .eq('id', post.id)

      if (error) throw error
      loadPosts()
    } catch (error) {
      console.error('Failed to toggle publish status:', error)
    }
  }

  const filteredPosts = posts.filter((post) =>
    post.title_en?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  if (loading && posts.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
          <p className="text-white">Loading blog posts...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h2 className="text-2xl font-bold text-white">Blog Management</h2>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={handleCreate}
          className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
        >
          <Plus className="h-5 w-5" />
          Add Post
        </motion.button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
        <input
          type="text"
          placeholder="Search blog posts..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
        />
      </div>

      {/* Posts List */}
      <div className="grid grid-cols-1 gap-4">
        <AnimatePresence>
          {filteredPosts.map((post) => (
            <motion.div
              key={post.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="bg-white/10 backdrop-blur-lg rounded-lg p-6 border border-white/20"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="text-lg font-semibold text-white">
                      {post.title_en || 'Untitled'}
                    </h3>
                    {post.is_published ? (
                      <span className="px-2 py-1 bg-green-500/20 text-green-300 text-xs rounded-full">
                        Published
                      </span>
                    ) : (
                      <span className="px-2 py-1 bg-gray-500/20 text-gray-300 text-xs rounded-full">
                        Draft
                      </span>
                    )}
                  </div>
                  {post.category && (
                    <span className="px-2 py-1 bg-blue-500/20 text-blue-300 text-xs rounded-full mr-2">
                      {post.category}
                    </span>
                  )}
                  <p className="text-gray-300 text-sm line-clamp-2 mb-2 mt-2">
                    {post.description_en}
                  </p>
                  {post.tags && post.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-2">
                      {post.tags.map((tag, index) => (
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
                    Created: {new Date(post.created_at).toLocaleDateString()}
                  </p>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => togglePublished(post)}
                    className="p-2 text-gray-300 hover:text-white transition-colors"
                    title={post.is_published ? 'Unpublish' : 'Publish'}
                  >
                    {post.is_published ? (
                      <Eye className="h-5 w-5" />
                    ) : (
                      <EyeOff className="h-5 w-5" />
                    )}
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => handleEdit(post)}
                    className="p-2 text-blue-400 hover:text-blue-300 transition-colors"
                  >
                    <Edit className="h-5 w-5" />
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => handleDelete(post.id)}
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

      {filteredPosts.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-400">No blog posts found</p>
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
                {editingPost ? 'Edit Blog Post' : 'Add Blog Post'}
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
                    Title (EN) *
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
                    Content (EN) *
                  </label>
                  <textarea
                    value={formData.content_en}
                    onChange={(e) => setFormData({ ...formData, content_en: e.target.value })}
                    required
                    rows={6}
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
                    rows={6}
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
                    rows={6}
                    className="w-full px-4 py-2 bg-white/5 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </div>

              {/* Other Fields */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Slug (EN)
                  </label>
                  <input
                    type="text"
                    value={formData.slug_en}
                    onChange={(e) => setFormData({ ...formData, slug_en: e.target.value })}
                    placeholder="my-blog-post-slug"
                    className="w-full px-4 py-2 bg-white/5 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
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
                    Category
                  </label>
                  <input
                    type="text"
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    placeholder="Web Development"
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
                    placeholder="react, typescript, tutorial"
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
                  {loading ? 'Saving...' : editingPost ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  )
}
