'use client'

import { useEffect, useRef, useState } from 'react';

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
  const [clipPath, setClipPath] = useState('inset(0 100% 0 0)');
  const animationRef = useRef<number | null>(null);
  const targetRef = useRef(0);
  const currentRef = useRef(0);
  const waveOffsetRef = useRef(0);

  // Animate fill percentage with wave effect — uses refs to avoid 60fps setState
  useEffect(() => {
    targetRef.current = isActive ? 100 : 0;

    const animate = () => {
      const diff = targetRef.current - currentRef.current;
      currentRef.current += diff * 0.08;

      if (Math.abs(diff) < 0.5) {
        currentRef.current = targetRef.current;
      }

      waveOffsetRef.current = (waveOffsetRef.current + 2) % 360;

      // Only update state when clip path actually changes visually
      const fillPercent = currentRef.current;
      const waveOffset = waveOffsetRef.current;

      let newClipPath: string;
      if (fillPercent <= 0) {
        newClipPath = direction === 'ltr' ? 'inset(0 100% 0 0)' : 'inset(0 0 0 100%)';
      } else if (fillPercent >= 100) {
        newClipPath = 'inset(0 0 0 0)';
      } else {
        const points: string[] = [];
        const waveAmplitude = 3;
        const waveFrequency = 4;

        if (direction === 'ltr') {
          points.push('0% 0%');
          for (let i = 0; i <= 20; i++) {
            const y = (i / 20) * 100;
            const wave = Math.sin((y / 100) * waveFrequency * Math.PI * 2 + (waveOffset * Math.PI) / 180) * waveAmplitude;
            const x = Math.min(100, Math.max(0, fillPercent + wave));
            points.push(`${x}% ${y}%`);
          }
          points.push('0% 100%');
        } else {
          points.push('100% 0%');
          for (let i = 0; i <= 20; i++) {
            const y = (i / 20) * 100;
            const wave = Math.sin((y / 100) * waveFrequency * Math.PI * 2 + (waveOffset * Math.PI) / 180) * waveAmplitude;
            const x = Math.max(0, Math.min(100, 100 - fillPercent - wave));
            points.push(`${x}% ${y}%`);
          }
          points.push('100% 100%');
        }
        newClipPath = `polygon(${points.join(', ')})`;
      }

      setClipPath(newClipPath);

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
  }, [isActive, direction]);

  return (
    <span className={`relative inline-block ${className}`}>
      {/* Base text - transparent with thin black outline (glass effect) */}
      <span
        className="font-comfortaa"
        style={{
          fontSize,
          fontWeight,
          color: '#fbbf24',
          WebkitTextStroke: 'none',
        }}
      >
        {text}
      </span>

      {/* Filled text overlay with wave clip */}
      <span
        aria-hidden="true"
        className="absolute inset-0 font-comfortaa select-none"
        style={{
          fontSize,
          fontWeight,
          color: fillColor || 'transparent',
          WebkitTextStroke: fillColor ? '0.5px rgba(79, 70, 229, 0.15)' : 'none',
          clipPath,
          textShadow: fillColor ? `0 0 10px ${fillColor}50` : 'none',
          transition: 'color 300ms ease-out',
        }}
      >
        {text}
      </span>
    </span>
  );
};
