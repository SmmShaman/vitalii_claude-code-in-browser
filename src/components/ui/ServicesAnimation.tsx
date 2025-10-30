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

    // Create timeline animation with 3D rotation effect (slower)
    timelineRef.current = createTimeline({
      loop: true,
      defaults: { duration: 2000, ease: 'easeInOutQuad' },
      delay: 1000,
    });

    // Calculate middle index to insert SERVICES text
    const middleIndex = Math.floor(services.length / 2);

    // Animate first half of services
    for (let i = 0; i < middleIndex; i++) {
      const lineClass = `.service-line-${i}`;

      timelineRef.current.add(lineClass, {
        opacity: [0, 1],
        rotateX: [-90, 0],
        translateZ: [-100, 0],
      }, i * 300);

      timelineRef.current.add(lineClass, {
        opacity: 1,
        duration: 1500,
      });
    }

    // Animate central SERVICES text
    timelineRef.current.add('.central-title', {
      opacity: [0, 1],
      rotateX: [-90, 0],
      translateZ: [-100, 0],
      scale: [0.8, 1],
    }, middleIndex * 300);

    timelineRef.current.add('.central-title', {
      opacity: 1,
      duration: 2000,
    });

    // Animate second half of services
    for (let i = middleIndex; i < services.length; i++) {
      const lineClass = `.service-line-${i}`;

      timelineRef.current.add(lineClass, {
        opacity: [0, 1],
        rotateX: [-90, 0],
        translateZ: [-100, 0],
      }, (i + 1) * 300);

      timelineRef.current.add(lineClass, {
        opacity: 1,
        duration: 1500,
      });
    }

    // Hold all visible
    timelineRef.current.add('.service-line, .central-title', {
      opacity: 1,
      duration: 2500,
    });

    // Disappear central text first
    timelineRef.current.add('.central-title', {
      opacity: [1, 0],
      rotateX: [0, 90],
      translateZ: [0, 100],
      scale: [1, 0.8],
    });

    // Disappear all service lines
    services.forEach((_, index) => {
      const lineClass = `.service-line-${index}`;

      timelineRef.current.add(lineClass, {
        opacity: [1, 0],
        rotateX: [0, 90],
        translateZ: [0, 100],
      }, index * 200);
    });

    return () => {
      if (timelineRef.current) {
        timelineRef.current.pause();
      }
    };
  }, [services, backgroundText]);

  return (
    <div className="h-full w-full overflow-hidden relative">
      {/* Rotating service lines and central title */}
      <div
        ref={containerRef}
        className="relative h-full w-full flex flex-col items-center justify-center gap-2 z-20"
        style={{
          perspective: '1000px',
          perspectiveOrigin: 'center center',
        }}
      >
        {services.map((service, index) => {
          const middleIndex = Math.floor(services.length / 2);

          return (
            <div key={index}>
              {/* First half of services */}
              {index < middleIndex && (
                <div
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
              )}

              {/* Central SERVICES text in the middle */}
              {index === middleIndex && (
                <>
                  <div
                    className="central-title relative w-full my-2"
                    style={{
                      transformStyle: 'preserve-3d',
                      backfaceVisibility: 'hidden',
                      opacity: 0,
                    }}
                  >
                    <h2
                      className="font-bold text-white text-center select-none"
                      style={{
                        fontSize: 'clamp(2.5rem, 6vw, 5rem)',
                        letterSpacing: '0.1em',
                        textShadow: '0 0 30px rgba(255, 255, 255, 0.4)',
                        textTransform: 'uppercase',
                      }}
                    >
                      {backgroundText}
                    </h2>
                  </div>

                  {/* Current service from second half */}
                  <div
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
                </>
              )}

              {/* Second half of services (except middle one already rendered) */}
              {index > middleIndex && (
                <div
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
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
