'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'

interface ModalProps {
  children: React.ReactNode
}

export function Modal({ children }: ModalProps) {
  const router = useRouter()

  const onDismiss = useCallback(() => {
    router.back()
  }, [router])

  const onKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') onDismiss()
    },
    [onDismiss]
  )

  useEffect(() => {
    document.addEventListener('keydown', onKeyDown)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = 'unset'
    }
  }, [onKeyDown])

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm"
        onClick={onDismiss}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="fixed inset-4 md:inset-10 lg:inset-20 bg-slate-900 rounded-2xl overflow-hidden shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={onDismiss}
            className="absolute top-4 right-4 z-10 p-2 rounded-full bg-slate-800/80 hover:bg-slate-700 transition-colors text-white"
          >
            <X className="w-6 h-6" />
          </button>
          <div className="h-full overflow-y-auto">
            {children}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
