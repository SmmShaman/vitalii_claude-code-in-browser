import { useEffect, useRef } from 'react';
import { createTimeline } from 'animejs';

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

    // Create timeline animation with 3D rotation effect
    timelineRef.current = createTimeline({
      loop: true,
      defaults: { duration: 1200, ease: 'easeInOutQuad' },
      delay: 500,
    });

    // Animate each service line with 3D rotation
    services.forEach((_, index) => {
      const lineClass = `.service-line-${index}`;

      // Appear: rotate from back to front
      timelineRef.current.add(lineClass, {
        opacity: [0, 1],
        rotateX: [-90, 0],
        translateZ: [-100, 0],
      }, index * 200);

      // Hold visible
      timelineRef.current.add(lineClass, {
        opacity: 1,
        duration: 1000,
      });
    });

    // Hold all visible
    timelineRef.current.add('.service-line', {
      opacity: 1,
      duration: 1500,
    });

    // Disappear: rotate forward
    services.forEach((_, index) => {
      const lineClass = `.service-line-${index}`;

      timelineRef.current.add(lineClass, {
        opacity: [1, 0],
        rotateX: [0, 90],
        translateZ: [0, 100],
      }, index * 150);
    });

    return () => {
      if (timelineRef.current) {
        timelineRef.current.pause();
      }
    };
  }, [services]);

  return (
    <div className="h-full w-full overflow-hidden relative">
      {/* Central "SERVICES" text */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
        <h2
          className="font-bold text-white select-none"
          style={{
            fontSize: 'clamp(2.5rem, 6vw, 5rem)',
            letterSpacing: '0.1em',
            textShadow: '0 0 20px rgba(255, 255, 255, 0.3)'
          }}
        >
          {backgroundText}
        </h2>
      </div>

      {/* Rotating service lines */}
      <div
        ref={containerRef}
        className="relative h-full w-full flex flex-col items-center justify-center gap-2 z-20"
        style={{
          perspective: '800px',
          perspectiveOrigin: 'center center',
        }}
      >
        {services.map((service, index) => {
          return (
            <div
              key={index}
              className={`service-line service-line-${index} relative w-full`}
              style={{
                transformStyle: 'preserve-3d',
                backfaceVisibility: 'hidden',
                opacity: 0,
              }}
            >
              <h4
                className="font-bold text-red-600 text-center relative px-4"
                style={{
                  fontSize: 'clamp(0.8rem, 1.6vw, 1.1rem)',
                  letterSpacing: '0.05em',
                  textTransform: 'uppercase',
                }}
              >
                {service.title}
              </h4>
            </div>
          );
        })}
      </div>
    </div>
  );
};
