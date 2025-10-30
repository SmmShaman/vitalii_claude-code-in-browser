import { Header } from '../components/layout/Header';
import { Footer } from '../components/layout/Footer';
import { BentoGrid } from '../components/sections/BentoGrid';
import { ParticlesBackground } from '../components/background/ParticlesBackground';

export const Index = () => {
  return (
    <div className="h-screen w-screen overflow-hidden flex flex-col relative">
      {/* Animated Background */}
      <ParticlesBackground />

      {/* Fixed Header - Language switcher only */}
      <div
        className="fixed top-0 left-0 right-0 z-50"
        style={{ height: 'clamp(50px, 6vh, 70px)' }}
      >
        <Header />
      </div>

      {/* Main Content - Takes remaining space with padding for fixed header/footer */}
      <main
        className="relative z-10 overflow-hidden"
        style={{
          paddingTop: 'clamp(50px, 6vh, 70px)',
          paddingBottom: 'clamp(50px, 7vh, 90px)',
          height: '100vh'
        }}
      >
        <BentoGrid />
      </main>

      {/* Fixed Footer */}
      <div
        className="fixed bottom-0 left-0 right-0 z-50"
        style={{ height: 'clamp(50px, 7vh, 90px)' }}
      >
        <Footer />
      </div>
    </div>
  );
};
