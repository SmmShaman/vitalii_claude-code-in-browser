import { useEffect, useRef } from 'react';
import gsap from 'gsap';

interface Service {
  title: string;
  description: string;
}

interface ServicesAnimationProps {
  services: Service[];
  backgroundText: string;
}

// Different background colors for each service
const SERVICE_COLORS = [
  'bg-blue-500/20',
  'bg-purple-500/20',
  'bg-green-500/20',
  'bg-orange-500/20',
  'bg-pink-500/20',
  'bg-teal-500/20',
];

export const ServicesAnimation = ({ services, backgroundText }: ServicesAnimationProps) => {
  const serviceRefs = useRef<(HTMLDivElement | null)[]>([]);
  const animationsRef = useRef<gsap.core.Tween[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Clear previous animations
    animationsRef.current.forEach(anim => anim.kill());
    animationsRef.current = [];

    // Create continuous movement animations for each service
    serviceRefs.current.forEach((element, index) => {
      if (!element) return;

      const isLeftToRight = index % 2 === 0;
      const verticalSpacing = 100 / (services.length + 1);
      const top = verticalSpacing * (index + 1);

      // Set initial position
      gsap.set(element, {
        top: `${top}%`,
        left: isLeftToRight ? '0%' : '100%',
        xPercent: -50,
        yPercent: -50,
      });

      // Create continuous horizontal movement
      const duration = 20; // 20 seconds to cross the screen

      if (isLeftToRight) {
        // Move from left (0%) to right (100%)
        const tween = gsap.to(element, {
          left: '100%',
          duration: duration,
          ease: 'none',
          repeat: -1,
          modifiers: {
            left: (value) => {
              // Loop back to 0% when reaching 100%
              const numValue = parseFloat(value);
              return `${numValue % 100}%`;
            }
          }
        });
        animationsRef.current.push(tween);
      } else {
        // Move from right (100%) to left (0%)
        const tween = gsap.to(element, {
          left: '0%',
          duration: duration,
          ease: 'none',
          repeat: -1,
          modifiers: {
            left: (value) => {
              // Loop back to 100% when reaching 0%
              const numValue = parseFloat(value);
              return numValue <= 0 ? '100%' : `${numValue}%`;
            }
          }
        });
        animationsRef.current.push(tween);
      }
    });

    return () => {
      animationsRef.current.forEach(anim => anim.kill());
    };
  }, [services.length]);

  const handleMouseEnter = () => {
    // Pause all animations and distribute services evenly
    animationsRef.current.forEach(anim => anim.pause());

    serviceRefs.current.forEach((element, index) => {
      if (!element) return;

      const horizontalSpacing = 100 / (services.length + 1);
      const verticalSpacing = 100 / (services.length + 1);

      gsap.to(element, {
        left: `${horizontalSpacing * (index + 1)}%`,
        top: `${verticalSpacing * (index + 1)}%`,
        duration: 0.6,
        ease: 'power2.out',
      });
    });
  };

  const handleMouseLeave = () => {
    // Resume animations
    serviceRefs.current.forEach((element, index) => {
      if (!element) return;

      const verticalSpacing = 100 / (services.length + 1);
      const top = verticalSpacing * (index + 1);

      // Animate back to proper vertical position
      gsap.to(element, {
        top: `${top}%`,
        duration: 0.6,
        ease: 'power2.out',
        onComplete: () => {
          // Resume continuous movement after settling
          animationsRef.current[index]?.resume();
        }
      });
    });
  };

  return (
    <div
      ref={containerRef}
      className="h-full w-full overflow-hidden relative"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Background text */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0">
        <h2 className="text-6xl sm:text-7xl md:text-8xl lg:text-9xl font-bold text-white/10 select-none">
          {backgroundText}
        </h2>
      </div>

      {/* Services */}
      <div className="relative h-full w-full z-10" style={{ padding: '5px' }}>
        <div className="relative w-full h-full">
          {services.map((service, index) => {
            const backgroundColor = SERVICE_COLORS[index % SERVICE_COLORS.length];

            return (
              <div
                key={index}
                ref={(el) => {
                  serviceRefs.current[index] = el;
                }}
                className={`absolute ${backgroundColor} backdrop-blur-sm rounded-lg p-3`}
                style={{
                  maxWidth: '280px',
                  minWidth: '200px',
                  zIndex: 10 + index,
                }}
              >
                <h4 className="text-sm sm:text-base font-bold text-white mb-1">
                  {service.title}
                </h4>
                <p className="text-xs sm:text-sm text-white/80">
                  {service.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
