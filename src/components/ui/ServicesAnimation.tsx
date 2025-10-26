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

const SERVICE_COLORS = [
  'bg-purple-500/80',
  'bg-blue-500/80',
  'bg-green-500/80',
  'bg-yellow-500/80',
  'bg-red-500/80',
  'bg-pink-500/80',
];

export const ServicesAnimation = ({ services, backgroundText }: ServicesAnimationProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const timelineRef = useRef<any>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // Clean up previous timeline
    if (timelineRef.current) {
      timelineRef.current.pause();
    }

    // Create timeline animation
    timelineRef.current = createTimeline({
      loop: true,
      defaults: { duration: 600 },
      delay: 800,
      loopDelay: 1000
    })
    // Animate each row appearing from left
    .add('.service-row', {
      opacity: { from: 0, to: 1 },
      translateX: { from: -100, to: 0 },
      delay: stagger(100, { from: 'first' }),
    })
    // Pause visible
    .add({}, '+=800')
    // Scale pulse from center
    .add('.service-row', {
      scale: { from: 1, to: 1.08 },
      delay: stagger(80, { from: 'center' }),
    })
    // Return to normal
    .add('.service-row', {
      scale: 1,
      delay: stagger(80, { from: 'center' }),
    })
    // Pause
    .add({}, '+=600')
    // Disappear animation to right
    .add('.service-row', {
      opacity: 0,
      translateX: 100,
      delay: stagger(100, { from: 'last' }),
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
        className="relative h-full w-full flex flex-col items-center justify-center gap-3 z-10 px-4"
      >
        {services.map((service, index) => {
          const backgroundColor = SERVICE_COLORS[index % SERVICE_COLORS.length];

          return (
            <div
              key={index}
              className={`service-row ${backgroundColor} backdrop-blur-sm rounded-lg px-4 py-3 w-full max-w-md`}
            >
              <h4
                className="font-bold text-white text-center"
                style={{ fontSize: 'clamp(0.75rem, 1.5vw, 1rem)' }}
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
