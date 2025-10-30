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

export const ServicesAnimation = ({ services }: ServicesAnimationProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const wheelRef = useRef<HTMLDivElement>(null);
  const timelineRef = useRef<gsap.core.Timeline | null>(null);

  useEffect(() => {
    if (!containerRef.current || !wheelRef.current) return;

    // Clean up previous timeline
    if (timelineRef.current) {
      timelineRef.current.kill();
    }

    // Get computed font size
    const fontSize = 50; // Base font size in px
    const txtElements = wheelRef.current.querySelectorAll('.txt');
    const numLines = txtElements.length;

    // Calculate radius and angle
    const radius = (fontSize / 2) / Math.sin((180 / numLines) * (Math.PI / 180));
    const angle = 360 / numLines;
    const origin = `50% 50% -${radius}px`;

    // Split text into characters
    txtElements.forEach((txt) => {
      new SplitText(txt, {
        type: 'chars',
        charsClass: 'char',
        position: 'absolute'
      });
    });

    // Position text elements around the wheel
    gsap.set('.txt', {
      rotationX: (index) => angle * index,
      z: radius,
      transformOrigin: origin
    });

    // Make container visible
    gsap.set(containerRef.current, { autoAlpha: 1 });

    // Create main timeline
    const charEase = 'power4.inOut';
    const gtl = gsap.timeline({
      defaults: {
        ease: 'power2.inOut',
        duration: 3
      },
      repeat: -1
    });

    gtl.to(wheelRef.current, {
      rotationX: -60,
      transformOrigin: '50% 50%'
    })
    .to('.char:nth-child(even)', {
      rotationX: 60,
      transformOrigin: origin,
      duration: 2
    }, '-=1')
    .to('.char:nth-child(odd)', {
      fontWeight: 300,
      ease: charEase
    }, '-=2')
    .to(wheelRef.current, {
      rotationX: -120,
      transformOrigin: '50% 50%'
    }, '-=0.5')
    .to('.char:nth-child(odd)', {
      rotationX: 120,
      transformOrigin: origin,
      duration: 2
    }, '-=1')
    .to('.char:nth-child(even)', {
      fontWeight: 300,
      ease: charEase
    }, '-=2')
    .to(wheelRef.current, {
      rotationX: -180,
      transformOrigin: '50% 50%'
    }, '-=0.5')
    .to('.char:nth-child(even)', {
      rotationX: 180,
      transformOrigin: origin,
      duration: 2
    }, '-=1')
    .to('.char:nth-child(odd)', {
      fontWeight: 900,
      ease: charEase
    }, '-=2')
    .to(wheelRef.current, {
      rotationX: -240,
      transformOrigin: '50% 50%'
    }, '-=0.5')
    .to('.char:nth-child(odd)', {
      rotationX: 240,
      transformOrigin: origin,
      duration: 2
    }, '-=1')
    .to('.char:nth-child(even)', {
      fontWeight: 900,
      ease: charEase
    }, '-=2')
    .set('.char', {
      rotationX: 0,
      immediateRender: false
    })
    .set(wheelRef.current, {
      rotationX: 0,
      immediateRender: false
    });

    gtl.timeScale(2.5);

    timelineRef.current = gtl;

    return () => {
      if (timelineRef.current) {
        timelineRef.current.kill();
      }
    };
  }, [services]);

  return (
    <div
      ref={containerRef}
      className="h-full w-full flex items-center justify-center"
      style={{
        perspective: '1200px',
        visibility: 'hidden',
        opacity: 0,
      }}
    >
      <div
        ref={wheelRef}
        className="relative w-full h-full"
        style={{
          minWidth: '900px',
          transformStyle: 'preserve-3d',
        }}
      >
        {services.map((service, index) => (
          <p
            key={index}
            className="txt absolute m-0 font-bold uppercase"
            style={{
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              fontSize: 'clamp(1.5rem, 3vw, 3rem)',
              fontWeight: 900,
              textTransform: 'uppercase',
              backfaceVisibility: 'hidden',
              transformStyle: 'preserve-3d',
              lineHeight: 1,
              whiteSpace: 'nowrap',
              textShadow: '0 0 20px rgba(255,255,255,0.5)',
            }}
          >
            {service.title}
          </p>
        ))}
      </div>
    </div>
  );
};
