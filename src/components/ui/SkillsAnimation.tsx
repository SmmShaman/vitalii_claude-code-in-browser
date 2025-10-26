import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface Skill {
  name: string;
  category?: string;
}

interface SkillsAnimationProps {
  skills: Skill[];
  backgroundText: string;
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

export const SkillsAnimation = ({ skills, backgroundText }: SkillsAnimationProps) => {
  const [showTitle, setShowTitle] = useState(true);
  const [cycleKey, setCycleKey] = useState(0);

  useEffect(() => {
    // Cycle timing:
    // 0-3s: Show title
    // 3-4s: Fade out title
    // 4-23s: Show snake animation (19s)
    // 23s: Restart

    const titleTimer = setTimeout(() => {
      setShowTitle(false);
    }, 3000); // Hide title after 3 seconds

    const cycleTimer = setTimeout(() => {
      setShowTitle(true);
      setCycleKey(prev => prev + 1); // Force re-render for new cycle
    }, 23000); // Restart cycle after 23 seconds

    return () => {
      clearTimeout(titleTimer);
      clearTimeout(cycleTimer);
    };
  }, [cycleKey]);

  const getColorClasses = (category?: string) => {
    return categoryColors[category || 'development'] || categoryColors.development;
  };

  return (
    <div className="h-full w-full overflow-hidden relative">
      {/* Background text watermark */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0">
        <h2
          className="font-bold text-white/10 select-none"
          style={{ fontSize: 'clamp(3rem, 8vw, 8rem)' }}
        >
          {backgroundText}
        </h2>
      </div>

      {/* Main content */}
      <div className="relative h-full w-full z-10">
        <AnimatePresence mode="wait">
          {showTitle ? (
            // Title phase (0-3s)
            <motion.div
              key={`title-${cycleKey}`}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.8 }}
              className="h-full w-full flex items-center justify-center"
            >
              <h1
                className="font-bold bg-gradient-to-r from-purple-600 via-pink-600 to-orange-600 bg-clip-text text-transparent"
                style={{ fontSize: 'clamp(2rem, 6vw, 5rem)' }}
              >
                {backgroundText}
              </h1>
            </motion.div>
          ) : (
            // Snake animation phase (4-23s)
            <motion.div
              key={`skills-${cycleKey}`}
              className="h-full w-full flex flex-wrap items-center justify-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-2"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5 }}
            >
              {skills.map((skill, index) => {
                const colors = getColorClasses(skill.category);
                // Calculate delay for snake effect
                // Spread 19 seconds across all skills
                const snakeDelay = (index * 19) / skills.length;

                return (
                  <motion.div
                    key={`${skill.name}-${cycleKey}`}
                    initial={{
                      opacity: 0,
                      y: 100,
                      x: index % 2 === 0 ? -50 : 50,
                      scale: 0.3,
                      rotate: index % 2 === 0 ? -45 : 45
                    }}
                    animate={{
                      opacity: [0, 1, 1, 0.8],
                      y: [100, -10, 0, 0],
                      x: [index % 2 === 0 ? -50 : 50, index % 2 === 0 ? 10 : -10, 0, 0],
                      scale: [0.3, 1.1, 1, 1],
                      rotate: [index % 2 === 0 ? -45 : 45, index % 2 === 0 ? 10 : -10, 0, 0]
                    }}
                    transition={{
                      duration: 0.8,
                      delay: snakeDelay,
                      times: [0, 0.4, 0.7, 1],
                      ease: [0.22, 1, 0.36, 1]
                    }}
                    whileHover={{
                      scale: 1.08,
                      rotate: 5,
                      transition: { duration: 0.2 }
                    }}
                    className={`px-2 sm:px-2.5 py-1 sm:py-1.5 ${colors.bg} ${colors.hover} rounded-full shadow-sm cursor-pointer transition-colors`}
                    style={{
                      willChange: 'transform, opacity',
                    }}
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
    </div>
  );
};
