'use client'

import { useEffect, useRef } from 'react';

interface NeonVerticalLabelProps {
  text: string;
  isDarkBackground?: boolean;
  currentLanguage?: string;
  isHovered?: boolean;
  neonColor?: { primary: string; secondary: string };
}

export const NeonVerticalLabel = ({
  text,
  isDarkBackground = false,
  currentLanguage = 'EN',
  isHovered = false,
  neonColor = { primary: '#fc51c9', secondary: '#e707f7' }
}: NeonVerticalLabelProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const letters = text.split('');

  // Зменшуємо розмір для норвезької та української мов
  const isNorwegian = currentLanguage.toLowerCase() === 'no';
  const isUkrainian = currentLanguage.toLowerCase() === 'ua';
  const fontSize = (isNorwegian || isUkrainian) ? 105 : 120;
  const letterSpacing = (isNorwegian || isUkrainian) ? 95 : 130;
  const svgHeight = letters.length * letterSpacing + fontSize;

  const liquidLevelRef = useRef<SVGRectElement>(null);
  const waveRef = useRef<SVGPathElement>(null);
  const animationFrameRef = useRef<number | undefined>(undefined);
  const currentYRef = useRef(svgHeight);
  const targetYRef = useRef(svgHeight);
  const waveOffsetRef = useRef(0);
  const isAnimatingRef = useRef(false);
  const startTimeRef = useRef(0);
  const startYRef = useRef(svgHeight);
  const svgHeightRef = useRef(svgHeight);
  svgHeightRef.current = svgHeight;

  // Тривалість анімації заливки (мс)
  const FILL_DURATION = 800;

  useEffect(() => {
    const createWave = (y: number): string => {
      const h = svgHeightRef.current;
      const amplitude = 10;
      const frequency = 0.03;
      const segments = 20;
      const step = 200 / segments;
      const parts = [`M 0 ${y + 15}`];

      for (let i = 0; i <= segments; i++) {
        const x = i * step;
        const waveY = y + Math.sin(x * frequency + waveOffsetRef.current) * amplitude;
        parts.push(`L ${x.toFixed(1)} ${waveY.toFixed(1)}`);
      }

      parts.push(`L 200 ${h} L 0 ${h} Z`);
      return parts.join(' ');
    };

    const runAnimation = () => {
      if (isAnimatingRef.current) return;
      isAnimatingRef.current = true;
      startTimeRef.current = performance.now();
      startYRef.current = currentYRef.current;
      const capturedTarget = targetYRef.current;
      const capturedStart = startYRef.current;

      const animate = (now: number) => {
        // Якщо target змінився під час анімації — перезапустити
        if (targetYRef.current !== capturedTarget) {
          isAnimatingRef.current = false;
          animationFrameRef.current = undefined;
          runAnimation();
          return;
        }

        const elapsed = now - startTimeRef.current;
        const totalDistance = capturedTarget - capturedStart;
        // Ease-out cubic: швидкий старт, плавне завершення
        const t = Math.min(elapsed / FILL_DURATION, 1);
        const eased = 1 - Math.pow(1 - t, 3);

        currentYRef.current = capturedStart + totalDistance * eased;

        // Оновлюємо SVG
        if (liquidLevelRef.current) {
          liquidLevelRef.current.setAttribute('y', currentYRef.current.toFixed(1));
        }

        waveOffsetRef.current += 0.12;
        if (waveRef.current) {
          waveRef.current.setAttribute('d', createWave(currentYRef.current));
        }

        if (t < 1) {
          animationFrameRef.current = requestAnimationFrame(animate);
        } else {
          // Анімація завершена — ЗУПИНЯЄМО цикл, 0 навантаження в idle
          currentYRef.current = capturedTarget;
          isAnimatingRef.current = false;
          animationFrameRef.current = undefined;
        }
      };

      animationFrameRef.current = requestAnimationFrame(animate);
    };

    targetYRef.current = isHovered ? -30 : svgHeight;
    runAnimation();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        isAnimatingRef.current = false;
      }
    };
  }, [isHovered, svgHeight]);

  const uniqueId = useRef(`neon-${Math.random().toString(36).substr(2, 9)}`).current;

  return (
    <div
      ref={containerRef}
      className="absolute left-1 sm:left-1.5 md:left-2 top-1/2 -translate-y-1/2 z-20 pointer-events-none"
    >
      <svg
        viewBox={`0 0 200 ${svgHeight}`}
        xmlns="http://www.w3.org/2000/svg"
        style={{
          width: 'clamp(35px, 6vw, 55px)',
          height: 'auto',
        }}
      >
        <defs>
          {/* Неоновий ефект для primary кольору */}
          <filter id={`${uniqueId}-primary-glow`} x="-100%" y="-100%" width="300%" height="300%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="8" result="blur1" />
            <feGaussianBlur in="SourceGraphic" stdDeviation="15" result="blur2" />
            <feFlood floodColor={neonColor.primary} floodOpacity="0.9" />
            <feComposite in2="blur1" operator="in" result="glow1" />
            <feFlood floodColor={neonColor.secondary} floodOpacity="0.6" />
            <feComposite in2="blur2" operator="in" result="glow2" />
            <feMerge>
              <feMergeNode in="glow2" />
              <feMergeNode in="glow1" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* Неоновий ефект для secondary кольору */}
          <filter id={`${uniqueId}-secondary-glow`} x="-100%" y="-100%" width="300%" height="300%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="6" result="blur" />
            <feFlood floodColor={neonColor.secondary} floodOpacity="0.8" />
            <feComposite in2="blur" operator="in" result="glow" />
            <feMerge>
              <feMergeNode in="glow" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* Маска для ефекту наповнення з хвилею */}
          <clipPath id={`${uniqueId}-liquid-mask`}>
            <rect ref={liquidLevelRef} id={`${uniqueId}-liquid-level`} x="0" y={svgHeight} width="200" height={svgHeight * 2} />
            <path ref={waveRef} id={`${uniqueId}-wave`} d="" fill="white" />
          </clipPath>
        </defs>

        {/* Контур букв (завжди видимий, темний або світлий залежно від фону) */}
        <text
          x="100"
          y={fontSize}
          fontFamily="Anton, sans-serif"
          fontSize={fontSize}
          textAnchor="middle"
          dominantBaseline="central"
          fill="none"
          stroke="#8B7500"
          strokeWidth="4"
        >
          {letters.map((letter, idx) => (
            <tspan key={idx} x="100" dy={idx === 0 ? "0" : letterSpacing}>
              {letter}
            </tspan>
          ))}
        </text>

        {/* Група з неоновою рідиною (з маскою) */}
        <g clipPath={`url(#${uniqueId}-liquid-mask)`}>
          {/* Primary неоновий шар */}
          <text
            x="100"
            y={fontSize}
            fontFamily="Anton, sans-serif"
            fontSize={fontSize}
            textAnchor="middle"
            dominantBaseline="central"
            fill={neonColor.primary}
            filter={`url(#${uniqueId}-primary-glow)`}
          >
            {letters.map((letter, idx) => (
              <tspan key={idx} x="100" dy={idx === 0 ? "0" : letterSpacing}>
                {letter}
              </tspan>
            ))}
          </text>

          {/* Secondary неоновий шар з режимом змішування */}
          <text
            x="100"
            y={fontSize - 3}
            fontFamily="Anton, sans-serif"
            fontSize={fontSize}
            textAnchor="middle"
            dominantBaseline="central"
            fill={neonColor.secondary}
            filter={`url(#${uniqueId}-secondary-glow)`}
            opacity="0.8"
            style={{ mixBlendMode: 'screen' }}
          >
            {letters.map((letter, idx) => (
              <tspan key={idx} x="100" dy={idx === 0 ? "0" : letterSpacing}>
                {letter}
              </tspan>
            ))}
          </text>
        </g>
      </svg>
    </div>
  );
};
