'use client'

import { useState, useEffect } from 'react';
import { Twitter, Facebook, Send, Instagram, Linkedin, Github, X, Copy, ExternalLink, Check, Mail, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { fetchFooterData } from '@/utils/footerApi';
import type { FooterData } from '@/utils/footerApi';
import { useTranslations } from '@/contexts/TranslationContext';
import { sendContactEmail } from '@/integrations/supabase/client';
import { useIsMobile } from '@/hooks/useIsMobile';
import { useCookieConsent } from '@/contexts/CookieConsentContext';

interface SocialLink {
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  href: string;
  label: string;
  username: string;
  color: string;
}

// TikTok icon component
const TikTokIcon = ({ className, ...props }: React.SVGProps<SVGSVGElement>) => (
  <svg
    viewBox="0 0 24 24"
    fill="currentColor"
    className={className}
    {...props}
  >
    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
  </svg>
);

// Snapchat icon component (ghost)
const SnapchatIcon = ({ className, ...props }: React.SVGProps<SVGSVGElement>) => (
  <svg
    viewBox="0 0 512 512"
    fill="currentColor"
    className={className}
    {...props}
  >
    <path d="M256 32C132.3 32 32 132.3 32 256s100.3 224 224 224 224-100.3 224-224S379.7 32 256 32zm108.2 309.5c-2.7 6.4-15.4 11.5-38.8 15.5-1.5 8.3-3.5 17-6 17-5.3 0-14.3-4.8-30.5-4.8-5.5 0-11.5.7-18.2 2.3-15.5 3.7-28.2 19.5-52.7 19.5h-1c-24.5 0-37-15.8-52.5-19.5-6.7-1.6-12.8-2.3-18.3-2.3-16.2 0-25.2 4.8-30.5 4.8-2.5 0-4.5-8.7-6-17-23.3-4-36-9-38.7-15.5-1-2.2-1-4.2.2-5.8 12.8-16.2 23.2-33.2 31-50.5 2.3-5 3.7-9.5 4.3-13.5 1-6.5-1-11.5-5.7-15.2-3-2.3-7-4.3-11.5-6-15-5.5-17-12.2-16.2-16.8 1.2-6.2 9-10 14.8-10 2 0 3.7.3 5.2 1 8 3.5 15.2 5.3 21 5.3 5 0 7.5-1.3 8-1.7-.3-5-.8-10.2-1.2-15.5-3.2-38.5-7.2-86.2 17.5-115.5 26.7-31.5 65.2-48.2 108-48.5h2c42.8.3 81.2 17 108 48.5 24.7 29.3 20.7 77 17.5 115.5-.5 5.3-.8 10.5-1.2 15.5.5.3 3 1.7 8 1.7 5.8 0 13-1.8 21-5.3 1.5-.7 3.2-1 5.2-1 5.8 0 13.5 3.8 14.8 10 .8 4.5-1.2 11.2-16.2 16.8-4.5 1.7-8.5 3.7-11.5 6-4.8 3.7-6.7 8.7-5.7 15.2.5 4 2 8.5 4.3 13.5 7.8 17.3 18.2 34.3 31 50.5 1.2 1.5 1.2 3.5.2 5.7z"/>
  </svg>
);

const CONTACT_EMAIL = 'berbeha@vitalii.no';

export const Footer = () => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [selectedSocial, setSelectedSocial] = useState<string | null>(null);
  const [modalSocial, setModalSocial] = useState<SocialLink | null>(null);
  const [copied, setCopied] = useState(false);
  const [footerData, setFooterData] = useState<FooterData>({
    userLocation: null,
    weather: null,
    distance: null,
  });
  const [isLoading, setIsLoading] = useState(true);
  const { t, currentLanguage } = useTranslations();
  const isMobile = useIsMobile();
  const { resetConsent } = useCookieConsent();

  const handleOpenCookieSettings = () => {
    resetConsent();
  };

  // Email modal state
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [emailForm, setEmailForm] = useState({
    senderEmail: '',
    subject: '',
    message: '',
  });
  const [isSending, setIsSending] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [emailCopied, setEmailCopied] = useState(false);
  const [formLoadTime] = useState(Date.now());

  // Update clock
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Fetch footer data on mount
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      const data = await fetchFooterData(currentLanguage.toLowerCase() as 'en' | 'no' | 'ua');
      setFooterData(data);
      setIsLoading(false);
    };

    loadData();
  }, [currentLanguage]);

  const handleCopyLink = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleSocialClick = (social: SocialLink) => {
    setModalSocial(social);
    setCopied(false);
  };

  const closeModal = () => {
    setModalSocial(null);
    setCopied(false);
  };

  // Email modal handlers
  const openEmailModal = () => {
    setIsEmailModalOpen(true);
    setEmailSent(false);
    setEmailCopied(false);
  };

  const closeEmailModal = () => {
    setIsEmailModalOpen(false);
    setEmailForm({ senderEmail: '', subject: '', message: '' });
    setEmailSent(false);
    setEmailCopied(false);
  };

  const handleEmailFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setEmailForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleCopyEmail = async () => {
    try {
      await navigator.clipboard.writeText(CONTACT_EMAIL);
      setEmailCopied(true);
      setTimeout(() => setEmailCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy email:', err);
    }
  };

  const handleSendEmail = async () => {
    setIsSending(true);
    setEmailError(null);

    try {
      const result = await sendContactEmail({
        name: emailForm.senderEmail.split('@')[0] || 'Website Visitor',
        email: emailForm.senderEmail,
        message: emailForm.subject ? `Subject: ${emailForm.subject}\n\n${emailForm.message}` : emailForm.message,
        timestamp: formLoadTime,
      });

      if (result.success) {
        setEmailSent(true);
      } else {
        setEmailError(result.message || 'Failed to send message');
      }
    } catch (error) {
      console.error('Error sending email:', error);
      setEmailError('Failed to send message. Please try again.');
    } finally {
      setIsSending(false);
    }
  };

  const socialLinks: SocialLink[] = [
    { icon: Instagram, href: 'https://instagram.com/smmshaman', label: 'Instagram', username: '@smmshaman', color: '#E4405F' },
    { icon: Send, href: 'https://t.me/smmshaman', label: 'Telegram', username: 'SmmShaman', color: '#26A5E4' },
    { icon: Facebook, href: 'https://facebook.com/smm.shaman', label: 'Facebook', username: 'smm.shaman', color: '#1877F2' },
    { icon: Linkedin, href: 'https://linkedin.com/in/smmshaman', label: 'LinkedIn', username: 'smmshaman', color: '#0A66C2' },
    { icon: Github, href: 'https://github.com/SmmShaman', label: 'GitHub', username: 'SmmShaman', color: '#8b5cf6' },
    { icon: Twitter, href: 'https://twitter.com/SmmShaman', label: 'Twitter', username: 'SmmShaman', color: '#1DA1F2' },
    { icon: TikTokIcon, href: 'https://tiktok.com/@stuardbmw', label: 'TikTok', username: '@stuardbmw', color: '#ff0050' },
    { icon: SnapchatIcon, href: 'https://snapchat.com/add/smmshaman', label: 'Snapchat', username: 'smmshaman', color: '#FFFC00' },
  ];

  const { userLocation, weather, distance, error } = footerData;

  // Text colors based on mobile/desktop
  const textPrimary = isMobile ? 'text-gray-700' : ''
  const textSecondary = isMobile ? 'text-gray-600' : ''
  const textAccent = isMobile ? 'text-gray-900' : ''
  const hoverBg = isMobile ? 'hover:bg-gray-100 active:bg-gray-200' : 'hover:bg-white/10 active:bg-white/20'

  // Desktop refined colors (Aurora Borealis)
  const dPrimary = 'rgba(255, 255, 255, 0.93)'
  const dSecondary = 'rgba(200, 230, 220, 0.7)'
  const dAccent = 'rgba(255, 255, 255, 0.95)'

  return (
    <footer className="h-full w-full flex items-center overflow-y-auto">
      <div
        className={`max-w-6xl mx-auto rounded-xl sm:rounded-2xl w-full ${
          isMobile ? 'border-black/10' : ''
        }`}
        style={isMobile ? {
          background: 'transparent',
        } : {
          background: 'linear-gradient(135deg, rgba(15, 76, 129, 0.7) 0%, rgba(102, 126, 234, 0.6) 25%, rgba(118, 75, 162, 0.55) 50%, rgba(0, 155, 119, 0.45) 75%, rgba(15, 76, 129, 0.65) 100%)',
          backdropFilter: 'blur(14px) saturate(1.6)',
          WebkitBackdropFilter: 'blur(14px) saturate(1.6)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          boxShadow: '0 4px 24px rgba(15, 76, 129, 0.2), inset 0 1px 0 rgba(0, 155, 119, 0.08), inset 0 -1px 0 rgba(15, 76, 129, 0.12)',
        }}
      >
        <div className="h-full flex flex-col justify-center px-3 sm:px-4 md:px-6 py-2">
          {/* Top row: Clock, Weather Info, Social Icons */}
          <div className="flex items-center justify-between gap-4">
            {/* Left: Clock */}
            <div
              className={`${textPrimary} font-mono flex-shrink-0 flex items-center`}
              style={{ fontSize: 'clamp(0.75rem, 1.5vw, 1rem)', ...(!isMobile && { color: dPrimary }) }}
            >
              {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })}
            </div>

            {/* Center: Weather & Location Info */}
            <motion.div
              className="flex-1 flex items-center justify-center gap-3 overflow-hidden min-h-[24px]"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              {isLoading ? (
                <div className={`${textSecondary} text-xs sm:text-sm flex items-center`} style={!isMobile ? { color: dSecondary } : undefined}>{t('footer_loading' as any)}</div>
              ) : error ? (
                <div className={`${textSecondary} text-xs sm:text-sm flex items-center`} style={!isMobile ? { color: dSecondary } : undefined}>{error}</div>
              ) : (
                <div className="flex items-center gap-3 flex-wrap justify-center">
                  {/* Weather text */}
                  {weather && userLocation && (
                    <div
                      className={`${textAccent} text-center flex items-center`}
                      style={{ fontSize: 'clamp(0.7rem, 1.2vw, 0.9rem)', ...(!isMobile && { color: dAccent }) }}
                    >
                      {t('footer_weather_in' as any)} <span className="font-semibold ml-1">{userLocation.city}</span>{' '}
                      {weather.temperature > 0 ? '+' : ''}
                      {weather.temperature}°C, {weather.description} {weather.emoji}
                    </div>
                  )}

                  {/* Distance */}
                  {distance !== null && (
                    <div
                      className={`${textAccent} flex items-center`}
                      style={{ fontSize: 'clamp(0.7rem, 1.2vw, 0.9rem)', ...(!isMobile && { color: dAccent }) }}
                    >
                      {distance.toLocaleString()} {t('footer_distance_from_me' as any)}
                    </div>
                  )}
                </div>
              )}
            </motion.div>

            {/* Right: Contact label + Email + Social Icons */}
            <div className="flex items-center gap-0.5 sm:gap-1 flex-shrink-0">
              {/* Contact label */}
              <span className={`${textSecondary} text-[9px] sm:text-[10px] mr-1 hidden md:inline`} style={!isMobile ? { color: dSecondary } : undefined}>
                {t('footer_contact_me')}
              </span>
              {/* Email Button */}
              <button
                onClick={openEmailModal}
                className={`${hoverBg} transition-all duration-300 cursor-pointer p-2 sm:p-1.5 min-w-[36px] min-h-[36px] sm:min-w-[32px] sm:min-h-[32px] flex items-center justify-center rounded-lg hover:scale-110`}
                aria-label="Send Email"
                onMouseEnter={() => setSelectedSocial('Email')}
                onMouseLeave={() => setSelectedSocial(null)}
              >
                <Mail className="w-4 h-4 sm:w-4 sm:h-4" style={{
                  color: !isMobile && selectedSocial === 'Email' ? '#EA4335' : (isMobile ? '#EA4335' : 'rgba(255, 255, 255, 0.65)'),
                  filter: !isMobile && selectedSocial === 'Email' ? 'drop-shadow(0 0 8px rgba(234, 67, 53, 0.25))' : 'none',
                  transition: 'color 0.3s ease, filter 0.3s ease',
                }} />
              </button>

              {/* Divider */}
              <div
                className="w-px h-5 mx-1.5"
                style={!isMobile ? {
                  background: 'linear-gradient(180deg, transparent 0%, rgba(251, 191, 36, 0.45) 30%, rgba(0, 155, 119, 0.35) 70%, transparent 100%)',
                } : {
                  background: '#d1d5db',
                }}
              />

              {/* Social Icons */}
              {socialLinks.map((social) => {
                const Icon = social.icon;
                return (
                  <button
                    key={social.label}
                    onClick={() => handleSocialClick(social)}
                    className={`${hoverBg} transition-all duration-300 cursor-pointer p-2 sm:p-1.5 min-w-[36px] min-h-[36px] sm:min-w-[32px] sm:min-h-[32px] flex items-center justify-center rounded-lg hover:scale-110`}
                    style={!isMobile && selectedSocial === social.label ? {
                      backgroundColor: `${social.color}15`,
                      boxShadow: `0 0 12px ${social.color}20`,
                    } : undefined}
                    aria-label={social.label}
                    onMouseEnter={() => setSelectedSocial(social.label)}
                    onMouseLeave={() => setSelectedSocial(null)}
                  >
                    <Icon className="w-4 h-4 sm:w-4 sm:h-4" style={{
                      color: !isMobile && selectedSocial === social.label ? social.color : (isMobile ? social.color : 'rgba(255, 255, 255, 0.65)'),
                      filter: !isMobile && selectedSocial === social.label ? `drop-shadow(0 0 8px ${social.color}25)` : 'none',
                      transition: 'color 0.3s ease, filter 0.3s ease',
                    }} />
                  </button>
                );
              })}
            </div>
          </div>

          {/* Bottom row: Selected social info - fixed height to prevent layout shift */}
          <div className="h-4 flex items-center justify-center">
            <AnimatePresence mode="wait">
              {selectedSocial && (
                <motion.div
                  key={selectedSocial}
                  className={`text-center ${textSecondary} text-xs`}
                  style={!isMobile ? { color: dSecondary } : undefined}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.15 }}
                >
                  {selectedSocial === 'Email'
                    ? CONTACT_EMAIL
                    : (() => {
                        const s = socialLinks.find((s) => s.label === selectedSocial);
                        return s ? `${s.label}: ${s.username}` : '';
                      })()}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Business info & cookie links */}
          <div className="flex items-center justify-center gap-1.5 mt-1 flex-wrap">
            <span className="text-[9px] tracking-wide" style={{ color: 'rgba(180, 200, 210, 0.45)' }}>
              BERBEHA · 932 905 736 · Hagegata 8, Lena
            </span>
            <span className="text-[9px]" style={{ color: 'rgba(180, 200, 210, 0.2)' }}>|</span>
            <button
              onClick={handleOpenCookieSettings}
              className="text-[9px] hover:underline transition-colors cursor-pointer bg-transparent border-none"
              style={{ color: 'rgba(200, 230, 220, 0.5)' }}
              onMouseEnter={(e) => e.currentTarget.style.color = '#34d399'}
              onMouseLeave={(e) => e.currentTarget.style.color = 'rgba(200, 230, 220, 0.5)'}
            >
              Cookies
            </button>
            <span className="text-[9px]" style={{ color: 'rgba(180, 200, 210, 0.2)' }}>|</span>
            <a
              href="/informasjonskapsler"
              className="text-[9px] hover:underline transition-colors"
              style={{ color: 'rgba(200, 230, 220, 0.5)' }}
              onMouseEnter={(e) => e.currentTarget.style.color = '#34d399'}
              onMouseLeave={(e) => e.currentTarget.style.color = 'rgba(200, 230, 220, 0.5)'}
            >
              Erklæring
            </a>
          </div>
        </div>
      </div>

      {/* Social Link Modal */}
      <AnimatePresence>
        {modalSocial && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
            onClick={closeModal}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full mx-4"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                    <modalSocial.icon className="w-5 h-5" style={{ color: modalSocial.color }} />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900">{modalSocial.label}</h3>
                    <p className="text-sm text-gray-500">{modalSocial.username}</p>
                  </div>
                </div>
                <button
                  onClick={closeModal}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* QR Code / Snapcode */}
              <div className="flex justify-center mb-4">
                <div className={`${modalSocial.label === 'Snapchat' ? 'bg-[#FFFC00] p-2' : 'bg-white p-3'} rounded-xl shadow-inner border border-gray-100`}>
                  <img
                    src={modalSocial.label === 'Snapchat' ? '/snapcode.png' : `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(modalSocial.href)}&format=svg`}
                    alt={modalSocial.label === 'Snapchat' ? 'Snapcode' : `QR Code for ${modalSocial.label}`}
                    width={150}
                    height={150}
                    className="rounded-lg"
                  />
                </div>
              </div>

              {/* URL Display */}
              <div className="bg-gray-100 rounded-lg p-3 mb-4">
                <p className="text-xs text-gray-500 mb-1">URL</p>
                <p className="text-sm text-gray-800 font-mono break-all">{modalSocial.href}</p>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2">
                <button
                  onClick={() => handleCopyLink(modalSocial.href)}
                  className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-medium transition-all ${
                    copied
                      ? 'bg-green-500 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
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
                      Copy Link
                    </>
                  )}
                </button>
                <a
                  href={modalSocial.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-medium bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:from-purple-600 hover:to-pink-600 transition-all"
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
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
            onClick={closeEmailModal}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="bg-white rounded-2xl shadow-2xl p-6 max-w-md w-full mx-4"
              onClick={(e) => e.stopPropagation()}
            >
              {emailSent ? (
                // Success state
                <div className="text-center py-4">
                  <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
                    <Check className="w-8 h-8 text-green-500" />
                  </div>
                  <h3 className="font-bold text-gray-900 text-lg mb-2">Message Sent!</h3>
                  <p className="text-gray-500 text-sm mb-4">
                    Thank you for your message. We will get back to you soon.
                  </p>
                  <button
                    onClick={closeEmailModal}
                    className="px-6 py-2.5 rounded-lg font-medium bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:from-purple-600 hover:to-pink-600 transition-all"
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
                        <h3 className="font-bold text-gray-900">Send Email</h3>
                        <p className="text-sm text-gray-500">Contact Vitalii</p>
                      </div>
                    </div>
                    <button
                      onClick={closeEmailModal}
                      className="text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  {/* Email Address Display */}
                  <div className="bg-gray-100 rounded-lg p-3 mb-4 flex items-center justify-between">
                    <div>
                      <p className="text-xs text-gray-500 mb-0.5">To:</p>
                      <p className="text-sm text-gray-800 font-mono">{CONTACT_EMAIL}</p>
                    </div>
                    <button
                      onClick={handleCopyEmail}
                      className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                        emailCopied
                          ? 'bg-green-500 text-white'
                          : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
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
                      <label className="block text-xs text-gray-500 mb-1">Your Email</label>
                      <input
                        type="email"
                        name="senderEmail"
                        value={emailForm.senderEmail}
                        onChange={handleEmailFormChange}
                        placeholder="your@email.com"
                        className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 outline-none transition-all text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Subject</label>
                      <input
                        type="text"
                        name="subject"
                        value={emailForm.subject}
                        onChange={handleEmailFormChange}
                        placeholder="What's this about?"
                        className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 outline-none transition-all text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Message</label>
                      <textarea
                        name="message"
                        value={emailForm.message}
                        onChange={handleEmailFormChange}
                        placeholder="Write your message here..."
                        rows={4}
                        className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 outline-none transition-all text-sm resize-none"
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
                      className="flex-1 px-4 py-2.5 rounded-lg font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 transition-all"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSendEmail}
                      disabled={isSending || !emailForm.message.trim() || !emailForm.senderEmail.trim()}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-medium bg-gradient-to-r from-blue-500 to-cyan-500 text-white hover:from-blue-600 hover:to-cyan-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
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
    </footer>
  );
};
