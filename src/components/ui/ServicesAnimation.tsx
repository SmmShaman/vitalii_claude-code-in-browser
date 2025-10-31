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
  const timelineRef = useRef<gsap.core.Timeline | null>(null);
  const intervalRef = useRef<number | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const container = containerRef.current;
    const serviceElements = container.querySelectorAll('.service-item');

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
      // Hide all services
      gsap.set(serviceElements, { autoAlpha: 0 });

      const currentElement = serviceElements[index] as HTMLElement;
      if (!currentElement) return;

      // Show current service
      gsap.set(currentElement, { autoAlpha: 1 });

      // Split text into characters
      const text = currentElement.querySelector('.service-text');
      if (!text) return;

      // Clean up old split
      const oldChars = text.querySelectorAll('.char');
      oldChars.forEach((char) => char.remove());

      const split = new SplitText(text, {
        type: 'chars',
        charsClass: 'char',
      });

      const chars = split.chars;

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
    };

    // Start animation with first service
    animateService(currentIndex);

    // Set interval to rotate services (2s animation + 1s hold = 3s total)
    intervalRef.current = window.setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % services.length);
    }, 3000);

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
      <div className="relative w-full h-full flex flex-col items-center justify-center gap-4">
        {services.map((service, index) => (
          <div
            key={index}
            className="service-item absolute inset-0 flex items-center justify-center"
            style={{
              visibility: 'hidden',
              opacity: 0,
            }}
          >
            <div
              className="service-text font-bold uppercase text-center px-4"
              style={{
                fontSize: 'clamp(1.5rem, 4vw, 3rem)',
                fontWeight: 900,
                color: '#1a1a1a',
                lineHeight: 1.2,
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
