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
              className="text-content-secondary font-comfortaa mt-0.5"
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
                    ? 'bg-brand text-white'
                    : searchOpen
                      ? 'bg-surface/80 text-content-secondary'
                      : 'bg-surface/70 text-content-muted'
                }`}
                aria-label="Search"
              >
                <Search className="w-3.5 h-3.5" />
                {/* Static dot indicator when search has a query */}
                {searchQuery.trim() && (
                  <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-amber-400 border border-surface" />
                )}
              </button>
              <AnimatePresence>
                {searchOpen && (
                  <motion.div
                    initial={{ scaleX: 0, opacity: 0 }}
                    animate={{ scaleX: 1, opacity: 1 }}
                    exit={{ scaleX: 0, opacity: 0 }}
                    transition={{ duration: 0.25, ease: 'easeOut' }}
                    className="absolute left-8 top-1/2 -translate-y-1/2 w-40 origin-left"
                  >
                    <input
                      ref={searchInputRef}
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onBlur={handleSearchBlur}
                      onKeyDown={handleSearchKeyDown}
                      placeholder={t('search_placeholder_short') as string}
                      className="w-full px-2 py-1 rounded-lg bg-surface text-content text-xs placeholder-content-faint border border-surface-border shadow-lg backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-brand-light"
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
                className={`min-w-[36px] min-h-[36px] flex items-center justify-center rounded text-xs font-semibold transition-all ${
                  currentLanguage === lang
                    ? 'bg-brand text-white shadow-[0_0_8px_rgba(99,102,241,0.4)]'
                    : 'bg-surface/70 text-content-faint'
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
              <div className="flex items-baseline gap-2">
                <h1
                  className="font-bold text-red-500 font-comfortaa"
                  style={{
                    fontSize: 'var(--text-display)',
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
                  fontSize="var(--text-heading)"
                  fontWeight="600"
                />
              </div>
              {/* Second line: Description with liquid fill - LEFT to RIGHT */}
              <HeroTextAnimation
                text={t('description') as string}
                fillColor={fillColor}
                isActive={isActive}
                direction="ltr"
                fontSize="var(--text-subheading)"
                fontWeight="400"
              />
            </div>
          )}
        </motion.div>

        {/* Search + Language Switcher */}
        <div className="flex items-center gap-1 flex-shrink-0 ml-2">
          {/* Search — before lang buttons, input expands right */}
          <div className="relative z-20">
            <button
              onClick={handleSearchToggle}
              className={`relative z-10 p-1.5 rounded-lg transition-all duration-300 ${
                searchQuery.trim()
                  ? 'bg-brand text-white'
                  : searchOpen
                    ? 'bg-surface/80 text-content-secondary'
                    : 'bg-surface/70 text-content-muted hover:bg-surface/90'
              }`}
              aria-label="Search"
            >
              <Search className="w-4 h-4" />
              {/* Static dot indicator when search has a query */}
              {searchQuery.trim() && (
                <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-amber-400 border border-surface" />
              )}
            </button>
            <AnimatePresence>
              {searchOpen && (
                <motion.div
                  initial={{ scaleX: 0, opacity: 0 }}
                  animate={{ scaleX: 1, opacity: 1 }}
                  exit={{ scaleX: 0, opacity: 0 }}
                  transition={{ duration: 0.3, ease: 'easeOut' }}
                  className="absolute left-10 top-1/2 -translate-y-1/2 w-[250px] origin-left"
                >
                  <input
                    ref={searchInputRef}
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onBlur={handleSearchBlur}
                    onKeyDown={handleSearchKeyDown}
                    placeholder={t('search_placeholder_short') as string}
                    className="w-full px-3 py-1.5 rounded-lg bg-surface text-content text-sm placeholder-content-faint border border-surface-border shadow-lg backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-brand-light focus:border-brand-light"
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
              className="p-1.5 rounded-lg transition-all duration-300 bg-surface/70 text-content-muted hover:bg-surface/90 hover:text-content-secondary"
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
              className={`px-2 py-1 rounded-md transition-all duration-300 font-semibold text-xs ${
                currentLanguage === lang
                  ? 'bg-brand text-white border border-brand-light shadow-[0_0_8px_rgba(99,102,241,0.35)]'
                  : 'bg-surface/70 text-content-faint hover:bg-surface/90 hover:text-content border border-transparent'
              }`}
              aria-label={`Switch to ${lang}`}
            >
              {lang}
            </button>
          ))}
        </div>
      </motion.div>
    </header>
  );
};
