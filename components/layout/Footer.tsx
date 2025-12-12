'use client';

import { useState, useEffect } from 'react';
import { Twitter, Facebook, Send, Instagram, Linkedin, Github } from 'lucide-react';
import { motion } from 'framer-motion';
import { fetchFooterData } from '@/utils/footerApi';
import type { FooterData } from '@/utils/footerApi';
import { useTranslations } from '@/contexts/TranslationContext';

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

  const socialLinks = [
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
    <footer className="h-full w-full px-4 flex items-center overflow-y-auto">
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
              className="text-white/80 font-mono flex-shrink-0"
              style={{ fontSize: 'clamp(0.75rem, 1.5vw, 1rem)' }}
            >
              {currentTime.toLocaleTimeString()}
            </div>

            {/* Center: Weather & Location Info */}
            <motion.div
              className="flex-1 flex items-center justify-center gap-3 overflow-hidden"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              {isLoading ? (
                <div className="text-white/60 text-xs sm:text-sm">{t('footer_loading' as any)}</div>
              ) : error ? (
                <div className="text-white/60 text-xs sm:text-sm">{error}</div>
              ) : (
                <div className="flex items-center gap-3 flex-wrap justify-center">
                  {/* Weather text */}
                  {weather && userLocation && (
                    <div
                      className="text-white/90 text-center"
                      style={{ fontSize: 'clamp(0.7rem, 1.2vw, 0.9rem)' }}
                    >
                      {t('footer_weather_in' as any)} <span className="font-semibold">{userLocation.city}</span>{' '}
                      {weather.temperature > 0 ? '+' : ''}
                      {weather.temperature}°C, {weather.description} {weather.emoji}
                    </div>
                  )}

                  {/* Distance */}
                  {distance !== null && (
                    <div
                      className="text-white/90"
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
              {socialLinks.map(({ icon: Icon, href, label }) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-white/80 hover:text-white transition-colors duration-300"
                  aria-label={label}
                  onMouseEnter={() => setSelectedSocial(label)}
                  onMouseLeave={() => setSelectedSocial(null)}
                >
                  <Icon className="w-3 h-3 sm:w-4 sm:h-4" />
                </a>
              ))}
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
    </footer>
  );
};
