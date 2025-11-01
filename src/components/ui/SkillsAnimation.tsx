import { motion, AnimatePresence } from 'framer-motion';

interface Skill {
  name: string;
  category?: string;
}

interface SkillsAnimationProps {
  skills: Skill[];
  backgroundText: string;
  isAnimationActive?: boolean;
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

export const SkillsAnimation = ({ skills, backgroundText, isAnimationActive = false }: SkillsAnimationProps) => {
  const getColorClasses = (category?: string) => {
    return categoryColors[category || 'development'] || categoryColors.development;
  };

  // Calculate grid positions for 5x5 layout
  const getGridPosition = (index: number) => {
    const cols = 5;
    const rows = 5;
    const row = Math.floor(index / cols);
    const col = index % cols;

    // Calculate position as percentage of container
    const x = (col / (cols - 1)) * 100 - 50; // -50 to 50%
    const y = (row / (rows - 1)) * 100 - 50; // -50 to 50%

    return { x: `${x}%`, y: `${y}%` };
  };

  return (
    <>
      {/* Normal mode - inside card */}
      {!isAnimationActive && (
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

          {/* Skills tags */}
          <div className="relative h-full w-full flex flex-wrap items-center justify-center gap-1.5 sm:gap-2 md:gap-2.5 z-10 px-2 sm:px-3 py-2 sm:py-3">
            {skills.map((skill, index) => {
              const colors = getColorClasses(skill.category);
              return (
                <motion.div
                  key={index}
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
          </div>
        </div>
      )}

      {/* Fullscreen animation mode */}
      <AnimatePresence>
        {isAnimationActive && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center"
          >
            {/* Logos spreading from center */}
            <div className="relative w-full h-full flex items-center justify-center">
              {skills.map((skill, index) => {
                const colors = getColorClasses(skill.category);
                const gridPos = getGridPosition(index);

                return (
                  <motion.div
                    key={index}
                    initial={{
                      opacity: 0,
                      scale: 0,
                      x: 0,
                      y: 0
                    }}
                    animate={{
                      opacity: 1,
                      scale: 1,
                      x: gridPos.x,
                      y: gridPos.y
                    }}
                    exit={{
                      opacity: 0,
                      scale: 0,
                      x: 0,
                      y: 0
                    }}
                    transition={{
                      duration: 0.5,
                      delay: index * 0.02,
                      ease: 'easeOut'
                    }}
                    className={`absolute px-4 py-2 ${colors.bg} rounded-full shadow-lg`}
                    style={{
                      left: '50%',
                      top: '50%',
                      transform: 'translate(-50%, -50%)'
                    }}
                  >
                    <span
                      className={`font-semibold ${colors.text} whitespace-nowrap`}
                      style={{ fontSize: 'clamp(0.8rem, 1.5vw, 1.2rem)' }}
                    >
                      {skill.name}
                    </span>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
