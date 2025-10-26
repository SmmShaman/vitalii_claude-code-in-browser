import { useEffect, useRef } from 'react';
import { animate, stagger, splitText, utils } from 'animejs';

interface AnimatedHeroTextProps {
  text: string;
  namePattern: RegExp;
  className?: string;
}

export const AnimatedHeroText = ({ text, namePattern, className = '' }: AnimatedHeroTextProps) => {
  const containerRef = useRef<HTMLParagraphElement>(null);
  const splitRef = useRef<any>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // Find the name in text
    const match = text.match(namePattern);
    if (!match) {
      containerRef.current.textContent = text;
      return;
    }

    const name = match[0];
    const beforeName = text.substring(0, match.index);
    const afterName = text.substring((match.index || 0) + name.length);

    // Set text with name wrapped in paragraph
    containerRef.current.innerHTML = `${beforeName}<p class="name-paragraph" style="display: inline; font-weight: 800; color: #1f2937;">${name}</p>${afterName}`;

    // Get the paragraph with the name
    const nameParagraph = containerRef.current.querySelector('.name-paragraph');
    if (!nameParagraph) {
      console.error('Name paragraph not found');
      return;
    }

    console.log('Name paragraph found:', nameParagraph);

    // Clean up previous split
    if (splitRef.current) {
      splitRef.current.revert();
    }

    const colors: string[] = [];

    // Split text on the name paragraph
    splitRef.current = splitText(nameParagraph, {
      lines: true,
    });

    console.log('Split created:', splitRef.current);

    // Add lines animation effect - exactly as in documentation
    splitRef.current.addEffect(({ lines }: any) => {
      console.log('addEffect called with lines:', lines);
      return animate(lines, {
        y: ['50%', '-50%'],
        loop: true,
        alternate: true,
        delay: stagger(400),
        ease: 'inOutQuad',
      });
    });

    // Add hover effect on words
    splitRef.current.addEffect((split: any) => {
      console.log('addEffect called with split:', split);
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
      <p
        ref={containerRef}
        className={`text-gray-800 leading-relaxed whitespace-pre-wrap break-words ${className}`}
        style={{
          fontSize: 'clamp(0.65rem, 1.2vw, 1rem)',
          scrollbarWidth: 'thin',
          scrollbarColor: 'rgba(0, 0, 0, 0.3) transparent',
        }}
      />
    </div>
  );
};
