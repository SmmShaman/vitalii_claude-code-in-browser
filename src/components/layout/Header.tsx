import { Globe } from 'lucide-react';
import { useTranslations, type Language } from '../../hooks/useTranslations';

export const Header = () => {
  const { t, currentLanguage, setCurrentLanguage, isLoading } = useTranslations();

  const languages: Language[] = ['NO', 'EN', 'UA'];

  return (
    <header className="fixed top-0 left-0 right-0 z-40 mt-4 px-4">
      <div className="max-w-6xl mx-auto rounded-[2rem] shadow-2xl border border-black/20"
        style={{
          background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.8) 0%, rgba(118, 75, 162, 0.8) 100%)',
          backdropFilter: 'blur(2px)',
          height: '22.2vh',
        }}
      >
        <div className="h-full flex flex-col md:flex-row items-center justify-between p-6 md:p-8">
          {/* Title Section */}
          <div className="flex-1 text-center md:text-left mb-4 md:mb-0">
            {isLoading ? (
              <div className="space-y-2">
                <div className="h-8 bg-white/20 rounded animate-pulse w-3/4 mx-auto md:mx-0" />
                <div className="h-6 bg-white/20 rounded animate-pulse w-1/2 mx-auto md:mx-0" />
                <div className="h-4 bg-white/20 rounded animate-pulse w-2/3 mx-auto md:mx-0" />
              </div>
            ) : (
              <>
                <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold text-white mb-2">
                  {t('title')}
                </h1>
                <h2 className="text-lg md:text-xl text-white/90 mb-1">
                  {t('subtitle')}
                </h2>
                <p className="text-sm md:text-base text-white/80">
                  {t('description')}
                </p>
              </>
            )}
          </div>

          {/* Language Switcher */}
          <div className="flex flex-row md:flex-col gap-2">
            {languages.map((lang) => (
              <button
                key={lang}
                onClick={() => setCurrentLanguage(lang)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-300 ${
                  currentLanguage === lang
                    ? 'bg-white/20 text-white'
                    : 'bg-black/20 text-white/70 hover:bg-black/40'
                }`}
                aria-label={`Switch to ${lang}`}
              >
                <Globe className="w-4 h-4" />
                <span className="font-semibold">{lang}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </header>
  );
};
