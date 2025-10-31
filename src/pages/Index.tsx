import { useState, useEffect } from 'react';
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

  // Header heights
  const headerHeight = isFullscreen ? 60 : 180;
  const footerHeight = 80;

  const handleFullscreenChange = (fullscreen: boolean) => {
    console.log('🎬 Header state changing:', fullscreen ? 'FULLSCREEN (collapse)' : 'NORMAL (expand)');
    setIsFullscreen(fullscreen);
  };

  useEffect(() => {
    console.log('📏 Header state changed:', {
      isFullscreen,
      titleHeight: isFullscreen ? '0px (collapsed)' : '180px (expanded)',
      mainPaddingTop: `calc(60px + ${isFullscreen ? 0 : 180}px)`,
      availableSpace: isFullscreen ? 'calc(100vh - 60px - 80px) = ~760px' : 'calc(100vh - 60px - 180px - 80px) = ~580px',
      gain: isFullscreen ? '+180px more space!' : 'normal'
    });
  }, [isFullscreen]);

  return (
    <div className="h-screen w-screen overflow-hidden flex flex-col relative">
      {/* Animated Background */}
      <ParticlesBackground />

      {/* Fixed Language Switcher Header - Transparent, floating above background */}
      <div
        className="fixed top-0 left-0 right-0 z-50"
        style={{ height: 'clamp(50px, 6vh, 70px)' }}
      >
        <Header isCompact={isFullscreen} />
      </div>

      {/* Title Section - Floating text on background, no white box */}
      <motion.div
        className="fixed left-0 right-0 z-40 overflow-hidden"
        animate={{
          top: 'clamp(50px, 6vh, 70px)',
          height: isFullscreen ? '0px' : `${headerHeight}px`,
          opacity: isFullscreen ? 0 : 1,
        }}
        transition={{
          duration: 0.5,
          ease: [0.4, 0, 0.2, 1],
        }}
      >
        {!isFullscreen && (
          <div
            className="text-center w-full max-w-7xl mx-auto h-full flex flex-col items-center justify-center px-4 sm:px-6 md:px-8 py-4"
            style={{
              textShadow: '2px 2px 4px rgba(0, 0, 0, 0.3), 0 0 20px rgba(255, 255, 255, 0.5)'
            }}
          >
            <h1
              className="font-bold text-white mb-0.5 leading-tight"
              style={{ fontSize: 'clamp(1.75rem, 3.5vw, 3rem)' }}
            >
              {renderTitle()}
            </h1>
            <h2
              className="text-white mt-2 leading-tight"
              style={{ fontSize: 'clamp(1rem, 2vw, 1.5rem)' }}
            >
              {t('subtitle')}
            </h2>
            <p
              className="text-black mt-1.5 leading-tight font-medium"
              style={{
                fontSize: 'clamp(0.75rem, 1.2vw, 0.875rem)',
                textShadow: 'none'
              }}
            >
              {t('description')}
            </p>
          </div>
        )}
      </motion.div>

      {/* Main Content - Takes remaining space with dynamic padding */}
      <motion.main
        className="relative z-10 overflow-hidden"
        animate={{
          paddingTop: `calc(clamp(50px, 6vh, 70px) + ${isFullscreen ? 0 : headerHeight}px)`,
          paddingBottom: `${footerHeight}px`,
        }}
        transition={{
          duration: 0.5,
          ease: [0.4, 0, 0.2, 1],
        }}
        style={{
          height: '100vh'
        }}
      >
        <BentoGrid onFullscreenChange={handleFullscreenChange} />
      </motion.main>

      {/* Fixed Footer */}
      <div
        className="fixed bottom-0 left-0 right-0 z-50"
        style={{ height: `${footerHeight}px` }}
      >
        <Footer />
      </div>
    </div>
  );
};
