import { Header } from '../components/layout/Header';
import { Footer } from '../components/layout/Footer';
import { BentoGrid } from '../components/sections/BentoGrid';
import { ParticlesBackground } from '../components/background/ParticlesBackground';

export const Index = () => {
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
