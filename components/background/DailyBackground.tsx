'use client';

import { useEffect, useRef, useState } from 'react';
import type { DailyImage } from '@/types/doodle';
import { DailyImageService } from '@/services/doodle/dailyImageService';
import { ColorAnalyzer } from '@/services/doodle/colorAnalyzer';
import { ParticleSystem } from '../doodle/effects/ParticleSystem';

export const DailyBackground = () => {
  const [image, setImage] = useState<DailyImage | null>(null);
  const [loading, setLoading] = useState(true);

  const imageRef = useRef<HTMLImageElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particleSystemRef = useRef<ParticleSystem | null>(null);

  // Fetch daily image
  useEffect(() => {
    const fetchImage = async () => {
      try {
        setLoading(true);
        const dailyImage = await DailyImageService.getTodaysImage();
        setImage(dailyImage);
      } catch (err) {
        console.error('Failed to load daily background:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchImage();
  }, []);

  // Initialize particle system
  useEffect(() => {
    if (!image || !canvasRef.current) return;

    const effectType = image.effect || 'particles';
    const dominantColor = ColorAnalyzer.getDominant(image.colors);

    const particleSystem = new ParticleSystem(
      canvasRef.current,
      effectType,
      dominantColor
    );

    particleSystem.start();
    particleSystemRef.current = particleSystem;

    const handleResize = () => {
      particleSystem.resize();
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      particleSystem.destroy();
    };
  }, [image]);

  if (loading || !image) {
    return null; // Don't show anything while loading
  }

  const backgroundColor = ColorAnalyzer.getBackground(image.colors);

  return (
    <>
      {/* Background Image Layer - z-0 */}
      <div
        className="fixed inset-0 w-full h-full -z-10"
        style={{
          background: `linear-gradient(135deg, ${backgroundColor}20, ${backgroundColor}40)`,
        }}
      >
        {/* Daily Image */}
        <img
          ref={imageRef}
          src={image.thumbnail_url || image.image_url}
          alt={image.title}
          className="w-full h-full object-cover opacity-30 blur-sm"
          loading="eager"
          style={{
            filter: 'brightness(0.7) contrast(1.1)',
          }}
        />

        {/* Dark overlay for readability */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/30 to-black/50" />

        {/* Particle effects overlay */}
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full opacity-60"
        />
      </div>
    </>
  );
};
