import { Globe } from 'lucide-react';
import { useTranslations, type Language } from '../../contexts/TranslationContext';
import { AnimatedTitle } from '../ui/AnimatedTitle';

export const Header = () => {
  const { t, currentLanguage, setCurrentLanguage, isLoading } = useTranslations();

  const languages: Language[] = ['NO', 'EN', 'UA'];

  return (
    <header className="fixed top-0 left-0 right-0 z-40 px-2 sm:px-4"
      style={{
        marginTop: '4px',
      }}
    >
      <div className="max-w-6xl mx-auto rounded-xl sm:rounded-[2rem] shadow-2xl border border-black/20 h-[100px] sm:h-[120px] lg:h-[140px]"
        style={{
          background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.8) 0%, rgba(118, 75, 162, 0.8) 100%)',
          backdropFilter: 'blur(2px)',
        }}
      >
        <div className="h-full flex flex-col sm:flex-row items-center justify-between p-3 sm:p-4 md:p-6 lg:p-8 gap-2 sm:gap-3"
        >
          {/* Title Section */}
          <div className="flex-1 text-center sm:text-left">
            {isLoading ? (
              <div className="space-y-1 sm:space-y-2">
                <div className="h-6 sm:h-8 bg-white/20 rounded animate-pulse w-3/4 mx-auto sm:mx-0" />
                <div className="h-4 sm:h-6 bg-white/20 rounded animate-pulse w-1/2 mx-auto sm:mx-0" />
                <div className="hidden sm:block h-4 bg-white/20 rounded animate-pulse w-2/3 mx-auto sm:mx-0" />
              </div>
            ) : (
              <>
                <AnimatedTitle
                  text={t('title') as string}
                  className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-white mb-1 sm:mb-2 leading-tight"
                />
                <h2 className="text-base sm:text-lg md:text-xl text-white/90 mb-0.5 sm:mb-1 leading-tight">
                  {t('subtitle')}
                </h2>
                <p className="text-xs sm:text-sm md:text-base text-white/80 hidden sm:block leading-tight">
                  {t('description')}
                </p>
              </>
            )}
          </div>

          {/* Language Switcher */}
          <div className="flex flex-row gap-1.5 sm:gap-2">
            {languages.map((lang) => (
              <button
                key={lang}
                onClick={() => setCurrentLanguage(lang)}
                className={`flex items-center gap-1 sm:gap-2 px-2 sm:px-3 md:px-4 py-1.5 sm:py-2 rounded-md sm:rounded-lg transition-all duration-300 ${
                  currentLanguage === lang
                    ? 'bg-white/20 text-white'
                    : 'bg-black/20 text-white/70 hover:bg-black/40'
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
