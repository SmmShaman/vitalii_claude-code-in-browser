import { motion } from 'framer-motion';

interface Skill {
  name: string;
  category?: string;
}

interface SkillsAnimationProps {
  skills: Skill[];
  backgroundText: string;
}

export const SkillsAnimation = ({ skills, backgroundText }: SkillsAnimationProps) => {
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

      {/* Skills tags */}
      <div className="relative h-full w-full flex flex-wrap items-center justify-center gap-2 sm:gap-3 md:gap-4 z-10 px-4 py-4 overflow-y-auto">
        {skills.map((skill, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{
              duration: 0.3,
              delay: index * 0.05,
              ease: 'easeOut'
            }}
            whileHover={{
              scale: 1.1,
              boxShadow: '0 8px 16px rgba(0,0,0,0.2)',
              transition: { duration: 0.2 }
            }}
            className="px-3 sm:px-4 py-1.5 sm:py-2 bg-white/95 rounded-full shadow-md cursor-pointer"
          >
            <span
              className="font-semibold text-gray-800 whitespace-nowrap"
              style={{ fontSize: 'clamp(0.7rem, 1.2vw, 0.9rem)' }}
            >
              {skill.name}
            </span>
          </motion.div>
        ))}
      </div>
    </div>
  );
};
