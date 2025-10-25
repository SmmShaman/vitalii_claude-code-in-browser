import { useEffect, useRef } from 'react';
import { animate, stagger, splitText, utils } from 'animejs';

interface AnimatedHeroTextProps {
  text: string;
  className?: string;
}

export const AnimatedHeroText = ({ text, className = '' }: AnimatedHeroTextProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const splitRef = useRef<any>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // Clean up previous split
    if (splitRef.current) {
      splitRef.current.revert();
    }

    // Create split with lines and words
    splitRef.current = splitText(containerRef.current, {
      lines: true,
      words: true,
    });

    // Add animation effect that updates on split changes
    splitRef.current.addEffect(({ lines, words }: any) => {
      // Animate lines sliding up with stagger
      const linesAnimation = animate(lines, {
        y: ['100%', '0%'],
        opacity: { from: 0 },
        duration: 800,
        delay: stagger(100),
        ease: 'out(expo)',
      });

      // Animate words with color change and slight scale
      const wordsAnimation = animate(words, {
        opacity: { from: 0 },
        scale: { from: 0.8, to: 1 },
        duration: 600,
        delay: stagger(30, { from: 'center' }),
        ease: 'out(elastic)',
      });

      return () => {
        // Cleanup function called before each split recalculation
        linesAnimation.pause();
        wordsAnimation.pause();
      };
    });

    // Add interactive hover effect
    splitRef.current.addEffect((split: any) => {
      const colors: string[] = [];

      split.words.forEach(($el: HTMLElement, i: number) => {
        const color = colors[i];
        if (color) utils.set($el, { color });

        $el.addEventListener('pointerenter', () => {
          animate($el, {
            color: utils.randomPick(['#FF4B4B', '#FFCC2A', '#B7FF54', '#57F695', '#667EEA', '#FF6B9D']),
            scale: 1.15,
            duration: 250,
            ease: 'out(back)',
          });
        });

        $el.addEventListener('pointerleave', () => {
          animate($el, {
            color: '#1f2937',
            scale: 1,
            duration: 200,
            ease: 'inOut(quad)',
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
  }, [text]);

  // Format text to preserve markdown-like formatting
  const formatText = (rawText: string) => {
    return rawText.split('\n').map((line, index) => {
      // Handle bold text **text**
      const parts = line.split(/(\*\*.*?\*\*)/g);
      const formattedLine = parts.map((part, i) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return `<strong key="${i}" class="font-bold">${part.slice(2, -2)}</strong>`;
        }
        return part;
      });

      return formattedLine.join('') + (index < rawText.split('\n').length - 1 ? '<br/>' : '');
    }).join('');
  };

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
        dangerouslySetInnerHTML={{ __html: formatText(text) }}
      />
    </div>
  );
};
