'use client';

import dynamic from 'next/dynamic';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';

// Dynamically import components that access browser-only APIs
const DailyBackground = dynamic(
  () => import('@/components/background/DailyBackground').then(mod => mod.DailyBackground),
  { ssr: false }
);

const BentoGrid = dynamic(
  () => import('@/components/sections/BentoGrid').then(mod => mod.BentoGrid),
  { ssr: false, loading: () => <div className="flex-1 flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div></div> }
);

export default function HomePage() {
  return (
    <div className="h-screen w-screen overflow-hidden flex flex-col relative">
      {/* Daily Background - Image of the day as background */}
      <DailyBackground />

      {/* Header */}
      <div className="flex-shrink-0 relative z-50" style={{ height: 'clamp(80px, 12vh, 120px)' }}>
        <Header />
      </div>

      {/* Spacing after header */}
      <div className="flex-shrink-0 h-4" />

      {/* Main Content - Takes remaining space */}
      <main className="flex-1 relative z-10 overflow-hidden">
        <BentoGrid />
      </main>

      {/* Spacing before footer */}
      <div className="flex-shrink-0 h-4" />

      {/* Footer */}
      <div className="flex-shrink-0 relative z-50" style={{ height: 'clamp(50px, 8vh, 80px)' }}>
        <Footer />
      </div>
    </div>
  );
}
