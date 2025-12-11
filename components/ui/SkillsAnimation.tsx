'use client'

import { motion } from 'framer-motion'

interface Skill {
  name: string
  category?: string
}

interface SkillsAnimationProps {
  skills: Skill[]
  backgroundText: string
}

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
}

export const SkillsAnimation = ({ skills, backgroundText }: SkillsAnimationProps) => {
  const getColorClasses = (category?: string) => {
    return categoryColors[category || 'development'] || categoryColors.development
  }

  return (
    <div className="h-full w-full overflow-hidden relative">
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0">
        <h2
          className="font-bold text-white/10 select-none"
          style={{ fontSize: 'clamp(3rem, 8vw, 6.5rem)' }}
        >
          {backgroundText}
        </h2>
      </div>

      <div className="relative h-full w-full flex flex-wrap items-center justify-center gap-1.5 sm:gap-2 md:gap-2.5 z-10 px-2 sm:px-3 py-2 sm:py-3">
        {skills.map((skill, index) => {
          const colors = getColorClasses(skill.category)
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
          )
        })}
      </div>
    </div>
  )
}
