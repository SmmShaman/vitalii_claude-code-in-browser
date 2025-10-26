import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Edit, Trash2, Sparkles, Save } from 'lucide-react';
import type { AIPrompt } from '../../integrations/supabase/types';
import { supabase } from '../../integrations/supabase/client';

type PromptType = 'rewrite' | 'translate' | 'summarize';

export const AIPromptsManager = () => {
  const [prompts, setPrompts] = useState<AIPrompt[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingPrompt, setEditingPrompt] = useState<AIPrompt | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    type: 'rewrite' as PromptType,
    prompt_text: '',
    is_active: true,
  });

  useEffect(() => {
    loadPrompts();
  }, []);

  const loadPrompts = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('ai_prompts')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      setPrompts(data || []);
    } catch (error) {
      console.error('Failed to load prompts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (editingPrompt) {
        // Update existing prompt
        const { error } = await supabase
          .from('ai_prompts')
          .update(formData)
          .eq('id', editingPrompt.id);

        if (error) throw error;
      } else {
        // Create new prompt
        const { error } = await supabase
          .from('ai_prompts')
          .insert([formData]);

        if (error) throw error;
      }

      // Reset form
      setFormData({
        name: '',
        type: 'rewrite',
        prompt_text: '',
        is_active: true,
      });
      setEditingPrompt(null);
      setShowForm(false);

      // Reload prompts
      loadPrompts();
    } catch (error) {
      console.error('Failed to save prompt:', error);
    }
  };

  const handleEdit = (prompt: AIPrompt) => {
    setEditingPrompt(prompt);
    setFormData({
      name: prompt.name,
      type: prompt.type as PromptType,
      prompt_text: prompt.prompt_text,
      is_active: prompt.is_active,
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this prompt?')) return;

    try {
      const { error } = await supabase
        .from('ai_prompts')
        .delete()
        .eq('id', id);

      if (error) throw error;

      loadPrompts();
    } catch (error) {
      console.error('Failed to delete prompt:', error);
    }
  };

  const defaultPrompts = {
    rewrite: `You are a professional content rewriter. Rewrite the following news article to avoid plagiarism while maintaining all key facts and information. Make it engaging and professional.

Article: {content}

Rewritten version:`,
    translate: `Translate the following text accurately while maintaining its tone and meaning.

Text: {content}
Target language: {language}

Translation:`,
    summarize: `Create a concise 2-3 sentence summary of the following article:

Article: {content}

Summary:`,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white mb-2">AI Prompts</h2>
          <p className="text-gray-400">Customize prompts for news rewriting, translation, and summarization</p>
        </div>

        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => {
            setShowForm(!showForm);
            setEditingPrompt(null);
            setFormData({
              name: '',
              type: 'rewrite',
              prompt_text: '',
              is_active: true,
            });
          }}
          className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-lg transition-colors"
        >
          <Plus className="h-5 w-5" />
          Add Prompt
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
              {editingPrompt ? 'Edit Prompt' : 'Add New Prompt'}
            </h3>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-200 mb-2">
                    Prompt Name
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                    className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="e.g., News Rewriter"
                  />
                </div>

                {/* Type */}
                <div>
                  <label className="block text-sm font-medium text-gray-200 mb-2">
                    Prompt Type
                  </label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value as PromptType })}
                    className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="rewrite">Rewrite Article</option>
                    <option value="translate">Translate Content</option>
                    <option value="summarize">Summarize Article</option>
                  </select>
                </div>
              </div>

              {/* Prompt Text */}
              <div>
                <label className="block text-sm font-medium text-gray-200 mb-2">
                  Prompt Text
                </label>
                <textarea
                  value={formData.prompt_text}
                  onChange={(e) => setFormData({ ...formData, prompt_text: e.target.value })}
                  required
                  rows={10}
                  className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary font-mono text-sm"
                  placeholder={defaultPrompts[formData.type]}
                />
                <p className="text-xs text-gray-400 mt-2">
                  Use placeholders: {'{content}'} for article content, {'{language}'} for target language
                </p>
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
                  Active (use this prompt for AI processing)
                </label>
              </div>

              {/* Buttons */}
              <div className="flex gap-3">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  type="submit"
                  className="flex items-center gap-2 px-6 py-2 bg-primary hover:bg-primary/90 text-white rounded-lg transition-colors"
                >
                  <Save className="h-5 w-5" />
                  {editingPrompt ? 'Update Prompt' : 'Add Prompt'}
                </motion.button>

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    setEditingPrompt(null);
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

      {/* Prompts List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
        </div>
      ) : prompts.length === 0 ? (
        <div className="bg-white/10 backdrop-blur-lg rounded-xl p-12 border border-white/20 text-center">
          <Sparkles className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-400 mb-4">No AI prompts yet. Add your first prompt to get started!</p>
          <p className="text-sm text-gray-500">
            Prompts are used to instruct Azure OpenAI on how to rewrite, translate, or summarize news content.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {prompts.map((prompt, index) => (
            <motion.div
              key={prompt.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20 hover:border-primary/50 transition-all"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-start gap-4 flex-1">
                  <div className={`p-3 rounded-lg ${prompt.is_active ? 'bg-purple-500/20 text-purple-400' : 'bg-gray-500/20 text-gray-400'}`}>
                    <Sparkles className="h-5 w-5" />
                  </div>

                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-white mb-1">{prompt.name}</h3>
                    <div className="flex items-center gap-2 text-xs text-gray-500 mb-3">
                      <span className="px-2 py-1 bg-white/5 rounded">
                        {prompt.type.toUpperCase()}
                      </span>
                      <span className={prompt.is_active ? 'text-green-400' : 'text-gray-400'}>
                        {prompt.is_active ? '● Active' : '○ Inactive'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => handleEdit(prompt)}
                    className="p-2 rounded-lg bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 transition-colors"
                  >
                    <Edit className="h-5 w-5" />
                  </motion.button>

                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => handleDelete(prompt.id)}
                    className="p-2 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors"
                  >
                    <Trash2 className="h-5 w-5" />
                  </motion.button>
                </div>
              </div>

              {/* Prompt Preview */}
              <div className="bg-black/20 rounded-lg p-4 border border-white/5">
                <p className="text-sm text-gray-300 font-mono whitespace-pre-wrap line-clamp-4">
                  {prompt.prompt_text}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};
