'use client'

import { useEffect, useRef, useState, useCallback } from 'react';

interface HeroTextAnimationProps {
  text: string;
  fillColor: string | null;
  isActive: boolean;
  direction?: 'ltr' | 'rtl'; // ltr = left to right, rtl = right to left
  fontSize?: string;
  className?: string;
  fontWeight?: string;
}

export const HeroTextAnimation = ({
  text,
  fillColor,
  isActive,
  direction = 'ltr',
  fontSize = 'clamp(0.875rem, 1.5vw, 1.25rem)',
  className = '',
  fontWeight = '700',
}: HeroTextAnimationProps) => {
  const [fillPercent, setFillPercent] = useState(0);
  const [waveOffset, setWaveOffset] = useState(0);
  const animationRef = useRef<number | null>(null);
  const targetRef = useRef(0);
  const currentRef = useRef(0);

  // Animate fill percentage with wave effect
  useEffect(() => {
    targetRef.current = isActive ? 100 : 0;

    const animate = () => {
      const diff = targetRef.current - currentRef.current;
      currentRef.current += diff * 0.08;

      // Prevent tiny fluctuations
      if (Math.abs(diff) < 0.5) {
        currentRef.current = targetRef.current;
      }

      setFillPercent(currentRef.current);

      // Animate wave
      setWaveOffset((prev) => (prev + 2) % 360);

      if (Math.abs(diff) > 0.1 || isActive) {
        animationRef.current = requestAnimationFrame(animate);
      }
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isActive]);

  // Generate wave polygon for clip-path
  const getWaveClipPath = useCallback(() => {
    if (fillPercent <= 0) {
      return direction === 'ltr' ? 'inset(0 100% 0 0)' : 'inset(0 0 0 100%)';
    }
    if (fillPercent >= 100) {
      return 'inset(0 0 0 0)';
    }

    // Create wave effect using polygon
    const points: string[] = [];
    const waveAmplitude = 3; // Wave height in percentage
    const waveFrequency = 4; // Number of waves
    const basePercent = fillPercent;

    if (direction === 'ltr') {
      // Start from top-left
      points.push('0% 0%');

      // Wave edge (vertical, moving right)
      for (let i = 0; i <= 20; i++) {
        const y = (i / 20) * 100;
        const wave = Math.sin((y / 100) * waveFrequency * Math.PI * 2 + (waveOffset * Math.PI) / 180) * waveAmplitude;
        const x = Math.min(100, Math.max(0, basePercent + wave));
        points.push(`${x}% ${y}%`);
      }

      // Bottom-left corner
      points.push('0% 100%');
    } else {
      // RTL: Start from top-right
      points.push('100% 0%');

      // Wave edge (vertical, moving left)
      for (let i = 0; i <= 20; i++) {
        const y = (i / 20) * 100;
        const wave = Math.sin((y / 100) * waveFrequency * Math.PI * 2 + (waveOffset * Math.PI) / 180) * waveAmplitude;
        const x = Math.max(0, Math.min(100, 100 - basePercent - wave));
        points.push(`${x}% ${y}%`);
      }

      // Bottom-right corner
      points.push('100% 100%');
    }

    return `polygon(${points.join(', ')})`;
  }, [fillPercent, waveOffset, direction]);

  return (
    <span className={`relative inline-block ${className}`}>
      {/* Base text - transparent with thin black outline (glass effect) */}
      <span
        className="font-comfortaa"
        style={{
          fontSize,
          fontWeight,
          color: 'transparent',
          WebkitTextStroke: '0.5px rgba(0, 0, 0, 0.4)',
        }}
      >
        {text}
      </span>

      {/* Filled text overlay with wave clip */}
      <span
        className="absolute inset-0 font-comfortaa"
        style={{
          fontSize,
          fontWeight,
          color: fillColor || 'transparent',
          WebkitTextStroke: fillColor ? '0.5px rgba(0, 0, 0, 0.3)' : 'none',
          clipPath: getWaveClipPath(),
          textShadow: fillColor ? `0 0 10px ${fillColor}50` : 'none',
          transition: 'color 300ms ease-out',
        }}
      >
        {text}
      </span>
    </span>
  );
};
