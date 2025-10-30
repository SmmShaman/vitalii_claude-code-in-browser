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
    const fontSize = 80; // Increased from 50 to 80 for better spacing between lines
    const txtElements = wheelRef.current.querySelectorAll('.txt');
    const numLines = txtElements.length;

    // Calculate radius and angle (multiply by 2.5 for thicker cylinder)
    const radius = ((fontSize / 2) / Math.sin((180 / numLines) * (Math.PI / 180))) * 2.5;
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

    // Create main timeline
    const charEase = 'power4.inOut';
    const gtl = gsap.timeline({
      defaults: {
        ease: 'power2.inOut',
        duration: 5 // Increased from 3 to 5 for slower rotation
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

    gtl.timeScale(1.2); // Reduced from 2.5 to 1.2 for slower animation

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
                fontSize: 'clamp(1.2rem, 2.5vw, 2.5rem)',
                fontWeight: 900,
                textTransform: 'uppercase',
                backfaceVisibility: 'hidden',
                transformStyle: 'preserve-3d',
                lineHeight: 1.2,
                textAlign: 'center',
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
