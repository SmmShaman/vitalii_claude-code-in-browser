import { Globe } from 'lucide-react';
import { useTranslations, type Language } from '../../contexts/TranslationContext';
import { AnimatedName } from '../ui/AnimatedName';

export const Header = () => {
  const { t, currentLanguage, setCurrentLanguage, isLoading } = useTranslations();

  const languages: Language[] = ['NO', 'EN', 'UA'];

  return (
    <header className="w-full py-6 px-4 mb-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between gap-4">
          {/* Title Section */}
          <div className="flex-1">
            {isLoading ? (
              <div className="space-y-2">
                <div className="h-8 bg-white/10 rounded animate-pulse w-3/4" />
                <div className="h-6 bg-white/10 rounded animate-pulse w-1/2" />
              </div>
            ) : (
              <>
                <AnimatedName
                  fullText={t('title') as string}
                  namePattern={/Vitalii Berbeha|Віталій Бербега/}
                  className="text-2xl md:text-3xl lg:text-4xl font-bold text-white/90 mb-2 leading-tight"
                />
                <h2 className="text-sm md:text-base lg:text-lg text-white/70 mb-1 leading-tight">
                  {t('subtitle')}
                </h2>
                <p className="text-xs md:text-sm text-white/60 hidden lg:block leading-tight">
                  {t('description')}
                </p>
              </>
            )}
          </div>

          {/* Language Switcher */}
          <div className="flex gap-2">
            {languages.map((lang) => (
              <button
                key={lang}
                onClick={() => setCurrentLanguage(lang)}
                className={`flex items-center gap-2 px-4 py-2 rounded-md transition-all duration-300 ${
                  currentLanguage === lang
                    ? 'bg-amber-500/20 text-amber-400 border border-amber-400/30'
                    : 'bg-white/5 text-white/60 hover:bg-white/10 hover:text-white/80 border border-white/10'
                }`}
                aria-label={`Switch to ${lang}`}
              >
                <Globe className="w-4 h-4" />
                <span className="font-semibold text-sm">{lang}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </header>
  );
};
