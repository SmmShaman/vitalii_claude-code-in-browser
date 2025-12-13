'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { LogOut, Newspaper, BookOpen, BarChart3, Home, Settings, List } from 'lucide-react'
import { supabase } from '@/integrations/supabase/client'
import { NewsManager } from '@/components/admin/NewsManager'
import { BlogManager } from '@/components/admin/BlogManager'
import { DashboardOverview } from '@/components/admin/DashboardOverview'
import { NewsSourcesManager } from '@/components/admin/NewsSourcesManager'
import { AIPromptsManager } from '@/components/admin/AIPromptsManager'
import { AutoPublishSettings } from '@/components/admin/AutoPublishSettings'
import { CronScheduleSettings } from '@/components/admin/CronScheduleSettings'
import { NewsQueueManager } from '@/components/admin/NewsQueueManager'

type TabType = 'overview' | 'queue' | 'news' | 'blog' | 'settings'
type SettingsSubTab = 'sources' | 'prompts' | 'schedule' | 'automation'

export default function AdminDashboardPage() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<TabType>('overview')
  const [settingsSubTab, setSettingsSubTab] = useState<SettingsSubTab>('sources')
  const [loading, setLoading] = useState(false)

  const handleLogout = async () => {
    setLoading(true)
    try {
      await supabase.auth.signOut()
      router.push('/admin/login')
    } catch (error) {
      console.error('Logout error:', error)
    } finally {
      setLoading(false)
    }
  }

  const tabs = [
    { id: 'overview' as TabType, label: 'Overview', icon: BarChart3 },
    { id: 'queue' as TabType, label: 'Queue', icon: List },
    { id: 'news' as TabType, label: 'News', icon: Newspaper },
    { id: 'blog' as TabType, label: 'Blog', icon: BookOpen },
    { id: 'settings' as TabType, label: 'Settings', icon: Settings },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Header */}
      <header className="bg-black/20 backdrop-blur-lg border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <h1 className="text-2xl font-bold text-white">Admin Panel</h1>
            </div>
            <div className="flex items-center gap-4">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => router.push('/')}
                className="flex items-center gap-2 px-4 py-2 text-gray-300 hover:text-white transition-colors"
              >
                <Home className="h-5 w-5" />
                <span className="hidden sm:inline">View Site</span>
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleLogout}
                disabled={loading}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors disabled:opacity-50"
              >
                <LogOut className="h-5 w-5" />
                <span className="hidden sm:inline">Logout</span>
              </motion.button>
            </div>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
        <div className="bg-black/20 backdrop-blur-lg rounded-lg p-1 inline-flex gap-1">
          {tabs.map((tab) => {
            const Icon = tab.icon
            return (
              <motion.button
                key={tab.id}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-all ${
                  activeTab === tab.id
                    ? 'bg-purple-600 text-white shadow-lg'
                    : 'text-gray-300 hover:text-white hover:bg-white/5'
                }`}
              >
                <Icon className="h-5 w-5" />
                {tab.label}
              </motion.button>
            )
          })}
        </div>
      </div>

      {/* Settings Sub-tabs */}
      {activeTab === 'settings' && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-4">
          <div className="flex gap-2">
            <button
              onClick={() => setSettingsSubTab('sources')}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                settingsSubTab === 'sources'
                  ? 'bg-white/10 text-white'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              News Sources
            </button>
            <button
              onClick={() => setSettingsSubTab('prompts')}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                settingsSubTab === 'prompts'
                  ? 'bg-white/10 text-white'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              AI Prompts
            </button>
            <button
              onClick={() => setSettingsSubTab('schedule')}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                settingsSubTab === 'schedule'
                  ? 'bg-white/10 text-white'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              Per-Channel Settings
            </button>
            <button
              onClick={() => setSettingsSubTab('automation')}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                settingsSubTab === 'automation'
                  ? 'bg-white/10 text-white'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              Cron Schedule
            </button>
          </div>
        </div>
      )}

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 max-h-[calc(100vh-180px)] overflow-y-auto">
        <motion.div
          key={activeTab + settingsSubTab}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.3 }}
          className="pb-8"
        >
          {activeTab === 'overview' && <DashboardOverview />}
          {activeTab === 'queue' && <NewsQueueManager />}
          {activeTab === 'news' && <NewsManager />}
          {activeTab === 'blog' && <BlogManager />}
          {activeTab === 'settings' && (
            <>
              {settingsSubTab === 'sources' && <NewsSourcesManager />}
              {settingsSubTab === 'prompts' && <AIPromptsManager />}
              {settingsSubTab === 'schedule' && <AutoPublishSettings />}
              {settingsSubTab === 'automation' && <CronScheduleSettings />}
            </>
          )}
        </motion.div>
      </div>
    </div>
  )
}
