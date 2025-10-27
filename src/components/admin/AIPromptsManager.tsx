import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Edit, Trash2, Sparkles, X, ToggleLeft, ToggleRight, Copy } from 'lucide-react';
import { supabase } from '../../integrations/supabase/client';

interface AIPrompt {
  id: string;
  name: string;
  description: string | null;
  prompt_text: string;
  prompt_type: string;
  is_active: boolean;
  usage_count: number;
  created_at: string;
}

export const AIPromptsManager = () => {
  const [prompts, setPrompts] = useState<AIPrompt[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingPrompt, setEditingPrompt] = useState<AIPrompt | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    prompt_text: '',
    prompt_type: 'rewrite',
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

  const handleCreate = () => {
    setEditingPrompt(null);
    setFormData({
      name: '',
      description: '',
      prompt_text: '',
      prompt_type: 'rewrite',
      is_active: true,
    });
    setShowModal(true);
  };

  const handleEdit = (prompt: AIPrompt) => {
    setEditingPrompt(prompt);
    setFormData({
      name: prompt.name,
      description: prompt.description || '',
      prompt_text: prompt.prompt_text,
      prompt_type: prompt.prompt_type,
      is_active: prompt.is_active,
    });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const promptData = {
        ...formData,
        description: formData.description || null,
      };

      if (editingPrompt) {
        const { error } = await supabase
          .from('ai_prompts')
          .update(promptData)
          .eq('id', editingPrompt.id);

        if (error) throw error;
      } else {
        const { error } = await supabase.from('ai_prompts').insert([promptData]);

        if (error) throw error;
      }

      setShowModal(false);
      loadPrompts();
    } catch (error) {
      console.error('Failed to save prompt:', error);
      alert('Failed to save AI prompt');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this AI prompt?')) return;

    try {
      const { error } = await supabase.from('ai_prompts').delete().eq('id', id);

      if (error) throw error;
      loadPrompts();
    } catch (error) {
      console.error('Failed to delete prompt:', error);
      alert('Failed to delete AI prompt');
    }
  };

  const toggleActive = async (prompt: AIPrompt) => {
    try {
      const { error } = await supabase
        .from('ai_prompts')
        .update({ is_active: !prompt.is_active })
        .eq('id', prompt.id);

      if (error) throw error;
      loadPrompts();
    } catch (error) {
      console.error('Failed to toggle active status:', error);
    }
  };

  const copyPrompt = (text: string) => {
    navigator.clipboard.writeText(text);
    alert('Prompt copied to clipboard!');
  };

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
}`;

  if (loading && prompts.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
          <p className="text-white">Loading prompts...</p>
        </div>
      </div>
    );
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
        <h3 className="text-white font-semibold mb-2">How AI Prompts Work:</h3>
        <ul className="text-gray-300 text-sm space-y-1">
          <li>• Create custom prompts for AI to rewrite and translate news articles</li>
          <li>• Use placeholders: {'{title}'}, {'{content}'}, {'{url}'}</li>
          <li>• System will use active "rewrite" type prompt for news processing</li>
          <li>• AI will return translated content in EN, NO, and UA languages</li>
        </ul>
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

      {/* Prompts List */}
      <div className="grid grid-cols-1 gap-4">
        <AnimatePresence>
          {prompts.map((prompt) => (
            <motion.div
              key={prompt.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className={`bg-white/10 backdrop-blur-lg rounded-lg p-6 border ${
                prompt.is_active ? 'border-white/20' : 'border-gray-500/20'
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <div className={`p-2 rounded-lg ${
                      prompt.is_active ? 'bg-purple-500/20' : 'bg-gray-500/20'
                    }`}>
                      <Sparkles className={`h-5 w-5 ${
                        prompt.is_active ? 'text-purple-300' : 'text-gray-400'
                      }`} />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-white">{prompt.name}</h3>
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          prompt.is_active
                            ? 'bg-green-500/20 text-green-300'
                            : 'bg-gray-500/20 text-gray-300'
                        }`}>
                          {prompt.is_active ? 'Active' : 'Inactive'}
                        </span>
                        <span className="px-2 py-1 bg-blue-500/20 text-blue-300 text-xs rounded-full">
                          {prompt.prompt_type}
                        </span>
                        <span className="text-gray-400 text-xs">
                          Used {prompt.usage_count} times
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="ml-14">
                    {prompt.description && (
                      <p className="text-gray-300 text-sm mb-2">{prompt.description}</p>
                    )}
                    <details className="text-gray-400 text-sm">
                      <summary className="cursor-pointer hover:text-gray-300">
                        View Prompt
                      </summary>
                      <pre className="mt-2 p-3 bg-black/20 rounded text-xs overflow-x-auto">
                        {prompt.prompt_text}
                      </pre>
                    </details>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => copyPrompt(prompt.prompt_text)}
                    className="p-2 text-gray-300 hover:text-white transition-colors"
                    title="Copy prompt"
                  >
                    <Copy className="h-5 w-5" />
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => toggleActive(prompt)}
                    className={`p-2 transition-colors ${
                      prompt.is_active
                        ? 'text-green-400 hover:text-green-300'
                        : 'text-gray-400 hover:text-gray-300'
                    }`}
                    title={prompt.is_active ? 'Deactivate' : 'Activate'}
                  >
                    {prompt.is_active ? (
                      <ToggleRight className="h-5 w-5" />
                    ) : (
                      <ToggleLeft className="h-5 w-5" />
                    )}
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => handleEdit(prompt)}
                    className="p-2 text-blue-400 hover:text-blue-300 transition-colors"
                  >
                    <Edit className="h-5 w-5" />
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => handleDelete(prompt.id)}
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
                  <option value="rewrite">Rewrite & Translate</option>
                  <option value="translate">Translate Only</option>
                  <option value="summarize">Summarize</option>
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
  );
};
