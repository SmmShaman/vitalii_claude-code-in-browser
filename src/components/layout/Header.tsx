import { motion } from 'framer-motion';
import { Globe } from 'lucide-react';
import { useTranslations, type Language } from '../../contexts/TranslationContext';

interface HeaderProps {
  isCompact?: boolean;
}

export const Header = ({ isCompact = false }: HeaderProps) => {
  const { t, currentLanguage, setCurrentLanguage } = useTranslations();

  const languages: Language[] = ['NO', 'EN', 'UA'];

  return (
    <header className="w-full h-full flex items-center px-2 sm:px-4">
      {/* Container wrapper for consistent width with BentoGrid */}
      <motion.div
        className="max-w-7xl mx-auto w-full flex items-center"
        animate={{
          justifyContent: isCompact ? 'space-between' : 'flex-end',
        }}
        transition={{ duration: 0.3 }}
      >
        {/* Compact title - shown when fullscreen */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{
            opacity: isCompact ? 1 : 0,
            x: isCompact ? 0 : -20,
            display: isCompact ? 'block' : 'none',
          }}
          transition={{ duration: 0.3 }}
          className="text-white font-semibold"
          style={{
            fontSize: 'clamp(0.875rem, 1.5vw, 1.125rem)',
            textShadow: '2px 2px 4px rgba(0, 0, 0, 0.5)'
          }}
        >
          <span className="font-bold text-amber-400">Vitalii Berbeha</span>
          <span className="hidden sm:inline"> - {t('subtitle')}</span>
        </motion.div>

        {/* Language Switcher */}
        <div className="flex gap-1 sm:gap-2 flex-shrink-0">
          {languages.map((lang) => (
            <button
              key={lang}
              onClick={() => setCurrentLanguage(lang)}
              className={`flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1.5 sm:py-2 rounded-md transition-all duration-300 ${
                currentLanguage === lang
                  ? 'bg-amber-500/20 text-amber-400 border border-amber-400/30'
                  : 'bg-white/5 text-white/60 hover:bg-white/10 hover:text-white/80 border border-white/10'
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
