'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useTranslations } from '@/contexts/TranslationContext'
import { getLatestNews, getLatestBlogPosts } from '@/integrations/supabase/client'
import { BottomNavigation } from '@/components/layout/BottomNavigation'
import {
  MobileAboutSection,
  MobileServicesSection,
  MobileProjectsSection,
  MobileFeaturesSection,
  MobileNewsSection,
  MobileBlogSection,
  MobileContactSection,
  sectionColors,
} from './mobile'

// Re-export sectionColors for external consumers (page.tsx)
export { sectionColors }
export { sectionColors as sectionNeonColorsMobile }

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
  const [isMounted, setIsMounted] = useState(false)

  // Contact overlay state (shared: opened from both section card and bottom nav)
  const [isContactsOpen, setIsContactsOpen] = useState(false)

  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const sectionRefs = useRef<{ [key: string]: HTMLElement | null }>({})

  // Set mounted for portal rendering
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
        const [news, blogs] = await Promise.all([getLatestNews(5), getLatestBlogPosts(5)])
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

  // Handle section change from bottom nav
  const handleSectionChange = useCallback(
    (sectionId: string) => {
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
    },
    []
  )

  // Track scroll position to update active section
  useEffect(() => {
    const container = scrollContainerRef.current
    if (!container) return

    const handleScroll = () => {
      const sections = ['home', 'services', 'projects', 'features', 'news', 'blog', 'contact']
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

  // Helper to create section ref setters
  const setSectionRef = useCallback(
    (key: string) => (el: HTMLElement | null) => {
      sectionRefs.current[key] = el
    },
    []
  )

  return (
    <div className="h-full w-full flex flex-col">
      {/* Scrollable content area */}
      <div ref={scrollContainerRef} className="flex-1 overflow-y-auto pb-24 scroll-smooth">
        <div className="px-4">
          <MobileAboutSection
            t={t}
            currentLanguage={currentLanguage}
            sectionRef={setSectionRef('home')}
            isMounted={isMounted}
          />

          <MobileServicesSection
            t={t}
            currentLanguage={currentLanguage}
            sectionRef={setSectionRef('services')}
            isMounted={isMounted}
          />

          <MobileProjectsSection
            t={t}
            currentLanguage={currentLanguage}
            sectionRef={setSectionRef('projects')}
            isMounted={isMounted}
          />

          <MobileFeaturesSection
            t={t}
            currentLanguage={currentLanguage}
            sectionRef={setSectionRef('features')}
          />

          <MobileNewsSection
            t={t}
            currentLanguage={currentLanguage}
            sectionRef={setSectionRef('news')}
            isMounted={isMounted}
            newsData={newsData}
            isLoadingNews={isLoadingNews}
          />

          <MobileBlogSection
            t={t}
            currentLanguage={currentLanguage}
            sectionRef={setSectionRef('blog')}
            isMounted={isMounted}
            blogData={blogData}
            isLoadingBlog={isLoadingBlog}
          />

          <MobileContactSection
            t={t}
            sectionRef={setSectionRef('contact')}
            isMounted={isMounted}
            isContactsOpen={isContactsOpen}
            setIsContactsOpen={setIsContactsOpen}
          />

          {/* Spacer */}
          <div className="h-4" />
        </div>
      </div>

      {/* Bottom Navigation */}
      <BottomNavigation activeSection={activeSection} onSectionChange={handleSectionChange} />
    </div>
  )
}
