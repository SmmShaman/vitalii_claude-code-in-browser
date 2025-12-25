'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTranslations } from '@/contexts/TranslationContext'
import { translations } from '@/utils/translations'
import { ChevronDown, User, Briefcase, FolderOpen, Sparkles, Newspaper, BookOpen } from 'lucide-react'

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

  const handleSectionClick = (sectionId: string) => {
    const newExpanded = expandedSection === sectionId ? null : sectionId
    setExpandedSection(newExpanded)
    onHoveredSectionChange?.(newExpanded)
  }

  // Render content based on section type
  const renderSectionContent = (section: Section) => {
    const langKey = currentLanguage.toLowerCase() as 'en' | 'no' | 'ua'

    switch (section.id) {
      case 'about':
        return (
          <div className="prose prose-sm max-w-none">
            <p className="text-gray-700 leading-relaxed whitespace-pre-line">
              {t(section.contentKey as any)}
            </p>
          </div>
        )

      case 'services':
        const services = translations[langKey].services_list
        return (
          <div className="space-y-3">
            {services.map((service, idx) => (
              <div key={idx} className="bg-white/60 rounded-lg p-3">
                <h4 className="font-semibold text-gray-900 text-sm">{service.title}</h4>
                <p className="text-gray-600 text-xs mt-1">{service.description}</p>
              </div>
            ))}
          </div>
        )

      case 'projects':
        const projects = translations[langKey].projects_list
        return (
          <div className="space-y-3">
            {projects.slice(0, 4).map((project, idx) => (
              <div key={idx} className="bg-white/60 rounded-lg p-3 flex items-start gap-3">
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
              </div>
            ))}
            {projects.length > 4 && (
              <p className="text-center text-gray-500 text-xs">
                +{projects.length - 4} more projects
              </p>
            )}
          </div>
        )

      case 'skills':
        const skills = translations[langKey].skills_list
        return (
          <div className="flex flex-wrap gap-2">
            {skills.map((skill, idx) => (
              <span
                key={idx}
                className="px-3 py-1.5 bg-white/60 rounded-full text-xs font-medium text-gray-700"
              >
                {skill.name}
              </span>
            ))}
          </div>
        )

      case 'news':
        return (
          <div className="space-y-2">
            <p className="text-gray-600 text-sm">{t(section.contentKey as any)}</p>
            <a
              href="/news"
              className="inline-flex items-center gap-1 text-lime-700 font-medium text-sm hover:underline"
            >
              {t('view_all_news' as any) || 'View all news'} →
            </a>
          </div>
        )

      case 'blog':
        return (
          <div className="space-y-2">
            <p className="text-gray-600 text-sm">{t(section.contentKey as any)}</p>
            <a
              href="/blog"
              className="inline-flex items-center gap-1 text-blue-700 font-medium text-sm hover:underline"
            >
              {t('view_all_blog' as any) || 'View all posts'} →
            </a>
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
        {sections.map((section) => {
          const isExpanded = expandedSection === section.id
          const colors = sectionColors[section.id]
          const icon = sectionIcons[section.id]

          return (
            <motion.div
              key={section.id}
              layout
              className={`rounded-xl overflow-hidden shadow-sm ${colors.bg}`}
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
