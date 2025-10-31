import { useState } from 'react';
import { motion } from 'framer-motion';
import { Header } from '../components/layout/Header';
import { Footer } from '../components/layout/Footer';
import { BentoGrid } from '../components/sections/BentoGrid';
import { ParticlesBackground } from '../components/background/ParticlesBackground';
import { useTranslations } from '../contexts/TranslationContext';

export const Index = () => {
  const { t } = useTranslations();
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Helper function to highlight name in title
  const renderTitle = () => {
    const title = t('title') as string;
    const namePattern = /Vitalii Berbeha|Віталій Бербега/;
    const match = title.match(namePattern);

    if (!match) return title;

    const name = match[0];
    const beforeName = title.substring(0, match.index);
    const afterName = title.substring((match.index || 0) + name.length);

    return (
      <>
        {beforeName}
        <span className="text-amber-400 font-extrabold">{name}</span>
        {afterName}
      </>
    );
  };

  const handleFullscreenChange = (fullscreen: boolean) => {
    console.log('🎬 Header state changing:', fullscreen ? 'FULLSCREEN (collapse)' : 'NORMAL (expand)');
    setIsFullscreen(fullscreen);
  };

  return (
    <div className="h-screen w-screen overflow-hidden flex flex-col relative">
      {/* Animated Background */}
      <ParticlesBackground />

      {/* Header - Fixed 60px */}
      <div className="flex-shrink-0 h-[60px] relative z-50">
        <Header isCompact={isFullscreen} />
      </div>

      {/* Spacing after header - 16px */}
      <div className="flex-shrink-0 h-4" />

      {/* Title Section - Collapsible */}
      <motion.div
        className="flex-shrink-0 relative z-40 overflow-hidden"
        animate={{
          height: isFullscreen ? 0 : 'auto',
          opacity: isFullscreen ? 0 : 1,
        }}
        transition={{
          duration: 0.5,
          ease: [0.4, 0, 0.2, 1],
        }}
      >
        <div className="text-center w-full max-w-7xl mx-auto px-4">
          <h1
            className="font-bold text-black mb-0.5 leading-tight"
            style={{
              fontSize: 'clamp(1rem, 3vw, 2.5rem)',
              whiteSpace: 'nowrap',
              overflow: 'visible'
            }}
          >
            {renderTitle()}
          </h1>
          <h2
            className="text-black mt-2 leading-tight"
            style={{
              fontSize: 'clamp(0.75rem, 1.8vw, 1.25rem)',
              whiteSpace: 'nowrap',
              overflow: 'visible'
            }}
          >
            {t('subtitle')}
          </h2>
          <p
            className="text-black mt-1.5 leading-tight font-medium"
            style={{
              fontSize: 'clamp(0.65rem, 1.2vw, 0.875rem)',
              whiteSpace: 'nowrap',
              overflow: 'visible'
            }}
          >
            {t('description')}
          </p>
        </div>
      </motion.div>

      {/* Spacing after title - 16px (only when title visible) */}
      {!isFullscreen && <div className="flex-shrink-0 h-4" />}

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
