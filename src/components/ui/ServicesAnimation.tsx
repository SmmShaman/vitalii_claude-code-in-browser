import { useEffect, useRef, useState } from 'react';
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
  const [isHovered, setIsHovered] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [hoverFontSize, setHoverFontSize] = useState('2rem');
  const timelineRef = useRef<gsap.core.Timeline | null>(null);
  const intervalRef = useRef<number | null>(null);

  // Calculate optimal font size for all services to fit
  useEffect(() => {
    if (!containerRef.current || !isHovered) return;

    const container = containerRef.current;
    const containerHeight = container.clientHeight;

    // Estimate total height needed for all services
    const numServices = services.length;
    const lineHeight = 1.3;
    const gapBetweenLines = 10; // pixels

    // Calculate max font size that fits all services
    let fontSize = 48; // Start with large font
    const minFontSize = 12;

    while (fontSize > minFontSize) {
      const estimatedLineHeight = fontSize * lineHeight;
      const totalHeight = (estimatedLineHeight * numServices) + (gapBetweenLines * (numServices - 1));

      // Check if it fits with some padding
      if (totalHeight < containerHeight * 0.9) {
        break;
      }
      fontSize -= 2;
    }

    setHoverFontSize(`${fontSize}px`);
  }, [isHovered, services]);

  useEffect(() => {
    // Guard: Check if container exists
    if (!containerRef.current) {
      console.warn('ServicesAnimation: Container not ready');
      return;
    }

    const container = containerRef.current;

    // Use requestAnimationFrame to ensure DOM is ready
    requestAnimationFrame(() => {
      const serviceElements = container.querySelectorAll('.service-item');

      // Guard: Check if service elements exist
      if (!serviceElements || serviceElements.length === 0) {
        console.warn('ServicesAnimation: No service elements found');
        return;
      }

      // Clean up previous animations
      if (timelineRef.current) {
        timelineRef.current.kill();
      }
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }

      // If hovered, show all services
      if (isHovered) {
        gsap.set(serviceElements, { autoAlpha: 1, scale: 1, y: 0 });

        // Animate chars for all services
        serviceElements.forEach((element) => {
          const chars = element.querySelectorAll('.char');

          // Guard: Only animate if chars exist
          if (!chars || chars.length === 0) {
            return;
          }

          gsap.fromTo(
            chars,
            {
              opacity: 0,
              x: () => Math.random() * 200 - 100,
              y: () => Math.random() * 200 - 100,
              rotation: () => Math.random() * 720 - 360,
              scale: 0,
            },
            {
              duration: 0.8,
              opacity: 1,
              x: 0,
              y: 0,
              rotation: 0,
              scale: 1,
              ease: 'back.out(1.7)',
              stagger: {
                amount: 0.5,
                from: 'random',
              },
            }
          );
        });
        return;
      }

      // Animation for single service rotation
      const animateService = (index: number) => {
        // Guard: Check if serviceElements still exist
        if (!serviceElements || serviceElements.length === 0) {
          console.warn('ServicesAnimation: Service elements disappeared');
          return;
        }

        // Hide all services
        gsap.set(serviceElements, { autoAlpha: 0 });

        const currentElement = serviceElements[index] as HTMLElement;
        if (!currentElement) {
          console.warn(`ServicesAnimation: Element at index ${index} not found`);
          return;
        }

        // Show current service
        gsap.set(currentElement, { autoAlpha: 1 });

        // Split text into characters
        const text = currentElement.querySelector('.service-text');
        if (!text) {
          console.warn('ServicesAnimation: .service-text not found');
          return;
        }

        // Guard: Check if text has content
        if (!text.textContent || text.textContent.trim() === '') {
          console.warn('ServicesAnimation: Text element is empty');
          return;
        }

        // Clean up old split
        const oldChars = text.querySelectorAll('.char');
        oldChars.forEach((char) => char.remove());

        try {
          // Guard: Check if SplitText is available
          if (typeof SplitText === 'undefined') {
            console.error('ServicesAnimation: SplitText plugin not loaded');
            return;
          }

          const split = new SplitText(text, {
            type: 'chars',
            charsClass: 'char',
          });

          const chars = split.chars;

          // Guard: Check if split created chars
          if (!chars || chars.length === 0) {
            console.warn('ServicesAnimation: SplitText created no characters');
            return;
          }

          // Animate chars gathering
          const tl = gsap.timeline();

          tl.fromTo(
            chars,
            {
              opacity: 0,
              x: () => (Math.random() - 0.5) * 400,
              y: () => (Math.random() - 0.5) * 400,
              rotation: () => (Math.random() - 0.5) * 720,
              scale: 0,
            },
            {
              duration: 2,
              opacity: 1,
              x: 0,
              y: 0,
              rotation: 0,
              scale: 1,
              ease: 'elastic.out(1, 0.5)',
              stagger: {
                amount: 0.8,
                from: 'random',
              },
            }
          );

          // Hold for 1 second
          tl.to({}, { duration: 1 });

          timelineRef.current = tl;
        } catch (error) {
          console.error('ServicesAnimation: Error in SplitText:', error);
        }
      };

      // Start animation with first service
      animateService(currentIndex);

      // Set interval to rotate services (2s animation + 1s hold = 3s total)
      intervalRef.current = window.setInterval(() => {
        setCurrentIndex((prev) => (prev + 1) % services.length);
      }, 3000);
    });

    return () => {
      if (timelineRef.current) {
        timelineRef.current.kill();
      }
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [services, currentIndex, isHovered]);

  return (
    <div
      ref={containerRef}
      className="h-full w-full flex items-center justify-center relative overflow-hidden"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div
        className={`relative w-full h-full flex items-center justify-center ${
          isHovered ? 'flex-col gap-2' : ''
        }`}
        style={{
          padding: isHovered ? '1rem' : '0',
        }}
      >
        {services.map((service, index) => (
          <div
            key={index}
            className={`service-item ${isHovered ? 'relative' : 'absolute inset-0'} flex items-center justify-center`}
            style={{
              visibility: 'hidden',
              opacity: 0,
            }}
          >
            <div
              className="service-text font-bold uppercase text-center px-4"
              style={{
                fontSize: isHovered ? hoverFontSize : 'clamp(1.5rem, 4vw, 3rem)',
                fontWeight: 900,
                color: '#1a1a1a',
                lineHeight: 1.3,
              }}
            >
              {service.title}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
