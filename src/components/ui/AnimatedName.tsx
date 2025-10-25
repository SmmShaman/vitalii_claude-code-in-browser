import { useEffect, useRef } from 'react';
import { animate, stagger, splitText } from 'animejs';

interface AnimatedNameProps {
  fullText: string; // e.g., "Vitalii Berbeha, an expert..."
  namePattern: RegExp; // e.g., /Vitalii Berbeha/
  className?: string;
}

export const AnimatedName = ({ fullText, namePattern, className = '' }: AnimatedNameProps) => {
  const containerRef = useRef<HTMLHeadingElement>(null);
  const animationRef = useRef<any>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const container = containerRef.current;

    // Split text into name and rest
    const match = fullText.match(namePattern);

    if (!match) {
      // If no match, just show static text
      container.innerHTML = fullText;
      return;
    }

    const name = match[0]; // e.g., "Vitalii Berbeha"
    const beforeName = fullText.substring(0, match.index);
    const afterName = fullText.substring((match.index || 0) + name.length);

    // Create HTML structure
    container.innerHTML = `
      ${beforeName}<span class="animated-name" style="color: #fbbf24; font-weight: 800;">${name}</span>${afterName}
    `;

    // Get the name span
    const nameSpan = container.querySelector('.animated-name') as HTMLElement;
    if (!nameSpan) return;

    // Split the name into characters using Anime.js splitText
    const { chars } = splitText(nameSpan, { words: false, chars: true });

    // Animate with continuous loop
    animationRef.current = animate(chars, {
      // Property keyframes
      y: [
        { to: '-2.75rem', ease: 'out(expo)', duration: 600 },
        { to: 0, ease: 'out(bounce)', duration: 800, delay: 100 }
      ],
      // Property specific parameters
      rotate: {
        from: '-1turn',
        delay: 0
      },
      delay: stagger(50),
      ease: 'inOut(circ)',
      loopDelay: 1000,
      loop: true
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
      style={{ whiteSpace: 'pre-wrap' }}
    >
      {fullText}
    </h1>
  );
};
