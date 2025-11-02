import { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { DailyImage } from '../../types/doodle';
import { DailyImageService } from '../../services/doodle/dailyImageService';
import { ColorAnalyzer } from '../../services/doodle/colorAnalyzer';
import { ParticleSystem } from './effects/ParticleSystem';

export const DailyDoodle = () => {
  const [image, setImage] = useState<DailyImage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particleSystemRef = useRef<ParticleSystem | null>(null);
  const gsapTimelineRef = useRef<gsap.core.Timeline | null>(null);

  // Fetch daily image
  useEffect(() => {
    const fetchImage = async () => {
      try {
        setLoading(true);
        const dailyImage = await DailyImageService.getTodaysImage();

        // Enhance colors with client-side analysis (optional, already have server colors)
        // const enhancedColors = await ColorAnalyzer.analyzeImage(dailyImage.thumbnail_url || dailyImage.image_url);
        // dailyImage.colors = { ...dailyImage.colors, ...enhancedColors };

        setImage(dailyImage);
        setError(null);
      } catch (err: any) {
        console.error('Failed to load daily image:', err);
        setError(err.message || 'Failed to load image');
      } finally {
        setLoading(false);
      }
    };

    fetchImage();
  }, []);

  // Initialize GSAP animations
  useEffect(() => {
    if (!image || !containerRef.current || !imageRef.current) return;

    const tl = gsap.timeline({ defaults: { ease: 'power2.out' } });

    // Fade in container
    tl.from(containerRef.current, {
      opacity: 0,
      duration: 0.8,
    });

    // Scale and fade in image
    tl.from(imageRef.current, {
      scale: 0.9,
      opacity: 0,
      duration: 1.2,
      ease: 'back.out(1.2)',
    }, '-=0.4');

    // Parallax effect on mouse move
    const handleMouseMove = (e: MouseEvent) => {
      if (!imageRef.current) return;

      const { clientX, clientY } = e;
      const { innerWidth, innerHeight } = window;

      const xPercent = (clientX / innerWidth - 0.5) * 2;
      const yPercent = (clientY / innerHeight - 0.5) * 2;

      gsap.to(imageRef.current, {
        x: xPercent * 20,
        y: yPercent * 20,
        duration: 0.5,
        ease: 'power2.out',
      });
    };

    window.addEventListener('mousemove', handleMouseMove);

    gsapTimelineRef.current = tl;

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      tl.kill();
    };
  }, [image]);

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

  // Interactive click effect
  const handleClick = (e: React.MouseEvent) => {
    if (!imageRef.current) return;

    // Pulse animation
    gsap.to(imageRef.current, {
      scale: 1.05,
      duration: 0.2,
      yoyo: true,
      repeat: 1,
      ease: 'power2.inOut',
    });

    // Create sparkle effect at click position
    const rect = containerRef.current!.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // TODO: Add sparkle particle burst at (x, y)
    console.log('✨ Sparkle effect at:', x, y);
  };

  if (loading) {
    return (
      <div className="w-full h-96 flex items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800">
        <div className="text-white/60 animate-pulse">Loading daily doodle...</div>
      </div>
    );
  }

  if (error || !image) {
    return (
      <div className="w-full h-96 flex items-center justify-center bg-gradient-to-br from-red-900/20 to-red-800/20">
        <div className="text-red-400">Failed to load daily doodle</div>
      </div>
    );
  }

  const dominantColor = ColorAnalyzer.getDominant(image.colors);
  const accentColor = ColorAnalyzer.getAccent(image.colors);
  const backgroundColor = ColorAnalyzer.getBackground(image.colors);

  return (
    <div
      ref={containerRef}
      className="relative w-full h-96 md:h-[500px] overflow-hidden cursor-pointer"
      onClick={handleClick}
      style={{
        background: `linear-gradient(135deg, ${backgroundColor}00, ${backgroundColor}40)`,
      }}
    >
      {/* Canvas for particle effects */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full pointer-events-none z-10"
      />

      {/* Main image */}
      <div className="absolute inset-0 flex items-center justify-center p-4 md:p-8">
        <div className="relative max-w-4xl w-full h-full">
          <img
            ref={imageRef}
            src={image.thumbnail_url || image.image_url}
            alt={image.title}
            className="w-full h-full object-contain rounded-lg shadow-2xl"
            style={{
              filter: 'drop-shadow(0 0 30px rgba(0,0,0,0.3))',
            }}
            loading="eager"
          />

          {/* Title overlay */}
          <div className="absolute bottom-0 left-0 right-0 p-4 md:p-6 bg-gradient-to-t from-black/70 to-transparent rounded-b-lg">
            <h3
              className="text-xl md:text-2xl font-bold text-white mb-1"
              style={{ textShadow: `0 0 10px ${dominantColor}` }}
            >
              {image.title}
            </h3>
            {image.copyright && (
              <p className="text-sm text-white/70">{image.copyright}</p>
            )}
          </div>

          {/* Glow effect */}
          <div
            className="absolute inset-0 rounded-lg opacity-30 blur-3xl -z-10"
            style={{
              background: `radial-gradient(circle at center, ${dominantColor}, transparent 70%)`,
            }}
          />
        </div>
      </div>

      {/* Theme indicator */}
      <div className="absolute top-4 right-4 z-20 flex items-center gap-2 bg-black/30 backdrop-blur-sm px-3 py-1.5 rounded-full">
        <span className="text-xs text-white/80">{image.theme || 'Daily'}</span>
        <div
          className="w-3 h-3 rounded-full"
          style={{ backgroundColor: dominantColor }}
        />
      </div>
    </div>
  );
};
