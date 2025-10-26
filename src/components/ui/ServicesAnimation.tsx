import { useEffect, useRef } from 'react';
import { createTimeline, stagger } from 'animejs';

interface Service {
  title: string;
  description: string;
}

interface ServicesAnimationProps {
  services: Service[];
  backgroundText: string;
}

export const ServicesAnimation = ({ services, backgroundText }: ServicesAnimationProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const timelineRef = useRef<any>(null);

  // Number of squares per row
  const SQUARES_COUNT = 12;

  useEffect(() => {
    if (!containerRef.current) return;

    // Clean up previous timeline
    if (timelineRef.current) {
      timelineRef.current.pause();
    }

    // Create timeline animation with square reveal effect
    timelineRef.current = createTimeline({
      loop: true,
      defaults: { duration: 500 },
      delay: 500,
      loopDelay: 500
    });

    // Animate each row with different stagger patterns
    const staggerPatterns = [
      { from: 7 },           // Row 1: from index 7
      { from: 'first' },     // Row 2: from first
      { from: 'center' },    // Row 3: from center
      { from: 'last' },      // Row 4: from last
      { from: 0 },           // Row 5: from index 0
      { from: 'random' },    // Row 6: from random
    ];

    services.forEach((_, index) => {
      const rowIndex = index + 1;
      const pattern = staggerPatterns[index] || { from: 'center' };

      // Highlight one square
      if (typeof pattern.from === 'number') {
        timelineRef.current.add(`.row:nth-child(${rowIndex}) .square:nth-child(${pattern.from + 1})`, {
          color: '#FFF',
          scale: 1.2
        });
      } else if (pattern.from === 'first') {
        timelineRef.current.add(`.row:nth-child(${rowIndex}) .square:first-child`, {
          color: '#FFF',
          scale: 1.2
        });
      } else if (pattern.from === 'last') {
        timelineRef.current.add(`.row:nth-child(${rowIndex}) .square:last-child`, {
          color: '#FFF',
          scale: 1.2
        });
      } else if (pattern.from === 'center') {
        timelineRef.current.add(`.row:nth-child(${rowIndex}) .square:nth-child(${Math.floor(SQUARES_COUNT / 2)})`, {
          color: '#FFF',
          scale: 1.2
        });
      }

      // Make squares disappear to reveal text
      timelineRef.current.add(`.row:nth-child(${rowIndex}) .square`, {
        scale: 0,
        delay: stagger(25, pattern as any),
      }, '<');
    });

    // Reset colors
    timelineRef.current.set('.row .square', { color: 'currentColor' });

    // Bring squares back
    timelineRef.current.add('.row .square', {
      scale: 1,
      delay: stagger(25, { from: 'random' }),
    });

    return () => {
      if (timelineRef.current) {
        timelineRef.current.pause();
      }
    };
  }, [services]);

  return (
    <div className="h-full w-full overflow-hidden relative">
      {/* Background text */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0">
        <h2
          className="font-bold text-white/10 select-none"
          style={{ fontSize: 'clamp(3rem, 8vw, 8rem)' }}
        >
          {backgroundText}
        </h2>
      </div>

      {/* Services in column */}
      <div
        ref={containerRef}
        className="relative h-full w-full flex flex-col items-center justify-center gap-1 z-10 px-4"
      >
        {services.map((service, index) => {
          return (
            <div
              key={index}
              className="row relative px-3 py-1.5 w-full max-w-md"
            >
              {/* Service title */}
              <h4
                className="font-bold text-white text-center relative"
                style={{ fontSize: 'clamp(0.75rem, 1.5vw, 1rem)' }}
              >
                {service.title}
              </h4>

              {/* Squares overlay - on top of text */}
              <div className="absolute inset-0 flex items-center justify-center z-20">
                <div className="flex gap-1">
                  {Array.from({ length: SQUARES_COUNT }).map((_, squareIndex) => (
                    <div
                      key={squareIndex}
                      className="square bg-orange-400"
                      style={{
                        width: 'clamp(8px, 1.5vw, 16px)',
                        height: 'clamp(8px, 1.5vw, 16px)',
                        borderRadius: '2px',
                      }}
                    />
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
