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
  const isHoveredRef = useRef(isHovered);
  const svgHeightRef = useRef(svgHeight);

  // Синхронне оновлення refs
  svgHeightRef.current = svgHeight;
  isHoveredRef.current = isHovered;

  // Анімаційний цикл — завжди біжить, як в оригіналі
  useEffect(() => {
    const createWave = (y: number): string => {
      const h = svgHeightRef.current;
      const amplitude = 12;
      const frequency = 0.03;
      const points = 50;
      let path = `M 0 ${y + 20}`;

      for (let i = 0; i <= points; i++) {
        const x = (i / points) * 200;
        const waveY = y + Math.sin(x * frequency + waveOffsetRef.current) * amplitude;
        path += ` L ${x} ${waveY}`;
      }

      path += ` L 200 ${h} L 0 ${h} Z`;
      return path;
    };

    const animate = () => {
      const target = targetYRef.current;
      const diff = target - currentYRef.current;
      // Заливка (вгору) 0.08, зливання (вниз) 0.10 — гравітація
      const speed = diff > 0 ? 0.10 : 0.08;
      currentYRef.current += diff * speed;

      // Оновлюємо позицію рівня рідини
      if (liquidLevelRef.current) {
        liquidLevelRef.current.setAttribute('y', currentYRef.current.toString());
      }

      // Хвиля
      waveOffsetRef.current += 0.15;
      if (waveRef.current) {
        waveRef.current.setAttribute('d', createWave(currentYRef.current));
      }

      // Завжди продовжуємо — простота і надійність
      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [svgHeight]);

  // Простий target update — як в оригіналі
  useEffect(() => {
    targetYRef.current = isHovered ? -30 : svgHeight;
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
