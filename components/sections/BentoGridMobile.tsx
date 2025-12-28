'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTranslations } from '@/contexts/TranslationContext'
import { translations } from '@/utils/translations'
import { ChevronDown, User, Briefcase, FolderOpen, Sparkles, Newspaper, BookOpen, Calendar, Eye } from 'lucide-react'
import { getLatestNews, getLatestBlogPosts } from '@/integrations/supabase/client'
import { useActiveSection } from '@/hooks/useActiveSection'

// Section colors (same as desktop)
const sectionColors: { [key: string]: { bg: string; text: string; icon: string } } = {
  about: { bg: 'bg-amber-50', text: 'text-amber-900', icon: '#AF601A' },
  services: { bg: 'bg-pink-50', text: 'text-pink-900', icon: '#EC008C' },
  projects: { bg: 'bg-emerald-50', text: 'text-emerald-900', icon: '#009B77' },
  skills: { bg: 'bg-rose-50', text: 'text-rose-900', icon: '#e11d48' },
  news: { bg: 'bg-lime-50', text: 'text-lime-900', icon: '#88B04B' },
  blog: { bg: 'bg-blue-50', text: 'text-blue-900', icon: '#0F4C81' },
}

// Section icons
const sectionIcons: { [key: string]: React.ReactNode } = {
  about: <User className="w-5 h-5" />,
  services: <Briefcase className="w-5 h-5" />,
  projects: <FolderOpen className="w-5 h-5" />,
  skills: <Sparkles className="w-5 h-5" />,
  news: <Newspaper className="w-5 h-5" />,
  blog: <BookOpen className="w-5 h-5" />,
}

interface Section {
  id: string
  titleKey: string
  contentKey: string
}

const sections: Section[] = [
  { id: 'about', titleKey: 'about_title', contentKey: 'about_content' },
  { id: 'services', titleKey: 'services_title', contentKey: 'services_content' },
  { id: 'projects', titleKey: 'projects_title', contentKey: 'projects_content' },
  { id: 'skills', titleKey: 'skills_title', contentKey: 'skills_content' },
  { id: 'news', titleKey: 'news_title', contentKey: 'news_description' },
  { id: 'blog', titleKey: 'blog_title', contentKey: 'blog_description' },
]

interface BentoGridMobileProps {
  onHoveredSectionChange?: (sectionId: string | null) => void
}

export const BentoGridMobile = ({ onHoveredSectionChange }: BentoGridMobileProps) => {
  const { t, currentLanguage } = useTranslations()
  const [expandedSection, setExpandedSection] = useState<string | null>(null)
  const [newsData, setNewsData] = useState<any[]>([])
  const [blogData, setBlogData] = useState<any[]>([])
  const [isLoadingNews, setIsLoadingNews] = useState(false)
  const [isLoadingBlog, setIsLoadingBlog] = useState(false)

  // Create refs for each section for scroll tracking
  const sectionRefs = useRef<(HTMLDivElement | null)[]>([])

  // Track which section is currently in viewport center
  const activeSectionIndex = useActiveSection(
    sectionRefs.current.map(el => ({ current: el }))
  )

  // Update hovered section based on scroll position
  useEffect(() => {
    if (activeSectionIndex !== null && activeSectionIndex >= 0 && activeSectionIndex < sections.length) {
      const sectionId = sections[activeSectionIndex].id
      onHoveredSectionChange?.(sectionId)
    }
  }, [activeSectionIndex, onHoveredSectionChange])

  // Fetch news and blog data
  useEffect(() => {
    const fetchData = async () => {
      setIsLoadingNews(true)
      setIsLoadingBlog(true)

      const [news, blogs] = await Promise.all([
        getLatestNews(5),
        getLatestBlogPosts(5)
      ])

      setNewsData(news || [])
      setBlogData(blogs || [])
      setIsLoadingNews(false)
      setIsLoadingBlog(false)
    }

    fetchData()
  }, [])

  const handleSectionClick = (sectionId: string) => {
    const newExpanded = expandedSection === sectionId ? null : sectionId
    setExpandedSection(newExpanded)
    onHoveredSectionChange?.(newExpanded)
  }

  // Helper to get title/description by language
  const getLocalizedField = (item: any, field: string) => {
    const lang = currentLanguage.toLowerCase()
    return item[`${field}_${lang}`] || item[`${field}_en`] || ''
  }

  // Format date
  const formatDate = (dateStr: string) => {
    if (!dateStr) return ''
    const date = new Date(dateStr)
    return date.toLocaleDateString(currentLanguage === 'UA' ? 'uk-UA' : currentLanguage === 'NO' ? 'nb-NO' : 'en-US', {
      day: 'numeric',
      month: 'short'
    })
  }

  // Render content based on section type
  const renderSectionContent = (section: Section) => {
    const langKey = currentLanguage.toLowerCase() as 'en' | 'no' | 'ua'

    switch (section.id) {
      case 'about':
        const aboutText = t(section.contentKey as any) as string
        const aboutWords = aboutText.split(' ')
        return (
          <div className="prose prose-sm max-w-none">
            <p className="text-gray-700 leading-relaxed">
              {aboutWords.map((word, idx) => (
                <motion.span
                  key={idx}
                  className="inline-block mr-1"
                  initial={{ opacity: 0, y: 5 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: '-50px' }}
                  transition={{
                    duration: 0.2,
                    delay: idx * 0.03,
                    ease: 'easeOut'
                  }}
                >
                  {word}
                </motion.span>
              ))}
            </p>
          </div>
        )

      case 'services':
        const services = translations[langKey].services_list
        return (
          <div className="space-y-3">
            {services.map((service, idx) => (
              <motion.div
                key={idx}
                className="bg-white/60 rounded-lg p-3"
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, margin: '-50px' }}
                transition={{
                  duration: 0.4,
                  delay: idx * 0.1,
                  ease: 'easeOut'
                }}
              >
                <h4 className="font-semibold text-gray-900 text-sm">{service.title}</h4>
                <p className="text-gray-600 text-xs mt-1">{service.description}</p>
              </motion.div>
            ))}
          </div>
        )

      case 'projects':
        const projects = translations[langKey].projects_list
        return (
          <div className="space-y-3">
            {projects.slice(0, 4).map((project, idx) => (
              <motion.div
                key={idx}
                className="bg-white/60 rounded-lg p-3 flex items-start gap-3"
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true, margin: '-50px' }}
                transition={{
                  duration: 0.4,
                  delay: idx * 0.1,
                  ease: 'backOut'
                }}
                whileTap={{ scale: 0.98 }}
              >
                {project.image && (
                  <img
                    src={project.image}
                    alt={project.title}
                    className="w-16 h-16 rounded-lg object-cover flex-shrink-0"
                  />
                )}
                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold text-gray-900 text-sm truncate">{project.title}</h4>
                  <p className="text-gray-600 text-xs mt-1 line-clamp-2">{project.short}</p>
                </div>
              </motion.div>
            ))}
            {projects.length > 4 && (
              <motion.p
                className="text-center text-gray-500 text-xs"
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                transition={{ delay: 0.5 }}
              >
                +{projects.length - 4} more projects
              </motion.p>
            )}
          </div>
        )

      case 'skills':
        const skills = translations[langKey].skills_list
        return (
          <div className="flex flex-wrap gap-2">
            {skills.map((skill, idx) => (
              <motion.span
                key={idx}
                className="px-3 py-1.5 bg-white/60 rounded-full text-xs font-medium text-gray-700"
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-50px' }}
                transition={{
                  duration: 0.3,
                  delay: idx * 0.05,
                  ease: 'easeOut'
                }}
                whileTap={{ scale: 1.1 }}
              >
                {skill.name}
              </motion.span>
            ))}
          </div>
        )

      case 'news':
        return (
          <div className="space-y-3">
            {isLoadingNews ? (
              <div className="flex items-center justify-center py-4">
                <div className="animate-spin rounded-full h-6 w-6 border-2 border-lime-600 border-t-transparent"></div>
              </div>
            ) : newsData.length > 0 ? (
              <>
                {newsData.slice(0, 3).map((item) => {
                  const slug = item[`slug_${currentLanguage.toLowerCase()}`] || item.slug_en
                  return (
                    <a
                      key={item.id}
                      href={`/news/${slug}`}
                      className="block bg-white/60 rounded-lg p-3 hover:bg-white/80 transition-colors"
                    >
                      <div className="flex gap-3">
                        {(item.processed_image_url || item.image_url) && (
                          <img
                            src={item.processed_image_url || item.image_url}
                            alt={getLocalizedField(item, 'title')}
                            className="w-16 h-16 rounded-lg object-cover flex-shrink-0"
                          />
                        )}
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-gray-900 text-sm line-clamp-2">
                            {getLocalizedField(item, 'title')}
                          </h4>
                          <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
                            <Calendar className="w-3 h-3" />
                            <span>{formatDate(item.published_at)}</span>
                            {item.views_count > 0 && (
                              <>
                                <Eye className="w-3 h-3 ml-1" />
                                <span>{item.views_count}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    </a>
                  )
                })}
                <a
                  href="/news"
                  className="inline-flex items-center gap-1 text-lime-700 font-medium text-sm hover:underline"
                >
                  {t('view_all_news' as any) || 'View all news'} →
                </a>
              </>
            ) : (
              <p className="text-gray-500 text-sm text-center py-4">
                {t('no_news' as any) || 'No news available'}
              </p>
            )}
          </div>
        )

      case 'blog':
        return (
          <div className="space-y-3">
            {isLoadingBlog ? (
              <div className="flex items-center justify-center py-4">
                <div className="animate-spin rounded-full h-6 w-6 border-2 border-blue-600 border-t-transparent"></div>
              </div>
            ) : blogData.length > 0 ? (
              <>
                {blogData.slice(0, 3).map((item) => {
                  const slug = item[`slug_${currentLanguage.toLowerCase()}`] || item.slug_en
                  return (
                    <a
                      key={item.id}
                      href={`/blog/${slug}`}
                      className="block bg-white/60 rounded-lg p-3 hover:bg-white/80 transition-colors"
                    >
                      <div className="flex gap-3">
                        {(item.processed_image_url || item.image_url || item.cover_image_url) && (
                          <img
                            src={item.processed_image_url || item.image_url || item.cover_image_url}
                            alt={getLocalizedField(item, 'title')}
                            className="w-16 h-16 rounded-lg object-cover flex-shrink-0"
                          />
                        )}
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-gray-900 text-sm line-clamp-2">
                            {getLocalizedField(item, 'title')}
                          </h4>
                          <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
                            <Calendar className="w-3 h-3" />
                            <span>{formatDate(item.published_at)}</span>
                            {item.reading_time && (
                              <span className="ml-1">• {item.reading_time} min</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </a>
                  )
                })}
                <a
                  href="/blog"
                  className="inline-flex items-center gap-1 text-blue-700 font-medium text-sm hover:underline"
                >
                  {t('view_all_blog' as any) || 'View all posts'} →
                </a>
              </>
            ) : (
              <p className="text-gray-500 text-sm text-center py-4">
                {t('no_blog_posts' as any) || 'No blog posts available'}
              </p>
            )}
          </div>
        )

      default:
        return (
          <p className="text-gray-700 text-sm">
            {t(section.contentKey as any)}
          </p>
        )
    }
  }

  return (
    <div className="h-full w-full overflow-y-auto overflow-x-hidden pb-4">
      <div className="flex flex-col gap-3 px-1">
        {sections.map((section, index) => {
          const isExpanded = expandedSection === section.id
          const isActive = activeSectionIndex === index
          const colors = sectionColors[section.id]
          const icon = sectionIcons[section.id]

          return (
            <motion.div
              key={section.id}
              ref={(el) => {
                sectionRefs.current[index] = el
              }}
              layout
              className={`rounded-xl overflow-hidden shadow-sm transition-all duration-300 ${colors.bg} ${
                isActive ? 'ring-2 ring-offset-2' : ''
              }`}
              style={isActive ? {
                '--tw-ring-color': colors.icon
              } as React.CSSProperties : {}}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              {/* Card Header - Always visible */}
              <button
                onClick={() => handleSectionClick(section.id)}
                className={`w-full px-4 py-4 flex items-center justify-between ${colors.text}`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: colors.icon + '20', color: colors.icon }}
                  >
                    {icon}
                  </div>
                  <span className="font-semibold text-base">
                    {t(section.titleKey as any)}
                  </span>
                </div>
                <motion.div
                  animate={{ rotate: isExpanded ? 180 : 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <ChevronDown className="w-5 h-5" />
                </motion.div>
              </button>

              {/* Expandable Content */}
              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3, ease: 'easeInOut' }}
                    className="overflow-hidden"
                  >
                    <div className="px-4 pb-4">
                      <div className="pt-2 border-t border-black/5">
                        {renderSectionContent(section)}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}

// Export section colors for use in page background
export { sectionColors as sectionNeonColorsMobile }
