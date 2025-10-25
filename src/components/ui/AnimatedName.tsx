import { useEffect, useRef } from 'react';
import { animate, stagger } from 'animejs';

interface AnimatedNameProps {
  fullText: string;
  namePattern: RegExp;
  className?: string;
  style?: React.CSSProperties;
}

export const AnimatedName = ({ fullText, namePattern, className = '', style }: AnimatedNameProps) => {
  const containerRef = useRef<HTMLHeadingElement>(null);
  const animationRef = useRef<any>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const container = containerRef.current;
    const match = fullText.match(namePattern);

    if (!match) {
      container.innerHTML = fullText;
      return;
    }

    const name = match[0];
    const beforeName = fullText.substring(0, match.index);
    const afterName = fullText.substring((match.index || 0) + name.length);

    // Split name into characters manually
    const nameChars = name.split('').map((char) => {
      if (char === ' ') {
        return `<span class="name-char" style="display: inline-block; width: 0.3em; color: #fbbf24; font-weight: 800;">${char}</span>`;
      }
      return `<span class="name-char" style="display: inline-block; color: #fbbf24; font-weight: 800;">${char}</span>`;
    }).join('');

    container.innerHTML = `${beforeName}${nameChars}${afterName}`;

    // Get all character spans
    const chars = container.querySelectorAll('.name-char');

    if (chars.length === 0) return;

    // Cleanup previous animation
    if (animationRef.current) {
      animationRef.current.pause();
    }

    // Animate with continuous loop
    animationRef.current = animate(chars, {
      translateY: [
        { to: -44, duration: 600, ease: 'out(expo)' },
        { to: 0, duration: 800, delay: 100, ease: 'out(bounce)' }
      ],
      rotate: [
        { from: -360, to: 0, duration: 1400, ease: 'out(expo)' }
      ],
      delay: stagger(50),
      loop: true,
      loopDelay: 1000
    });

    return () => {
      if (animationRef.current) {
        animationRef.current.pause();
      }
    };
  }, [fullText, namePattern]);

  return (
    <h1
      ref={containerRef}
      className={className}
      style={{ whiteSpace: 'pre-wrap', ...style }}
    >
      {fullText}
    </h1>
  );
};
