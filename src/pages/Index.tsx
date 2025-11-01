import { Header } from '../components/layout/Header';
import { Footer } from '../components/layout/Footer';
import { BentoGrid } from '../components/sections/BentoGrid';
import { ParticlesBackground } from '../components/background/ParticlesBackground';
import { useTranslations } from '../contexts/TranslationContext';

export const Index = () => {
  const { t } = useTranslations();

  const handleFullscreenChange = (fullscreen: boolean) => {
    console.log('🎬 Fullscreen change:', fullscreen);
  };

  return (
    <div className="h-screen w-screen overflow-hidden flex flex-col relative">
      {/* Animated Background */}
      <ParticlesBackground />

      {/* Header - Fixed 60px */}
      <div className="flex-shrink-0 h-[60px] relative z-50">
        <Header isCompact={false} />
      </div>

      {/* Spacing after header - 16px */}
      <div className="flex-shrink-0 h-4" />

      {/* Title Section */}
      <div className="flex-shrink-0 relative z-40 flex justify-start pt-4 px-4">
        <div className="text-left">
          <h1
            className="font-bold text-black"
            style={{
              fontSize: 'clamp(1rem, 2vw, 2.5rem)',
              whiteSpace: 'nowrap'
            }}
          >
            <span className="text-amber-400">{t('title')}</span>{' '}
            <span className="font-semibold" style={{ fontSize: 'clamp(0.75rem, 1.5vw, 1.25rem)' }}>
              {t('subtitle')}
            </span>
          </h1>
          <h2
            className="text-black mt-1"
            style={{
              fontSize: 'clamp(0.65rem, 1.2vw, 0.875rem)',
              whiteSpace: 'nowrap'
            }}
          >
            {t('description')}
          </h2>
        </div>
      </div>

      {/* Spacing after title - 16px */}
      <div className="flex-shrink-0 h-4" />

      {/* Main Content - Takes remaining space */}
      <main className="flex-1 relative z-10 overflow-hidden">
        <BentoGrid onFullscreenChange={handleFullscreenChange} />
      </main>

      {/* Spacing before footer - 16px */}
      <div className="flex-shrink-0 h-4" />

      {/* Footer - Fixed 60px */}
      <div className="flex-shrink-0 h-[60px] relative z-50">
        <Footer />
      </div>
    </div>
  );
};
