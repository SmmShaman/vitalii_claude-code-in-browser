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

  useEffect(() => {
    if (!containerRef.current) return;

    // Clean up previous timeline
    if (timelineRef.current) {
      timelineRef.current.pause();
    }

    // Create timeline animation with letter reveal effect
    timelineRef.current = createTimeline({
      loop: true,
      defaults: { duration: 800 },
      delay: 500,
      loopDelay: 1000
    });

    // Animate each service row
    services.forEach((_, index) => {
      const rowIndex = index + 1;

      // Make letters appear one by one
      timelineRef.current.add(`.row:nth-child(${rowIndex}) .letter`, {
        opacity: [0, 1],
        translateY: [20, 0],
        delay: stagger(50),
      }, index === 0 ? 0 : '-=400');
    });

    // Hold visible state
    timelineRef.current.add('.letter', {
      opacity: 1,
      duration: 1500,
    });

    // Make letters disappear one by one
    services.forEach((_, index) => {
      const rowIndex = index + 1;

      timelineRef.current.add(`.row:nth-child(${rowIndex}) .letter`, {
        opacity: [1, 0],
        translateY: [0, -20],
        delay: stagger(30, { from: 'random' }),
      }, index === 0 ? '-=400' : '-=600');
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
        className="relative h-full w-full flex flex-col items-center justify-center gap-1 z-10"
      >
        {services.map((service, index) => {
          return (
            <div
              key={index}
              className="row relative py-1 w-full"
            >
              {/* Service title with animated letters */}
              <h4
                className="font-bold text-white text-center relative px-4 flex items-center justify-center flex-wrap gap-x-1"
                style={{ fontSize: 'clamp(0.7rem, 1.4vw, 0.95rem)' }}
              >
                {service.title.split('').map((char, charIndex) => (
                  <span
                    key={charIndex}
                    className="letter inline-block"
                    style={{
                      opacity: 0,
                      whiteSpace: char === ' ' ? 'pre' : 'normal'
                    }}
                  >
                    {char === ' ' ? '\u00A0' : char}
                  </span>
                ))}
              </h4>
            </div>
          );
        })}
      </div>
    </div>
  );
};
