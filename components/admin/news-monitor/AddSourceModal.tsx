'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Loader2, CheckCircle, AlertCircle, ExternalLink } from 'lucide-react'
import { RSSArticle } from './types'
import { TIER_CONFIGS } from './constants'

interface AddSourceModalProps {
  isOpen: boolean
  onClose: () => void
  onAdd: (source: {
    name: string
    url: string | null
    rssUrl: string
    tier: 1 | 2 | 3 | 4
    isActive: boolean
    isDefault: boolean
  }) => Promise<boolean>
  onValidate: (rssUrl: string) => Promise<{
    valid: boolean
    articles?: RSSArticle[]
    error?: string
  }>
  initialTier?: number
}

export function AddSourceModal({ isOpen, onClose, onAdd, onValidate, initialTier = 3 }: AddSourceModalProps) {
  const [name, setName] = useState('')
  const [rssUrl, setRssUrl] = useState('')
  const [websiteUrl, setWebsiteUrl] = useState('')
  const [tier, setTier] = useState<1 | 2 | 3 | 4>(initialTier as 1 | 2 | 3 | 4)
  const [validating, setValidating] = useState(false)
  const [validated, setValidated] = useState(false)
  const [validationError, setValidationError] = useState<string | null>(null)
  const [previewArticles, setPreviewArticles] = useState<RSSArticle[]>([])
  const [saving, setSaving] = useState(false)

  const handleValidate = async () => {
    if (!rssUrl) return

    setValidating(true)
    setValidated(false)
    setValidationError(null)
    setPreviewArticles([])

    const result = await onValidate(rssUrl)

    setValidating(false)

    if (result.valid && result.articles) {
      setValidated(true)
      setPreviewArticles(result.articles)

      // Auto-fill name if empty
      if (!name && result.articles.length > 0) {
        // Try to extract domain name
        try {
          const url = new URL(rssUrl)
          const domain = url.hostname.replace('www.', '').split('.')[0]
          setName(domain.charAt(0).toUpperCase() + domain.slice(1))
        } catch {
          // Ignore
        }
      }
    } else {
      setValidationError(result.error || 'Validation failed')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validated || !name || !rssUrl) return

    setSaving(true)
    const success = await onAdd({
      name,
      url: websiteUrl || null,
      rssUrl,
      tier,
      isActive: true,
      isDefault: false,
    })
    setSaving(false)

    if (success) {
      handleClose()
    }
  }

  const handleClose = () => {
    setName('')
    setRssUrl('')
    setWebsiteUrl('')
    setTier(3)
    setValidating(false)
    setValidated(false)
    setValidationError(null)
    setPreviewArticles([])
    onClose()
  }

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-slate-900 rounded-xl p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto border border-white/20"
        >
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold text-white">
              Add RSS Source to Tier {tier}
            </h3>
            <button
              onClick={handleClose}
              className="p-2 text-gray-400 hover:text-white transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* RSS URL */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                RSS Feed URL *
              </label>
              <div className="flex gap-2">
                <input
                  type="url"
                  value={rssUrl}
                  onChange={(e) => {
                    setRssUrl(e.target.value)
                    setValidated(false)
                    setValidationError(null)
                  }}
                  placeholder="https://example.com/feed.xml"
                  required
                  className="flex-1 px-4 py-2 bg-white/5 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
                <motion.button
                  type="button"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleValidate}
                  disabled={!rssUrl || validating}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {validating ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Validating</span>
                    </>
                  ) : (
                    <span>Validate</span>
                  )}
                </motion.button>
              </div>

              {/* Validation status */}
              {validated && (
                <div className="flex items-center gap-2 mt-2 text-green-400 text-sm">
                  <CheckCircle className="h-4 w-4" />
                  <span>Valid RSS feed with {previewArticles.length} articles</span>
                </div>
              )}
              {validationError && (
                <div className="flex items-center gap-2 mt-2 text-red-400 text-sm">
                  <AlertCircle className="h-4 w-4" />
                  <span>{validationError}</span>
                </div>
              )}
            </div>

            {/* Preview Articles */}
            {previewArticles.length > 0 && (
              <div className="bg-white/5 rounded-lg p-3 border border-white/10">
                <p className="text-xs text-gray-400 mb-2">Preview:</p>
                <div className="space-y-2">
                  {previewArticles.slice(0, 3).map((article, idx) => (
                    <a
                      key={idx}
                      href={article.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-start gap-2 text-sm text-gray-300 hover:text-white"
                    >
                      <span className="text-gray-500">{idx + 1}.</span>
                      <span className="line-clamp-1">{article.title}</span>
                      <ExternalLink className="h-3 w-3 shrink-0 mt-1" />
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* Name */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Source Name *
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="TechCrunch"
                required
                className="w-full px-4 py-2 bg-white/5 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>

            {/* Website URL */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Website URL (optional)
              </label>
              <input
                type="url"
                value={websiteUrl}
                onChange={(e) => setWebsiteUrl(e.target.value)}
                placeholder="https://techcrunch.com"
                className="w-full px-4 py-2 bg-white/5 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>

            {/* Tier */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Tier
              </label>
              <div className="grid grid-cols-4 gap-2">
                {TIER_CONFIGS.map((tierConfig) => (
                  <button
                    key={tierConfig.id}
                    type="button"
                    onClick={() => setTier(tierConfig.id)}
                    className={`p-2 rounded-lg border text-center transition-colors ${
                      tier === tierConfig.id
                        ? `${tierConfig.bgColor} ${tierConfig.borderColor} ${tierConfig.color}`
                        : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10'
                    }`}
                  >
                    <span className="text-sm font-medium">{tierConfig.id}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-4">
              <button
                type="button"
                onClick={handleClose}
                className="px-6 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors"
              >
                Cancel
              </button>
              <motion.button
                type="submit"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                disabled={!validated || !name || saving}
                className="px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Adding...</span>
                  </>
                ) : (
                  <span>Add Source</span>
                )}
              </motion.button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
