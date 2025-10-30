import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Header } from '../components/layout/Header';
import { Footer } from '../components/layout/Footer';
import { BentoGrid } from '../components/sections/BentoGrid';
import { ParticlesBackground } from '../components/background/ParticlesBackground';
import { AnimatedHeaderTitle } from '../components/ui/AnimatedHeaderTitle';
import { AnimatedDescription } from '../components/ui/AnimatedDescription';
import { useTranslations } from '../contexts/TranslationContext';

export const Index = () => {
  const { t } = useTranslations();
  const [isFullscreen, setIsFullscreen] = useState(false);

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

      {/* Fixed Language Switcher Header */}
      <div
        className="fixed top-0 left-0 right-0 z-50"
        style={{ height: 'clamp(50px, 6vh, 70px)' }}
      >
        <Header />
      </div>

      {/* Title Section - Collapsible */}
      <motion.div
        className="fixed left-0 right-0 z-40 bg-white/95 backdrop-blur-sm shadow-md overflow-hidden"
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
          <div className="text-center w-full h-full flex flex-col items-center justify-center px-4 sm:px-6 md:px-8 py-4">
            <AnimatedHeaderTitle
              text={t('title') as string}
              namePattern={/Vitalii Berbeha|Віталій Бербега/}
            />
            <h2
              className="text-gray-700 mt-2 leading-tight"
              style={{ fontSize: 'clamp(1rem, 2vw, 1.5rem)' }}
            >
              {t('subtitle')}
            </h2>
            <AnimatedDescription text={t('description') as string} />
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
