'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Edit, Trash2, Sparkles, X, ToggleLeft, ToggleRight, Copy, ChevronDown, ChevronRight } from 'lucide-react'
import { supabase } from '@/integrations/supabase/client'

interface AIPrompt {
  id: string
  name: string
  description: string | null
  prompt_text: string
  prompt_type: string
  is_active: boolean
  usage_count: number
  created_at: string
}

// Prompt categories configuration
const PROMPT_CATEGORIES: Record<string, { label: string; icon: string; types: string[] }> = {
  news: {
    label: 'Новини та контент',
    icon: '📰',
    types: ['news_rewrite', 'blog_rewrite', 'pre_moderation', 'rss_article_analysis', 'rss_news_rewrite', 'rewrite', 'translate', 'summarize']
  },
  image_generation: {
    label: 'Генерація зображень',
    icon: '🖼️',
    types: ['image_pre_analyzer', 'image_creative_writer', 'image_classifier', 'image_template_tech_product', 'image_template_marketing_campaign', 'image_template_ai_research', 'image_template_business_news', 'image_template_science', 'image_template_lifestyle', 'image_template_general']
  },
  image_processing: {
    label: 'Обробка зображень',
    icon: '🎨',
    types: ['image_linkedin_optimize', 'image_enhance', 'image_custom']
  },
  social: {
    label: 'Соціальні мережі',
    icon: '📱',
    types: ['social_teaser_linkedin', 'social_teaser_facebook', 'social_teaser_instagram', 'social_teaser_twitter']
  }
}

export const AIPromptsManager = () => {
  const [prompts, setPrompts] = useState<AIPrompt[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingPrompt, setEditingPrompt] = useState<AIPrompt | null>(null)
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    news: true,
    image_generation: false,
    image_processing: false,
    social: false
  })
  const [expandedPrompts, setExpandedPrompts] = useState<Record<string, boolean>>({})

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    prompt_text: '',
    prompt_type: 'rewrite',
    is_active: true,
  })

  useEffect(() => {
    loadPrompts()
  }, [])

  const loadPrompts = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('ai_prompts')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setPrompts(data || [])
    } catch (error) {
      console.error('Failed to load prompts:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = () => {
    setEditingPrompt(null)
    setFormData({
      name: '',
      description: '',
      prompt_text: '',
      prompt_type: 'rewrite',
      is_active: true,
    })
    setShowModal(true)
  }

  const handleEdit = (prompt: AIPrompt) => {
    setEditingPrompt(prompt)
    setFormData({
      name: prompt.name,
      description: prompt.description || '',
      prompt_text: prompt.prompt_text,
      prompt_type: prompt.prompt_type,
      is_active: prompt.is_active,
    })
    setShowModal(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const promptData = {
        ...formData,
        description: formData.description || null,
      }

      if (editingPrompt) {
        const { error } = await supabase
          .from('ai_prompts')
          .update(promptData)
          .eq('id', editingPrompt.id)

        if (error) throw error
      } else {
        const { error } = await supabase.from('ai_prompts').insert([promptData])

        if (error) throw error
      }

      setShowModal(false)
      loadPrompts()
    } catch (error) {
      console.error('Failed to save prompt:', error)
      alert('Failed to save AI prompt')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this AI prompt?')) return

    try {
      const { error } = await supabase.from('ai_prompts').delete().eq('id', id)

      if (error) throw error
      loadPrompts()
    } catch (error) {
      console.error('Failed to delete prompt:', error)
      alert('Failed to delete AI prompt')
    }
  }

  const toggleActive = async (prompt: AIPrompt) => {
    try {
      const { error } = await supabase
        .from('ai_prompts')
        .update({ is_active: !prompt.is_active })
        .eq('id', prompt.id)

      if (error) throw error
      loadPrompts()
    } catch (error) {
      console.error('Failed to toggle active status:', error)
    }
  }

  const copyPrompt = (text: string) => {
    navigator.clipboard.writeText(text)
    alert('Prompt copied to clipboard!')
  }

  const toggleSection = (category: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [category]: !prev[category]
    }))
  }

  const togglePrompt = (promptId: string) => {
    setExpandedPrompts(prev => ({
      ...prev,
      [promptId]: !prev[promptId]
    }))
  }

  // Group prompts by category
  const getPromptsByCategory = (category: string): AIPrompt[] => {
    const categoryTypes = PROMPT_CATEGORIES[category]?.types || []
    return prompts.filter(p => categoryTypes.includes(p.prompt_type))
  }

  // Get category stats
  const getCategoryStats = (category: string): { active: number; total: number } => {
    const categoryPrompts = getPromptsByCategory(category)
    return {
      active: categoryPrompts.filter(p => p.is_active).length,
      total: categoryPrompts.length
    }
  }

  const defaultRewritePrompt = `You are a professional content rewriter and translator. Rewrite the following news article to avoid plagiarism while preserving the meaning and key facts.

Original Title: {title}
Original Content: {content}
Source URL: {url}

Requirements:
1. Rewrite the content in your own words to avoid plagiarism
2. Keep all important facts and information
3. Make it engaging and professional
4. Translate to English (en), Norwegian (no), and Ukrainian (ua)
5. Create a short description (max 150 characters) for each language
6. Maintain journalistic style

Return ONLY valid JSON in this exact format:
{
  "en": {
    "title": "Rewritten English title",
    "content": "Full rewritten content in English",
    "description": "Short description (max 150 chars)"
  },
  "no": {
    "title": "Norwegian title",
    "content": "Full content in Norwegian",
    "description": "Short description in Norwegian"
  },
  "ua": {
    "title": "Ukrainian title",
    "content": "Full content in Ukrainian",
    "description": "Short description in Ukrainian"
  }
}`

  if (loading && prompts.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
          <p className="text-white">Loading prompts...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white">AI Prompts</h2>
          <p className="text-gray-300 text-sm">Manage prompts for AI rewriting and translation</p>
        </div>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={handleCreate}
          className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
        >
          <Plus className="h-5 w-5" />
          Add Prompt
        </motion.button>
      </div>

      {/* Info Box */}
      <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-4">
        <h3 className="text-white font-semibold mb-2">Як працюють AI промпти:</h3>
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <h4 className="text-purple-300 font-medium mb-1">📝 Текстовий контент:</h4>
            <ul className="text-gray-300 text-sm space-y-1">
              <li>- Використовуйте плейсхолдери: {'{title}'}, {'{content}'}, {'{url}'}</li>
              <li>- <strong>news_rewrite:</strong> Публікація в Новини (об'єктивний стиль)</li>
              <li>- <strong>blog_rewrite:</strong> Публікація в Блог (від першої особи)</li>
              <li>- AI поверне контент на EN, NO, UA як JSON</li>
            </ul>
          </div>
          <div>
            <h4 className="text-cyan-300 font-medium mb-1">🖼️ Обробка зображень:</h4>
            <ul className="text-gray-300 text-sm space-y-1">
              <li>- <strong>image_linkedin_optimize:</strong> Оптимізація для LinkedIn</li>
              <li>- <strong>image_enhance:</strong> Загальне покращення якості</li>
              <li>- Зображення обробляються через Google AI</li>
              <li>- Автоматично при завантаженні з Telegram</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Default Prompt Preview */}
      <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-white font-semibold">Default Rewrite Prompt Template:</h3>
          <button
            onClick={() => copyPrompt(defaultRewritePrompt)}
            className="flex items-center gap-2 px-3 py-1 bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 rounded-lg text-sm transition-colors"
          >
            <Copy className="h-4 w-4" />
            Copy
          </button>
        </div>
        <pre className="text-gray-300 text-xs bg-black/20 p-3 rounded overflow-x-auto">
          {defaultRewritePrompt}
        </pre>
      </div>

      {/* Prompts List - Organized by Sections */}
      <div className="space-y-4">
        {Object.entries(PROMPT_CATEGORIES).map(([categoryKey, categoryConfig]) => {
          const categoryPrompts = getPromptsByCategory(categoryKey)
          const stats = getCategoryStats(categoryKey)
          const isExpanded = expandedSections[categoryKey]

          return (
            <div
              key={categoryKey}
              className="bg-white/5 backdrop-blur-lg rounded-lg border border-white/10 overflow-hidden"
            >
              {/* Section Header */}
              <button
                onClick={() => toggleSection(categoryKey)}
                className="w-full flex items-center justify-between p-4 hover:bg-white/5 transition-colors"
              >
                <div className="flex items-center gap-3">
                  {isExpanded ? (
                    <ChevronDown className="h-5 w-5 text-gray-400" />
                  ) : (
                    <ChevronRight className="h-5 w-5 text-gray-400" />
                  )}
                  <span className="text-xl">{categoryConfig.icon}</span>
                  <span className="text-lg font-semibold text-white">{categoryConfig.label}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-3 py-1 bg-green-500/20 text-green-300 text-sm rounded-full">
                    {stats.active} active
                  </span>
                  <span className="text-gray-400 text-sm">/ {stats.total} total</span>
                </div>
              </button>

              {/* Section Content */}
              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    {categoryPrompts.length === 0 ? (
                      <div className="px-4 pb-4 text-gray-500 text-sm">
                        No prompts in this category
                      </div>
                    ) : (
                      <div className="px-4 pb-4 space-y-2">
                        {categoryPrompts.map((prompt) => {
                          const isPromptExpanded = expandedPrompts[prompt.id]

                          return (
                            <div
                              key={prompt.id}
                              className={`rounded-lg border transition-colors ${
                                prompt.is_active
                                  ? 'bg-white/5 border-white/10'
                                  : 'bg-gray-500/5 border-gray-500/10'
                              }`}
                            >
                              {/* Compact Prompt Row */}
                              <div className="flex items-center justify-between p-3 gap-4">
                                <div className="flex items-center gap-3 flex-1 min-w-0">
                                  {/* Expand/Collapse Button */}
                                  <button
                                    onClick={() => togglePrompt(prompt.id)}
                                    className="p-1 text-gray-400 hover:text-white transition-colors"
                                  >
                                    {isPromptExpanded ? (
                                      <ChevronDown className="h-4 w-4" />
                                    ) : (
                                      <ChevronRight className="h-4 w-4" />
                                    )}
                                  </button>

                                  {/* Prompt Type Badge */}
                                  <span className="px-2 py-1 bg-blue-500/20 text-blue-300 text-xs rounded-full whitespace-nowrap">
                                    {prompt.prompt_type}
                                  </span>

                                  {/* Prompt Name */}
                                  <span className="text-white font-medium truncate">
                                    {prompt.name}
                                  </span>

                                  {/* Status Badge */}
                                  <span className={`px-2 py-0.5 rounded-full text-xs whitespace-nowrap ${
                                    prompt.is_active
                                      ? 'bg-green-500/20 text-green-300'
                                      : 'bg-gray-500/20 text-gray-400'
                                  }`}>
                                    {prompt.is_active ? 'Active' : 'Inactive'}
                                  </span>

                                  {/* Usage Count */}
                                  <span className={`text-xs whitespace-nowrap ${
                                    prompt.usage_count > 0 ? 'text-gray-400' : 'text-gray-600'
                                  }`}>
                                    Used {prompt.usage_count}x
                                  </span>
                                </div>

                                {/* Action Buttons */}
                                <div className="flex items-center gap-1">
                                  <motion.button
                                    whileHover={{ scale: 1.1 }}
                                    whileTap={{ scale: 0.9 }}
                                    onClick={() => copyPrompt(prompt.prompt_text)}
                                    className="p-1.5 text-gray-400 hover:text-white transition-colors"
                                    title="Copy prompt"
                                  >
                                    <Copy className="h-4 w-4" />
                                  </motion.button>
                                  <motion.button
                                    whileHover={{ scale: 1.1 }}
                                    whileTap={{ scale: 0.9 }}
                                    onClick={() => toggleActive(prompt)}
                                    className={`p-1.5 transition-colors ${
                                      prompt.is_active
                                        ? 'text-green-400 hover:text-green-300'
                                        : 'text-gray-400 hover:text-gray-300'
                                    }`}
                                    title={prompt.is_active ? 'Deactivate' : 'Activate'}
                                  >
                                    {prompt.is_active ? (
                                      <ToggleRight className="h-4 w-4" />
                                    ) : (
                                      <ToggleLeft className="h-4 w-4" />
                                    )}
                                  </motion.button>
                                  <motion.button
                                    whileHover={{ scale: 1.1 }}
                                    whileTap={{ scale: 0.9 }}
                                    onClick={() => handleEdit(prompt)}
                                    className="p-1.5 text-blue-400 hover:text-blue-300 transition-colors"
                                    title="Edit"
                                  >
                                    <Edit className="h-4 w-4" />
                                  </motion.button>
                                  <motion.button
                                    whileHover={{ scale: 1.1 }}
                                    whileTap={{ scale: 0.9 }}
                                    onClick={() => handleDelete(prompt.id)}
                                    className="p-1.5 text-red-400 hover:text-red-300 transition-colors"
                                    title="Delete"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </motion.button>
                                </div>
                              </div>

                              {/* Expanded Prompt Details */}
                              <AnimatePresence>
                                {isPromptExpanded && (
                                  <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: 'auto', opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    transition={{ duration: 0.15 }}
                                    className="overflow-hidden"
                                  >
                                    <div className="px-4 pb-4 pt-2 border-t border-white/5">
                                      {prompt.description && (
                                        <p className="text-gray-300 text-sm mb-3">
                                          {prompt.description}
                                        </p>
                                      )}
                                      <pre className="p-3 bg-black/30 rounded text-xs text-gray-300 overflow-x-auto max-h-64 overflow-y-auto">
                                        {prompt.prompt_text}
                                      </pre>
                                    </div>
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )
        })}
      </div>

      {prompts.length === 0 && (
        <div className="text-center py-12">
          <Sparkles className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-400">No AI prompts configured</p>
          <p className="text-gray-500 text-sm">Add your first prompt to start using AI rewriting</p>
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
                {editingPrompt ? 'Edit AI Prompt' : 'Add AI Prompt'}
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
                  Prompt Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  placeholder="News Rewriter - Multi-language"
                  className="w-full px-4 py-2 bg-white/5 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Prompt Type *
                </label>
                <select
                  value={formData.prompt_type}
                  onChange={(e) => setFormData({ ...formData, prompt_type: e.target.value })}
                  className="w-full px-4 py-2 bg-white/5 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <optgroup label="📰 Новини та контент">
                    <option value="news_rewrite">News Rewrite (Journalistic Style)</option>
                    <option value="blog_rewrite">Blog Rewrite (Personal Perspective)</option>
                    <option value="pre_moderation">Pre-Moderation (AI Filter)</option>
                    <option value="rss_article_analysis">RSS Article Analysis</option>
                    <option value="rss_news_rewrite">RSS News Rewrite (Fallback)</option>
                    <option value="rewrite">Rewrite & Translate (Legacy)</option>
                    <option value="translate">Translate Only</option>
                    <option value="summarize">Summarize</option>
                  </optgroup>
                  <optgroup label="🖼️ Генерація зображень">
                    <option value="image_pre_analyzer">Image Pre-Analyzer (Approach + Metaphor)</option>
                    <option value="image_creative_writer">Image Creative Writer (Editorial Method)</option>
                    <option value="image_classifier">Image Classifier (Structured Step 1)</option>
                    <option value="image_template_tech_product">Template: Tech Product</option>
                    <option value="image_template_marketing_campaign">Template: Marketing Campaign</option>
                    <option value="image_template_ai_research">Template: AI Research</option>
                    <option value="image_template_business_news">Template: Business News</option>
                    <option value="image_template_science">Template: Science</option>
                    <option value="image_template_lifestyle">Template: Lifestyle</option>
                    <option value="image_template_general">Template: General (Fallback)</option>
                  </optgroup>
                  <optgroup label="🎨 Обробка зображень">
                    <option value="image_linkedin_optimize">Image: LinkedIn Optimization</option>
                    <option value="image_enhance">Image: General Enhancement</option>
                    <option value="image_custom">Image: Custom Processing</option>
                  </optgroup>
                  <optgroup label="📱 Соціальні мережі">
                    <option value="social_teaser_linkedin">Social Teaser: LinkedIn</option>
                    <option value="social_teaser_facebook">Social Teaser: Facebook</option>
                    <option value="social_teaser_instagram">Social Teaser: Instagram</option>
                    <option value="social_teaser_twitter">Social Teaser: Twitter</option>
                  </optgroup>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Description
                </label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Rewrites news articles in English, Norwegian, and Ukrainian"
                  className="w-full px-4 py-2 bg-white/5 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Prompt Text *
                </label>
                <textarea
                  value={formData.prompt_text}
                  onChange={(e) => setFormData({ ...formData, prompt_text: e.target.value })}
                  required
                  placeholder={defaultRewritePrompt}
                  className="w-full h-64 px-4 py-2 bg-white/5 border border-white/20 rounded-lg text-white font-mono text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none overflow-y-auto"
                />
                <p className="text-gray-400 text-xs mt-1">
                  Use placeholders: {'{title}'}, {'{content}'}, {'{url}'}
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
                  Active (use this prompt for processing)
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
                  {loading ? 'Saving...' : editingPrompt ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  )
}
