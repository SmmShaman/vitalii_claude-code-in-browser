'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Shield } from 'lucide-react'
import Link from 'next/link'
import { useCookieConsent } from '@/contexts/CookieConsentContext'
import { useTranslations } from '@/contexts/TranslationContext'

export function CookieConsentBanner() {
  const { showBanner, updateConsent } = useCookieConsent()
  const { t } = useTranslations()
  const [analyticsEnabled, setAnalyticsEnabled] = useState(false)

  const handleAcceptAll = () => {
    updateConsent(true)
  }

  const handleSaveChoice = () => {
    updateConsent(analyticsEnabled)
  }

  return (
    <AnimatePresence>
      {showBanner && (
        <motion.div
          initial={{ y: '100%', opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: '100%', opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="fixed bottom-0 left-0 right-0 md:bottom-6 md:left-1/2 md:-translate-x-1/2 md:max-w-lg md:right-auto z-[9999]"
        >
          <div
            className="rounded-t-2xl md:rounded-2xl shadow-2xl p-5 md:p-6 mx-0 md:mx-4 border border-white/20"
            style={{
              background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.97) 0%, rgba(118, 75, 162, 0.97) 100%)',
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
            }}
          >
            {/* Header */}
            <div className="flex items-center gap-2.5 mb-3">
              <div className="w-8 h-8 rounded-full bg-white/15 flex items-center justify-center flex-shrink-0">
                <Shield className="w-4 h-4 text-white/90" />
              </div>
              <h3 className="text-white/95 font-bold text-sm">
                {t('cookie_banner_title')}
              </h3>
            </div>

            {/* Description */}
            <p className="text-white/70 text-xs leading-relaxed mb-4">
              {t('cookie_banner_description')}
            </p>

            {/* Cookie categories */}
            <div className="space-y-3 mb-4">
              {/* Necessary cookies - always on */}
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-white/90 text-xs font-semibold">{t('cookie_necessary')}</p>
                  <p className="text-white/50 text-[10px]">{t('cookie_necessary_desc')}</p>
                </div>
                <div className="ml-3 flex-shrink-0">
                  <div className="w-10 h-5 rounded-full bg-white/20 flex items-center justify-end px-0.5 cursor-not-allowed opacity-60">
                    <div className="w-4 h-4 rounded-full bg-white shadow-sm" />
                  </div>
                </div>
              </div>

              {/* Analytics - toggleable */}
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-white/90 text-xs font-semibold">{t('cookie_analytics')}</p>
                  <p className="text-white/50 text-[10px]">{t('cookie_analytics_desc')}</p>
                </div>
                <div className="ml-3 flex-shrink-0">
                  <button
                    onClick={() => setAnalyticsEnabled(!analyticsEnabled)}
                    className={`w-10 h-5 rounded-full flex items-center px-0.5 transition-colors duration-200 ${
                      analyticsEnabled
                        ? 'bg-gradient-to-r from-purple-400 to-pink-400 justify-end'
                        : 'bg-white/20 justify-start'
                    }`}
                    role="switch"
                    aria-checked={analyticsEnabled}
                    aria-label={t('cookie_analytics')}
                  >
                    <div className="w-4 h-4 rounded-full bg-white shadow-sm transition-transform" />
                  </button>
                </div>
              </div>
            </div>

            {/* Cookie policy link */}
            <Link
              href="/informasjonskapsler"
              className="text-white/60 text-[11px] hover:text-white/90 hover:underline transition-colors inline-flex items-center gap-1 mb-4"
              onClick={() => updateConsent(analyticsEnabled)}
            >
              {t('cookie_read_more')} →
            </Link>

            {/* Buttons */}
            <div className="flex gap-2">
              <button
                onClick={handleAcceptAll}
                className="flex-1 px-4 py-2.5 rounded-lg font-semibold text-xs bg-gradient-to-r from-purple-400 to-pink-400 text-white hover:from-purple-300 hover:to-pink-300 transition-all shadow-lg shadow-purple-500/20"
              >
                {t('cookie_accept_all')}
              </button>
              <button
                onClick={handleSaveChoice}
                className="flex-1 px-4 py-2.5 rounded-lg font-semibold text-xs bg-white/15 text-white/90 hover:bg-white/25 transition-all border border-white/10"
              >
                {t('cookie_save_choice')}
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
