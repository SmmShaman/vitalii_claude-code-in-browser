import { useEffect, useRef } from 'react';
import { animate, stagger, splitText, utils } from 'animejs';

interface AnimatedHeaderTitleProps {
  text: string;
  namePattern: RegExp;
}

export const AnimatedHeaderTitle = ({ text, namePattern }: AnimatedHeaderTitleProps) => {
  const containerRef = useRef<HTMLHeadingElement>(null);
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
    containerRef.current.innerHTML = `${beforeName}<p class="name-paragraph" style="display: inline; font-weight: 800; color: #fbbf24;">${name}</p>${afterName}`;

    // Get the paragraph with the name
    const nameParagraph = containerRef.current.querySelector('.name-paragraph') as HTMLElement;
    if (!nameParagraph) {
      return;
    }

    // Clean up previous split
    if (splitRef.current) {
      splitRef.current.revert();
    }

    const colors: string[] = [];

    // Split text on the name paragraph
    splitRef.current = splitText(nameParagraph, {
      lines: true,
    });

    // Add lines animation effect - reduced amplitude
    splitRef.current.addEffect(({ lines }: any) => {
      return animate(lines, {
        y: ['25%', '-25%'],
        loop: true,
        alternate: true,
        delay: stagger(400),
        ease: 'inOutQuad',
      });
    });

    // Add hover effect on words
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
    <h1
      ref={containerRef}
      className="font-bold text-gray-800 mb-0.5 leading-tight"
      style={{ fontSize: 'clamp(1.75rem, 3.5vw, 3rem)' }}
    />
  );
};
