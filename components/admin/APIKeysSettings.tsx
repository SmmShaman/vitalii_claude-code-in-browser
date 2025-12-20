'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  Key,
  Eye,
  EyeOff,
  Save,
  RefreshCw,
  Check,
  AlertCircle,
  ExternalLink,
  Copy,
  CheckCircle2
} from 'lucide-react'
import { supabase } from '@/integrations/supabase/client'

interface APIKey {
  id: string
  key_name: string
  key_value: string | null
  description: string | null
  is_active: boolean
  updated_at: string
}

const API_KEY_CONFIGS = {
  GOOGLE_API_KEY: {
    label: 'Google API Key',
    description: 'Для Gemini AI обробки зображень перед публікацією в LinkedIn',
    helpUrl: 'https://aistudio.google.com/app/apikey',
    helpText: 'Отримати ключ в Google AI Studio'
  },
  LINKEDIN_ACCESS_TOKEN: {
    label: 'LinkedIn Access Token',
    description: 'OAuth2 токен для публікації в LinkedIn',
    helpUrl: 'https://www.linkedin.com/developers/apps',
    helpText: 'LinkedIn Developer Portal'
  },
  LINKEDIN_PERSON_URN: {
    label: 'LinkedIn Person URN',
    description: 'Ваш унікальний ID в LinkedIn (формат: urn:li:person:xxxxx)',
    helpUrl: 'https://www.linkedin.com/developers/apps',
    helpText: 'Знайти через LinkedIn API: GET /v2/me'
  }
}

export const APIKeysSettings = () => {
  const [keys, setKeys] = useState<APIKey[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)
  const [showValues, setShowValues] = useState<Record<string, boolean>>({})
  const [editValues, setEditValues] = useState<Record<string, string>>({})
  const [copied, setCopied] = useState<string | null>(null)
  const [testResults, setTestResults] = useState<Record<string, 'success' | 'error' | null>>({})

  useEffect(() => {
    loadKeys()
  }, [])

  const loadKeys = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('api_settings')
        .select('*')
        .order('key_name')

      if (error) throw error

      setKeys(data || [])

      // Initialize edit values
      const values: Record<string, string> = {}
      data?.forEach(key => {
        values[key.key_name] = key.key_value || ''
      })
      setEditValues(values)
    } catch (error) {
      console.error('Failed to load API keys:', error)
    } finally {
      setLoading(false)
    }
  }

  const saveKey = async (keyName: string) => {
    try {
      setSaving(keyName)

      const { error } = await supabase
        .from('api_settings')
        .update({
          key_value: editValues[keyName] || null,
          updated_at: new Date().toISOString()
        })
        .eq('key_name', keyName)

      if (error) throw error

      await loadKeys()
      setTestResults(prev => ({ ...prev, [keyName]: null }))
    } catch (error) {
      console.error('Failed to save API key:', error)
    } finally {
      setSaving(null)
    }
  }

  const testGoogleApiKey = async () => {
    const key = editValues['GOOGLE_API_KEY']
    if (!key) {
      setTestResults(prev => ({ ...prev, GOOGLE_API_KEY: 'error' }))
      return
    }

    try {
      // Simple test - list models
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models?key=${key}`
      )

      if (response.ok) {
        setTestResults(prev => ({ ...prev, GOOGLE_API_KEY: 'success' }))
      } else {
        setTestResults(prev => ({ ...prev, GOOGLE_API_KEY: 'error' }))
      }
    } catch {
      setTestResults(prev => ({ ...prev, GOOGLE_API_KEY: 'error' }))
    }
  }

  const copyToClipboard = (text: string, keyName: string) => {
    navigator.clipboard.writeText(text)
    setCopied(keyName)
    setTimeout(() => setCopied(null), 2000)
  }

  const maskValue = (value: string) => {
    if (!value) return ''
    if (value.length <= 8) return '••••••••'
    return value.substring(0, 4) + '••••••••' + value.substring(value.length - 4)
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
        <div className="p-3 bg-gradient-to-br from-yellow-500 to-orange-600 rounded-xl">
          <Key className="h-6 w-6 text-white" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-white">API Ключі</h2>
          <p className="text-gray-400 text-sm">Налаштування зовнішніх сервісів</p>
        </div>
      </div>

      {/* Info */}
      <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-blue-400 mt-0.5" />
          <div>
            <h3 className="text-blue-300 font-medium mb-1">Як це працює</h3>
            <p className="text-gray-300 text-sm">
              API ключі зберігаються в базі даних і використовуються Edge Functions.
              Для максимальної безпеки рекомендуємо також встановити їх як Supabase Secrets.
            </p>
          </div>
        </div>
      </div>

      {/* API Keys */}
      <div className="space-y-4">
        {keys.map((key) => {
          const config = API_KEY_CONFIGS[key.key_name as keyof typeof API_KEY_CONFIGS]
          const isEditing = editValues[key.key_name] !== (key.key_value || '')
          const testResult = testResults[key.key_name]

          return (
            <div
              key={key.id}
              className="bg-white/5 rounded-xl p-6 border border-white/10"
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                    {config?.label || key.key_name}
                    {key.key_value && (
                      <span className="text-xs px-2 py-0.5 bg-green-500/20 text-green-400 rounded-full">
                        Налаштовано
                      </span>
                    )}
                    {!key.key_value && (
                      <span className="text-xs px-2 py-0.5 bg-yellow-500/20 text-yellow-400 rounded-full">
                        Не налаштовано
                      </span>
                    )}
                  </h3>
                  <p className="text-gray-400 text-sm mt-1">
                    {config?.description || key.description}
                  </p>
                </div>

                {config?.helpUrl && (
                  <a
                    href={config.helpUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-sm text-blue-400 hover:text-blue-300"
                  >
                    {config.helpText}
                    <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </div>

              {/* Input */}
              <div className="flex items-center gap-3">
                <div className="flex-1 relative">
                  <input
                    type={showValues[key.key_name] ? 'text' : 'password'}
                    value={editValues[key.key_name] || ''}
                    onChange={(e) =>
                      setEditValues(prev => ({ ...prev, [key.key_name]: e.target.value }))
                    }
                    placeholder={`Введіть ${config?.label || key.key_name}...`}
                    className="w-full px-4 py-3 bg-black/30 border border-white/20 rounded-lg text-white font-mono text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 pr-24"
                  />
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                    <button
                      onClick={() =>
                        setShowValues(prev => ({ ...prev, [key.key_name]: !prev[key.key_name] }))
                      }
                      className="p-2 text-gray-400 hover:text-white"
                      title={showValues[key.key_name] ? 'Приховати' : 'Показати'}
                    >
                      {showValues[key.key_name] ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                    {editValues[key.key_name] && (
                      <button
                        onClick={() => copyToClipboard(editValues[key.key_name], key.key_name)}
                        className="p-2 text-gray-400 hover:text-white"
                        title="Копіювати"
                      >
                        {copied === key.key_name ? (
                          <CheckCircle2 className="h-4 w-4 text-green-400" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </button>
                    )}
                  </div>
                </div>

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => saveKey(key.key_name)}
                  disabled={saving === key.key_name || !isEditing}
                  className="flex items-center gap-2 px-4 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving === key.key_name ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  Зберегти
                </motion.button>

                {/* Test button for Google API */}
                {key.key_name === 'GOOGLE_API_KEY' && editValues[key.key_name] && (
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={testGoogleApiKey}
                    className={`flex items-center gap-2 px-4 py-3 rounded-lg ${
                      testResult === 'success'
                        ? 'bg-green-600 text-white'
                        : testResult === 'error'
                        ? 'bg-red-600 text-white'
                        : 'bg-white/10 text-white hover:bg-white/20'
                    }`}
                  >
                    {testResult === 'success' ? (
                      <Check className="h-4 w-4" />
                    ) : testResult === 'error' ? (
                      <AlertCircle className="h-4 w-4" />
                    ) : (
                      <RefreshCw className="h-4 w-4" />
                    )}
                    Тест
                  </motion.button>
                )}
              </div>

              {/* Test result message */}
              {testResult && key.key_name === 'GOOGLE_API_KEY' && (
                <p className={`mt-2 text-sm ${
                  testResult === 'success' ? 'text-green-400' : 'text-red-400'
                }`}>
                  {testResult === 'success'
                    ? '✓ API ключ працює коректно'
                    : '✗ API ключ недійсний або не має доступу'}
                </p>
              )}

              {/* Last updated */}
              {key.key_value && key.updated_at && (
                <p className="mt-2 text-xs text-gray-500">
                  Оновлено: {new Date(key.updated_at).toLocaleString('uk-UA')}
                </p>
              )}
            </div>
          )
        })}
      </div>

      {/* Supabase Secrets Info */}
      <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
        <h4 className="text-yellow-300 font-medium mb-2">💡 Рекомендація: Supabase Secrets</h4>
        <p className="text-gray-300 text-sm mb-3">
          Для максимальної безпеки також налаштуйте ключі як Supabase Secrets:
        </p>
        <pre className="bg-black/30 rounded-lg p-3 text-sm text-gray-300 overflow-x-auto">
{`cd supabase
supabase secrets set GOOGLE_API_KEY="your_key"
supabase secrets set LINKEDIN_ACCESS_TOKEN="your_token"
supabase secrets set LINKEDIN_PERSON_URN="urn:li:person:xxxxx"`}
        </pre>
      </div>

      {/* Refresh button */}
      <div className="flex justify-end">
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={loadKeys}
          className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg"
        >
          <RefreshCw className="h-4 w-4" />
          Оновити
        </motion.button>
      </div>
    </div>
  )
}
