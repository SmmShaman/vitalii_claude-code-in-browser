'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence, useAnimation } from 'framer-motion'
import { useTranslations } from '@/contexts/TranslationContext'
import { translations } from '@/utils/translations'
import { Calendar, Eye, ChevronRight, Sparkles, ArrowLeft, Loader2, Instagram, Send, Facebook, Linkedin, Github, Twitter, Mail, X, Copy, ExternalLink, Check } from 'lucide-react'
import { getLatestNews, getLatestBlogPosts, getAllNews, getAllBlogPosts } from '@/integrations/supabase/client'
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

// Skill category colors
const categoryColors: { [key: string]: { bg: string; text: string } } = {
  development: { bg: 'bg-green-100', text: 'text-green-800' },
  ui: { bg: 'bg-purple-100', text: 'text-purple-800' },
  automation: { bg: 'bg-blue-100', text: 'text-blue-800' },
  ai: { bg: 'bg-orange-100', text: 'text-orange-800' },
  marketing: { bg: 'bg-pink-100', text: 'text-pink-800' },
  integration: { bg: 'bg-cyan-100', text: 'text-cyan-800' },
}

// Vertical Label Component (like desktop NeonVerticalLabel but simpler for mobile)
const VerticalLabel = ({ text, color }: { text: string; color: string }) => {
  const letters = text.toUpperCase().split('')
  return (
    <div className="absolute left-2 top-1/2 -translate-y-1/2 flex flex-col items-center gap-0.5 z-10 pointer-events-none">
      {letters.map((letter, idx) => (
        <span
          key={idx}
          className="font-bold text-[11px] leading-none block"
          style={{
            color: color,
            opacity: 0.7,
            textShadow: `0 0 10px ${color}50, 0 0 20px ${color}30`,
            fontFamily: 'Anton, sans-serif',
          }}
        >
          {letter}
        </span>
      ))}
    </div>
  )
}

// About Explosion Overlay Component - Fast word-by-word animation
const AboutExplosionOverlay = ({
  text,
  onClose,
  color
}: {
  text: string
  onClose: () => void
  color: string
}) => {
  // Clean text and split into paragraphs
  const cleanText = text.replace(/\*\*/g, '')
  const paragraphs = cleanText.split('\n\n').filter(p => p.trim())

  // Flatten all words for stagger animation
  let wordIndex = 0

  return (
    <motion.div
      className="fixed inset-0 z-50 bg-white"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
    >
      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 w-10 h-10 flex items-center justify-center rounded-full z-10 transition-colors"
        style={{ backgroundColor: `${color}20` }}
        aria-label="Close"
      >
        <svg className="w-6 h-6" style={{ color }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      {/* Scrollable content */}
      <div className="h-full overflow-y-auto pt-16 pb-8 px-6">
        <div className="text-gray-800" style={{ fontSize: '1rem', lineHeight: 1.8 }}>
          {paragraphs.map((paragraph, pIndex) => {
            const words = paragraph.trim().split(' ')
            const boldCount = Math.min(3, words.length)

            return (
              <p key={pIndex} className="mb-4">
                {words.map((word, wIndex) => {
                  const currentWordIndex = wordIndex++
                  const isBold = wIndex < boldCount

                  return (
                    <motion.span
                      key={`${pIndex}-${wIndex}`}
                      className={isBold ? 'font-bold' : ''}
                      initial={{
                        opacity: 0,
                        y: 20,
                        filter: 'blur(4px)',
                      }}
                      animate={{
                        opacity: 1,
                        y: 0,
                        filter: 'blur(0px)',
                      }}
                      transition={{
                        duration: 0.3,
                        delay: currentWordIndex * 0.02, // 20ms per word
                        ease: 'easeOut',
                      }}
                    >
                      {word}{' '}
                    </motion.span>
                  )
                })}
              </p>
            )
          })}
        </div>
      </div>
    </motion.div>
  )
}

// Services Explosion Overlay Component
const ServicesExplosionOverlay = ({
  services,
  onClose,
  color
}: {
  services: { title: string; description?: string; detailedDescription?: string; simpleExplanation?: string }[]
  onClose: () => void
  color: string
}) => {
  return (
    <motion.div
      className="fixed inset-0 z-50 bg-white"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
    >
      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 w-10 h-10 flex items-center justify-center rounded-full z-10 transition-colors"
        style={{ backgroundColor: `${color}20` }}
        aria-label="Close"
      >
        <svg className="w-6 h-6" style={{ color }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      {/* Scrollable content */}
      <div className="h-full overflow-y-auto pt-16 pb-8 px-4">
        <div className="space-y-4">
          {services.map((service, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 30, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{
                duration: 0.4,
                delay: index * 0.08,
                ease: [0.25, 0.46, 0.45, 0.94],
              }}
              className="bg-gradient-to-br from-pink-50 to-white rounded-2xl p-4 shadow-sm border border-pink-100"
            >
              {/* Service title */}
              <h3
                className="font-bold uppercase mb-2"
                style={{ color, fontSize: 'clamp(0.9rem, 4vw, 1.1rem)' }}
              >
                {service.title}
              </h3>

              {/* Short description */}
              {service.description && (
                <p className="text-gray-500 text-xs mb-3 italic">
                  {service.description}
                </p>
              )}

              {/* Detailed description */}
              {service.detailedDescription && (
                <p className="text-gray-700 text-sm leading-relaxed mb-2">
                  {service.detailedDescription}
                </p>
              )}

              {/* Simple explanation */}
              {service.simpleExplanation && (
                <div className="mt-3 pt-3 border-t border-pink-100">
                  <p className="text-gray-600 text-xs leading-relaxed">
                    💡 {service.simpleExplanation}
                  </p>
                </div>
              )}
            </motion.div>
          ))}
        </div>
      </div>
    </motion.div>
  )
}

// Project colors (matching desktop)
const projectColors = [
  { from: '#fc51c9', via: '#e707f7', to: '#9c27b0' },
  { from: '#05ddfa', via: '#00bfff', to: '#4169e1' },
  { from: '#ffeb3b', via: '#ffc107', to: '#ff9800' },
  { from: '#4caf50', via: '#8bc34a', to: '#cddc39' },
  { from: '#ff6b6b', via: '#ff5252', to: '#f44336' },
]

// Projects Explosion Overlay Component with Detail View
const ProjectsExplosionOverlay = ({
  projects,
  onClose,
  color
}: {
  projects: { title: string; short?: string; description?: string; image?: string; link?: string }[]
  onClose: () => void
  color: string
}) => {
  const [selectedProject, setSelectedProject] = useState<number | null>(null)

  const handleProjectClick = (index: number) => {
    setSelectedProject(index)
  }

  const handleBack = () => {
    setSelectedProject(null)
  }

  // Detail view for selected project
  if (selectedProject !== null) {
    const project = projects[selectedProject]
    const colorSet = projectColors[selectedProject % projectColors.length]

    return (
      <motion.div
        className="fixed inset-0 z-50 bg-white"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
      >
        {/* Back button */}
        <button
          onClick={handleBack}
          className="absolute top-4 left-4 w-10 h-10 flex items-center justify-center rounded-full z-10 transition-colors"
          style={{ backgroundColor: `${colorSet.to}20` }}
          aria-label="Back"
        >
          <ArrowLeft className="w-5 h-5" style={{ color: colorSet.to }} />
        </button>

        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-10 h-10 flex items-center justify-center rounded-full z-10 transition-colors"
          style={{ backgroundColor: `${color}20` }}
          aria-label="Close"
        >
          <svg className="w-6 h-6" style={{ color }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Scrollable content */}
        <div className="h-full overflow-y-auto">
          {/* Hero image */}
          {project.image && (
            <div className="h-56 overflow-hidden relative">
              <img
                src={project.image}
                alt={project.title}
                className="w-full h-full object-cover"
              />
              <div
                className="absolute inset-0"
                style={{
                  background: `linear-gradient(to top, white 0%, ${colorSet.to}40 50%, transparent 100%)`,
                }}
              />
            </div>
          )}

          <div className="px-6 pb-8" style={{ marginTop: project.image ? '-2rem' : '4rem' }}>
            {/* Project title */}
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="font-bold mb-4 relative z-10"
              style={{ color: colorSet.to, fontSize: 'clamp(1.5rem, 6vw, 2rem)' }}
            >
              {project.title}
            </motion.h2>

            {/* Short description */}
            {project.short && (
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
                className="text-gray-500 text-base mb-6 italic"
              >
                {project.short}
              </motion.p>
            )}

            {/* Full description */}
            {project.description && (
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="text-gray-700 text-base leading-relaxed mb-6"
              >
                {project.description}
              </motion.p>
            )}

            {/* Link button */}
            {project.link && (
              <motion.a
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25 }}
                href={project.link}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-full text-white text-base font-medium transition-transform active:scale-95"
                style={{
                  background: `linear-gradient(135deg, ${colorSet.from}, ${colorSet.to})`,
                }}
              >
                <span>View Project</span>
                <ChevronRight className="w-5 h-5" />
              </motion.a>
            )}
          </div>
        </div>
      </motion.div>
    )
  }

  // Grid view of all projects
  return (
    <motion.div
      className="fixed inset-0 z-50 bg-white"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
    >
      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 w-10 h-10 flex items-center justify-center rounded-full z-10 transition-colors"
        style={{ backgroundColor: `${color}20` }}
        aria-label="Close"
      >
        <svg className="w-6 h-6" style={{ color }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      {/* Scrollable content - Grid of projects */}
      <div className="h-full overflow-y-auto pt-16 pb-8 px-4">
        <div className="grid grid-cols-2 gap-3">
          {projects.map((project, index) => {
            const colorSet = projectColors[index % projectColors.length]
            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{
                  duration: 0.3,
                  delay: index * 0.05,
                  ease: 'backOut',
                }}
                onClick={() => handleProjectClick(index)}
                className="rounded-xl overflow-hidden shadow-md cursor-pointer active:scale-95 transition-transform aspect-square relative"
                style={{
                  background: `linear-gradient(135deg, ${colorSet.from}30, ${colorSet.to}50)`,
                }}
              >
                {/* Project image */}
                {project.image && (
                  <img
                    src={project.image}
                    alt={project.title}
                    className="absolute inset-0 w-full h-full object-cover opacity-60"
                  />
                )}
                {/* Gradient overlay */}
                <div
                  className="absolute inset-0"
                  style={{
                    background: `linear-gradient(to top, ${colorSet.to}95, ${colorSet.to}40 50%, transparent)`,
                  }}
                />
                {/* Title */}
                <div className="absolute bottom-0 left-0 right-0 p-3">
                  <h3 className="font-bold text-white text-sm line-clamp-2 drop-shadow-lg">
                    {project.title}
                  </h3>
                </div>
              </motion.div>
            )
          })}
        </div>
      </div>
    </motion.div>
  )
}

// News List Overlay Component with Infinite Scroll
const NewsListOverlay = ({
  onClose,
  color,
  currentLanguage,
  t
}: {
  onClose: () => void
  color: string
  currentLanguage: string
  t: (key: any) => any
}) => {
  const [allNews, setAllNews] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [offset, setOffset] = useState(0)
  const LIMIT = 10
  const scrollRef = useRef<HTMLDivElement>(null)

  const getLocalizedField = (item: any, field: string) => {
    const lang = currentLanguage.toLowerCase()
    return item[`${field}_${lang}`] || item[`${field}_en`] || ''
  }

  const formatDate = (dateStr: string) => {
    if (!dateStr) return ''
    const date = new Date(dateStr)
    return date.toLocaleDateString(currentLanguage === 'UA' ? 'uk-UA' : currentLanguage === 'NO' ? 'nb-NO' : 'en-US', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    })
  }

  // Initial load
  useEffect(() => {
    const loadNews = async () => {
      try {
        const { data } = await getAllNews({ limit: LIMIT, offset: 0 })
        setAllNews(data || [])
        setHasMore((data?.length || 0) === LIMIT)
        setOffset(LIMIT)
      } catch (error) {
        console.error('Error loading news:', error)
      } finally {
        setIsLoading(false)
      }
    }
    loadNews()
  }, [])

  // Load more on scroll
  const loadMore = async () => {
    if (isLoadingMore || !hasMore) return
    setIsLoadingMore(true)
    try {
      const { data } = await getAllNews({ limit: LIMIT, offset })
      if (data && data.length > 0) {
        setAllNews(prev => [...prev, ...data])
        setHasMore(data.length === LIMIT)
        setOffset(prev => prev + LIMIT)
      } else {
        setHasMore(false)
      }
    } catch (error) {
      console.error('Error loading more news:', error)
    } finally {
      setIsLoadingMore(false)
    }
  }

  // Scroll handler for infinite scroll
  useEffect(() => {
    const container = scrollRef.current
    if (!container) return

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container
      if (scrollHeight - scrollTop - clientHeight < 200) {
        loadMore()
      }
    }

    container.addEventListener('scroll', handleScroll, { passive: true })
    return () => container.removeEventListener('scroll', handleScroll)
  }, [offset, hasMore, isLoadingMore])

  return (
    <motion.div
      className="fixed inset-0 z-50 bg-white"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
    >
      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 w-10 h-10 flex items-center justify-center rounded-full z-10 transition-colors"
        style={{ backgroundColor: `${color}20` }}
        aria-label="Close"
      >
        <svg className="w-6 h-6" style={{ color }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      {/* Title */}
      <div className="pt-4 px-4 pb-2">
        <h2 className="font-bold text-xl" style={{ color }}>{t('news_title')}</h2>
      </div>

      {/* Scrollable content */}
      <div ref={scrollRef} className="h-[calc(100%-4rem)] overflow-y-auto px-4 pb-8">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin" style={{ color }} />
          </div>
        ) : allNews.length > 0 ? (
          <div className="space-y-3">
            {allNews.map((item, idx) => {
              const slug = item[`slug_${currentLanguage.toLowerCase()}`] || item.slug_en
              return (
                <motion.a
                  key={item.id}
                  href={`/news/${slug}`}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(idx * 0.05, 0.5) }}
                  className="flex gap-3 bg-gradient-to-r from-lime-50 to-white rounded-xl p-3 shadow-sm border border-lime-100 active:scale-[0.98] transition-transform"
                >
                  {(item.processed_image_url || item.image_url) && (
                    <div className="w-20 h-20 rounded-lg overflow-hidden flex-shrink-0">
                      <img
                        src={item.processed_image_url || item.image_url}
                        alt={getLocalizedField(item, 'title')}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-gray-900 text-sm line-clamp-2 mb-1">
                      {getLocalizedField(item, 'title')}
                    </h4>
                    <p className="text-gray-500 text-xs line-clamp-2 mb-2">
                      {getLocalizedField(item, 'description')}
                    </p>
                    <div className="flex items-center gap-3 text-[10px] text-gray-400">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {formatDate(item.published_at)}
                      </span>
                      {item.views_count > 0 && (
                        <span className="flex items-center gap-1">
                          <Eye className="w-3 h-3" />
                          {item.views_count}
                        </span>
                      )}
                    </div>
                  </div>
                </motion.a>
              )
            })}
            {isLoadingMore && (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="w-6 h-6 animate-spin" style={{ color }} />
              </div>
            )}
            {!hasMore && allNews.length > 0 && (
              <p className="text-center text-gray-400 text-sm py-4">
                {t('no_more_news' as any) || 'No more news'}
              </p>
            )}
          </div>
        ) : (
          <p className="text-gray-500 text-sm text-center py-12">
            {t('no_news' as any) || 'No news available'}
          </p>
        )}
      </div>
    </motion.div>
  )
}

// TikTok icon component
const TikTokIcon = ({ className, ...props }: React.SVGProps<SVGSVGElement>) => (
  <svg
    viewBox="0 0 24 24"
    fill="currentColor"
    className={className}
    {...props}
  >
    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
  </svg>
)

// Social links data
interface SocialLink {
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>
  href: string
  label: string
  username: string
  color: string
}

const CONTACT_EMAIL = 'berbeha@vitalii.no'

const socialLinks: SocialLink[] = [
  { icon: Mail, href: `mailto:${CONTACT_EMAIL}`, label: 'Email', username: CONTACT_EMAIL, color: '#EA4335' },
  { icon: Instagram, href: 'https://instagram.com/smmshaman', label: 'Instagram', username: '@smmshaman', color: '#E4405F' },
  { icon: Send, href: 'https://t.me/smmshaman', label: 'Telegram', username: '@SmmShaman', color: '#0088cc' },
  { icon: Facebook, href: 'https://facebook.com/smm.shaman', label: 'Facebook', username: 'smm.shaman', color: '#1877F2' },
  { icon: Linkedin, href: 'https://linkedin.com/in/smmshaman', label: 'LinkedIn', username: 'smmshaman', color: '#0A66C2' },
  { icon: Github, href: 'https://github.com/SmmShaman', label: 'GitHub', username: 'SmmShaman', color: '#333' },
  { icon: Twitter, href: 'https://twitter.com/SmmShaman', label: 'Twitter/X', username: '@SmmShaman', color: '#000' },
  { icon: TikTokIcon, href: 'https://tiktok.com/@stuardbmw', label: 'TikTok', username: '@stuardbmw', color: '#000' },
]

// Contacts Overlay Component with QR codes
const ContactsOverlay = ({
  onClose,
  color,
  t
}: {
  onClose: () => void
  color: string
  t: (key: any) => any
}) => {
  const [selectedSocial, setSelectedSocial] = useState<SocialLink | null>(null)
  const [copied, setCopied] = useState(false)

  // Email form state
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false)
  const [emailForm, setEmailForm] = useState({
    senderEmail: '',
    subject: '',
    message: '',
  })
  const [isSending, setIsSending] = useState(false)
  const [emailSent, setEmailSent] = useState(false)
  const [emailCopied, setEmailCopied] = useState(false)

  const handleCopyLink = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  const handleCopyEmail = async () => {
    try {
      await navigator.clipboard.writeText(CONTACT_EMAIL)
      setEmailCopied(true)
      setTimeout(() => setEmailCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy email:', err)
    }
  }

  const handleEmailFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setEmailForm((prev) => ({ ...prev, [name]: value }))
  }

  const handleSendEmail = () => {
    setIsSending(true)

    // Create mailto link with form data
    const mailtoLink = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(emailForm.subject)}&body=${encodeURIComponent(
      `From: ${emailForm.senderEmail}\n\n${emailForm.message}`
    )}`

    // Open default email client
    window.location.href = mailtoLink

    setTimeout(() => {
      setIsSending(false)
      setEmailSent(true)
    }, 500)
  }

  const closeEmailModal = () => {
    setIsEmailModalOpen(false)
    setEmailForm({ senderEmail: '', subject: '', message: '' })
    setEmailSent(false)
    setEmailCopied(false)
  }

  const closeQRModal = () => {
    setSelectedSocial(null)
    setCopied(false)
  }

  const handleContactClick = (social: SocialLink) => {
    if (social.label === 'Email') {
      setIsEmailModalOpen(true)
    } else {
      setSelectedSocial(social)
    }
  }

  return (
    <motion.div
      className="fixed inset-0 z-50 bg-white"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
    >
      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 w-10 h-10 flex items-center justify-center rounded-full z-10 transition-colors"
        style={{ backgroundColor: `${color}20` }}
        aria-label="Close"
      >
        <svg className="w-6 h-6" style={{ color }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      {/* Title */}
      <div className="pt-4 px-4 pb-2">
        <h2 className="font-bold text-xl" style={{ color }}>{t('contact_title' as any) || 'Contact'}</h2>
        <p className="text-gray-500 text-sm mt-1">{t('contact_subtitle' as any) || 'Get in touch'}</p>
      </div>

      {/* Scrollable content - List of contacts */}
      <div className="h-[calc(100%-5rem)] overflow-y-auto px-4 pb-8">
        <div className="space-y-3 pt-2">
          {socialLinks.map((social, idx) => {
            const Icon = social.icon
            return (
              <motion.button
                key={social.label}
                initial={{ opacity: 0, x: -30 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.05 }}
                onClick={() => handleContactClick(social)}
                className="w-full flex items-center gap-4 p-4 bg-gradient-to-r from-purple-50 to-white rounded-2xl shadow-sm border border-purple-100 active:scale-[0.98] transition-transform"
              >
                {/* Icon */}
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: `${social.color}15` }}
                >
                  <Icon className="w-6 h-6" style={{ color: social.color }} />
                </div>

                {/* Info */}
                <div className="flex-1 text-left">
                  <h3 className="font-semibold text-gray-900">{social.label}</h3>
                  <p className="text-sm text-gray-500">{social.username}</p>
                </div>

                {/* Arrow */}
                <ChevronRight className="w-5 h-5 text-gray-400" />
              </motion.button>
            )
          })}
        </div>
      </div>

      {/* QR Code Modal */}
      <AnimatePresence>
        {selectedSocial && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm"
            onClick={closeQRModal}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full mx-4"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: `${selectedSocial.color}15` }}
                  >
                    <selectedSocial.icon className="w-5 h-5" style={{ color: selectedSocial.color }} />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900">{selectedSocial.label}</h3>
                    <p className="text-sm text-gray-500">{selectedSocial.username}</p>
                  </div>
                </div>
                <button
                  onClick={closeQRModal}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* QR Code */}
              <div className="flex justify-center mb-4">
                <div className="bg-white p-3 rounded-xl shadow-inner border border-gray-100">
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(selectedSocial.href)}&format=svg`}
                    alt={`QR Code for ${selectedSocial.label}`}
                    width={150}
                    height={150}
                    className="rounded-lg"
                  />
                </div>
              </div>

              {/* URL Display */}
              <div className="bg-gray-100 rounded-lg p-3 mb-4">
                <p className="text-xs text-gray-500 mb-1">URL</p>
                <p className="text-sm text-gray-800 font-mono break-all">{selectedSocial.href}</p>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2">
                <button
                  onClick={() => handleCopyLink(selectedSocial.href)}
                  className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-medium transition-all ${
                    copied
                      ? 'bg-green-500 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200 active:bg-gray-300'
                  }`}
                >
                  {copied ? (
                    <>
                      <Check className="w-4 h-4" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      Copy
                    </>
                  )}
                </button>
                <a
                  href={selectedSocial.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-medium text-white transition-all active:scale-95"
                  style={{ backgroundColor: selectedSocial.color }}
                >
                  <ExternalLink className="w-4 h-4" />
                  Open
                </a>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Email Compose Modal */}
      <AnimatePresence>
        {isEmailModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm"
            onClick={closeEmailModal}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="bg-white rounded-2xl shadow-2xl p-6 max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {emailSent ? (
                // Success state
                <div className="text-center py-4">
                  <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
                    <Check className="w-8 h-8 text-green-500" />
                  </div>
                  <h3 className="font-bold text-gray-900 text-lg mb-2">Email Client Opened!</h3>
                  <p className="text-gray-500 text-sm mb-4">
                    Your default email app should open with the message ready to send.
                  </p>
                  <button
                    onClick={closeEmailModal}
                    className="px-6 py-2.5 rounded-lg font-medium bg-gradient-to-r from-purple-500 to-pink-500 text-white active:scale-95 transition-transform"
                  >
                    Close
                  </button>
                </div>
              ) : (
                // Form state
                <>
                  {/* Header */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
                        <Mail className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <h3 className="font-bold text-gray-900">Send Email</h3>
                        <p className="text-sm text-gray-500">Contact Vitalii</p>
                      </div>
                    </div>
                    <button
                      onClick={closeEmailModal}
                      className="text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  {/* Email Address Display */}
                  <div className="bg-gray-100 rounded-lg p-3 mb-4 flex items-center justify-between">
                    <div>
                      <p className="text-xs text-gray-500 mb-0.5">To:</p>
                      <p className="text-sm text-gray-800 font-mono">{CONTACT_EMAIL}</p>
                    </div>
                    <button
                      onClick={handleCopyEmail}
                      className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                        emailCopied
                          ? 'bg-green-500 text-white'
                          : 'bg-white text-gray-600 active:bg-gray-50 border border-gray-200'
                      }`}
                    >
                      {emailCopied ? (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          Copied
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          Copy
                        </>
                      )}
                    </button>
                  </div>

                  {/* Form */}
                  <div className="space-y-3 mb-4">
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Your Email</label>
                      <input
                        type="email"
                        name="senderEmail"
                        value={emailForm.senderEmail}
                        onChange={handleEmailFormChange}
                        placeholder="your@email.com"
                        className="w-full px-3 py-2.5 rounded-lg border border-gray-200 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 outline-none transition-all text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Subject</label>
                      <input
                        type="text"
                        name="subject"
                        value={emailForm.subject}
                        onChange={handleEmailFormChange}
                        placeholder="What's this about?"
                        className="w-full px-3 py-2.5 rounded-lg border border-gray-200 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 outline-none transition-all text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Message</label>
                      <textarea
                        name="message"
                        value={emailForm.message}
                        onChange={handleEmailFormChange}
                        placeholder="Write your message here..."
                        rows={4}
                        className="w-full px-3 py-2.5 rounded-lg border border-gray-200 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 outline-none transition-all text-sm resize-none"
                      />
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-2">
                    <button
                      onClick={closeEmailModal}
                      className="flex-1 px-4 py-2.5 rounded-lg font-medium bg-gray-100 text-gray-700 active:bg-gray-200 transition-all"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSendEmail}
                      disabled={isSending || !emailForm.message.trim()}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-medium bg-gradient-to-r from-blue-500 to-cyan-500 text-white active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isSending ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Opening...
                        </>
                      ) : (
                        <>
                          <Send className="w-4 h-4" />
                          Open Email App
                        </>
                      )}
                    </button>
                  </div>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

// Blog List Overlay Component with Infinite Scroll
const BlogListOverlay = ({
  onClose,
  color,
  currentLanguage,
  t
}: {
  onClose: () => void
  color: string
  currentLanguage: string
  t: (key: any) => any
}) => {
  const [allBlogs, setAllBlogs] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [offset, setOffset] = useState(0)
  const LIMIT = 10
  const scrollRef = useRef<HTMLDivElement>(null)

  const getLocalizedField = (item: any, field: string) => {
    const lang = currentLanguage.toLowerCase()
    return item[`${field}_${lang}`] || item[`${field}_en`] || ''
  }

  const formatDate = (dateStr: string) => {
    if (!dateStr) return ''
    const date = new Date(dateStr)
    return date.toLocaleDateString(currentLanguage === 'UA' ? 'uk-UA' : currentLanguage === 'NO' ? 'nb-NO' : 'en-US', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    })
  }

  // Initial load
  useEffect(() => {
    const loadBlogs = async () => {
      try {
        const { data } = await getAllBlogPosts({ limit: LIMIT, offset: 0 })
        setAllBlogs(data || [])
        setHasMore((data?.length || 0) === LIMIT)
        setOffset(LIMIT)
      } catch (error) {
        console.error('Error loading blog posts:', error)
      } finally {
        setIsLoading(false)
      }
    }
    loadBlogs()
  }, [])

  // Load more on scroll
  const loadMore = async () => {
    if (isLoadingMore || !hasMore) return
    setIsLoadingMore(true)
    try {
      const { data } = await getAllBlogPosts({ limit: LIMIT, offset })
      if (data && data.length > 0) {
        setAllBlogs(prev => [...prev, ...data])
        setHasMore(data.length === LIMIT)
        setOffset(prev => prev + LIMIT)
      } else {
        setHasMore(false)
      }
    } catch (error) {
      console.error('Error loading more blogs:', error)
    } finally {
      setIsLoadingMore(false)
    }
  }

  // Scroll handler for infinite scroll
  useEffect(() => {
    const container = scrollRef.current
    if (!container) return

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container
      if (scrollHeight - scrollTop - clientHeight < 200) {
        loadMore()
      }
    }

    container.addEventListener('scroll', handleScroll, { passive: true })
    return () => container.removeEventListener('scroll', handleScroll)
  }, [offset, hasMore, isLoadingMore])

  return (
    <motion.div
      className="fixed inset-0 z-50 bg-white"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
    >
      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 w-10 h-10 flex items-center justify-center rounded-full z-10 transition-colors"
        style={{ backgroundColor: `${color}20` }}
        aria-label="Close"
      >
        <svg className="w-6 h-6" style={{ color }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      {/* Title */}
      <div className="pt-4 px-4 pb-2">
        <h2 className="font-bold text-xl" style={{ color }}>{t('blog_title')}</h2>
      </div>

      {/* Scrollable content */}
      <div ref={scrollRef} className="h-[calc(100%-4rem)] overflow-y-auto px-4 pb-8">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin" style={{ color }} />
          </div>
        ) : allBlogs.length > 0 ? (
          <div className="space-y-3">
            {allBlogs.map((item, idx) => {
              const slug = item[`slug_${currentLanguage.toLowerCase()}`] || item.slug_en
              return (
                <motion.a
                  key={item.id}
                  href={`/blog/${slug}`}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(idx * 0.05, 0.5) }}
                  className="flex gap-3 bg-gradient-to-r from-blue-50 to-white rounded-xl p-3 shadow-sm border border-blue-100 active:scale-[0.98] transition-transform"
                >
                  {(item.processed_image_url || item.image_url || item.cover_image_url) && (
                    <div className="w-20 h-20 rounded-lg overflow-hidden flex-shrink-0">
                      <img
                        src={item.processed_image_url || item.image_url || item.cover_image_url}
                        alt={getLocalizedField(item, 'title')}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-gray-900 text-sm line-clamp-2 mb-1">
                      {getLocalizedField(item, 'title')}
                    </h4>
                    <p className="text-gray-500 text-xs line-clamp-2 mb-2">
                      {getLocalizedField(item, 'description')}
                    </p>
                    <div className="flex items-center gap-3 text-[10px] text-gray-400">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {formatDate(item.published_at)}
                      </span>
                      {item.reading_time && (
                        <span>{item.reading_time} min</span>
                      )}
                      {item.views_count > 0 && (
                        <span className="flex items-center gap-1">
                          <Eye className="w-3 h-3" />
                          {item.views_count}
                        </span>
                      )}
                    </div>
                  </div>
                </motion.a>
              )
            })}
            {isLoadingMore && (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="w-6 h-6 animate-spin" style={{ color }} />
              </div>
            )}
            {!hasMore && allBlogs.length > 0 && (
              <p className="text-center text-gray-400 text-sm py-4">
                {t('no_more_blogs' as any) || 'No more blog posts'}
              </p>
            )}
          </div>
        ) : (
          <p className="text-gray-500 text-sm text-center py-12">
            {t('no_blog_posts' as any) || 'No blog posts available'}
          </p>
        )}
      </div>
    </motion.div>
  )
}

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
  const [typedText, setTypedText] = useState('')
  const [isTyping, setIsTyping] = useState(true)
  const [isAboutExpanded, setIsAboutExpanded] = useState(false)
  const [isMounted, setIsMounted] = useState(false)

  // Skills section states
  const [isSkillsExpanded, setIsSkillsExpanded] = useState(false)
  const [storedSkills, setStoredSkills] = useState<any[]>([])

  // Projects section states
  const [currentProjectIndex, setCurrentProjectIndex] = useState(0)
  const [isProjectsExpanded, setIsProjectsExpanded] = useState(false)
  const touchStartRef = useRef<{ x: number; time: number } | null>(null)

  // Services animation state
  const [currentServiceIndex, setCurrentServiceIndex] = useState(0)
  const [isServicesExpanded, setIsServicesExpanded] = useState(false)

  // News and Blog overlay states
  const [isNewsListOpen, setIsNewsListOpen] = useState(false)
  const [isBlogListOpen, setIsBlogListOpen] = useState(false)
  const [isContactsOpen, setIsContactsOpen] = useState(false)

  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const sectionRefs = useRef<{ [key: string]: HTMLElement | null }>({})
  const aboutTextRef = useRef<HTMLDivElement>(null)

  const langKey = currentLanguage.toLowerCase() as 'en' | 'no' | 'ua'

  // Set mounted for portal
  useEffect(() => {
    setIsMounted(true)
    return () => setIsMounted(false)
  }, [])

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

  // Typewriter effect for About section - shows full content
  useEffect(() => {
    const aboutText = t('about_content') as string
    if (!isTyping) return

    if (typedText.length < aboutText.length) {
      const timer = setTimeout(() => {
        setTypedText(aboutText.substring(0, typedText.length + 1))
      }, 20) // Faster typing for full content
      return () => clearTimeout(timer)
    } else {
      setIsTyping(false)
    }
  }, [typedText, isTyping, t])

  // Reset typewriter when language changes
  useEffect(() => {
    setTypedText('')
    setIsTyping(true)
  }, [currentLanguage])

  // Auto-scroll about text to keep cursor visible
  useEffect(() => {
    if (aboutTextRef.current && isTyping) {
      aboutTextRef.current.scrollTop = aboutTextRef.current.scrollHeight
    }
  }, [typedText, isTyping])

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

    // Open overlay for contact section directly
    if (sectionId === 'contact') {
      setIsContactsOpen(true)
      return
    }

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
      const sections = ['home', 'services', 'projects', 'skills', 'news', 'blog', 'contact']
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
              onClick={() => setIsAboutExpanded(true)}
              className={`rounded-2xl p-4 pl-8 bg-gradient-to-br ${sectionColors.home.gradient} shadow-sm relative h-44 cursor-pointer active:scale-[0.98] transition-transform`}
            >
              {/* Vertical Label */}
              <VerticalLabel text={t('about_title') as string} color={sectionColors.home.icon} />

              {/* Hint to tap */}
              <div className="absolute top-2 right-2 text-[10px] text-amber-600/60 font-medium">
                {t('tap_to_expand' as any) || 'Tap to expand'}
              </div>

              {/* Scrollable text container with auto-scroll */}
              <div
                ref={aboutTextRef}
                className="h-full overflow-y-auto pr-2 scrollbar-thin scroll-smooth"
              >
                <p className="text-sm leading-relaxed text-gray-700 whitespace-pre-line">
                  {typedText}
                  {isTyping && (
                    <span className="inline-block w-0.5 h-4 bg-gray-800 ml-0.5 animate-pulse" />
                  )}
                </p>
              </div>
            </motion.div>
          </section>

          {/* SERVICES Section */}
          <section ref={el => { sectionRefs.current['services'] = el }}>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              onClick={() => setIsServicesExpanded(true)}
              className={`rounded-2xl p-4 pl-8 bg-gradient-to-br ${sectionColors.services.gradient} shadow-sm relative h-44 overflow-hidden cursor-pointer active:scale-[0.98] transition-transform`}
            >
              {/* Vertical Label */}
              <VerticalLabel text={t('services_title') as string} color={sectionColors.services.icon} />

              {/* Hint to tap */}
              <div className="absolute top-2 right-2 text-[10px] text-pink-600/60 font-medium">
                {t('tap_to_expand' as any) || 'Tap to expand'}
              </div>

              {/* Animated service title - centered */}
              <div className="h-full flex items-center justify-center">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={currentServiceIndex}
                    initial={{ opacity: 0, y: 30, scale: 0.8 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -30, scale: 0.8 }}
                    transition={{ duration: 0.6, ease: [0.34, 1.56, 0.64, 1] }}
                    className="text-center px-4"
                  >
                    <h3
                      className="font-bold text-gray-900 uppercase"
                      style={{ fontSize: 'clamp(1rem, 5vw, 1.5rem)', lineHeight: 1.2 }}
                    >
                      {translations[langKey].services_list[currentServiceIndex]?.title}
                    </h3>
                    <p className="text-gray-500 text-xs mt-2 italic">
                      {translations[langKey].services_list[currentServiceIndex]?.description}
                    </p>
                  </motion.div>
                </AnimatePresence>
              </div>

              {/* Progress dots */}
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1">
                {translations[langKey].services_list.map((_, i) => (
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
              onClick={() => setIsProjectsExpanded(true)}
              className={`rounded-2xl p-4 pl-8 bg-gradient-to-br ${sectionColors.projects.gradient} shadow-sm relative h-44 overflow-hidden cursor-pointer active:scale-[0.98] transition-transform`}
            >
              {/* Vertical Label */}
              <VerticalLabel text={t('projects_title') as string} color={sectionColors.projects.icon} />

              {/* Hint to tap */}
              <div className="absolute top-2 right-2 text-[10px] text-emerald-600/60 font-medium">
                {t('tap_to_expand' as any) || 'Tap to expand'}
              </div>

              {/* Carousel view */}
              <div
                className="relative mt-4"
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

                <AnimatePresence mode="wait">
                  <motion.div
                    key={currentProjectIndex}
                    initial={{ opacity: 0, x: 50, scale: 0.9 }}
                    animate={{ opacity: 1, x: 0, scale: 1 }}
                    exit={{ opacity: 0, x: -50, scale: 0.9 }}
                    transition={{ duration: 0.4, ease: 'easeOut' }}
                    className="flex items-center gap-3"
                  >
                    {currentProject?.image && (
                      <div className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 shadow-sm">
                        <img
                          src={currentProject.image}
                          alt={currentProject.title}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-gray-900 text-sm mb-1 line-clamp-1">{currentProject?.title}</h4>
                      <p className="text-gray-600 text-xs line-clamp-2">{currentProject?.short}</p>
                    </div>
                  </motion.div>
                </AnimatePresence>
              </div>
            </motion.div>
          </section>

          {/* SKILLS Section */}
          <section ref={el => { sectionRefs.current['skills'] = el }}>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className={`rounded-2xl p-4 pl-8 bg-gradient-to-br ${sectionColors.skills.gradient} shadow-sm relative h-44 overflow-hidden`}
            >
              {/* Vertical Label */}
              <VerticalLabel text={t('skills_title') as string} color={sectionColors.skills.icon} />

              {/* Toggle button */}
              <div className="flex justify-end mb-2">
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
              className={`rounded-2xl p-4 pl-8 bg-gradient-to-br ${sectionColors.news.gradient} shadow-sm relative h-44 overflow-hidden`}
            >
              {/* Vertical Label */}
              <VerticalLabel text={t('news_title') as string} color={sectionColors.news.icon} />

              {/* View all button */}
              <div className="flex justify-end mb-2">
                <button
                  onClick={() => setIsNewsListOpen(true)}
                  className="text-xs font-medium flex items-center gap-1"
                  style={{ color: sectionColors.news.icon }}
                >
                  {t('view_all' as any) || 'View all'}
                  <ChevronRight className="w-4 h-4" />
                </button>
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
              className={`rounded-2xl p-4 pl-8 bg-gradient-to-br ${sectionColors.blog.gradient} shadow-sm relative h-44 overflow-hidden`}
            >
              {/* Vertical Label */}
              <VerticalLabel text={t('blog_title') as string} color={sectionColors.blog.icon} />

              {/* View all button */}
              <div className="flex justify-end mb-2">
                <button
                  onClick={() => setIsBlogListOpen(true)}
                  className="text-xs font-medium flex items-center gap-1"
                  style={{ color: sectionColors.blog.icon }}
                >
                  {t('view_all' as any) || 'View all'}
                  <ChevronRight className="w-4 h-4" />
                </button>
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

          {/* CONTACT Section */}
          <section ref={el => { sectionRefs.current['contact'] = el }}>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35 }}
              onClick={() => setIsContactsOpen(true)}
              className={`rounded-2xl p-4 pl-8 bg-gradient-to-br ${sectionColors.contact.gradient} shadow-sm relative h-44 overflow-hidden cursor-pointer active:scale-[0.98] transition-transform`}
            >
              {/* Vertical Label */}
              <VerticalLabel text={t('contact_title' as any) || 'Contact'} color={sectionColors.contact.icon} />

              {/* Hint to tap */}
              <div className="absolute top-2 right-2 text-[10px] text-purple-600/60 font-medium">
                {t('tap_to_expand' as any) || 'Tap to expand'}
              </div>

              {/* Contact icons preview */}
              <div className="h-full flex items-center justify-center">
                <div className="flex flex-wrap justify-center gap-3">
                  {socialLinks.slice(0, 6).map((social, idx) => {
                    const Icon = social.icon
                    return (
                      <motion.div
                        key={social.label}
                        initial={{ opacity: 0, scale: 0 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.4 + idx * 0.1 }}
                        className="w-11 h-11 rounded-full flex items-center justify-center"
                        style={{ backgroundColor: `${social.color}15` }}
                      >
                        <Icon className="w-5 h-5" style={{ color: social.color }} />
                      </motion.div>
                    )
                  })}
                </div>
              </div>

              {/* Bottom text */}
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 text-xs text-purple-600/80 font-medium">
                {t('tap_to_see_all' as any) || 'Tap to see all contacts'}
              </div>
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

      {/* About Explosion Overlay Portal */}
      {isMounted && createPortal(
        <AnimatePresence>
          {isAboutExpanded && (
            <AboutExplosionOverlay
              text={t('about_content') as string}
              onClose={() => setIsAboutExpanded(false)}
              color={sectionColors.home.icon}
            />
          )}
        </AnimatePresence>,
        document.body
      )}

      {/* Services Explosion Overlay Portal */}
      {isMounted && createPortal(
        <AnimatePresence>
          {isServicesExpanded && (
            <ServicesExplosionOverlay
              services={translations[langKey].services_list}
              onClose={() => setIsServicesExpanded(false)}
              color={sectionColors.services.icon}
            />
          )}
        </AnimatePresence>,
        document.body
      )}

      {/* Projects Explosion Overlay Portal */}
      {isMounted && createPortal(
        <AnimatePresence>
          {isProjectsExpanded && (
            <ProjectsExplosionOverlay
              projects={translations[langKey].projects_list}
              onClose={() => setIsProjectsExpanded(false)}
              color={sectionColors.projects.icon}
            />
          )}
        </AnimatePresence>,
        document.body
      )}

      {/* News List Overlay Portal */}
      {isMounted && createPortal(
        <AnimatePresence>
          {isNewsListOpen && (
            <NewsListOverlay
              onClose={() => setIsNewsListOpen(false)}
              color={sectionColors.news.icon}
              currentLanguage={currentLanguage}
              t={t}
            />
          )}
        </AnimatePresence>,
        document.body
      )}

      {/* Blog List Overlay Portal */}
      {isMounted && createPortal(
        <AnimatePresence>
          {isBlogListOpen && (
            <BlogListOverlay
              onClose={() => setIsBlogListOpen(false)}
              color={sectionColors.blog.icon}
              currentLanguage={currentLanguage}
              t={t}
            />
          )}
        </AnimatePresence>,
        document.body
      )}

      {/* Contacts Overlay Portal */}
      {isMounted && createPortal(
        <AnimatePresence>
          {isContactsOpen && (
            <ContactsOverlay
              onClose={() => setIsContactsOpen(false)}
              color={sectionColors.contact.icon}
              t={t}
            />
          )}
        </AnimatePresence>,
        document.body
      )}
    </div>
  )
}

// Export for page.tsx
export { sectionColors as sectionNeonColorsMobile }
