'use client'

import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Globe } from 'lucide-react';
import { useTranslations, type Language } from '@/contexts/TranslationContext';
import { sectionNeonColors, oppositeSections } from '@/components/sections/BentoGrid';
import { HeroTextAnimation } from '@/components/ui/HeroTextAnimation';

interface HeaderProps {
  isCompact?: boolean;
  hoveredSection?: string | null;
}

export const Header = ({ isCompact = false, hoveredSection = null }: HeaderProps) => {
  const { t, currentLanguage, setCurrentLanguage } = useTranslations();

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

  // Get the opposite section's color for text fill effect
  const getOppositeColor = () => {
    if (!debouncedSection) return null;
    const oppositeSection = oppositeSections[debouncedSection];
    return oppositeSection ? sectionNeonColors[oppositeSection]?.primary : null;
  };

  const fillColor = getOppositeColor();
  const isActive = !!(debouncedSection && !isTransitioning);

  const languages: Language[] = ['NO', 'EN', 'UA'];

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
              <span className="font-bold text-amber-400">Vitalii Berbeha</span>
              <span className="hidden sm:inline"> - {t('subtitle')}</span>
            </div>
          ) : (
            // Full version for normal state
            <div className="space-y-1">
              {/* First line: Name + Subtitle */}
              <div className="flex flex-wrap items-baseline gap-2">
                <h1
                  className="font-bold text-amber-400 font-comfortaa"
                  style={{
                    fontSize: 'clamp(1.5rem, 3vw, 2.5rem)',
                    textShadow: '2px 2px 4px rgba(0, 0, 0, 0.5)',
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
                  fontSize="clamp(0.875rem, 1.5vw, 1.25rem)"
                  fontWeight="600"
                />
              </div>
              {/* Second line: Description with liquid fill - LEFT to RIGHT */}
              <HeroTextAnimation
                text={t('description') as string}
                fillColor={fillColor}
                isActive={isActive}
                direction="ltr"
                fontSize="clamp(0.875rem, 1.2vw, 1.125rem)"
                fontWeight="400"
              />
            </div>
          )}
        </motion.div>

        {/* Language Switcher */}
        <div className="flex gap-1 sm:gap-2 flex-shrink-0 ml-4">
          {languages.map((lang) => (
            <button
              key={lang}
              onClick={() => setCurrentLanguage(lang)}
              className={`flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1.5 sm:py-2 rounded-md transition-all duration-300 ${
                currentLanguage === lang
                  ? 'bg-gray-200/80 text-black border border-gray-300'
                  : 'bg-white/70 text-black/70 hover:bg-white/90 hover:text-black border border-gray-200'
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
