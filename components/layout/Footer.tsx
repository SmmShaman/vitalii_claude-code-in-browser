'use client'

import { useState, useEffect } from 'react';
import { Twitter, Facebook, Send, Instagram, Linkedin, Github, X, Copy, ExternalLink, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { fetchFooterData } from '@/utils/footerApi';
import type { FooterData } from '@/utils/footerApi';
import { useTranslations } from '@/contexts/TranslationContext';

interface SocialLink {
  icon: React.ComponentType<{ className?: string }>;
  href: string;
  label: string;
  username: string;
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

  const socialLinks: SocialLink[] = [
    { icon: Instagram, href: 'https://instagram.com/smmshaman', label: 'Instagram', username: '@smmshaman' },
    { icon: Send, href: 'https://t.me/smmshaman', label: 'Telegram', username: 'SmmShaman' },
    { icon: Facebook, href: 'https://facebook.com/smm.shaman', label: 'Facebook', username: 'smm.shaman' },
    { icon: Linkedin, href: 'https://linkedin.com/in/smmshaman', label: 'LinkedIn', username: 'smmshaman' },
    { icon: Github, href: 'https://github.com/SmmShaman', label: 'GitHub', username: 'SmmShaman' },
    { icon: Twitter, href: 'https://twitter.com/SmmShaman', label: 'Twitter', username: 'SmmShaman' },
    { icon: TikTokIcon, href: 'https://tiktok.com/@stuardbmw', label: 'TikTok', username: '@stuardbmw' },
  ];

  const { userLocation, weather, distance, error } = footerData;

  return (
    <footer className="h-full w-full flex items-center overflow-y-auto">
      <div
        className="max-w-6xl mx-auto rounded-xl sm:rounded-2xl shadow-2xl border border-black/20 w-full"
        style={{
          background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.8) 0%, rgba(118, 75, 162, 0.8) 100%)',
          backdropFilter: 'blur(2px)',
        }}
      >
        <div className="h-full flex flex-col justify-center px-3 sm:px-4 md:px-6 py-2">
          {/* Top row: Clock, Weather Info, Social Icons */}
          <div className="flex items-center justify-between gap-4 mb-2">
            {/* Left: Clock */}
            <div
              className="text-white/80 font-mono flex-shrink-0 flex items-center"
              style={{ fontSize: 'clamp(0.75rem, 1.5vw, 1rem)' }}
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
                <div className="text-white/60 text-xs sm:text-sm flex items-center">{t('footer_loading' as any)}</div>
              ) : error ? (
                <div className="text-white/60 text-xs sm:text-sm flex items-center">{error}</div>
              ) : (
                <div className="flex items-center gap-3 flex-wrap justify-center">
                  {/* Weather text */}
                  {weather && userLocation && (
                    <div
                      className="text-white/90 text-center flex items-center"
                      style={{ fontSize: 'clamp(0.7rem, 1.2vw, 0.9rem)' }}
                    >
                      {t('footer_weather_in' as any)} <span className="font-semibold ml-1">{userLocation.city}</span>{' '}
                      {weather.temperature > 0 ? '+' : ''}
                      {weather.temperature}°C, {weather.description} {weather.emoji}
                    </div>
                  )}

                  {/* Distance */}
                  {distance !== null && (
                    <div
                      className="text-white/90 flex items-center"
                      style={{ fontSize: 'clamp(0.7rem, 1.2vw, 0.9rem)' }}
                    >
                      {distance.toLocaleString()} {t('footer_distance_from_me' as any)}
                    </div>
                  )}
                </div>
              )}
            </motion.div>

            {/* Right: Social Icons */}
            <div className="flex items-center gap-2 flex-shrink-0">
              {socialLinks.map((social) => {
                const Icon = social.icon;
                return (
                  <button
                    key={social.label}
                    onClick={() => handleSocialClick(social)}
                    className="text-white/80 hover:text-white transition-colors duration-300 cursor-pointer"
                    aria-label={social.label}
                    onMouseEnter={() => setSelectedSocial(social.label)}
                    onMouseLeave={() => setSelectedSocial(null)}
                  >
                    <Icon className="w-3 h-3 sm:w-4 sm:h-4" />
                  </button>
                );
              })}
            </div>
          </div>

          {/* Bottom row: Selected social info */}
          {selectedSocial && (
            <motion.div
              className="text-center text-white/70 text-xs"
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
            >
              {socialLinks.find((s) => s.label === selectedSocial)?.username}
            </motion.div>
          )}
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
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                    <modalSocial.icon className="w-5 h-5 text-white" />
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
    </footer>
  );
};
