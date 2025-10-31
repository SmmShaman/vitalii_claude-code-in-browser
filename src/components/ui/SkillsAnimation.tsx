import { motion, AnimatePresence } from 'framer-motion';
import { getSkillLogo } from '../../utils/skillLogos';

interface Skill {
  name: string;
  category?: string;
}

interface SkillsAnimationProps {
  skills: Skill[];
  backgroundText: string;
  isExploding?: boolean;
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

export const SkillsAnimation = ({ skills, backgroundText, isExploding = false }: SkillsAnimationProps) => {
  const getColorClasses = (category?: string) => {
    return categoryColors[category || 'development'] || categoryColors.development;
  };

  // Calculate evenly distributed positions for logos
  const getLogoPosition = (index: number, total: number) => {
    const cols = Math.ceil(Math.sqrt(total));
    const rows = Math.ceil(total / cols);

    const col = index % cols;
    const row = Math.floor(index / cols);

    // Distribute evenly across screen
    const x = (col / (cols - 1 || 1)) * 80 + 10; // 10-90% width
    const y = (row / (rows - 1 || 1)) * 80 + 10; // 10-90% height

    return { x: `${x}%`, y: `${y}%` };
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
          /* Exploding logos view */
          <motion.div
            key="logos"
            className="absolute inset-0 z-10"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            {skills.map((skill, index) => {
              const pos = getLogoPosition(index, skills.length);
              return (
                <motion.div
                  key={`logo-${index}`}
                  className="absolute"
                  initial={{
                    left: '50%',
                    top: '50%',
                    x: '-50%',
                    y: '-50%',
                    scale: 0,
                    opacity: 0
                  }}
                  animate={{
                    left: pos.x,
                    top: pos.y,
                    x: '-50%',
                    y: '-50%',
                    scale: 1,
                    opacity: 1
                  }}
                  exit={{
                    left: '50%',
                    top: '50%',
                    scale: 0,
                    opacity: 0
                  }}
                  transition={{
                    duration: 0.8,
                    delay: index * 0.05,
                    ease: 'easeOut'
                  }}
                >
                  <img
                    src={getSkillLogo(skill.name)}
                    alt={skill.name}
                    className="w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 object-contain"
                    style={{
                      filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.2))'
                    }}
                  />
                </motion.div>
              );
            })}
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
