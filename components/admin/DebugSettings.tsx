'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Bug, RefreshCw, AlertTriangle } from 'lucide-react'
import { isDebugEnabled, setDebugMode } from '@/utils/debug'

export const DebugSettings = () => {
  const [debugEnabled, setDebugEnabled] = useState(false)
  const [mounted, setMounted] = useState(false)

  // Load current debug state on mount
  useEffect(() => {
    setMounted(true)
    setDebugEnabled(isDebugEnabled())
  }, [])

  const handleToggle = () => {
    const newValue = !debugEnabled
    setDebugEnabled(newValue)
    setDebugMode(newValue)
  }

  const handleRefresh = () => {
    window.location.reload()
  }

  if (!mounted) {
    return (
      <div className="bg-black/20 backdrop-blur-lg rounded-xl p-6 border border-white/10">
        <div className="animate-pulse h-32" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Debug Mode Toggle */}
      <div className="bg-black/20 backdrop-blur-lg rounded-xl p-6 border border-white/10">
        <div className="flex items-center gap-3 mb-4">
          <Bug className="h-6 w-6 text-purple-400" />
          <h2 className="text-xl font-semibold text-white">Debug Mode</h2>
        </div>

        <p className="text-gray-400 mb-6">
          Enable debug mode to see detailed console logs for animations and component lifecycle.
          Useful for debugging issues with BentoGrid, Services, Skills, and About animations.
        </p>

        <div className="flex items-center justify-between p-4 bg-black/30 rounded-lg">
          <div>
            <h3 className="text-white font-medium">Console Logging</h3>
            <p className="text-sm text-gray-500">
              {debugEnabled ? 'Debug logs are visible in browser console' : 'Debug logs are hidden'}
            </p>
          </div>

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleToggle}
            className={`relative w-14 h-7 rounded-full transition-colors ${
              debugEnabled ? 'bg-green-500' : 'bg-gray-600'
            }`}
          >
            <motion.div
              className="absolute top-1 w-5 h-5 bg-white rounded-full shadow-md"
              animate={{ left: debugEnabled ? '1.75rem' : '0.25rem' }}
              transition={{ type: 'spring', stiffness: 500, damping: 30 }}
            />
          </motion.button>
        </div>

        {/* Status indicator */}
        <div className={`mt-4 p-3 rounded-lg ${debugEnabled ? 'bg-green-500/10 border border-green-500/30' : 'bg-gray-500/10 border border-gray-500/30'}`}>
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${debugEnabled ? 'bg-green-500 animate-pulse' : 'bg-gray-500'}`} />
            <span className={debugEnabled ? 'text-green-400' : 'text-gray-400'}>
              {debugEnabled ? 'Debug mode is ON' : 'Debug mode is OFF'}
            </span>
          </div>
        </div>
      </div>

      {/* Refresh Notice */}
      <div className="bg-yellow-500/10 backdrop-blur-lg rounded-xl p-6 border border-yellow-500/30">
        <div className="flex items-start gap-3">
          <AlertTriangle className="h-6 w-6 text-yellow-500 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h3 className="text-yellow-500 font-medium mb-2">Page Refresh Required</h3>
            <p className="text-gray-400 text-sm mb-4">
              After toggling debug mode, refresh the page to apply changes to all components.
            </p>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleRefresh}
              className="flex items-center gap-2 px-4 py-2 bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-500 rounded-lg transition-colors"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh Page Now
            </motion.button>
          </div>
        </div>
      </div>

      {/* What gets logged */}
      <div className="bg-black/20 backdrop-blur-lg rounded-xl p-6 border border-white/10">
        <h3 className="text-white font-medium mb-4">What gets logged when debug is ON:</h3>
        <ul className="space-y-2 text-sm text-gray-400">
          <li className="flex items-center gap-2">
            <span className="text-green-400">&#10003;</span>
            BentoGrid section animations and state changes
          </li>
          <li className="flex items-center gap-2">
            <span className="text-green-400">&#10003;</span>
            Services rotation animation cycles
          </li>
          <li className="flex items-center gap-2">
            <span className="text-green-400">&#10003;</span>
            Skills explosion animation
          </li>
          <li className="flex items-center gap-2">
            <span className="text-green-400">&#10003;</span>
            About text animation lifecycle
          </li>
          <li className="flex items-center gap-2">
            <span className="text-green-400">&#10003;</span>
            Mouse enter/leave events
          </li>
          <li className="flex items-center gap-2">
            <span className="text-green-400">&#10003;</span>
            Component mount/unmount events
          </li>
        </ul>
      </div>
    </div>
  )
}
