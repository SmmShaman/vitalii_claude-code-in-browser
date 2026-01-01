'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence, useAnimation } from 'framer-motion'
import { useTranslations } from '@/contexts/TranslationContext'
import { translations } from '@/utils/translations'
import {
  User, Briefcase, FolderOpen, Sparkles, Newspaper, BookOpen,
  Calendar, Eye, ChevronRight, ChevronDown, ExternalLink, X,
  Bot, TrendingUp, BarChart3, Zap, GraduationCap, ShoppingCart, Users
} from 'lucide-react'
import { getLatestNews, getLatestBlogPosts } from '@/integrations/supabase/client'
import { BottomNavigation } from '@/components/layout/BottomNavigation'
import { getSkillLogo } from '@/utils/skillLogos'
import { getStoredSkills, convertSkillsForAnimation } from '@/utils/skillsStorage'

// Section colors (same as desktop)
export const sectionColors: { [key: string]: { bg: string; text: string; icon: string; gradient: string } } = {
  home: { bg: 'bg-amber-50', text: 'text-amber-900', icon: '#AF601A', gradient: 'from-amber-100 to-amber-50' },
  about: { bg: 'bg-amber-50', text: 'text-amber-900', icon: '#AF601A', gradient: 'from-amber-100 to-amber-50' },
  services: { bg: 'bg-pink-50', text: 'text-pink-900', icon: '#EC008C', gradient: 'from-pink-100 to-pink-50' },
  projects: { bg: 'bg-emerald-50', text: 'text-emerald-900', icon: '#009B77', gradient: 'from-emerald-100 to-emerald-50' },
  skills: { bg: 'bg-rose-50', text: 'text-rose-900', icon: '#e11d48', gradient: 'from-rose-100 to-rose-50' },
  news: { bg: 'bg-lime-50', text: 'text-lime-900', icon: '#88B04B', gradient: 'from-lime-100 to-lime-50' },
  blog: { bg: 'bg-blue-50', text: 'text-blue-900', icon: '#0F4C81', gradient: 'from-blue-100 to-blue-50' },
  contact: { bg: 'bg-purple-50', text: 'text-purple-900', icon: '#764BB0', gradient: 'from-purple-100 to-purple-50' },
}

// Service icons
const serviceIcons = [Bot, TrendingUp, BarChart3, Zap, GraduationCap, ShoppingCart, Users]

// Skill category colors
const categoryColors: { [key: string]: { bg: string; text: string } } = {
  development: { bg: 'bg-green-100', text: 'text-green-800' },
  ui: { bg: 'bg-purple-100', text: 'text-purple-800' },
  automation: { bg: 'bg-blue-100', text: 'text-blue-800' },
  ai: { bg: 'bg-orange-100', text: 'text-orange-800' },
  marketing: { bg: 'bg-pink-100', text: 'text-pink-800' },
  integration: { bg: 'bg-cyan-100', text: 'text-cyan-800' },
}

// Project colors (matching desktop)
const projectColors = [
  { from: '#fc51c9', via: '#e707f7', to: '#9c27b0' },
  { from: '#05ddfa', via: '#00bfff', to: '#4169e1' },
  { from: '#ffeb3b', via: '#ffc107', to: '#ff9800' },
  { from: '#4caf50', via: '#8bc34a', to: '#cddc39' },
  { from: '#ff6b6b', via: '#ff5252', to: '#f44336' },
]

interface BentoGridMobileProps {
  onHoveredSectionChange?: (sectionId: string | null) => void
}

export const BentoGridMobile = ({ onHoveredSectionChange }: BentoGridMobileProps) => {
  const { t, currentLanguage } = useTranslations()
  const [activeSection, setActiveSection] = useState<string>('home')
  const [newsData, setNewsData] = useState<any[]>([])
  const [blogData, setBlogData] = useState<any[]>([])
  const [isLoadingNews, setIsLoadingNews] = useState(true)
  const [isLoadingBlog, setIsLoadingBlog] = useState(true)

  // About section states
  const [expandedAbout, setExpandedAbout] = useState(false)
  const [typedText, setTypedText] = useState('')
  const [isTyping, setIsTyping] = useState(true)

  // Skills section states
  const [isSkillsExpanded, setIsSkillsExpanded] = useState(false)
  const [storedSkills, setStoredSkills] = useState<any[]>([])

  // Projects section states
  const [currentProjectIndex, setCurrentProjectIndex] = useState(0)
  const [isProjectsExpanded, setIsProjectsExpanded] = useState(false)
  const touchStartRef = useRef<{ x: number; time: number } | null>(null)

  // Services animation state
  const [currentServiceIndex, setCurrentServiceIndex] = useState(0)

  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const sectionRefs = useRef<{ [key: string]: HTMLElement | null }>({})

  const langKey = currentLanguage.toLowerCase() as 'en' | 'no' | 'ua'

  // Notify parent of active section
  useEffect(() => {
    onHoveredSectionChange?.(activeSection)
  }, [activeSection, onHoveredSectionChange])

  // Fetch news and blog data
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [news, blogs] = await Promise.all([
          getLatestNews(5),
          getLatestBlogPosts(5)
        ])
        setNewsData(news || [])
        setBlogData(blogs || [])
      } catch (error) {
        console.error('Mobile: Error fetching data:', error)
      } finally {
        setIsLoadingNews(false)
        setIsLoadingBlog(false)
      }
    }
    fetchData()
  }, [])

  // Load skills from localStorage
  useEffect(() => {
    const stored = getStoredSkills()
    const converted = convertSkillsForAnimation(stored)
    setStoredSkills(converted)
  }, [])

  // Typewriter effect for About section
  useEffect(() => {
    const aboutText = (t('about_content') as string).split('\n\n')[0]
    if (!isTyping || expandedAbout) return

    if (typedText.length < aboutText.length) {
      const timer = setTimeout(() => {
        setTypedText(aboutText.substring(0, typedText.length + 1))
      }, 30)
      return () => clearTimeout(timer)
    } else {
      setIsTyping(false)
    }
  }, [typedText, isTyping, expandedAbout, t])

  // Reset typewriter when language changes
  useEffect(() => {
    setTypedText('')
    setIsTyping(true)
  }, [currentLanguage])

  // Services rotation
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentServiceIndex(prev => (prev + 1) % translations[langKey].services_list.length)
    }, 3000)
    return () => clearInterval(interval)
  }, [langKey])

  // Projects auto-rotation
  useEffect(() => {
    if (isProjectsExpanded) return
    const interval = setInterval(() => {
      setCurrentProjectIndex(prev => (prev + 1) % translations[langKey].projects_list.length)
    }, 4000)
    return () => clearInterval(interval)
  }, [isProjectsExpanded, langKey])

  // Handle section change from bottom nav
  const handleSectionChange = (sectionId: string) => {
    setActiveSection(sectionId)
    const sectionElement = sectionRefs.current[sectionId]
    if (sectionElement && scrollContainerRef.current) {
      sectionElement.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }

  // Track scroll position
  useEffect(() => {
    const container = scrollContainerRef.current
    if (!container) return

    const handleScroll = () => {
      const sections = ['home', 'services', 'projects', 'skills', 'news', 'blog']
      for (const sectionId of sections) {
        const element = sectionRefs.current[sectionId]
        if (element) {
          const rect = element.getBoundingClientRect()
          if (rect.top <= window.innerHeight / 3 && rect.bottom > 0) {
            if (activeSection !== sectionId) {
              setActiveSection(sectionId)
            }
            break
          }
        }
      }
    }

    container.addEventListener('scroll', handleScroll, { passive: true })
    return () => container.removeEventListener('scroll', handleScroll)
  }, [activeSection])

  // Helper functions
  const getLocalizedField = (item: any, field: string) => {
    const lang = currentLanguage.toLowerCase()
    return item[`${field}_${lang}`] || item[`${field}_en`] || ''
  }

  const formatDate = (dateStr: string) => {
    if (!dateStr) return ''
    const date = new Date(dateStr)
    return date.toLocaleDateString(currentLanguage === 'UA' ? 'uk-UA' : currentLanguage === 'NO' ? 'nb-NO' : 'en-US', {
      day: 'numeric',
      month: 'short'
    })
  }

  // Project swipe handlers
  const handleProjectTouchStart = (e: React.TouchEvent) => {
    touchStartRef.current = { x: e.touches[0].clientX, time: Date.now() }
  }

  const handleProjectTouchEnd = (e: React.TouchEvent) => {
    if (!touchStartRef.current) return
    const deltaX = e.changedTouches[0].clientX - touchStartRef.current.x
    const deltaTime = Date.now() - touchStartRef.current.time

    if (Math.abs(deltaX) > 50 && deltaTime < 300) {
      if (deltaX < 0) {
        setCurrentProjectIndex(prev => (prev + 1) % translations[langKey].projects_list.length)
      } else {
        setCurrentProjectIndex(prev => (prev - 1 + translations[langKey].projects_list.length) % translations[langKey].projects_list.length)
      }
    }
    touchStartRef.current = null
  }

  const skillsToShow = storedSkills.length > 0 ? storedSkills : translations[langKey].skills_list
  const currentProject = translations[langKey].projects_list[currentProjectIndex]
  const currentColor = projectColors[currentProjectIndex % projectColors.length]

  return (
    <div className="h-full w-full flex flex-col">
      {/* Scrollable content area */}
      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto pb-24 scroll-smooth"
      >
        <div className="space-y-3 px-3">

          {/* HOME / ABOUT Section */}
          <section ref={el => { sectionRefs.current['home'] = el }} className="pt-2">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className={`rounded-2xl p-5 bg-gradient-to-br ${sectionColors.home.gradient} shadow-sm overflow-hidden`}
            >
              <div className="flex items-center gap-3 mb-3">
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: `${sectionColors.home.icon}20` }}
                >
                  <User className="w-6 h-6" style={{ color: sectionColors.home.icon }} />
                </div>
                <h2 className={`text-lg font-bold ${sectionColors.home.text}`}>
                  {t('about_title')}
                </h2>
              </div>

              {/* Typewriter text */}
              <div className="relative">
                <p className="text-sm leading-relaxed text-gray-700">
                  {expandedAbout ? (t('about_content') as string).split('\n\n').slice(0, 3).join('\n\n') : typedText}
                  {isTyping && !expandedAbout && (
                    <span className="inline-block w-0.5 h-4 bg-gray-800 ml-0.5 animate-pulse" />
                  )}
                </p>

                <AnimatePresence>
                  {expandedAbout && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="mt-3"
                    >
                      {(t('about_content') as string).split('\n\n').slice(3).map((para, idx) => (
                        <p key={idx} className="text-sm leading-relaxed text-gray-700 mt-2">
                          {para}
                        </p>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>

                <button
                  onClick={() => setExpandedAbout(!expandedAbout)}
                  className="mt-3 flex items-center gap-1 text-sm font-medium"
                  style={{ color: sectionColors.home.icon }}
                >
                  {expandedAbout ? t('read_more' as any) || 'Show less' : t('read_more' as any) || 'Read more'}
                  <ChevronDown className={`w-4 h-4 transition-transform ${expandedAbout ? 'rotate-180' : ''}`} />
                </button>
              </div>

              {/* Quick actions */}
              <div className="flex gap-2 pt-3">
                <button
                  onClick={() => handleSectionChange('projects')}
                  className="flex-1 py-2.5 px-4 rounded-xl font-medium text-sm text-white active:scale-95 transition-transform"
                  style={{ backgroundColor: sectionColors.projects.icon }}
                >
                  {t('nav_projects' as any) || 'Projects'}
                </button>
                <button
                  onClick={() => handleSectionChange('contact')}
                  className="flex-1 py-2.5 px-4 rounded-xl font-medium text-sm border-2 active:scale-95 transition-transform"
                  style={{ borderColor: sectionColors.home.icon, color: sectionColors.home.icon }}
                >
                  {t('nav_contact' as any) || 'Contact'}
                </button>
              </div>
            </motion.div>
          </section>

          {/* SERVICES Section */}
          <section ref={el => { sectionRefs.current['services'] = el }}>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className={`rounded-2xl p-4 bg-gradient-to-br ${sectionColors.services.gradient} shadow-sm`}
            >
              <div className="flex items-center gap-3 mb-3">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: `${sectionColors.services.icon}20` }}
                >
                  <Briefcase className="w-5 h-5" style={{ color: sectionColors.services.icon }} />
                </div>
                <h2 className={`text-lg font-bold ${sectionColors.services.text}`}>
                  {t('services_title')}
                </h2>
              </div>

              {/* Animated service title (like desktop) */}
              <div className="h-16 flex items-center justify-center overflow-hidden mb-3">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={currentServiceIndex}
                    initial={{ opacity: 0, y: 20, scale: 0.9 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -20, scale: 0.9 }}
                    transition={{ duration: 0.5, ease: 'easeOut' }}
                    className="text-center px-4"
                  >
                    <h3 className="font-bold text-gray-900 uppercase" style={{ fontSize: 'clamp(0.9rem, 4vw, 1.3rem)' }}>
                      {translations[langKey].services_list[currentServiceIndex]?.title}
                    </h3>
                  </motion.div>
                </AnimatePresence>
              </div>

              {/* Horizontal services scroll */}
              <div className="overflow-x-auto scrollbar-hide -mx-4 px-4">
                <div className="flex gap-3" style={{ width: 'max-content' }}>
                  {translations[langKey].services_list.slice(0, 6).map((service, idx) => {
                    const ServiceIcon = serviceIcons[idx] || Briefcase
                    const isActive = idx === currentServiceIndex
                    return (
                      <motion.div
                        key={idx}
                        onClick={() => setCurrentServiceIndex(idx)}
                        className={`w-28 flex-shrink-0 rounded-xl p-3 shadow-sm transition-all ${isActive ? 'bg-white scale-105' : 'bg-white/60'}`}
                        whileTap={{ scale: 0.95 }}
                      >
                        <ServiceIcon
                          className="w-5 h-5 mb-2"
                          style={{ color: isActive ? sectionColors.services.icon : '#9ca3af' }}
                        />
                        <h4 className="font-semibold text-gray-900 text-[11px] line-clamp-2">
                          {service.title}
                        </h4>
                      </motion.div>
                    )
                  })}
                </div>
              </div>

              {/* Progress dots */}
              <div className="flex justify-center mt-3 gap-1">
                {translations[langKey].services_list.slice(0, 6).map((_, i) => (
                  <div
                    key={i}
                    className={`w-1.5 h-1.5 rounded-full transition-all ${i === currentServiceIndex ? 'bg-pink-500 w-3' : 'bg-pink-300'}`}
                  />
                ))}
              </div>
            </motion.div>
          </section>

          {/* PROJECTS Section */}
          <section ref={el => { sectionRefs.current['projects'] = el }}>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className={`rounded-2xl p-4 bg-gradient-to-br ${sectionColors.projects.gradient} shadow-sm overflow-hidden`}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: `${sectionColors.projects.icon}20` }}
                  >
                    <FolderOpen className="w-5 h-5" style={{ color: sectionColors.projects.icon }} />
                  </div>
                  <h2 className={`text-lg font-bold ${sectionColors.projects.text}`}>
                    {t('projects_title')}
                  </h2>
                </div>
                <button
                  onClick={() => setIsProjectsExpanded(!isProjectsExpanded)}
                  className="text-xs font-medium flex items-center gap-1"
                  style={{ color: sectionColors.projects.icon }}
                >
                  {isProjectsExpanded ? 'Carousel' : 'All'}
                  <ChevronRight className={`w-4 h-4 transition-transform ${isProjectsExpanded ? 'rotate-90' : ''}`} />
                </button>
              </div>

              <AnimatePresence mode="wait">
                {!isProjectsExpanded ? (
                  /* Carousel view */
                  <motion.div
                    key="carousel"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="relative"
                    onTouchStart={handleProjectTouchStart}
                    onTouchEnd={handleProjectTouchEnd}
                  >
                    {/* Progress bar */}
                    <div className="h-1 bg-gray-200 rounded-full mb-3 overflow-hidden">
                      <motion.div
                        className="h-full rounded-full"
                        style={{ background: `linear-gradient(to right, ${currentColor.from}, ${currentColor.to})` }}
                        initial={{ width: '0%' }}
                        animate={{ width: '100%' }}
                        transition={{ duration: 4, ease: 'linear' }}
                        key={currentProjectIndex}
                      />
                    </div>

                    <motion.div
                      key={currentProjectIndex}
                      initial={{ opacity: 0, x: 50, scale: 0.9 }}
                      animate={{ opacity: 1, x: 0, scale: 1 }}
                      exit={{ opacity: 0, x: -50, scale: 0.9 }}
                      transition={{ duration: 0.4, ease: 'easeOut' }}
                      className="bg-white rounded-xl p-4 shadow-sm"
                    >
                      {currentProject?.image && (
                        <div className="h-32 rounded-lg overflow-hidden mb-3">
                          <img
                            src={currentProject.image}
                            alt={currentProject.title}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      )}
                      <h4 className="font-bold text-gray-900 text-sm mb-1">{currentProject?.title}</h4>
                      <p className="text-gray-600 text-xs line-clamp-2">{currentProject?.short}</p>
                    </motion.div>

                    {/* Navigation dots */}
                    <div className="flex justify-center mt-3 gap-1">
                      {translations[langKey].projects_list.map((_, i) => (
                        <button
                          key={i}
                          onClick={() => setCurrentProjectIndex(i)}
                          className={`w-2 h-2 rounded-full transition-all ${i === currentProjectIndex ? 'w-4' : ''}`}
                          style={{ backgroundColor: i === currentProjectIndex ? currentColor.via : '#d1d5db' }}
                        />
                      ))}
                    </div>
                  </motion.div>
                ) : (
                  /* Grid view (explosion) */
                  <motion.div
                    key="grid"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="grid grid-cols-2 gap-2"
                  >
                    {translations[langKey].projects_list.map((project, idx) => {
                      const color = projectColors[idx % projectColors.length]
                      return (
                        <motion.div
                          key={idx}
                          initial={{ opacity: 0, scale: 0.5 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: idx * 0.05, ease: 'backOut' }}
                          className="rounded-lg overflow-hidden shadow-sm relative"
                          style={{ background: `linear-gradient(135deg, ${color.from}30, ${color.to}40)` }}
                        >
                          {project.image && (
                            <div className="h-20 overflow-hidden">
                              <img src={project.image} alt={project.title} className="w-full h-full object-cover opacity-50" />
                            </div>
                          )}
                          <div className="absolute inset-0 flex items-end p-2" style={{ background: `linear-gradient(to top, ${color.to}90, transparent)` }}>
                            <h5 className="font-bold text-white text-xs line-clamp-2 drop-shadow">{project.title}</h5>
                          </div>
                        </motion.div>
                      )
                    })}
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </section>

          {/* SKILLS Section */}
          <section ref={el => { sectionRefs.current['skills'] = el }}>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className={`rounded-2xl p-4 bg-gradient-to-br ${sectionColors.skills.gradient} shadow-sm`}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: `${sectionColors.skills.icon}20` }}
                  >
                    <Sparkles className="w-5 h-5" style={{ color: sectionColors.skills.icon }} />
                  </div>
                  <h2 className={`text-lg font-bold ${sectionColors.skills.text}`}>
                    {t('skills_title')}
                  </h2>
                </div>
                <button
                  onClick={() => setIsSkillsExpanded(!isSkillsExpanded)}
                  className="text-xs font-medium flex items-center gap-1"
                  style={{ color: sectionColors.skills.icon }}
                >
                  {isSkillsExpanded ? 'Tags' : 'Logos'}
                  <Sparkles className="w-3 h-3" />
                </button>
              </div>

              <AnimatePresence mode="wait">
                {!isSkillsExpanded ? (
                  /* Tags view */
                  <motion.div
                    key="tags"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="overflow-x-auto scrollbar-hide -mx-4 px-4"
                  >
                    <div className="flex flex-wrap gap-2 justify-center">
                      {skillsToShow.slice(0, 16).map((skill: any, idx: number) => {
                        const colors = categoryColors[skill.category] || categoryColors.development
                        return (
                          <motion.span
                            key={idx}
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: idx * 0.03 }}
                            whileTap={{ scale: 1.1 }}
                            className={`px-3 py-1.5 rounded-full text-xs font-medium ${colors.bg} ${colors.text}`}
                          >
                            {skill.name}
                          </motion.span>
                        )
                      })}
                    </div>
                  </motion.div>
                ) : (
                  /* Logos grid (explosion) */
                  <motion.div
                    key="logos"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="grid grid-cols-5 gap-3 py-2"
                  >
                    {skillsToShow.slice(0, 15).map((skill: any, idx: number) => (
                      <motion.div
                        key={idx}
                        initial={{ opacity: 0, scale: 0, rotate: -180 }}
                        animate={{ opacity: 1, scale: 1, rotate: 0 }}
                        transition={{ delay: idx * 0.05, type: 'spring', stiffness: 200 }}
                        className="flex flex-col items-center"
                      >
                        <img
                          src={getSkillLogo(skill.name)}
                          alt={skill.name}
                          className="w-10 h-10 object-contain"
                          style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))' }}
                        />
                        <span className="text-[9px] text-gray-600 mt-1 text-center line-clamp-1">{skill.name}</span>
                      </motion.div>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </section>

          {/* NEWS Section */}
          <section ref={el => { sectionRefs.current['news'] = el }}>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
              className={`rounded-2xl p-4 bg-gradient-to-br ${sectionColors.news.gradient} shadow-sm`}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: `${sectionColors.news.icon}20` }}
                  >
                    <Newspaper className="w-5 h-5" style={{ color: sectionColors.news.icon }} />
                  </div>
                  <h2 className={`text-lg font-bold ${sectionColors.news.text}`}>
                    {t('news_title')}
                  </h2>
                </div>
                <a
                  href="/news"
                  className="text-xs font-medium flex items-center gap-1"
                  style={{ color: sectionColors.news.icon }}
                >
                  {t('view_all' as any) || 'View all'}
                  <ChevronRight className="w-4 h-4" />
                </a>
              </div>

              {isLoadingNews ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-6 w-6 border-2 border-lime-600 border-t-transparent" />
                </div>
              ) : newsData.length > 0 ? (
                <div className="overflow-x-auto scrollbar-hide -mx-4 px-4">
                  <div className="flex gap-3" style={{ width: 'max-content' }}>
                    {newsData.map((item, idx) => {
                      const slug = item[`slug_${currentLanguage.toLowerCase()}`] || item.slug_en
                      return (
                        <motion.a
                          key={item.id}
                          href={`/news/${slug}`}
                          initial={{ opacity: 0, x: 30 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: idx * 0.1 }}
                          whileTap={{ scale: 0.98 }}
                          className="w-44 flex-shrink-0 bg-white/80 rounded-xl overflow-hidden shadow-sm"
                        >
                          {(item.processed_image_url || item.image_url) && (
                            <div className="h-24 overflow-hidden">
                              <img
                                src={item.processed_image_url || item.image_url}
                                alt={getLocalizedField(item, 'title')}
                                className="w-full h-full object-cover"
                              />
                            </div>
                          )}
                          <div className="p-2.5">
                            <h4 className="font-semibold text-gray-900 text-xs line-clamp-2">
                              {getLocalizedField(item, 'title')}
                            </h4>
                            <div className="flex items-center gap-2 mt-1.5 text-[10px] text-gray-500">
                              <Calendar className="w-3 h-3" />
                              <span>{formatDate(item.published_at)}</span>
                              {item.views_count > 0 && (
                                <>
                                  <Eye className="w-3 h-3" />
                                  <span>{item.views_count}</span>
                                </>
                              )}
                            </div>
                          </div>
                        </motion.a>
                      )
                    })}
                  </div>
                </div>
              ) : (
                <p className="text-gray-500 text-sm text-center py-4">
                  {t('no_news' as any) || 'No news available'}
                </p>
              )}
            </motion.div>
          </section>

          {/* BLOG Section */}
          <section ref={el => { sectionRefs.current['blog'] = el }}>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className={`rounded-2xl p-4 bg-gradient-to-br ${sectionColors.blog.gradient} shadow-sm`}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: `${sectionColors.blog.icon}20` }}
                  >
                    <BookOpen className="w-5 h-5" style={{ color: sectionColors.blog.icon }} />
                  </div>
                  <h2 className={`text-lg font-bold ${sectionColors.blog.text}`}>
                    {t('blog_title')}
                  </h2>
                </div>
                <a
                  href="/blog"
                  className="text-xs font-medium flex items-center gap-1"
                  style={{ color: sectionColors.blog.icon }}
                >
                  {t('view_all' as any) || 'View all'}
                  <ChevronRight className="w-4 h-4" />
                </a>
              </div>

              {isLoadingBlog ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-6 w-6 border-2 border-blue-600 border-t-transparent" />
                </div>
              ) : blogData.length > 0 ? (
                <div className="overflow-x-auto scrollbar-hide -mx-4 px-4">
                  <div className="flex gap-3" style={{ width: 'max-content' }}>
                    {blogData.map((item, idx) => {
                      const slug = item[`slug_${currentLanguage.toLowerCase()}`] || item.slug_en
                      return (
                        <motion.a
                          key={item.id}
                          href={`/blog/${slug}`}
                          initial={{ opacity: 0, x: 30 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: idx * 0.1 }}
                          whileTap={{ scale: 0.98 }}
                          className="w-44 flex-shrink-0 bg-white/80 rounded-xl overflow-hidden shadow-sm"
                        >
                          {(item.processed_image_url || item.image_url || item.cover_image_url) && (
                            <div className="h-24 overflow-hidden">
                              <img
                                src={item.processed_image_url || item.image_url || item.cover_image_url}
                                alt={getLocalizedField(item, 'title')}
                                className="w-full h-full object-cover"
                              />
                            </div>
                          )}
                          <div className="p-2.5">
                            <h4 className="font-semibold text-gray-900 text-xs line-clamp-2">
                              {getLocalizedField(item, 'title')}
                            </h4>
                            <div className="flex items-center gap-2 mt-1.5 text-[10px] text-gray-500">
                              <Calendar className="w-3 h-3" />
                              <span>{formatDate(item.published_at)}</span>
                              {item.reading_time && <span>• {item.reading_time} min</span>}
                            </div>
                          </div>
                        </motion.a>
                      )
                    })}
                  </div>
                </div>
              ) : (
                <p className="text-gray-500 text-sm text-center py-4">
                  {t('no_blog_posts' as any) || 'No blog posts available'}
                </p>
              )}
            </motion.div>
          </section>

          {/* Spacer */}
          <div className="h-4" />
        </div>
      </div>

      {/* Bottom Navigation */}
      <BottomNavigation
        activeSection={activeSection}
        onSectionChange={handleSectionChange}
      />
    </div>
  )
}

// Export for page.tsx
export { sectionColors as sectionNeonColorsMobile }
