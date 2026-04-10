'use client'

import { useState, useEffect, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { translations } from '@/utils/translations'
import { sectionColors } from './types'
import { VerticalLabel } from './VerticalLabel'
import type { TranslateFn } from './types'

// Services Explosion Overlay Component
const ServicesExplosionOverlay = ({
  categories,
  onClose,
  color,
}: {
  categories: {
    category: string
    icon: string
    services: { title: string; description?: string; detailedDescription?: string; simpleExplanation?: string }[]
  }[]
  onClose: () => void
  color: string
}) => {
  let itemIndex = 0
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

      {/* Scrollable content */}
      <div className="h-full overflow-y-auto pt-16 pb-8 px-4">
        <div className="space-y-8">
          {categories.map((cat, catIdx) => (
            <div key={catIdx}>
              {/* Category header */}
              <motion.h2
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: catIdx * 0.1 }}
                className="font-bold uppercase mb-4 px-1"
                style={{ color, fontSize: 'clamp(0.75rem, 3vw, 0.875rem)', letterSpacing: '0.15em' }}
              >
                {cat.category}
              </motion.h2>

              <div className="space-y-5">
                {cat.services.map((service, sIndex) => {
                  const delay = itemIndex * 0.06
                  itemIndex++
                  return (
                    <motion.div
                      key={sIndex}
                      initial={{ opacity: 0, y: 30, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      transition={{
                        duration: 0.4,
                        delay,
                        ease: [0.25, 0.46, 0.45, 0.94],
                      }}
                      className="pl-4 ml-2 relative"
                      style={{ borderLeft: `2px solid ${color}40` }}
                    >
                      {/* Service title */}
                      <h3
                        className="font-bold uppercase mb-1"
                        style={{ color, fontSize: 'clamp(0.9rem, 4vw, 1.1rem)' }}
                      >
                        {service.title}
                      </h3>

                      {/* Short description */}
                      {service.description && (
                        <p className="text-content-secondary text-sm mb-2 italic">{service.description}</p>
                      )}

                      {/* Detailed description */}
                      {service.detailedDescription && (
                        <p className="text-content-secondary text-base leading-relaxed">{service.detailedDescription}</p>
                      )}

                      {/* Simple explanation */}
                      {service.simpleExplanation && (
                        <p className="text-content-secondary text-sm leading-relaxed mt-2">{service.simpleExplanation}</p>
                      )}
                    </motion.div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  )
}

interface MobileServicesSectionProps {
  t: TranslateFn
  currentLanguage: string
  sectionRef: (el: HTMLElement | null) => void
  isMounted: boolean
}

export const MobileServicesSection = ({ t, currentLanguage, sectionRef, isMounted }: MobileServicesSectionProps) => {
  const langKey = currentLanguage.toLowerCase() as 'en' | 'no' | 'ua'
  const [currentServiceIndex, setCurrentServiceIndex] = useState(0)
  const [isServicesExpanded, setIsServicesExpanded] = useState(false)

  // Flatten services categories into a flat list for mobile rotation
  const flatServicesList = useMemo(
    () => translations[langKey].services_categories.flatMap((cat) => cat.services),
    [langKey]
  )

  // Services rotation
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentServiceIndex((prev) => (prev + 1) % flatServicesList.length)
    }, 3000)
    return () => clearInterval(interval)
  }, [langKey, flatServicesList.length])

  return (
    <>
      <section ref={sectionRef} className="mb-3">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          onClick={() => setIsServicesExpanded(true)}
          className={`rounded-2xl p-4 pl-8 bg-gradient-to-br ${sectionColors.services.gradient} shadow-sm relative h-40 overflow-hidden cursor-pointer active:scale-[0.98] transition-transform`}
        >
          {/* Vertical Label */}
          <VerticalLabel text={t('services_title') as string} color={sectionColors.services.icon} />

          {/* Hint to tap */}
          <div
            className="absolute top-3 right-3 text-xs font-medium opacity-60"
            style={{ color: sectionColors.services.icon }}
          >
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
                <h3 className="font-bold text-content uppercase" style={{ fontSize: 'clamp(1rem, 5vw, 1.5rem)', lineHeight: 1.2 }}>
                  {flatServicesList[currentServiceIndex]?.title}
                </h3>
                <p className="text-content-muted text-sm mt-2 italic">
                  {flatServicesList[currentServiceIndex]?.description}
                </p>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Progress dots */}
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
            {flatServicesList.map((_, i) => (
              <div
                key={i}
                className={`w-2 h-2 rounded-full transition-all ${i === currentServiceIndex ? 'bg-pink-500 w-4' : 'bg-pink-300'}`}
              />
            ))}
          </div>
        </motion.div>
      </section>

      {/* Services Explosion Overlay Portal */}
      {isMounted &&
        createPortal(
          <AnimatePresence>
            {isServicesExpanded && (
              <ServicesExplosionOverlay
                categories={translations[langKey].services_categories}
                onClose={() => setIsServicesExpanded(false)}
                color={sectionColors.services.icon}
              />
            )}
          </AnimatePresence>,
          document.body
        )}
    </>
  )
}
