'use client'

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Globe, Search, Pause, Play } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useTranslations, type Language } from '@/contexts/TranslationContext';
import { heroContrastColors } from '@/components/sections/BentoGrid';
import { HeroTextAnimation } from '@/components/ui/HeroTextAnimation';
import { useIsMobile } from '@/hooks/useIsMobile';

interface HeaderProps {
  isCompact?: boolean;
  hoveredSection?: string | null;
}

export const Header = ({ isCompact = false, hoveredSection = null }: HeaderProps) => {
  const { t, currentLanguage, setCurrentLanguage } = useTranslations();
  const isMobile = useIsMobile();
  const router = useRouter();

  // Search state
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Marquee pause/play
  const [marqueePaused, setMarqueePaused] = useState(false);

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail) setMarqueePaused(detail.paused);
    };
    window.addEventListener('marquee-state', handler);
    return () => window.removeEventListener('marquee-state', handler);
  }, []);

  const handleSearchToggle = () => {
    if (searchOpen && searchQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
      setSearchOpen(false);
      setSearchQuery('');
    } else {
      setSearchOpen(true);
      setTimeout(() => searchInputRef.current?.focus(), 100);
    }
  };

  const handleSearchBlur = () => {
    if (!searchQuery.trim()) {
      setTimeout(() => setSearchOpen(false), 150);
    }
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && searchQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
      setSearchOpen(false);
      setSearchQuery('');
    }
    if (e.key === 'Escape') {
      setSearchOpen(false);
      setSearchQuery('');
    }
  };

  // Debounced state for smooth transitions between sections
  const [debouncedSection, setDebouncedSection] = useState<string | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const previousSectionRef = useRef<string | null>(null);

  useEffect(() => {
    // Clear any existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    if (hoveredSection === null) {
      // When leaving all sections, start fade out immediately
      setIsTransitioning(true);
      timeoutRef.current = setTimeout(() => {
        setDebouncedSection(null);
        setIsTransitioning(false);
      }, 300); // Short delay for fade out
    } else if (previousSectionRef.current !== null && previousSectionRef.current !== hoveredSection) {
      // When switching between sections, briefly reset then apply new color
      setIsTransitioning(true);
      timeoutRef.current = setTimeout(() => {
        setDebouncedSection(hoveredSection);
        setIsTransitioning(false);
      }, 150); // Quick transition between sections
    } else {
      // First hover or same section
      setDebouncedSection(hoveredSection);
      setIsTransitioning(false);
    }

    previousSectionRef.current = hoveredSection;

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [hoveredSection]);

  // Get the contrasting color for Hero text fill effect
  const getContrastColor = () => {
    if (!debouncedSection) return null;
    return heroContrastColors[debouncedSection] || null;
  };

  const fillColor = getContrastColor();
  const isActive = !!(debouncedSection && !isTransitioning);

  const languages: Language[] = ['NO', 'EN', 'UA'];

  // Mobile-specific header layout
  if (isMobile) {
    return (
      <header className="w-full">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <h1
              className="font-bold text-red-500 font-comfortaa"
              style={{
                fontSize: '1.25rem',
                textShadow: '2px 2px 4px rgba(0, 0, 0, 0.5)',
                lineHeight: '1.3'
              }}
            >
              {t('title')}
            </h1>
            <p
              className="text-[#C8C5D6] font-comfortaa mt-0.5"
              style={{
                fontSize: '0.75rem',
                fontWeight: '600',
                lineHeight: '1.4'
              }}
            >
              {t('subtitle')}
            </p>
          </div>
          {/* Search + compact language buttons */}
          <div className="flex items-center gap-1 flex-shrink-0">
            {/* Search — before lang buttons, expands right */}
            <div className="relative z-20">
              <button
                onClick={handleSearchToggle}
                className={`relative z-10 p-1.5 rounded-lg transition-all duration-300 ${
                  searchQuery.trim()
                    ? 'bg-[#6366F1] text-white animate-pulse'
                    : searchOpen
                      ? 'bg-[#1A1730]/80 text-[#C8C5D6]'
                      : 'bg-[#1A1730]/70 text-[#9B97B0]'
                }`}
                aria-label="Search"
              >
                <Search className="w-3.5 h-3.5" />
              </button>
              <AnimatePresence>
                {searchOpen && (
                  <motion.div
                    initial={{ width: 0, opacity: 0 }}
                    animate={{ width: 160, opacity: 1 }}
                    exit={{ width: 0, opacity: 0 }}
                    transition={{ duration: 0.25, ease: 'easeOut' }}
                    className="absolute left-8 top-1/2 -translate-y-1/2 overflow-hidden"
                  >
                    <input
                      ref={searchInputRef}
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onBlur={handleSearchBlur}
                      onKeyDown={handleSearchKeyDown}
                      placeholder={t('search_placeholder_short') as string}
                      className="w-full px-2 py-1 rounded-lg bg-[#1A1730] text-[#EEEDF5] text-xs placeholder-[#6B6680] border border-[#2D2A40] shadow-lg backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-[#6366F1]/40"
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            {/* Language buttons */}
            {languages.map((lang) => (
              <button
                key={lang}
                onClick={() => setCurrentLanguage(lang)}
                className={`px-2 py-1 rounded text-xs font-semibold transition-all ${
                  currentLanguage === lang
                    ? 'bg-[#6366F1]/80 text-white'
                    : 'bg-[#1A1730]/70 text-[#C8C5D6]'
                }`}
              >
                {lang}
              </button>
            ))}
          </div>
        </div>
      </header>
    );
  }

  // Desktop layout (original)
  return (
    <header className="w-full flex items-start">
      {/* Container wrapper for consistent width with BentoGrid */}
      <motion.div
        className="max-w-7xl mx-auto w-full flex items-center justify-between"
        transition={{ duration: 0.3 }}
      >
        {/* Title Section - Always visible */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{
            opacity: 1,
            x: 0,
          }}
          transition={{ duration: 0.3 }}
          className="text-white flex-1"
        >
          {isCompact ? (
            // Compact version for fullscreen
            <div
              className="font-semibold"
              style={{
                fontSize: 'clamp(0.875rem, 1.5vw, 1.125rem)',
                textShadow: '2px 2px 4px rgba(0, 0, 0, 0.5)'
              }}
            >
              <span className="font-bold text-red-500">Vitalii Berbeha</span>
              <span className="hidden sm:inline"> - {t('subtitle')}</span>
            </div>
          ) : (
            // Full version for normal state
            <div className="space-y-1">
              {/* First line: Name + Subtitle */}
              <div className="flex items-baseline gap-2 overflow-hidden">
                <h1
                  className="font-bold text-red-500 font-comfortaa"
                  style={{
                    fontSize: 'clamp(1.5rem, 3vw, 2.5rem)',
                    textShadow: '1px 1px 3px rgba(79, 70, 229, 0.3)',
                    lineHeight: '1.2'
                  }}
                >
                  {t('title')}
                </h1>
                {/* Subtitle with liquid fill animation - RIGHT to LEFT */}
                <HeroTextAnimation
                  text={t('subtitle') as string}
                  fillColor={fillColor}
                  isActive={isActive}
                  direction="rtl"
                  fontSize="clamp(1rem, 1.7vw, 1.5rem)"
                  fontWeight="600"
                />
              </div>
              {/* Second line: Description with liquid fill - LEFT to RIGHT */}
              <HeroTextAnimation
                text={t('description') as string}
                fillColor={fillColor}
                isActive={isActive}
                direction="ltr"
                fontSize="clamp(0.95rem, 1.4vw, 1.35rem)"
                fontWeight="400"
              />
            </div>
          )}
        </motion.div>

        {/* Search + Language Switcher */}
        <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0 ml-6 sm:ml-8">
          {/* Search — before lang buttons, input expands right */}
          <div className="relative z-20">
            <button
              onClick={handleSearchToggle}
              className={`relative z-10 p-2 rounded-lg transition-all duration-300 ${
                searchQuery.trim()
                  ? 'bg-[#6366F1] text-white animate-pulse'
                  : searchOpen
                    ? 'bg-[#1A1730]/80 text-[#C8C5D6]'
                    : 'bg-[#1A1730]/70 text-[#9B97B0] hover:bg-[#1A1730]/90'
              }`}
              aria-label="Search"
            >
              <Search className="w-4 h-4" />
            </button>
            <AnimatePresence>
              {searchOpen && (
                <motion.div
                  initial={{ width: 0, opacity: 0 }}
                  animate={{ width: 250, opacity: 1 }}
                  exit={{ width: 0, opacity: 0 }}
                  transition={{ duration: 0.3, ease: 'easeOut' }}
                  className="absolute left-10 top-1/2 -translate-y-1/2 overflow-hidden"
                >
                  <input
                    ref={searchInputRef}
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onBlur={handleSearchBlur}
                    onKeyDown={handleSearchKeyDown}
                    placeholder={t('search_placeholder_short') as string}
                    className="w-full px-3 py-1.5 rounded-lg bg-[#1A1730] text-[#EEEDF5] text-sm placeholder-[#6B6680] border border-[#2D2A40] shadow-lg backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-[#6366F1]/40 focus:border-[#6366F1]"
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          {/* Marquee pause/play */}
          {!isMobile && (
            <button
              onClick={() => {
                window.dispatchEvent(new CustomEvent('marquee-toggle'));
                setMarqueePaused(p => !p);
              }}
              className="p-2 rounded-lg transition-all duration-300 bg-[#1A1730]/70 text-[#9B97B0] hover:bg-[#1A1730]/90 hover:text-[#C8C5D6]"
              aria-label={marqueePaused ? 'Play features marquee' : 'Pause features marquee'}
            >
              {marqueePaused
                ? <Play className="w-4 h-4" />
                : <Pause className="w-4 h-4" />
              }
            </button>
          )}
          {/* Language buttons */}
          {languages.map((lang) => (
            <button
              key={lang}
              onClick={() => setCurrentLanguage(lang)}
              className={`flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1.5 sm:py-2 rounded-md transition-all duration-300 ${
                currentLanguage === lang
                  ? 'bg-[#221F3A]/80 text-[#EEEDF5] border border-[#2D2A40]'
                  : 'bg-[#1A1730]/70 text-[#C8C5D6] hover:bg-[#1A1730]/90 hover:text-[#EEEDF5] border border-[#2D2A40]'
              }`}
              aria-label={`Switch to ${lang}`}
            >
              <Globe className="w-3 h-3 sm:w-4 sm:h-4" />
              <span className="font-semibold text-xs sm:text-sm">{lang}</span>
            </button>
          ))}
        </div>
      </motion.div>
    </header>
  );
};
