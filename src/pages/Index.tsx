import { Header } from '../components/layout/Header';
import { Footer } from '../components/layout/Footer';
import { BentoGrid } from '../components/sections/BentoGrid';
import { ParticlesBackground } from '../components/background/ParticlesBackground';

export const Index = () => {
  return (
    <div className="h-screen w-screen overflow-hidden flex flex-col relative">
      {/* Animated Background */}
      <ParticlesBackground />

      {/* Compact Header - Language switcher only */}
      <div className="flex-shrink-0 relative z-20" style={{ height: 'clamp(50px, 6vh, 70px)' }}>
        <Header />
      </div>

      {/* Main Content - Takes remaining space */}
      <main className="flex-1 relative z-10 overflow-hidden">
        <BentoGrid />
      </main>

      {/* Interactive Footer - Auto height */}
      <div className="flex-shrink-0 relative z-20" style={{ minHeight: 'clamp(60px, 8vh, 100px)', maxHeight: '40vh' }}>
        <Footer />
      </div>
    </div>
  );
};
