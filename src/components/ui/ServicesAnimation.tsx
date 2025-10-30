import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { SplitText } from 'gsap/SplitText';

// Register GSAP plugins
gsap.registerPlugin(SplitText);

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
  const timelineRef = useRef<gsap.core.Timeline | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // Clean up previous timeline
    if (timelineRef.current) {
      timelineRef.current.kill();
    }

    // Split text into characters for animation
    const redTexts = containerRef.current.querySelectorAll('.name--red');
    const blueTexts = containerRef.current.querySelectorAll('.name--blue');

    redTexts.forEach(el => {
      new SplitText(el, { type: 'chars', charsClass: 'serviceChar' });
    });

    blueTexts.forEach(el => {
      new SplitText(el, { type: 'chars', charsClass: 'serviceChar' });
    });

    // Create master timeline
    const masterTl = gsap.timeline({ delay: 0.5 });

    // Intro animation
    const introTl = gsap.timeline({
      defaults: {
        duration: 2,
        ease: 'power4.out'
      }
    });

    introTl.from('.service-names', {
      x: (i) => {
        if (i % 2 === 0) {
          return 1000;
        }
        return -1000;
      },
      stagger: 0.15
    });

    // Loop animation
    const loopTl = gsap.timeline({
      repeat: -1,
      repeatDelay: 0
    });

    // Calculate height for scrolling
    const serviceHeight = 80; // approximate height of each service
    const totalHeight = services.length * serviceHeight;

    loopTl.to('.service-names', {
      y: -totalHeight,
      duration: services.length * 3,
      ease: 'none'
    });

    // Add character animations for last few services
    const lastIndex = services.length - 1;
    const secondLastIndex = services.length - 2;

    if (lastIndex >= 0) {
      loopTl.from(`.service-band:nth-child(${lastIndex + 1}) .name--red .serviceChar`, {
        y: 120,
        duration: 2,
        ease: 'power4.out',
        stagger: 0.03
      }, 1);

      loopTl.from(`.service-band:nth-child(${lastIndex + 1}) .name--blue .serviceChar`, {
        y: 120,
        duration: 2,
        ease: 'power4.out',
        stagger: 0.03
      }, 1.2);
    }

    if (secondLastIndex >= 0) {
      loopTl.from(`.service-band:nth-child(${secondLastIndex + 1}) .name--blue .serviceChar`, {
        y: -120,
        duration: 1.5,
        ease: 'power4.inOut',
        stagger: -0.03
      }, 0);
    }

    masterTl.add(introTl);
    masterTl.add(loopTl, 0);

    timelineRef.current = masterTl;

    return () => {
      if (timelineRef.current) {
        timelineRef.current.kill();
      }
    };
  }, [services]);

  return (
    <div className="h-full w-full overflow-hidden relative">
      <div
        ref={containerRef}
        className="absolute w-[120%] h-[120%] overflow-hidden"
        style={{
          top: '-10%',
          left: '5%',
          transform: 'rotate(-15deg)',
        }}
      >
        {/* Duplicate services multiple times for continuous scroll */}
        {[...Array(3)].map((_, setIndex) => (
          <div key={setIndex}>
            {services.map((service, index) => (
              <h1
                key={`${setIndex}-${index}`}
                className="service-band relative m-0 font-bold"
                style={{
                  height: '80px',
                  fontSize: 'clamp(1.2rem, 2.5vw, 2rem)',
                  lineHeight: '1',
                  letterSpacing: '0px',
                }}
              >
                <span
                  className="service-names block relative w-full overflow-hidden"
                  style={{
                    height: '90px',
                  }}
                >
                  {/* Red version */}
                  <span
                    className={`name name--red ${index === services.length - 1 ? 'name__end name__end--red' : ''} block absolute top-0 left-0 text-red-600`}
                    style={{
                      mixBlendMode: 'multiply',
                      maxWidth: '90%',
                      wordWrap: 'break-word',
                      overflowWrap: 'break-word',
                    }}
                  >
                    {service.title}
                  </span>

                  {/* Blue version (offset) */}
                  <span
                    className={`name name--blue ${index === services.length - 1 ? 'name__end name__end--blue' : ''} block absolute left-0 text-blue-500`}
                    style={{
                      top: '8px',
                      mixBlendMode: 'multiply',
                      maxWidth: '90%',
                      wordWrap: 'break-word',
                      overflowWrap: 'break-word',
                    }}
                  >
                    {service.title}
                  </span>
                </span>
              </h1>
            ))}
          </div>
        ))}
      </div>

      {/* Central SERVICES text overlay */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
        <h2
          className="font-bold text-white text-center select-none"
          style={{
            fontSize: 'clamp(1.2rem, 2.5vw, 2rem)',
            letterSpacing: '0.05em',
            textShadow: '0 0 40px rgba(255, 255, 255, 0.5), 0 0 20px rgba(255, 255, 255, 0.8)',
            mixBlendMode: 'screen',
            transform: 'rotate(-15deg)',
          }}
        >
          {backgroundText}
        </h2>
      </div>
    </div>
  );
};
