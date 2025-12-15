'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  Image,
  Sparkles,
  RefreshCw,
  Save,
  Plus,
  Trash2,
  Check,
  Snowflake,
  Sun,
  Flower2,
  Leaf,
  Heart,
  Star
} from 'lucide-react'
import { supabase } from '@/integrations/supabase/client'

interface ImagePrompt {
  id: string
  name: string
  prompt_type: string
  prompt_text: string
  description: string | null
  is_active: boolean
  usage_count: number
}

// Predefined seasonal themes
const SEASONAL_THEMES = [
  {
    id: 'christmas',
    name: '🎄 Різдвяний',
    icon: Snowflake,
    prompt: `Edit this image with a festive Christmas theme:
- Add subtle warm holiday lighting effects
- Enhance with cozy winter atmosphere
- Keep professional look suitable for LinkedIn
- Add gentle snow or sparkle effects if appropriate
- Maintain the original subject clearly visible
Output a professionally enhanced Christmas-themed version.`
  },
  {
    id: 'spring',
    name: '🌸 Весняний',
    icon: Flower2,
    prompt: `Edit this image with a fresh spring theme:
- Brighten colors with spring freshness
- Add subtle floral or nature elements
- Enhance with warm, optimistic lighting
- Keep professional appearance for LinkedIn
- Make colors vibrant but not oversaturated
Output a professionally enhanced spring-themed version.`
  },
  {
    id: 'easter',
    name: '🐰 Пасхальний',
    icon: Star,
    prompt: `Edit this image with an Easter/spring celebration theme:
- Add warm, hopeful lighting
- Enhance with soft pastel tones
- Keep professional look for LinkedIn
- Add subtle festive elements if appropriate
- Maintain clear visibility of the subject
Output a professionally enhanced Easter-themed version.`
  },
  {
    id: 'summer',
    name: '☀️ Літній',
    icon: Sun,
    prompt: `Edit this image with a bright summer theme:
- Enhance with warm, sunny lighting
- Make colors vibrant and energetic
- Add summer freshness and brightness
- Keep professional for LinkedIn posting
- Optimize contrast for outdoor visibility
Output a professionally enhanced summer-themed version.`
  },
  {
    id: 'autumn',
    name: '🍂 Осінній',
    icon: Leaf,
    prompt: `Edit this image with a cozy autumn theme:
- Add warm golden/orange tones
- Enhance with soft autumn lighting
- Create comfortable, professional atmosphere
- Keep suitable for LinkedIn
- Add subtle warmth without overdoing colors
Output a professionally enhanced autumn-themed version.`
  },
  {
    id: 'valentine',
    name: '💝 Валентина',
    icon: Heart,
    prompt: `Edit this image with a Valentine's Day theme:
- Add soft romantic lighting
- Enhance with subtle pink/red accents
- Keep professional appearance for LinkedIn
- Add gentle warmth and elegance
- Maintain clear subject visibility
Output a professionally enhanced Valentine-themed version.`
  },
]

export const ImageProcessingSettings = () => {
  const [prompts, setPrompts] = useState<ImagePrompt[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [activePromptId, setActivePromptId] = useState<string | null>(null)
  const [customPrompt, setCustomPrompt] = useState('')
  const [showCustomEditor, setShowCustomEditor] = useState(false)

  useEffect(() => {
    loadPrompts()
  }, [])

  const loadPrompts = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('ai_prompts')
        .select('*')
        .like('prompt_type', 'image_%')
        .order('is_active', { ascending: false })

      if (error) throw error

      setPrompts(data || [])

      // Find active prompt
      const active = data?.find(p => p.is_active && p.prompt_type === 'image_linkedin_optimize')
      if (active) {
        setActivePromptId(active.id)
        setCustomPrompt(active.prompt_text)
      }
    } catch (error) {
      console.error('Failed to load prompts:', error)
    } finally {
      setLoading(false)
    }
  }

  const activatePrompt = async (promptId: string) => {
    try {
      setSaving(true)

      // Deactivate all image_linkedin_optimize prompts
      await supabase
        .from('ai_prompts')
        .update({ is_active: false })
        .eq('prompt_type', 'image_linkedin_optimize')

      // Activate selected prompt
      await supabase
        .from('ai_prompts')
        .update({ is_active: true })
        .eq('id', promptId)

      setActivePromptId(promptId)
      await loadPrompts()
    } catch (error) {
      console.error('Failed to activate prompt:', error)
    } finally {
      setSaving(false)
    }
  }

  const applySeasonalTheme = async (theme: typeof SEASONAL_THEMES[0]) => {
    try {
      setSaving(true)

      // Check if theme prompt already exists
      const { data: existing } = await supabase
        .from('ai_prompts')
        .select('id')
        .eq('prompt_type', 'image_linkedin_optimize')
        .eq('name', theme.name)
        .single()

      let promptId: string

      if (existing) {
        // Update existing
        await supabase
          .from('ai_prompts')
          .update({ prompt_text: theme.prompt })
          .eq('id', existing.id)
        promptId = existing.id
      } else {
        // Create new
        const { data: newPrompt, error } = await supabase
          .from('ai_prompts')
          .insert({
            name: theme.name,
            prompt_type: 'image_linkedin_optimize',
            prompt_text: theme.prompt,
            description: `Сезонна тема: ${theme.name}`,
            is_active: false
          })
          .select('id')
          .single()

        if (error) throw error
        promptId = newPrompt.id
      }

      // Activate this prompt
      await activatePrompt(promptId)
      setCustomPrompt(theme.prompt)

    } catch (error) {
      console.error('Failed to apply theme:', error)
    } finally {
      setSaving(false)
    }
  }

  const saveCustomPrompt = async () => {
    if (!customPrompt.trim()) return

    try {
      setSaving(true)

      // Update or create custom prompt
      const { data: existing } = await supabase
        .from('ai_prompts')
        .select('id')
        .eq('prompt_type', 'image_linkedin_optimize')
        .eq('name', '✏️ Власний промпт')
        .single()

      let promptId: string

      if (existing) {
        await supabase
          .from('ai_prompts')
          .update({ prompt_text: customPrompt })
          .eq('id', existing.id)
        promptId = existing.id
      } else {
        const { data: newPrompt, error } = await supabase
          .from('ai_prompts')
          .insert({
            name: '✏️ Власний промпт',
            prompt_type: 'image_linkedin_optimize',
            prompt_text: customPrompt,
            description: 'Користувацький промпт для обробки зображень',
            is_active: false
          })
          .select('id')
          .single()

        if (error) throw error
        promptId = newPrompt.id
      }

      await activatePrompt(promptId)
      setShowCustomEditor(false)

    } catch (error) {
      console.error('Failed to save custom prompt:', error)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-3 bg-gradient-to-br from-pink-500 to-purple-600 rounded-xl">
          <Image className="h-6 w-6 text-white" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-white">Обробка зображень</h2>
          <p className="text-gray-400 text-sm">Налаштування Gemini AI для LinkedIn</p>
        </div>
      </div>

      {/* Current Active Theme */}
      <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4">
        <div className="flex items-center gap-2 mb-2">
          <Check className="h-5 w-5 text-green-400" />
          <h3 className="text-white font-semibold">Активна тема:</h3>
        </div>
        <p className="text-green-300">
          {prompts.find(p => p.id === activePromptId)?.name || 'Стандартна оптимізація'}
        </p>
      </div>

      {/* Seasonal Themes */}
      <div className="bg-white/5 rounded-xl p-6 border border-white/10">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-yellow-400" />
          Сезонні теми
        </h3>
        <p className="text-gray-400 text-sm mb-4">
          Оберіть тему для автоматичної обробки всіх зображень з Telegram
        </p>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {SEASONAL_THEMES.map((theme) => {
            const Icon = theme.icon
            const isActive = prompts.find(p => p.id === activePromptId)?.name === theme.name

            return (
              <motion.button
                key={theme.id}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => applySeasonalTheme(theme)}
                disabled={saving}
                className={`p-4 rounded-lg border-2 transition-all text-left ${
                  isActive
                    ? 'bg-purple-500/20 border-purple-500 text-white'
                    : 'bg-white/5 border-white/10 text-gray-300 hover:border-white/30'
                }`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <Icon className={`h-5 w-5 ${isActive ? 'text-purple-400' : 'text-gray-400'}`} />
                  <span className="font-medium">{theme.name}</span>
                </div>
                {isActive && (
                  <span className="text-xs text-purple-400">✓ Активна</span>
                )}
              </motion.button>
            )
          })}
        </div>
      </div>

      {/* Custom Prompt Editor */}
      <div className="bg-white/5 rounded-xl p-6 border border-white/10">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            ✏️ Власний промпт
          </h3>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowCustomEditor(!showCustomEditor)}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm"
          >
            {showCustomEditor ? 'Згорнути' : 'Редагувати'}
          </motion.button>
        </div>

        {showCustomEditor && (
          <div className="space-y-4">
            <p className="text-gray-400 text-sm">
              Напишіть власні інструкції для Gemini AI. Цей промпт буде відправлятися разом з кожним зображенням.
            </p>

            <textarea
              value={customPrompt}
              onChange={(e) => setCustomPrompt(e.target.value)}
              placeholder="Edit this image to..."
              className="w-full h-48 px-4 py-3 bg-black/30 border border-white/20 rounded-lg text-white font-mono text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
            />

            <div className="flex items-center gap-3">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={saveCustomPrompt}
                disabled={saving || !customPrompt.trim()}
                className="flex items-center gap-2 px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg disabled:opacity-50"
              >
                <Save className="h-4 w-4" />
                {saving ? 'Збереження...' : 'Зберегти та активувати'}
              </motion.button>

              <button
                onClick={() => setShowCustomEditor(false)}
                className="px-4 py-2 text-gray-400 hover:text-white"
              >
                Скасувати
              </button>
            </div>

            {/* Tips */}
            <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 mt-4">
              <h4 className="text-blue-300 font-medium mb-2">💡 Поради для промпту:</h4>
              <ul className="text-gray-300 text-sm space-y-1">
                <li>• Починайте з "Edit this image to..." для редагування</li>
                <li>• Вказуйте конкретний стиль: lighting, colors, atmosphere</li>
                <li>• Додайте "Keep professional for LinkedIn"</li>
                <li>• Закінчуйте з "Output a high-quality version"</li>
              </ul>
            </div>
          </div>
        )}
      </div>

      {/* Info about multiple images */}
      <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
        <h4 className="text-yellow-300 font-medium mb-2">⚠️ Обмеження:</h4>
        <ul className="text-gray-300 text-sm space-y-1">
          <li>• Зараз обробляється тільки <strong>перше зображення</strong> з поста</li>
          <li>• Обробка відбувається автоматично при завантаженні з Telegram</li>
          <li>• Оброблене зображення використовується для LinkedIn публікацій</li>
        </ul>
      </div>

      {/* Refresh button */}
      <div className="flex justify-end">
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={loadPrompts}
          className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg"
        >
          <RefreshCw className="h-4 w-4" />
          Оновити
        </motion.button>
      </div>
    </div>
  )
}
