import { Globe } from 'lucide-react';
import { useTranslations, type Language } from '../../contexts/TranslationContext';
import { AnimatedHeaderTitle } from '../ui/AnimatedHeaderTitle';

export const Header = () => {
  const { t, currentLanguage, setCurrentLanguage, isLoading } = useTranslations();

  const languages: Language[] = ['NO', 'EN', 'UA'];

  return (
    <header className="w-full h-full flex items-center px-2 sm:px-4">
      <div className="max-w-7xl mx-auto w-full">
        <div className="flex items-center justify-between gap-2 sm:gap-4">
          {/* Title Section */}
          <div className="flex-1 min-w-0">
            {isLoading ? (
              <div className="space-y-1">
                <div className="h-6 bg-white/10 rounded animate-pulse w-3/4" />
                <div className="h-4 bg-white/10 rounded animate-pulse w-1/2" />
              </div>
            ) : (
              <>
                <AnimatedHeaderTitle
                  text={t('title') as string}
                  namePattern={/Vitalii Berbeha|Віталій Бербега/}
                />
                <h2
                  className="text-white/70 mb-0.5 leading-tight"
                  style={{ fontSize: 'clamp(0.75rem, 1.5vw, 1rem)' }}
                >
                  {t('subtitle')}
                </h2>
                <p
                  className="text-white/60 hidden lg:block leading-tight"
                  style={{ fontSize: 'clamp(0.65rem, 1.2vw, 0.875rem)' }}
                >
                  {t('description')}
                </p>
              </>
            )}
          </div>

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
        </div>
      </div>
    </header>
  );
};
