'use client';

import dynamic from 'next/dynamic';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';

const DailyBackground = dynamic(
  () => import('@/components/background/DailyBackground').then(mod => mod.DailyBackground),
  { ssr: false }
);

const BentoGrid = dynamic(
  () => import('@/components/sections/BentoGrid').then(mod => mod.BentoGrid),
  {
    ssr: false,
    loading: () => (
      <div className="flex-1 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
      </div>
    )
  }
);

export default function HomePage() {
  return (
    <div className="h-screen w-screen overflow-hidden flex flex-col relative">
      <DailyBackground />
      <Header />
      <main className="flex-1 overflow-hidden">
        <BentoGrid />
      </main>
      <Footer />
    </div>
  );
}
