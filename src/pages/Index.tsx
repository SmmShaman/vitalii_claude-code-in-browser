import { Header } from '../components/layout/Header';
import { Footer } from '../components/layout/Footer';
import { BentoGrid } from '../components/sections/BentoGrid';
import { ParticlesBackground } from '../components/background/ParticlesBackground';

export const Index = () => {
  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Animated Background */}
      <ParticlesBackground />

      {/* Fixed Header */}
      <Header />

      {/* Main Content */}
      <main className="relative z-10" style={{ paddingTop: 'calc(22.2vh + 2rem)', paddingBottom: 'calc(11.1vh + 2rem)' }}>
        <BentoGrid />
      </main>

      {/* Fixed Footer */}
      <Footer />
    </div>
  );
};
