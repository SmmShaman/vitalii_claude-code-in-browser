'use client'

import { motion, AnimatePresence } from 'framer-motion';
import { getSkillLogo } from '@/utils/skillLogos';
import { debugLog, debugError } from '@/utils/debug';
import { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { getStoredSkills, convertSkillsForAnimation } from '@/utils/skillsStorage';

interface Skill {
  name: string;
  category?: string;
}

interface SkillsAnimationProps {
  skills: Skill[];
  backgroundText: string;
  isExploding?: boolean;
  gridContainerRef?: React.RefObject<HTMLDivElement | null>;
}

// Color mapping for skill categories
const categoryColors: Record<string, { bg: string; text: string; hover: string }> = {
  development: {
    bg: 'bg-green-900/30',
    text: 'text-green-400',
    hover: 'hover:bg-green-800/40'
  },
  ui: {
    bg: 'bg-purple-900/30',
    text: 'text-purple-400',
    hover: 'hover:bg-purple-800/40'
  },
  ai: {
    bg: 'bg-orange-900/30',
    text: 'text-orange-400',
    hover: 'hover:bg-orange-800/40'
  },
  automation: {
    bg: 'bg-blue-900/30',
    text: 'text-blue-400',
    hover: 'hover:bg-blue-800/40'
  },
  marketing: {
    bg: 'bg-pink-900/30',
    text: 'text-pink-400',
    hover: 'hover:bg-pink-800/40'
  },
  integration: {
    bg: 'bg-cyan-900/30',
    text: 'text-cyan-400',
    hover: 'hover:bg-cyan-800/40'
  },
};

// Shuffle function to randomize skills order
const shuffleArray = <T,>(array: T[]): T[] => {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

export const SkillsAnimation = ({ skills, backgroundText, isExploding = false, gridContainerRef }: SkillsAnimationProps) => {
  const [gridBounds, setGridBounds] = useState<DOMRect | null>(null);
  const [storedSkills, setStoredSkills] = useState<Skill[]>([]);

  // Load skills from localStorage on mount
  useEffect(() => {
    const stored = getStoredSkills();
    const converted = convertSkillsForAnimation(stored);
    setStoredSkills(converted);
  }, []);

  // Use stored skills if available, otherwise use provided skills, then shuffle
  const shuffledSkills = useMemo(() => {
    const skillsToUse = storedSkills.length > 0 ? storedSkills : skills;
    return shuffleArray(skillsToUse);
  }, [storedSkills, skills]);

  debugLog('🎨 SkillsAnimation render:', {
    isExploding,
    hasGridRef: !!gridContainerRef?.current,
    skillsCount: shuffledSkills.length,
    gridBounds
  });

  // Get grid bounds when exploding
  useEffect(() => {
    debugLog('🔄 useEffect triggered:', { isExploding, hasGridRef: !!gridContainerRef?.current });
    if (isExploding && gridContainerRef?.current) {
      const bounds = gridContainerRef.current.getBoundingClientRect();
      debugLog('📐 Grid bounds calculated:', bounds);
      setGridBounds(bounds);
    }
  }, [isExploding, gridContainerRef]);

  const getColorClasses = (category?: string) => {
    return categoryColors[category || 'development'] || categoryColors.development;
  };

  // Calculate evenly distributed positions for logos across grid area
  // Dynamic grid: auto-fit columns/rows based on total skill count
  const getLogoPosition = (index: number, total: number) => {
    if (!gridBounds) {
      debugLog(`Logo ${index}: No gridBounds, using center`);
      return { left: '50%', top: '50%' };
    }

    // Auto-calculate grid dimensions to fit all skills
    const cols = Math.ceil(Math.sqrt(total * (gridBounds.width / gridBounds.height)));
    const rows = Math.ceil(total / cols);

    const col = index % cols;
    const row = Math.floor(index / cols);

    // 15% padding on each side to keep logos within visible area
    const pad = 0.15;
    const usable = 1 - pad * 2;
    const xPercent = cols > 1 ? (col / (cols - 1)) : 0.5;
    const yPercent = rows > 1 ? (row / (rows - 1)) : 0.5;

    const left = gridBounds.left + gridBounds.width * (pad + usable * xPercent);
    const top = gridBounds.top + gridBounds.height * (pad + usable * yPercent);

    const position = { left: `${left}px`, top: `${top}px` };
    if (index === 0) debugLog(`Logo ${index} position:`, position, { col, row, cols, rows });
    return position;
  };

  return (
    <>
      {/* Render explosion animation in portal to escape parent transforms */}
      {isExploding && gridBounds && createPortal(
        <AnimatePresence mode="wait">
          {isExploding && (
          /* Exploding logos view - fixed positioning to cover grid area only */
          <motion.div
            key="logos"
            className="fixed"
            style={{
              left: gridBounds.left,
              top: gridBounds.top,
              width: gridBounds.width,
              height: gridBounds.height,
              zIndex: 100
            }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            onAnimationStart={() => debugLog('💥 Explosion container animation started')}
          >
            {(() => {
              debugLog('🎯 Rendering logos:', { count: shuffledSkills.length, hasGridBounds: !!gridBounds });

              // Don't render logos until we have gridBounds
              if (!gridBounds) {
                debugLog('⏳ Waiting for gridBounds...');
                return null;
              }

              return shuffledSkills.map((skill, index) => {
                const pos = getLogoPosition(index, shuffledSkills.length);
                const centerX = gridBounds.left + gridBounds.width / 2;
                const centerY = gridBounds.top + gridBounds.height / 2;

                // Parse position strings to numbers
                const targetLeft = parseFloat(pos.left);
                const targetTop = parseFloat(pos.top);

                if (index === 0) debugLog('🚀 First logo data:', {
                  skill: skill.name,
                  centerX,
                  centerY,
                  targetLeft,
                  targetTop
                });

                if (index === 0) debugLog('🎬 Animating logo 0 - MOTION CONFIG:', {
                  initialLeft: centerX,
                  initialTop: centerY,
                  animateLeft: targetLeft,
                  animateTop: targetTop
                });

                return (
                <motion.div
                  key={`logo-${skill.name}-${index}`}
                  className="fixed"
                  style={{
                    zIndex: 200 + index
                  }}
                  initial={{
                    left: centerX,
                    top: centerY,
                    x: '-50%',
                    y: '-50%',
                    scale: 0,
                    opacity: 0
                  }}
                  animate={{
                    left: targetLeft,
                    top: targetTop,
                    x: '-50%',
                    y: '-50%',
                    scale: 1,
                    opacity: 1
                  }}
                  exit={{
                    left: centerX,
                    top: centerY,
                    scale: 0,
                    opacity: 0
                  }}
                  transition={{
                    duration: 0.8,
                    delay: index * 0.05,
                    ease: 'easeOut'
                  }}
                  onAnimationStart={() => index === 0 && debugLog('🎬 ANIMATION STARTED for logo 0')}
                  onAnimationComplete={() => index === 0 && debugLog('✅ ANIMATION COMPLETE for logo 0')}
                >
                  <img
                    src={getSkillLogo(skill.name)}
                    alt={skill.name}
                    className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 object-contain"
                    style={{
                      filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.5))'
                    }}
                    onLoad={() => index === 0 && debugLog('First logo image loaded')}
                    onError={() => debugError(`Logo failed to load: ${skill.name}`)}
                  />
                </motion.div>
              );
            });
            })()}
          </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}

      <div className="h-full w-full overflow-hidden relative">
        {/* Background text */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0">
          <h2
            className="font-bold text-white/5 select-none text-center"
            style={{ fontSize: 'clamp(2rem, 5vw, 4.5rem)' }}
          >
            {backgroundText}
          </h2>
        </div>

        <AnimatePresence mode="wait">
          {!isExploding && (
          /* Normal text badges view */
          <motion.div
            key="badges"
            className="relative h-full w-full flex flex-wrap justify-center content-evenly gap-x-1 gap-y-0 z-10 px-2 py-1"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            {shuffledSkills.map((skill, index) => {
              const colors = getColorClasses(skill.category);
              return (
                <motion.div
                  key={`badge-${index}`}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{
                    duration: 0.3,
                    delay: index * 0.03,
                    ease: 'easeOut'
                  }}
                  whileHover={{
                    scale: 1.08,
                    transition: { duration: 0.2 }
                  }}
                  className={`px-1.5 py-0.5 sm:px-2 sm:py-0.5 ${colors.bg} ${colors.hover} rounded-full shadow-sm cursor-pointer transition-colors`}
                >
                  <span
                    className={`font-semibold ${colors.text} whitespace-nowrap`}
                    style={{ fontSize: 'clamp(0.6rem, 1vw, 0.85rem)' }}
                  >
                    {skill.name}
                  </span>
                </motion.div>
              );
            })}
          </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
};
