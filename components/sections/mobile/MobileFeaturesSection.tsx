'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { allFeatures, categories, getCategoryInfo } from '@/data/features'
import { FeatureModal } from '@/components/ui/FeatureModal'
import { sectionColors } from './types'
import { VerticalLabel } from './VerticalLabel'
import type { FeatureCategory } from '@/data/features'
import type { TranslateFn } from './types'

interface MobileFeaturesSectionProps {
  t: TranslateFn
  currentLanguage: string
  sectionRef: (el: HTMLElement | null) => void
}

export const MobileFeaturesSection = ({ t, currentLanguage, sectionRef }: MobileFeaturesSectionProps) => {
  const langKey = currentLanguage.toLowerCase() as 'en' | 'no' | 'ua'
  const [isFeaturesModalOpen, setIsFeaturesModalOpen] = useState(false)
  const [selectedFeatureCategory, setSelectedFeatureCategory] = useState<FeatureCategory | undefined>(undefined)

  const latestFeatures = allFeatures.slice(0, 4)

  return (
    <>
      <section ref={sectionRef} className="mb-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className={`rounded-2xl p-4 pl-8 bg-gradient-to-br ${sectionColors.features.gradient} shadow-sm relative overflow-hidden`}
        >
          {/* Vertical Label */}
          <VerticalLabel text={t('features_title') as string} color={sectionColors.features.icon} />

          {/* Latest features */}
          <div className="mb-2">
            {latestFeatures.slice(0, 2).map((feature, idx) => {
              const catInfo = getCategoryInfo(feature.category)
              return (
                <motion.div
                  key={feature.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.1 }}
                  onClick={() => {
                    setSelectedFeatureCategory(undefined)
                    setIsFeaturesModalOpen(true)
                  }}
                  className="flex items-center gap-2 p-1.5 rounded-md mb-1 bg-white/5 active:bg-white/10"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-white/90 truncate">
                      {feature.title[langKey as 'en' | 'no' | 'ua']}
                    </p>
                  </div>
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded ${catInfo.color.bg} ${catInfo.color.text} shrink-0`}
                  >
                    {feature.techStack[0]}
                  </span>
                </motion.div>
              )
            })}
          </div>

          {/* Category folders grid */}
          <div className="grid grid-cols-3 gap-1.5">
            {categories.map((cat) => {
              const count = allFeatures.filter((f) => f.category === cat.id).length
              return (
                <motion.button
                  key={cat.id}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => {
                    setSelectedFeatureCategory(cat.id)
                    setIsFeaturesModalOpen(true)
                  }}
                  className={`flex flex-col items-center p-1.5 rounded-lg ${cat.color.bg} border border-white/5`}
                >
                  <span className={`text-[10px] font-medium ${cat.color.text} text-center leading-tight`}>
                    {cat.label[langKey as 'en' | 'no' | 'ua']}
                  </span>
                  <span className="text-[10px] text-white/30">{count}</span>
                </motion.button>
              )
            })}
          </div>
        </motion.div>
      </section>

      {/* Features Modal (mobile) */}
      <FeatureModal
        open={isFeaturesModalOpen}
        onOpenChange={setIsFeaturesModalOpen}
        features={allFeatures}
        initialCategory={selectedFeatureCategory}
        currentLanguage={langKey as 'en' | 'no' | 'ua'}
      />
    </>
  )
}
