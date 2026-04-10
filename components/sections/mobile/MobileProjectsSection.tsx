'use client'

import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronRight, ArrowLeft } from 'lucide-react'
import { translations } from '@/utils/translations'
import { sectionColors, projectColors } from './types'
import { VerticalLabel } from './VerticalLabel'
import type { TranslateFn } from './types'

// Projects Explosion Overlay Component with Detail View
const ProjectsExplosionOverlay = ({
  projects,
  onClose,
  color,
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
        className="fixed inset-0 z-50 bg-surface"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
      >
        {/* Back button */}
        <button
          onClick={handleBack}
          className="absolute top-4 left-4 w-11 h-11 flex items-center justify-center rounded-full z-10 transition-colors"
          style={{ backgroundColor: `${colorSet.to}20` }}
          aria-label="Back"
        >
          <ArrowLeft className="w-5 h-5" style={{ color: colorSet.to }} />
        </button>

        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-11 h-11 flex items-center justify-center rounded-full z-10 transition-colors"
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
              <img src={project.image} alt={project.title} loading="lazy" className="w-full h-full object-cover" />
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
                className="text-content-muted text-base mb-6 italic"
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
                className="text-content-secondary text-base leading-relaxed mb-6"
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
      className="fixed inset-0 z-50 bg-surface"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
    >
      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 w-11 h-11 flex items-center justify-center rounded-full z-10 transition-colors"
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
                    loading="lazy"
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
                  <h3 className="font-bold text-white text-sm line-clamp-2 drop-shadow-lg">{project.title}</h3>
                </div>
              </motion.div>
            )
          })}
        </div>
      </div>
    </motion.div>
  )
}

interface MobileProjectsSectionProps {
  t: TranslateFn
  currentLanguage: string
  sectionRef: (el: HTMLElement | null) => void
  isMounted: boolean
}

export const MobileProjectsSection = ({ t, currentLanguage, sectionRef, isMounted }: MobileProjectsSectionProps) => {
  const langKey = currentLanguage.toLowerCase() as 'en' | 'no' | 'ua'
  const [currentProjectIndex, setCurrentProjectIndex] = useState(0)
  const [isProjectsExpanded, setIsProjectsExpanded] = useState(false)
  const touchStartRef = useRef<{ x: number; time: number } | null>(null)

  const projectsList = translations[langKey].projects_list
  const currentProject = projectsList[currentProjectIndex]
  const currentColor = projectColors[currentProjectIndex % projectColors.length]

  // Projects auto-rotation
  useEffect(() => {
    if (isProjectsExpanded) return
    const interval = setInterval(() => {
      setCurrentProjectIndex((prev) => (prev + 1) % projectsList.length)
    }, 4000)
    return () => clearInterval(interval)
  }, [isProjectsExpanded, langKey, projectsList.length])

  // Touch swipe handlers
  const handleProjectTouchStart = (e: React.TouchEvent) => {
    touchStartRef.current = { x: e.touches[0].clientX, time: Date.now() }
  }

  const handleProjectTouchEnd = (e: React.TouchEvent) => {
    if (!touchStartRef.current) return
    const deltaX = e.changedTouches[0].clientX - touchStartRef.current.x
    const deltaTime = Date.now() - touchStartRef.current.time

    if (Math.abs(deltaX) > 50 && deltaTime < 300) {
      if (deltaX < 0) {
        setCurrentProjectIndex((prev) => (prev + 1) % projectsList.length)
      } else {
        setCurrentProjectIndex((prev) => (prev - 1 + projectsList.length) % projectsList.length)
      }
    }
    touchStartRef.current = null
  }

  return (
    <>
      <section ref={sectionRef} className="mb-6">
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
          <div
            className="absolute top-3 right-3 text-xs font-medium opacity-60"
            style={{ color: sectionColors.projects.icon }}
          >
            {t('tap_to_expand' as any) || 'Tap to expand'}
          </div>

          {/* Carousel view */}
          <div className="relative mt-4" onTouchStart={handleProjectTouchStart} onTouchEnd={handleProjectTouchEnd}>
            {/* Progress bar */}
            <div className="h-1 bg-surface-border rounded-full mb-3 overflow-hidden">
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
                    <img src={currentProject.image} alt={currentProject.title} loading="lazy" className="w-full h-full object-cover" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <h4 className="font-bold text-content text-sm mb-1 line-clamp-1">{currentProject?.title}</h4>
                  <p className="text-content-muted text-xs line-clamp-2">{currentProject?.short}</p>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        </motion.div>
      </section>

      {/* Projects Explosion Overlay Portal */}
      {isMounted &&
        createPortal(
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
    </>
  )
}
