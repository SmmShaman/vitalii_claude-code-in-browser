'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { LogOut, Newspaper, BookOpen, BarChart3, Home, Settings, List, Share2, MessageSquare, Users, Sparkles, Image, Activity, ChevronLeft, ChevronRight } from 'lucide-react'
import { supabase } from '@/integrations/supabase/client'
import { NewsManager } from '@/components/admin/NewsManager'
import { BlogManager } from '@/components/admin/BlogManager'
import { DashboardOverview } from '@/components/admin/DashboardOverview'
import { NewsSourcesManager } from '@/components/admin/NewsSourcesManager'
import { AIPromptsManager } from '@/components/admin/AIPromptsManager'
import { AutoPublishSettings } from '@/components/admin/AutoPublishSettings'
import { CronScheduleSettings } from '@/components/admin/CronScheduleSettings'
import { NewsQueueManager } from '@/components/admin/NewsQueueManager'
import { DebugSettings } from '@/components/admin/DebugSettings'
import { LinkedInPostsManager } from '@/components/admin/LinkedInPostsManager'
import { SkillsManager } from '@/components/admin/SkillsManager'
import { ImageProcessingSettings } from '@/components/admin/ImageProcessingSettings'
import { APIKeysSettings } from '@/components/admin/APIKeysSettings'
import { SocialMediaPostsManager } from '@/components/admin/SocialMediaPostsManager'
import { SocialMediaCommentsManager } from '@/components/admin/SocialMediaCommentsManager'
import { SocialMediaAccountsManager } from '@/components/admin/SocialMediaAccountsManager'
import { NewsMonitorManager } from '@/components/admin/news-monitor'

type TabType = 'overview' | 'queue' | 'news' | 'blog' | 'monitor' | 'social' | 'comments' | 'skills' | 'settings'
type SettingsSubTab = 'sources' | 'prompts' | 'images' | 'apikeys' | 'accounts' | 'schedule' | 'automation' | 'debug'

interface HeaderStats {
  totalNews: number
  publishedNews: number
  totalBlog: number
  publishedBlog: number
}

export default function AdminDashboardPage() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<TabType>('overview')
  const [settingsSubTab, setSettingsSubTab] = useState<SettingsSubTab>('sources')
  const [loading, setLoading] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [headerStats, setHeaderStats] = useState<HeaderStats>({
    totalNews: 0,
    publishedNews: 0,
    totalBlog: 0,
    publishedBlog: 0,
  })

  useEffect(() => {
    loadHeaderStats()
  }, [])

  const loadHeaderStats = async () => {
    try {
      const [newsTotal, newsPub, blogTotal, blogPub] = await Promise.all([
        supabase.from('news').select('*', { count: 'exact', head: true }),
        supabase.from('news').select('*', { count: 'exact', head: true }).eq('is_published', true),
        supabase.from('blog_posts').select('*', { count: 'exact', head: true }),
        supabase.from('blog_posts').select('*', { count: 'exact', head: true }).eq('is_published', true),
      ])
      setHeaderStats({
        totalNews: newsTotal.count || 0,
        publishedNews: newsPub.count || 0,
        totalBlog: blogTotal.count || 0,
        publishedBlog: blogPub.count || 0,
      })
    } catch (error) {
      console.error('Failed to load header stats:', error)
    }
  }

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
    { id: 'monitor' as TabType, label: 'Monitor', icon: Activity },
    { id: 'social' as TabType, label: 'Social', icon: Share2 },
    { id: 'comments' as TabType, label: 'Comments', icon: MessageSquare },
    { id: 'skills' as TabType, label: 'Skills', icon: Sparkles },
    { id: 'settings' as TabType, label: 'Settings', icon: Settings },
  ]

  return (
    <div className="h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex">
      {/* Sidebar */}
      <aside
        className={`
          ${sidebarCollapsed ? 'w-16' : 'w-64'}
          bg-black/30 backdrop-blur-xl border-r border-white/10
          flex flex-col transition-all duration-300 flex-shrink-0
        `}
      >
        {/* Toggle button */}
        <div className="p-4 border-b border-white/10 flex items-center justify-center">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="p-2 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
            title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {sidebarCollapsed ? <ChevronRight className="h-5 w-5" /> : <ChevronLeft className="h-5 w-5" />}
          </motion.button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
          {tabs.map((tab) => {
            const Icon = tab.icon
            const isActive = activeTab === tab.id
            return (
              <motion.button
                key={tab.id}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  w-full flex items-center gap-3 px-3 py-3 rounded-lg transition-all
                  ${isActive
                    ? 'bg-purple-600 text-white shadow-lg'
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                  }
                  ${sidebarCollapsed ? 'justify-center' : ''}
                `}
                title={sidebarCollapsed ? tab.label : undefined}
              >
                <Icon className="h-5 w-5 flex-shrink-0" />
                {!sidebarCollapsed && (
                  <span className="font-medium truncate">{tab.label}</span>
                )}
              </motion.button>
            )
          })}
        </nav>
      </aside>

      {/* Main content area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="bg-black/20 backdrop-blur-lg border-b border-white/10 px-6 h-16 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-6">
            <h1 className="text-2xl font-bold text-white">Admin Panel</h1>

            {/* Stats inline */}
            <div className="hidden md:flex items-center gap-3 text-sm">
              <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-500/20 rounded-lg border border-blue-500/30">
                <Newspaper className="h-4 w-4 text-blue-400" />
                <span className="text-white font-medium">{headerStats.totalNews}</span>
                <span className="text-gray-400">/</span>
                <span className="text-green-400 font-medium">{headerStats.publishedNews}</span>
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 bg-purple-500/20 rounded-lg border border-purple-500/30">
                <BookOpen className="h-4 w-4 text-purple-400" />
                <span className="text-white font-medium">{headerStats.totalBlog}</span>
                <span className="text-gray-400">/</span>
                <span className="text-green-400 font-medium">{headerStats.publishedBlog}</span>
              </div>
            </div>
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
        </header>

        {/* Settings Sub-tabs (inside content area) */}
        {activeTab === 'settings' && (
          <div className="px-6 pt-4 flex gap-2 flex-wrap border-b border-white/10 pb-4">
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
              onClick={() => setSettingsSubTab('images')}
              className={`px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-2 ${
                settingsSubTab === 'images'
                  ? 'bg-white/10 text-white'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Image className="h-4 w-4" />
              Зображення
            </button>
            <button
              onClick={() => setSettingsSubTab('apikeys')}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                settingsSubTab === 'apikeys'
                  ? 'bg-white/10 text-white'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              API Keys
            </button>
            <button
              onClick={() => setSettingsSubTab('accounts')}
              className={`px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-2 ${
                settingsSubTab === 'accounts'
                  ? 'bg-white/10 text-white'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Users className="h-4 w-4" />
              Accounts
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
            <button
              onClick={() => setSettingsSubTab('debug')}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                settingsSubTab === 'debug'
                  ? 'bg-white/10 text-white'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              Debug
            </button>
          </div>
        )}

        {/* Content */}
        <main className={`flex-1 ${activeTab === 'overview' ? 'overflow-hidden' : 'overflow-y-auto'}`}>
          <motion.div
            key={activeTab + settingsSubTab}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            className={activeTab === 'overview' ? 'p-6 h-full flex flex-col' : 'p-6'}
          >
            {activeTab === 'overview' && (
              <DashboardOverview onNavigateToSources={() => {
                setActiveTab('settings')
                setSettingsSubTab('sources')
              }} />
            )}
            {activeTab === 'queue' && <NewsQueueManager />}
            {activeTab === 'news' && <NewsManager />}
            {activeTab === 'blog' && <BlogManager />}
            {activeTab === 'monitor' && <NewsMonitorManager />}
            {activeTab === 'social' && <SocialMediaPostsManager />}
            {activeTab === 'comments' && <SocialMediaCommentsManager />}
            {activeTab === 'skills' && <SkillsManager />}
            {activeTab === 'settings' && (
              <>
                {settingsSubTab === 'sources' && <NewsSourcesManager />}
                {settingsSubTab === 'prompts' && <AIPromptsManager />}
                {settingsSubTab === 'images' && <ImageProcessingSettings />}
                {settingsSubTab === 'apikeys' && <APIKeysSettings />}
                {settingsSubTab === 'accounts' && <SocialMediaAccountsManager />}
                {settingsSubTab === 'schedule' && <AutoPublishSettings />}
                {settingsSubTab === 'automation' && <CronScheduleSettings />}
                {settingsSubTab === 'debug' && <DebugSettings />}
              </>
            )}
          </motion.div>
        </main>
      </div>
    </div>
  )
}
