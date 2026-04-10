'use client'

import { useState } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ChevronRight,
  X,
  Copy,
  ExternalLink,
  Check,
  Loader2,
  Instagram,
  Send,
  Facebook,
  Linkedin,
  Github,
  Twitter,
  Mail,
} from 'lucide-react'
import { sendContactEmail } from '@/integrations/supabase/client'
import { sectionColors } from './types'
import { VerticalLabel } from './VerticalLabel'
import type { SocialLink, TranslateFn } from './types'

// TikTok icon component
const TikTokIcon = ({ className, ...props }: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className} {...props}>
    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z" />
  </svg>
)

const CONTACT_EMAIL = 'berbeha@vitalii.no'

const socialLinks: SocialLink[] = [
  { icon: Mail, href: `mailto:${CONTACT_EMAIL}`, label: 'Email', username: CONTACT_EMAIL, color: '#EA4335' },
  { icon: Instagram, href: 'https://instagram.com/smmshaman', label: 'Instagram', username: '@smmshaman', color: '#E4405F' },
  { icon: Send, href: 'https://t.me/smmshaman', label: 'Telegram', username: '@SmmShaman', color: '#0088cc' },
  { icon: Facebook, href: 'https://facebook.com/smm.shaman', label: 'Facebook', username: 'smm.shaman', color: '#1877F2' },
  { icon: Linkedin, href: 'https://linkedin.com/in/smmshaman', label: 'LinkedIn', username: 'smmshaman', color: '#0A66C2' },
  { icon: Github, href: 'https://github.com/SmmShaman', label: 'GitHub', username: 'SmmShaman', color: '#333' },
  { icon: Twitter, href: 'https://twitter.com/SmmShaman', label: 'Twitter/X', username: '@SmmShaman', color: '#000' },
  { icon: TikTokIcon, href: 'https://tiktok.com/@stuardbmw', label: 'TikTok', username: '@stuardbmw', color: '#000' },
]

// Contacts Overlay Component with QR codes and email form
const ContactsOverlay = ({
  onClose,
  color,
  t,
}: {
  onClose: () => void
  color: string
  t: TranslateFn
}) => {
  const [selectedSocial, setSelectedSocial] = useState<SocialLink | null>(null)
  const [copied, setCopied] = useState(false)

  // Email form state
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false)
  const [emailForm, setEmailForm] = useState({
    senderEmail: '',
    subject: '',
    message: '',
  })
  const [isSending, setIsSending] = useState(false)
  const [emailSent, setEmailSent] = useState(false)
  const [emailError, setEmailError] = useState<string | null>(null)
  const [emailCopied, setEmailCopied] = useState(false)
  const [formLoadTime] = useState(Date.now())

  const handleCopyLink = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  const handleCopyEmail = async () => {
    try {
      await navigator.clipboard.writeText(CONTACT_EMAIL)
      setEmailCopied(true)
      setTimeout(() => setEmailCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy email:', err)
    }
  }

  const handleEmailFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setEmailForm((prev) => ({ ...prev, [name]: value }))
  }

  const handleSendEmail = async () => {
    setIsSending(true)
    setEmailError(null)

    try {
      const result = await sendContactEmail({
        name: emailForm.senderEmail.split('@')[0] || 'Website Visitor',
        email: emailForm.senderEmail,
        message: emailForm.subject ? `Subject: ${emailForm.subject}\n\n${emailForm.message}` : emailForm.message,
        timestamp: formLoadTime,
      })

      if (result.success) {
        setEmailSent(true)
      } else {
        setEmailError(result.message || 'Failed to send message')
      }
    } catch (error) {
      console.error('Error sending email:', error)
      setEmailError('Failed to send message. Please try again.')
    } finally {
      setIsSending(false)
    }
  }

  const closeEmailModal = () => {
    setIsEmailModalOpen(false)
    setEmailForm({ senderEmail: '', subject: '', message: '' })
    setEmailSent(false)
    setEmailCopied(false)
  }

  const closeQRModal = () => {
    setSelectedSocial(null)
    setCopied(false)
  }

  const handleContactClick = (social: SocialLink) => {
    if (social.label === 'Email') {
      setIsEmailModalOpen(true)
    } else {
      setSelectedSocial(social)
    }
  }

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

      {/* Title */}
      <div className="pt-5 px-5 pb-4">
        <h2 className="font-bold text-lg tracking-wide" style={{ color }}>
          {t('contact_title' as any) || 'Contact'}
        </h2>
        <p className="text-content-muted text-sm mt-1">{t('contact_subtitle' as any) || 'Get in touch'}</p>
      </div>

      {/* Scrollable content - List of contacts */}
      <div className="h-[calc(100%-5.5rem)] overflow-y-auto px-4 pb-8">
        <div className="space-y-1">
          {socialLinks.map((social, idx) => {
            const Icon = social.icon
            return (
              <motion.button
                key={social.label}
                initial={{ opacity: 0, x: -30 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.05 }}
                onClick={() => handleContactClick(social)}
                className="w-full flex items-center gap-4 p-4 rounded-2xl active:bg-white/5 transition-colors"
              >
                {/* Icon */}
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: `${social.color}15` }}
                >
                  <Icon className="w-6 h-6" style={{ color: social.color }} />
                </div>

                {/* Info */}
                <div className="flex-1 text-left">
                  <h3 className="font-semibold text-content">{social.label}</h3>
                  <p className="text-sm text-content-muted">{social.username}</p>
                </div>

                {/* Arrow */}
                <ChevronRight className="w-5 h-5 text-content-faint" />
              </motion.button>
            )
          })}
        </div>
      </div>

      {/* QR Code Modal */}
      <AnimatePresence>
        {selectedSocial && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm"
            onClick={closeQRModal}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="bg-surface rounded-2xl shadow-2xl p-6 max-w-sm w-full mx-4"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div
                    className="w-11 h-11 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: `${selectedSocial.color}15` }}
                  >
                    <selectedSocial.icon className="w-5 h-5" style={{ color: selectedSocial.color }} />
                  </div>
                  <div>
                    <h3 className="font-bold text-content">{selectedSocial.label}</h3>
                    <p className="text-sm text-content-muted">{selectedSocial.username}</p>
                  </div>
                </div>
                <button onClick={closeQRModal} className="text-content-faint hover:text-content-muted transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* QR Code */}
              <div className="flex justify-center mb-4">
                <div className="bg-surface p-3 rounded-xl shadow-inner border border-surface-border">
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(selectedSocial.href)}&format=svg`}
                    alt={`QR Code for ${selectedSocial.label}`}
                    loading="lazy"
                    width={150}
                    height={150}
                    className="rounded-lg"
                  />
                </div>
              </div>

              {/* URL Display */}
              <div className="bg-surface-elevated rounded-lg p-3 mb-4">
                <p className="text-xs text-content-muted mb-1">URL</p>
                <p className="text-sm text-content-secondary font-mono break-all">{selectedSocial.href}</p>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2">
                <button
                  onClick={() => handleCopyLink(selectedSocial.href)}
                  className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-medium transition-all ${
                    copied
                      ? 'bg-green-500 text-white'
                      : 'bg-surface-elevated text-content-secondary hover:bg-surface-border active:bg-surface-border'
                  }`}
                >
                  {copied ? (
                    <>
                      <Check className="w-4 h-4" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      Copy
                    </>
                  )}
                </button>
                <a
                  href={selectedSocial.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-medium text-white transition-all active:scale-95"
                  style={{ backgroundColor: selectedSocial.color }}
                >
                  <ExternalLink className="w-4 h-4" />
                  Open
                </a>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Email Compose Modal */}
      <AnimatePresence>
        {isEmailModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm"
            onClick={closeEmailModal}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="bg-surface rounded-2xl shadow-2xl p-6 max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {emailSent ? (
                // Success state
                <div className="text-center py-4">
                  <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
                    <Check className="w-8 h-8 text-green-500" />
                  </div>
                  <h3 className="font-bold text-content text-lg mb-2">Message Sent!</h3>
                  <p className="text-content-muted text-sm mb-4">
                    Thank you for your message. We will get back to you soon.
                  </p>
                  <button
                    onClick={closeEmailModal}
                    className="px-6 py-2.5 rounded-lg font-medium bg-gradient-to-r from-purple-500 to-pink-500 text-white active:scale-95 transition-transform"
                  >
                    Close
                  </button>
                </div>
              ) : (
                // Form state
                <>
                  {/* Header */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
                        <Mail className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <h3 className="font-bold text-content">Send Email</h3>
                        <p className="text-sm text-content-muted">Contact Vitalii</p>
                      </div>
                    </div>
                    <button
                      onClick={closeEmailModal}
                      className="text-content-faint hover:text-content-muted transition-colors"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  {/* Email Address Display */}
                  <div className="bg-surface-elevated rounded-lg p-3 mb-4 flex items-center justify-between">
                    <div>
                      <p className="text-xs text-content-muted mb-0.5">To:</p>
                      <p className="text-sm text-content-secondary font-mono">{CONTACT_EMAIL}</p>
                    </div>
                    <button
                      onClick={handleCopyEmail}
                      className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                        emailCopied
                          ? 'bg-green-500 text-white'
                          : 'bg-surface text-content-muted active:bg-surface-deep border border-surface-border'
                      }`}
                    >
                      {emailCopied ? (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          Copied
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          Copy
                        </>
                      )}
                    </button>
                  </div>

                  {/* Form */}
                  <div className="space-y-3 mb-4">
                    <div>
                      <label className="block text-xs text-content-muted mb-1">Your Email</label>
                      <input
                        type="email"
                        name="senderEmail"
                        value={emailForm.senderEmail}
                        onChange={handleEmailFormChange}
                        placeholder="your@email.com"
                        className="w-full px-3 py-2.5 rounded-lg border border-surface-border focus:border-purple-500 focus:ring-1 focus:ring-purple-500 outline-none transition-all text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-content-muted mb-1">Subject</label>
                      <input
                        type="text"
                        name="subject"
                        value={emailForm.subject}
                        onChange={handleEmailFormChange}
                        placeholder="What's this about?"
                        className="w-full px-3 py-2.5 rounded-lg border border-surface-border focus:border-purple-500 focus:ring-1 focus:ring-purple-500 outline-none transition-all text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-content-muted mb-1">Message</label>
                      <textarea
                        name="message"
                        value={emailForm.message}
                        onChange={handleEmailFormChange}
                        placeholder="Write your message here..."
                        rows={4}
                        className="w-full px-3 py-2.5 rounded-lg border border-surface-border focus:border-purple-500 focus:ring-1 focus:ring-purple-500 outline-none transition-all text-sm resize-none"
                      />
                    </div>
                  </div>

                  {/* Error Message */}
                  {emailError && (
                    <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
                      {emailError}
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex gap-2">
                    <button
                      onClick={closeEmailModal}
                      className="flex-1 px-4 py-2.5 rounded-lg font-medium bg-surface-elevated text-content-secondary active:bg-surface-border transition-all"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSendEmail}
                      disabled={isSending || !emailForm.message.trim() || !emailForm.senderEmail.trim()}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-medium bg-gradient-to-r from-blue-500 to-cyan-500 text-white active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isSending ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Sending...
                        </>
                      ) : (
                        <>
                          <Send className="w-4 h-4" />
                          Send Message
                        </>
                      )}
                    </button>
                  </div>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

interface MobileContactSectionProps {
  t: TranslateFn
  sectionRef: (el: HTMLElement | null) => void
  isMounted: boolean
  isContactsOpen: boolean
  setIsContactsOpen: (open: boolean) => void
}

export const MobileContactSection = ({
  t,
  sectionRef,
  isMounted,
  isContactsOpen,
  setIsContactsOpen,
}: MobileContactSectionProps) => {
  return (
    <>
      <section ref={sectionRef} className="mb-2">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          onClick={() => setIsContactsOpen(true)}
          className={`rounded-2xl p-4 pl-8 bg-gradient-to-br ${sectionColors.contact.gradient} shadow-sm relative h-40 overflow-hidden cursor-pointer active:scale-[0.98] transition-transform`}
        >
          {/* Vertical Label */}
          <VerticalLabel text={t('contact_title' as any) || 'Contact'} color={sectionColors.contact.icon} />

          {/* Hint to tap */}
          <div
            className="absolute top-3 right-3 text-xs font-medium opacity-60"
            style={{ color: sectionColors.contact.icon }}
          >
            {t('tap_to_expand' as any) || 'Tap to expand'}
          </div>

          {/* Contact icons preview */}
          <div className="h-full flex items-center justify-center">
            <div className="flex flex-wrap justify-center gap-3">
              {socialLinks.slice(0, 6).map((social, idx) => {
                const Icon = social.icon
                return (
                  <motion.div
                    key={social.label}
                    initial={{ opacity: 0, scale: 0 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.4 + idx * 0.1 }}
                    className="w-11 h-11 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: `${social.color}15` }}
                  >
                    <Icon className="w-5 h-5" style={{ color: social.color }} />
                  </motion.div>
                )
              })}
            </div>
          </div>

          {/* Bottom text */}
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 text-xs text-purple-600/80 font-medium">
            {t('tap_to_see_all' as any) || 'Tap to see all contacts'}
          </div>
        </motion.div>
      </section>

      {/* Contacts Overlay Portal */}
      {isMounted &&
        createPortal(
          <AnimatePresence>
            {isContactsOpen && (
              <ContactsOverlay
                onClose={() => setIsContactsOpen(false)}
                color={sectionColors.contact.icon}
                t={t}
              />
            )}
          </AnimatePresence>,
          document.body
        )}
    </>
  )
}
