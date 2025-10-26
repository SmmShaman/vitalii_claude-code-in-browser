import { useState, useEffect } from 'react';
import { Twitter, Facebook, Send, Instagram, Linkedin, MapPin } from 'lucide-react';
import { motion } from 'framer-motion';
import { fetchFooterData } from '../../utils/footerApi';
import type { FooterData } from '../../utils/footerApi';
import { InteractiveMap } from '../ui/InteractiveMap';
import { WeatherAvatar } from '../ui/WeatherAvatar';
import { useTranslations } from '../../contexts/TranslationContext';

export const Footer = () => {
  const { t } = useTranslations();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [footerData, setFooterData] = useState<FooterData>({
    userLocation: null,
    weather: null,
    distance: null,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [showMap, setShowMap] = useState(false);

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
      const data = await fetchFooterData();
      setFooterData(data);
      setIsLoading(false);
    };

    loadData();
  }, []);

  const socialLinks = [
    { icon: Twitter, href: 'https://twitter.com', label: 'Twitter' },
    { icon: Facebook, href: 'https://facebook.com', label: 'Facebook' },
    { icon: Send, href: 'https://t.me', label: 'Telegram' },
    { icon: Instagram, href: 'https://instagram.com', label: 'Instagram' },
    { icon: Linkedin, href: 'https://linkedin.com', label: 'LinkedIn' },
  ];

  const { userLocation, weather, distance, error } = footerData;

  return (
    <footer className="h-full w-full px-2 sm:px-4 flex items-center overflow-y-auto">
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
                <div className="text-white/60 text-xs sm:text-sm">{t('footer_loading')}</div>
              ) : error ? (
                <div className="text-white/60 text-xs sm:text-sm">{t('footer_error')}</div>
              ) : (
                <div className="flex items-center gap-3 flex-wrap justify-center">
                  {/* Weather text */}
                  {weather && userLocation && (
                    <div
                      className="text-white/90 text-center"
                      style={{ fontSize: 'clamp(0.7rem, 1.2vw, 0.9rem)' }}
                    >
                      {t('footer_weather_in')} <span className="font-semibold">{userLocation.city}</span>{' '}
                      {weather.temperature > 0 ? '+' : ''}
                      {weather.temperature}°C, {t(weather.translationKey as any)} {weather.emoji}
                    </div>
                  )}

                  {/* Distance */}
                  {distance !== null && (
                    <button
                      onClick={() => setShowMap(!showMap)}
                      className="flex items-center gap-1 text-white/90 hover:text-white transition-colors bg-white/10 hover:bg-white/20 rounded-full px-2 py-1"
                      style={{ fontSize: 'clamp(0.7rem, 1.2vw, 0.9rem)' }}
                    >
                      <MapPin className="w-3 h-3" />
                      <span>
                        {distance.toLocaleString()} {t('footer_distance_from_me')}
                      </span>
                    </button>
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
                >
                  <Icon className="w-3 h-3 sm:w-4 sm:h-4" />
                </a>
              ))}
            </div>
          </div>

          {/* Bottom row: Map & Avatar (expandable) */}
          {showMap && (
            <motion.div
              className="flex items-center gap-4 mt-2"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              {/* Map */}
              <div className="flex-1">
                <InteractiveMap userLocation={userLocation} className="h-48" />
              </div>

              {/* Avatar */}
              <div className="flex-shrink-0 flex flex-col items-center gap-2">
                <WeatherAvatar weather={weather} />
                <div
                  className="text-white/70 text-center"
                  style={{ fontSize: 'clamp(0.65rem, 1vw, 0.8rem)' }}
                >
                  📍 {t('footer_author_location')}
                </div>
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </footer>
  );
};
