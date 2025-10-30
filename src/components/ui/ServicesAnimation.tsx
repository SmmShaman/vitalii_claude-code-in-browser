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
    const fontSize = 32; // Reduced for more compact display
    const txtElements = wheelRef.current.querySelectorAll('.txt');
    const numLines = txtElements.length;

    // Calculate radius with larger multiplier for better spacing
    const radius = (fontSize * 1.5) / Math.sin((180 / numLines) * (Math.PI / 180));
    const angle = 360 / numLines;
    const origin = `50% 50% -${radius}px`;

    // Split text into characters (split by lines first to preserve word structure)
    txtElements.forEach((txt) => {
      const lines = txt.querySelectorAll('.service-line');
      lines.forEach((line) => {
        new SplitText(line, {
          type: 'chars',
          charsClass: 'char',
          position: 'absolute'
        });
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

    // Create main timeline with enhanced effects
    const charEase = 'elastic.inOut(1, 0.5)';
    const gtl = gsap.timeline({
      defaults: {
        ease: 'power3.inOut',
        duration: 2.5
      },
      repeat: -1
    });

    gtl.to(wheelRef.current, {
      rotationX: -90,
      transformOrigin: '50% 50%',
      ease: 'power2.inOut'
    })
    .to('.char:nth-child(even)', {
      rotationY: 25,
      z: 80,
      transformOrigin: origin,
      duration: 2,
      ease: 'back.out(1.5)'
    }, '-=1.5')
    .to('.char:nth-child(odd)', {
      fontWeight: 100,
      scale: 0.8,
      ease: charEase
    }, '-=2')
    .to(wheelRef.current, {
      rotationX: -180,
      transformOrigin: '50% 50%'
    }, '-=0.3')
    .to('.char:nth-child(odd)', {
      rotationY: -25,
      z: 80,
      transformOrigin: origin,
      duration: 2,
      ease: 'back.out(1.5)'
    }, '-=1.5')
    .to('.char:nth-child(even)', {
      fontWeight: 100,
      scale: 0.8,
      ease: charEase
    }, '-=2')
    .to(wheelRef.current, {
      rotationX: -270,
      transformOrigin: '50% 50%'
    }, '-=0.3')
    .to('.char:nth-child(even)', {
      rotationY: 25,
      z: 80,
      transformOrigin: origin,
      duration: 2,
      ease: 'back.out(1.5)'
    }, '-=1.5')
    .to('.char:nth-child(odd)', {
      fontWeight: 900,
      scale: 1.2,
      ease: charEase
    }, '-=2')
    .to(wheelRef.current, {
      rotationX: -360,
      transformOrigin: '50% 50%'
    }, '-=0.3')
    .to('.char:nth-child(odd)', {
      rotationY: 0,
      z: 0,
      transformOrigin: origin,
      duration: 2
    }, '-=1.5')
    .to('.char:nth-child(even)', {
      fontWeight: 900,
      scale: 1,
      rotationY: 0,
      z: 0,
      ease: charEase
    }, '-=2')
    .set('.char', {
      rotationX: 0,
      rotationY: 0,
      z: 0,
      scale: 1,
      immediateRender: false
    })
    .set(wheelRef.current, {
      rotationX: 0,
      immediateRender: false
    });

    gtl.timeScale(3);

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
      className="h-full w-full flex items-center justify-center relative overflow-hidden"
      style={{
        perspective: '800px',
        visibility: 'hidden',
        opacity: 0,
      }}
    >
      <div
        ref={wheelRef}
        className="relative w-full h-full"
        style={{
          transformStyle: 'preserve-3d',
        }}
      >
        {services.map((service, index) => {
          // Split service title into lines if it's too long or has multiple words
          const words = service.title.split(/\s+/);
          const lines: string[] = [];

          // Group words into lines (max 3 words per line or if "&" present, split there)
          if (words.length <= 2) {
            lines.push(service.title);
          } else {
            // Find natural break points like "&", "and", "та"
            const breakIndex = words.findIndex(w => w === '&' || w.toLowerCase() === 'and' || w === 'та');
            if (breakIndex > 0) {
              lines.push(words.slice(0, breakIndex + 1).join(' '));
              lines.push(words.slice(breakIndex + 1).join(' '));
            } else {
              // Split roughly in half
              const mid = Math.ceil(words.length / 2);
              lines.push(words.slice(0, mid).join(' '));
              lines.push(words.slice(mid).join(' '));
            }
          }

          return (
            <div
              key={index}
              className="txt absolute m-0 font-bold uppercase"
              style={{
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                fontSize: 'clamp(1rem, 2vw, 2rem)',
                fontWeight: 900,
                textTransform: 'uppercase',
                backfaceVisibility: 'hidden',
                transformStyle: 'preserve-3d',
                lineHeight: 1.2,
                textAlign: 'center',
                background: 'linear-gradient(45deg, #00d4ff, #7c3aed, #00d4ff)',
                backgroundSize: '200% 200%',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
                filter: 'drop-shadow(0 0 15px rgba(0, 212, 255, 0.6))',
              }}
            >
              {lines.map((line, lineIndex) => (
                <div
                  key={lineIndex}
                  className="service-line"
                  style={{
                    whiteSpace: 'nowrap',
                  }}
                >
                  {line}
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
};
