'use client'

import { motion } from 'framer-motion'
import { Home, Briefcase, FolderOpen, Newspaper, BookOpen, Mail } from 'lucide-react'
import { useTranslations } from '@/contexts/TranslationContext'

// Section colors matching desktop Bento Grid
const navColors: { [key: string]: string } = {
  home: '#AF601A',      // About/Home - brown-orange
  services: '#EC008C',  // Services - fuchsia
  projects: '#009B77',  // Projects - emerald
  news: '#88B04B',      // News - greenery
  blog: '#0F4C81',      // Blog - classic blue
  contact: '#764BB0',   // Contact - purple
}

interface NavItem {
  id: string
  icon: React.ComponentType<{ className?: string }>
  labelKey: string
}

const navItems: NavItem[] = [
  { id: 'home', icon: Home, labelKey: 'nav_home' },
  { id: 'services', icon: Briefcase, labelKey: 'nav_services' },
  { id: 'projects', icon: FolderOpen, labelKey: 'nav_projects' },
  { id: 'news', icon: Newspaper, labelKey: 'nav_news' },
  { id: 'blog', icon: BookOpen, labelKey: 'nav_blog' },
  { id: 'contact', icon: Mail, labelKey: 'nav_contact' },
]

interface BottomNavigationProps {
  activeSection: string
  onSectionChange: (sectionId: string) => void
}

export const BottomNavigation = ({ activeSection, onSectionChange }: BottomNavigationProps) => {
  const { t } = useTranslations()

  return (
    <motion.nav
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ type: 'spring', damping: 25, stiffness: 300, delay: 0.2 }}
      className="fixed bottom-0 left-0 right-0 z-50 px-2 pb-safe"
      style={{
        paddingBottom: 'max(8px, env(safe-area-inset-bottom))',
      }}
    >
      {/* Glassmorphism container */}
      <div
        className="mx-auto max-w-md rounded-2xl border border-white/20 shadow-lg"
        style={{
          background: 'rgba(255, 255, 255, 0.85)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
        }}
      >
        <div className="flex items-center justify-around px-2 py-2">
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive = activeSection === item.id
            const color = navColors[item.id]

            return (
              <motion.button
                key={item.id}
                onClick={() => onSectionChange(item.id)}
                className="relative flex flex-col items-center justify-center px-3 py-2 rounded-xl transition-all"
                whileTap={{ scale: 0.9 }}
                style={{
                  minWidth: '48px',
                  minHeight: '48px',
                }}
              >
                {/* Active indicator background */}
                {isActive && (
                  <motion.div
                    layoutId="activeTab"
                    className="absolute inset-0 rounded-xl"
                    style={{
                      backgroundColor: `${color}15`,
                    }}
                    transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                  />
                )}

                {/* Icon */}
                <div
                  className="w-5 h-5 relative z-10 transition-colors duration-200"
                  style={{
                    color: isActive ? color : '#6B7280',
                  }}
                >
                  <Icon className="w-full h-full" />
                </div>

                {/* Label - only show for active */}
                <motion.span
                  initial={false}
                  animate={{
                    opacity: isActive ? 1 : 0,
                    height: isActive ? 'auto' : 0,
                    marginTop: isActive ? 2 : 0,
                  }}
                  className="text-[10px] font-semibold relative z-10 overflow-hidden"
                  style={{
                    color: isActive ? color : '#6B7280',
                  }}
                >
                  {t(item.labelKey as any) || item.id}
                </motion.span>

                {/* Active dot indicator */}
                {isActive && (
                  <motion.div
                    layoutId="activeDot"
                    className="absolute -bottom-1 w-1 h-1 rounded-full"
                    style={{ backgroundColor: color }}
                    transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                  />
                )}
              </motion.button>
            )
          })}
        </div>
      </div>
    </motion.nav>
  )
}
