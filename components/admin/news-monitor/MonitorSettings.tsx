'use client'

import { motion } from 'framer-motion'
import { Settings, X, Clock, FileText, ToggleLeft, ToggleRight, Bot } from 'lucide-react'
import { ViewerSettings } from './types'

interface MonitorSettingsProps {
  isOpen: boolean
  onClose: () => void
  settings: ViewerSettings
  onUpdate: (settings: Partial<ViewerSettings>) => void
}

const INTERVAL_OPTIONS = [
  { value: 60, label: '1 min' },
  { value: 120, label: '2 min' },
  { value: 300, label: '5 min' },
  { value: 600, label: '10 min' },
  { value: 900, label: '15 min' },
  { value: 1800, label: '30 min' },
]

const ARTICLES_OPTIONS = [3, 5, 10, 15, 20]

export function MonitorSettings({ isOpen, onClose, settings, onUpdate }: MonitorSettingsProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-slate-900 rounded-xl p-6 max-w-md w-full border border-white/20"
      >
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Settings className="h-5 w-5 text-purple-400" />
            <h3 className="text-xl font-bold text-white">Monitor Settings</h3>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-6">
          {/* Auto Refresh Toggle */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/10">
                <Clock className="h-4 w-4 text-green-400" />
              </div>
              <div>
                <p className="text-white font-medium">Auto Refresh</p>
                <p className="text-sm text-gray-400">
                  Automatically refresh feeds
                </p>
              </div>
            </div>
            <button
              onClick={() => onUpdate({ autoRefresh: !settings.autoRefresh })}
              className={`p-2 rounded-lg transition-colors ${
                settings.autoRefresh
                  ? 'text-green-400 hover:text-green-300'
                  : 'text-gray-500 hover:text-gray-400'
              }`}
            >
              {settings.autoRefresh ? (
                <ToggleRight className="h-6 w-6" />
              ) : (
                <ToggleLeft className="h-6 w-6" />
              )}
            </button>
          </div>

          {/* Auto Analyze Toggle */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-500/10">
                <Bot className="h-4 w-4 text-purple-400" />
              </div>
              <div>
                <p className="text-white font-medium">Auto Analyze</p>
                <p className="text-sm text-gray-400">
                  AI analyze new articles → Telegram
                </p>
              </div>
            </div>
            <button
              onClick={() => onUpdate({ autoAnalyze: !settings.autoAnalyze })}
              className={`p-2 rounded-lg transition-colors ${
                settings.autoAnalyze
                  ? 'text-purple-400 hover:text-purple-300'
                  : 'text-gray-500 hover:text-gray-400'
              }`}
            >
              {settings.autoAnalyze ? (
                <ToggleRight className="h-6 w-6" />
              ) : (
                <ToggleLeft className="h-6 w-6" />
              )}
            </button>
          </div>

          {/* Refresh Interval */}
          <div>
            <label className="flex items-center gap-3 mb-3">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <Clock className="h-4 w-4 text-blue-400" />
              </div>
              <div>
                <p className="text-white font-medium">Refresh Interval</p>
                <p className="text-sm text-gray-400">
                  How often to refresh feeds
                </p>
              </div>
            </label>
            <div className="grid grid-cols-3 gap-2">
              {INTERVAL_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  onClick={() => onUpdate({ refreshInterval: option.value })}
                  disabled={!settings.autoRefresh}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 ${
                    settings.refreshInterval === option.value
                      ? 'bg-purple-600 text-white'
                      : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {/* Articles Per Source */}
          <div>
            <label className="flex items-center gap-3 mb-3">
              <div className="p-2 rounded-lg bg-orange-500/10">
                <FileText className="h-4 w-4 text-orange-400" />
              </div>
              <div>
                <p className="text-white font-medium">Articles Per Source</p>
                <p className="text-sm text-gray-400">
                  Number of articles to show
                </p>
              </div>
            </label>
            <div className="grid grid-cols-5 gap-2">
              {ARTICLES_OPTIONS.map((num) => (
                <button
                  key={num}
                  onClick={() => onUpdate({ articlesPerSource: num })}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    settings.articlesPerSource === num
                      ? 'bg-purple-600 text-white'
                      : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  {num}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Close button */}
        <div className="mt-6 pt-4 border-t border-white/10">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors"
          >
            Done
          </button>
        </div>
      </motion.div>
    </div>
  )
}
