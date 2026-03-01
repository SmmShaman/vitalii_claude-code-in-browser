'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useCallback, useRef, useId } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'

interface ModalProps {
  children: React.ReactNode
  title?: string
}

export function Modal({ children, title = 'Article' }: ModalProps) {
  const router = useRouter()
  const modalRef = useRef<HTMLDivElement>(null)
  const previousActiveElement = useRef<HTMLElement | null>(null)
  const titleId = useId()

  const onDismiss = useCallback(() => {
    // Return focus to previously focused element
    if (previousActiveElement.current) {
      previousActiveElement.current.focus()
    }
    router.back()
  }, [router])

  // Focus trap - get all focusable elements within modal
  const getFocusableElements = useCallback(() => {
    if (!modalRef.current) return []
    return Array.from(
      modalRef.current.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      )
    ).filter(el => !el.hasAttribute('disabled') && el.offsetParent !== null)
  }, [])

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onDismiss()
        return
      }

      // Focus trap on Tab
      if (e.key === 'Tab') {
        const focusableElements = getFocusableElements()
        if (focusableElements.length === 0) return

        const firstElement = focusableElements[0]
        const lastElement = focusableElements[focusableElements.length - 1]

        if (e.shiftKey) {
          // Shift + Tab: go to last element if at first
          if (document.activeElement === firstElement) {
            e.preventDefault()
            lastElement.focus()
          }
        } else {
          // Tab: go to first element if at last
          if (document.activeElement === lastElement) {
            e.preventDefault()
            firstElement.focus()
          }
        }
      }
    },
    [onDismiss, getFocusableElements]
  )

  useEffect(() => {
    // Save current focus
    previousActiveElement.current = document.activeElement as HTMLElement

    // Add keyboard listener
    document.addEventListener('keydown', handleKeyDown)
    document.body.style.overflow = 'hidden'

    // Focus the modal or first focusable element
    const focusableElements = getFocusableElements()
    if (focusableElements.length > 0) {
      // Focus close button (first focusable)
      focusableElements[0].focus()
    } else if (modalRef.current) {
      modalRef.current.focus()
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = 'unset'
    }
  }, [handleKeyDown, getFocusableElements])

  return (
    <AnimatePresence>
      {/* Light backdrop for smooth transition */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-40 bg-white"
        onClick={onDismiss}
        aria-hidden="true"
      />
      <motion.div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 20 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="fixed inset-0 z-50 bg-white overflow-hidden shadow-2xl focus:outline-none"
        style={{
          paddingTop: 'env(safe-area-inset-top)',
          paddingRight: 'env(safe-area-inset-right)',
          paddingBottom: 'env(safe-area-inset-bottom)',
          paddingLeft: 'env(safe-area-inset-left)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Visually hidden title for screen readers */}
        <h2 id={titleId} className="sr-only">{title}</h2>

        <button
          onClick={onDismiss}
          aria-label="Close modal"
          className="absolute top-4 right-4 z-20 p-2 min-w-[44px] min-h-[44px] rounded-full bg-gray-100 hover:bg-gray-200 transition-colors text-gray-700 flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-lime-500 focus:ring-offset-2 shadow-md"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Live region for loading status */}
        <div
          role="status"
          aria-live="polite"
          aria-atomic="true"
          className="sr-only"
          id="modal-status"
        />

        <div className="h-full overflow-y-auto">
          {children}
        </div>
      </motion.div>
    </AnimatePresence>
  )
}
