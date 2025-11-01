import { motion, AnimatePresence } from 'framer-motion';
import { getSkillLogo } from '../../utils/skillLogos';
import { useState, useEffect } from 'react';

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
    bg: 'bg-green-100',
    text: 'text-green-800',
    hover: 'hover:bg-green-200'
  },
  ui: {
    bg: 'bg-purple-100',
    text: 'text-purple-800',
    hover: 'hover:bg-purple-200'
  },
  ai: {
    bg: 'bg-orange-100',
    text: 'text-orange-800',
    hover: 'hover:bg-orange-200'
  },
  automation: {
    bg: 'bg-blue-100',
    text: 'text-blue-800',
    hover: 'hover:bg-blue-200'
  },
  marketing: {
    bg: 'bg-pink-100',
    text: 'text-pink-800',
    hover: 'hover:bg-pink-200'
  },
  integration: {
    bg: 'bg-cyan-100',
    text: 'text-cyan-800',
    hover: 'hover:bg-cyan-200'
  },
};

export const SkillsAnimation = ({ skills, backgroundText, isExploding = false, gridContainerRef }: SkillsAnimationProps) => {
  const [gridBounds, setGridBounds] = useState<DOMRect | null>(null);

  console.log('🎨 SkillsAnimation render:', {
    isExploding,
    hasGridRef: !!gridContainerRef?.current,
    skillsCount: skills.length,
    gridBounds
  });

  // Get grid bounds when exploding
  useEffect(() => {
    console.log('🔄 useEffect triggered:', { isExploding, hasGridRef: !!gridContainerRef?.current });
    if (isExploding && gridContainerRef?.current) {
      const bounds = gridContainerRef.current.getBoundingClientRect();
      console.log('📐 Grid bounds calculated:', bounds);
      setGridBounds(bounds);
    }
  }, [isExploding, gridContainerRef]);

  const getColorClasses = (category?: string) => {
    return categoryColors[category || 'development'] || categoryColors.development;
  };

  // Calculate evenly distributed positions for logos across grid area
  // Fixed 5x5 grid layout (25 positions for up to 25 skills)
  const getLogoPosition = (index: number, _total: number) => {
    if (!gridBounds) {
      console.log(`⚠️ Logo ${index}: No gridBounds, using center`);
      return { left: '50%', top: '50%' };
    }

    const cols = 5; // Fixed: 5 columns
    const rows = 5; // Fixed: 5 rows

    const col = index % cols;
    const row = Math.floor(index / cols);

    // Distribute evenly across grid bounds
    const xPercent = (col / (cols - 1 || 1));
    const yPercent = (row / (rows - 1 || 1));

    const left = gridBounds.left + (gridBounds.width * xPercent * 0.9) + (gridBounds.width * 0.05);
    const top = gridBounds.top + (gridBounds.height * yPercent * 0.9) + (gridBounds.height * 0.05);

    const position = { left: `${left}px`, top: `${top}px` };
    if (index === 0) console.log(`📍 Logo ${index} position:`, position, { col, row, xPercent, yPercent });
    return position;
  };

  return (
    <div className="h-full w-full overflow-hidden relative">
      {/* Background text */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0">
        <h2
          className="font-bold text-white/10 select-none"
          style={{ fontSize: 'clamp(3rem, 8vw, 8rem)' }}
        >
          {backgroundText}
        </h2>
      </div>

      <AnimatePresence mode="wait">
        {isExploding ? (
          /* Exploding logos view - fixed positioning to cover entire grid area */
          <motion.div
            key="logos"
            className="fixed inset-0 z-[100] bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            onAnimationStart={() => console.log('💥 Explosion container animation started')}
          >
            {(() => {
              console.log('🎯 Rendering logos:', { count: skills.length, hasGridBounds: !!gridBounds });

              // Don't render logos until we have gridBounds
              if (!gridBounds) {
                console.log('⏳ Waiting for gridBounds...');
                return null;
              }

              return skills.map((skill, index) => {
                const pos = getLogoPosition(index, skills.length);
                const centerX = gridBounds.left + gridBounds.width / 2;
                const centerY = gridBounds.top + gridBounds.height / 2;

                // Parse position strings to numbers
                const targetLeft = parseFloat(pos.left);
                const targetTop = parseFloat(pos.top);

                if (index === 0) console.log('🚀 First logo data:', {
                  skill: skill.name,
                  centerX,
                  centerY,
                  targetLeft,
                  targetTop
                });

                if (index === 0) console.log('🎬 Animating logo 0 - MOTION CONFIG:', {
                  initialLeft: centerX,
                  initialTop: centerY,
                  animateLeft: targetLeft,
                  animateTop: targetTop
                });

                return (
                <motion.div
                  key={`logo-${skill.name}-${index}`}
                  className="fixed border-4 border-red-500"
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
                    duration: 2,
                    delay: index * 0.05,
                    ease: 'easeOut'
                  }}
                  onAnimationStart={() => index === 0 && console.log('🎬 ANIMATION STARTED for logo 0')}
                  onAnimationComplete={() => index === 0 && console.log('✅ ANIMATION COMPLETE for logo 0')}
                >
                  <img
                    src={getSkillLogo(skill.name)}
                    alt={skill.name}
                    className="w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 object-contain"
                    style={{
                      filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.2))'
                    }}
                    onLoad={() => index === 0 && console.log('✅ First logo image loaded')}
                    onError={() => console.error(`❌ Logo failed to load: ${skill.name}`)}
                  />
                </motion.div>
              );
            });
            })()}
          </motion.div>
        ) : (
          /* Normal text badges view */
          <motion.div
            key="badges"
            className="relative h-full w-full flex flex-wrap items-center justify-center gap-1.5 sm:gap-2 md:gap-2.5 z-10 px-2 sm:px-3 py-2 sm:py-3"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            {skills.map((skill, index) => {
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
                  className={`px-2 sm:px-2.5 py-1 sm:py-1.5 ${colors.bg} ${colors.hover} rounded-full shadow-sm cursor-pointer transition-colors`}
                >
                  <span
                    className={`font-semibold ${colors.text} whitespace-nowrap`}
                    style={{ fontSize: 'clamp(0.6rem, 1vw, 0.75rem)' }}
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
  );
};
