import { useEffect, useRef } from 'react';
import { animate, stagger, splitText, utils } from 'animejs';

interface AnimatedHeroTextProps {
  text: string;
  namePattern: RegExp;
  className?: string;
}

export const AnimatedHeroText = ({ text, namePattern, className = '' }: AnimatedHeroTextProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const nameContainerRef = useRef<HTMLSpanElement>(null);
  const splitRef = useRef<any>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // Find and wrap the name
    const match = text.match(namePattern);
    if (!match) {
      containerRef.current.textContent = text;
      return;
    }

    const name = match[0];
    const beforeName = text.substring(0, match.index);
    const afterName = text.substring((match.index || 0) + name.length);

    // Create HTML structure with name in a span
    containerRef.current.innerHTML = `${beforeName}<span class="animated-name" style="display: inline-block; font-weight: 800;">${name}</span>${afterName}`;

    const nameSpan = containerRef.current.querySelector('.animated-name') as HTMLElement;
    if (!nameSpan) return;

    nameContainerRef.current = nameSpan as HTMLSpanElement;

    // Clean up previous split
    if (splitRef.current) {
      splitRef.current.revert();
    }

    // Create split with lines and words on the name only
    splitRef.current = splitText(nameSpan, {
      lines: true,
      words: true,
    });

    const colors: string[] = [];

    // Add lines animation effect
    splitRef.current.addEffect(({ lines }: any) => {
      return animate(lines, {
        y: ['50%', '-50%'],
        loop: true,
        alternate: true,
        delay: stagger(400),
        ease: 'inOutQuad',
      });
    });

    // Add interactive hover effect on words
    splitRef.current.addEffect((split: any) => {
      split.words.forEach(($el: HTMLElement, i: number) => {
        const color = colors[i];
        if (color) utils.set($el, { color });

        $el.addEventListener('pointerenter', () => {
          animate($el, {
            color: utils.randomPick(['#FF4B4B', '#FFCC2A', '#B7FF54', '#57F695']),
            duration: 250,
          });
        });
      });

      return () => {
        // Save colors between splits
        split.words.forEach((w: HTMLElement, i: number) => {
          colors[i] = utils.get(w, 'color');
        });
      };
    });

    return () => {
      if (splitRef.current) {
        splitRef.current.revert();
      }
    };
  }, [text, namePattern]);

  return (
    <div className="w-full h-full overflow-y-auto overflow-x-hidden">
      <div
        ref={containerRef}
        className={`text-gray-800 leading-relaxed whitespace-pre-wrap break-words ${className}`}
        style={{
          fontSize: 'clamp(0.65rem, 1.2vw, 1rem)',
          scrollbarWidth: 'thin',
          scrollbarColor: 'rgba(0, 0, 0, 0.3) transparent',
        }}
      >
        {text}
      </div>
    </div>
  );
};
