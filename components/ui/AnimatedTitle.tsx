'use client';

import { useEffect, useRef } from 'react';
import { animate } from 'animejs';

interface AnimatedTitleProps {
  text: string;
  className?: string;
}

export const AnimatedTitle = ({ text, className = '' }: AnimatedTitleProps) => {
  const containerRef = useRef<HTMLHeadingElement>(null);
  const hasAnimated = useRef(false);

  useEffect(() => {
    if (!containerRef.current || hasAnimated.current) return;

    // Split text into individual characters, preserving spaces
    const chars = text.split('').map((char) => {
      const span = document.createElement('span');
      span.textContent = char;
      span.style.display = 'inline-block';
      span.style.opacity = '0';

      // Preserve spaces
      if (char === ' ') {
        span.style.width = '0.3em';
      }

      return span;
    });

    // Clear container and add spans
    containerRef.current.innerHTML = '';
    chars.forEach(span => containerRef.current?.appendChild(span));

    // Animate with Anime.js
    const animation = animate(containerRef.current.children, {
      opacity: [0, 1],
      translateY: [20, 0],
      scale: [0.6, 1],
      rotate: [-10, 0],
      easing: 'out(elastic, 1, 0.6)',
      duration: 1200,
      delay: (_target: unknown, i: number) => 300 + i * 50, // 50ms between each letter, start after 300ms
    });

    hasAnimated.current = true;

    // Cleanup
    return () => {
      if (animation) {
        animation.pause();
      }
    };
  }, [text]);

  return (
    <h1
      ref={containerRef}
      className={className}
      style={{ whiteSpace: 'pre-wrap' }}
    >
      {text}
    </h1>
  );
};
