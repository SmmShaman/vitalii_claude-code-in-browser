import { useEffect, useRef, useState, useCallback } from 'react';
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
  currentLanguage?: string;
}

export const ServicesAnimation = ({ services, currentLanguage = 'EN' }: ServicesAnimationProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isHovered, setIsHovered] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [hoverFontSize, setHoverFontSize] = useState('2rem');
  const timelineRef = useRef<gsap.core.Timeline | null>(null);
  const intervalRef = useRef<number | null>(null);
  const retryCountRef = useRef<number>(0);
  const maxRetries = 10;
  const splitTextsRef = useRef<SplitText[]>([]);


  // Calculate optimal font size for all services to fit
  useEffect(() => {
    if (!containerRef.current || !isHovered) return;

    const container = containerRef.current;
    const containerHeight = container.clientHeight;

    // Estimate total height needed for all services
    const numServices = services.length;
    const lineHeight = 1.3;
    // Зменшуємо відступ для української мови через довші назви
    const isUkrainian = currentLanguage.toLowerCase() === 'ua';
    const gapBetweenLines = isUkrainian ? 5 : 10; // pixels

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
  }, [isHovered, services, currentLanguage]);

  // Function to start rotation animation
  const startRotation = useCallback(() => {
    if (!containerRef.current) return;

    const container = containerRef.current;
    const serviceElements = container.querySelectorAll('.service-item');

    const animateService = (index: number) => {
      if (!serviceElements || serviceElements.length === 0) return;

      console.log(`🎯 Starting animation for service ${index}`);

      // Hide all services first
      gsap.set(serviceElements, { autoAlpha: 0 });

      const currentElement = serviceElements[index] as HTMLElement;
      if (!currentElement) return;

      // Show current service
      gsap.set(currentElement, { autoAlpha: 1 });

      const chars = currentElement.querySelectorAll('.char');
      if (!chars || chars.length === 0) return;

      // IMPORTANT: Set initial scattered positions for current chars
      gsap.set(chars, {
        opacity: 0,
        x: () => (Math.random() - 0.5) * 800,
        y: () => (Math.random() - 0.5) * 800,
        rotation: () => (Math.random() - 0.5) * 720,
        scale: 0,
      });

      // Animate chars gathering
      const tl = gsap.timeline();

      tl.to(chars, {
        duration: 2,
        opacity: 1,
        x: 0,
        y: 0,
        rotation: 0,
        scale: 1,
        ease: 'elastic.out(1, 0.5)',
        stagger: {
          amount: 0.4,
          from: 'random',
        },
      });

      tl.to({}, { duration: 1 });
      timelineRef.current = tl;
    };

    // Start with current index
    animateService(currentIndex);

    // Set interval for rotation
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    intervalRef.current = window.setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % services.length);
    }, 3000);
  }, [currentIndex, services.length]);

  // Main initialization effect - runs when services change (language change)
  useEffect(() => {
    if (!containerRef.current) {
      console.warn('ServicesAnimation: Container not ready');
      return;
    }

    const container = containerRef.current;

    // Cleanup previous SplitText instances before creating new ones
    if (splitTextsRef.current.length > 0) {
      splitTextsRef.current.forEach((split) => split.revert());
      splitTextsRef.current = [];
    }

    // Function to check if elements have text content
    const hasTextContent = (elements: NodeListOf<Element>): boolean => {
      return Array.from(elements).some(el => {
        const text = el.querySelector('.service-text');
        return text && text.textContent && text.textContent.trim().length > 0;
      });
    };

    // Function to initialize split texts
    const initSplitTexts = (): boolean => {
      const serviceElements = container.querySelectorAll('.service-item');

      if (!serviceElements || serviceElements.length === 0) {
        console.warn('ServicesAnimation: No service elements found');
        return false;
      }

      if (!hasTextContent(serviceElements)) {
        console.warn('ServicesAnimation: Text elements are empty, retrying...');
        return false;
      }

      // Create SplitText for all services
      splitTextsRef.current = [];
      serviceElements.forEach((element) => {
        const text = element.querySelector('.service-text');
        if (text && text.textContent && text.textContent.trim()) {
          try {
            const split = new SplitText(text, {
              type: 'words,chars',
              charsClass: 'char',
              wordsClass: 'word',
            });

            splitTextsRef.current.push(split);
          } catch (error) {
            console.error('ServicesAnimation: Error creating SplitText:', error);
          }
        }
      });

      return splitTextsRef.current.length > 0;
    };

    // Retry logic for initialization
    const tryInit = () => {
      requestAnimationFrame(() => {
        const success = initSplitTexts();

        if (success) {
          retryCountRef.current = 0;
          startRotation();
        } else if (retryCountRef.current < maxRetries) {
          retryCountRef.current++;
          setTimeout(tryInit, 100);
        } else {
          console.error(`❌ ServicesAnimation: Failed after ${maxRetries} attempts`);
          retryCountRef.current = 0;
        }
      });
    };

    tryInit();

    return () => {
      if (timelineRef.current) {
        timelineRef.current.kill();
      }
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      splitTextsRef.current.forEach((split) => split.revert());
      splitTextsRef.current = [];
    };
  }, [services]); // Removed startRotation to prevent infinite loop

  // Effect for currentIndex changes (rotation)
  useEffect(() => {
    if (!isHovered && containerRef.current) {
      const container = containerRef.current;
      const serviceElements = container.querySelectorAll('.service-item');

      if (!serviceElements || serviceElements.length === 0) return;

      console.log('🔄 ANIMATION CYCLE - Starting transition to index:', currentIndex);

      // Hide all services
      gsap.set(serviceElements, { autoAlpha: 0 });

      const currentElement = serviceElements[currentIndex] as HTMLElement;
      if (!currentElement) return;

      // Show current service
      gsap.set(currentElement, { autoAlpha: 1 });

      const chars = currentElement.querySelectorAll('.char');
      if (!chars || chars.length === 0) return;

      console.log(`✨ Animating service ${currentIndex} with ${chars.length} chars`);

      // IMPORTANT: Set initial scattered positions for chars
      gsap.set(chars, {
        opacity: 0,
        x: () => (Math.random() - 0.5) * 800,
        y: () => (Math.random() - 0.5) * 800,
        rotation: () => (Math.random() - 0.5) * 720,
        scale: 0,
      });

      // Animate chars
      if (timelineRef.current) {
        timelineRef.current.kill();
      }

      const tl = gsap.timeline({
        onComplete: () => {
          console.log('✅ Animation complete for service', currentIndex);
        }
      });

      tl.to(chars, {
        duration: 2,
        opacity: 1,
        x: 0,
        y: 0,
        rotation: 0,
        scale: 1,
        ease: 'elastic.out(1, 0.5)',
        stagger: {
          amount: 0.4,
          from: 'random',
        },
      });

      tl.to({}, { duration: 1 });
      timelineRef.current = tl;
    }
  }, [currentIndex, isHovered, services.length]);

  // Effect for hover state changes
  useEffect(() => {
    if (!containerRef.current) return;

    const container = containerRef.current;
    const serviceElements = container.querySelectorAll('.service-item');

    if (!serviceElements || serviceElements.length === 0) return;

    if (isHovered) {
      // Pause rotation
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      if (timelineRef.current) {
        timelineRef.current.pause();
      }

      // Show all services
      gsap.to(serviceElements, {
        autoAlpha: 1,
        duration: 0.3,
        stagger: 0.05,
      });

      // Animate all chars to gathered state
      serviceElements.forEach((element) => {
        const chars = element.querySelectorAll('.char');
        if (!chars || chars.length === 0) return;

        gsap.to(chars, {
          opacity: 1,
          x: 0,
          y: 0,
          rotation: 0,
          scale: 1,
          duration: 0.6,
          ease: 'back.out(1.7)',
          stagger: {
            amount: 0.2, // Reduced from 0.3 for better performance
            from: 'random',
          },
        });
      });
    } else {
      // IMPORTANT: ANIMATE scatter of all chars BEFORE resuming rotation to prevent piling
      console.log('🌪️ Mouse left - scattering all chars before rotation');

      // Kill any ongoing timelines
      if (timelineRef.current) {
        timelineRef.current.kill();
      }

      // Collect all chars from all services
      const allChars: Element[] = [];
      serviceElements.forEach((element) => {
        const chars = element.querySelectorAll('.char');
        allChars.push(...Array.from(chars));
      });

      if (allChars.length > 0) {
        // Animate scatter with stagger for smooth effect
        gsap.to(allChars, {
          opacity: 0,
          x: () => (Math.random() - 0.5) * 800,
          y: () => (Math.random() - 0.5) * 800,
          rotation: () => (Math.random() - 0.5) * 720,
          scale: 0,
          duration: 0.4,
          ease: 'power2.in',
          stagger: {
            amount: 0.1,
            from: 'random',
          },
          onComplete: () => {
            console.log('✅ Scatter complete - starting rotation');
            startRotation();
          }
        });
      } else {
        startRotation();
      }
    }
  }, [isHovered, startRotation]);

  return (
    <div
      ref={containerRef}
      className="h-full w-full flex items-center justify-center relative overflow-hidden"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        // Global styles for GSAP SplitText words to prevent breaking
        // @ts-ignore
        '--word-display': 'inline-block',
      }}
    >
      <style>{`
        .word {
          display: inline-block;
          white-space: nowrap;
          margin-right: 0.25em;
        }
      `}</style>

      <div
        className={`relative w-full h-full flex items-center justify-center ${
          isHovered ? `flex-col ${currentLanguage.toLowerCase() === 'ua' ? 'gap-1' : 'gap-2'}` : ''
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
                  fontSize: isHovered ? hoverFontSize : 'clamp(1.2rem, 3.5vw, 2.5rem)',
                  fontWeight: 900,
                  color: '#1a1a1a',
                  lineHeight: 1.3,
                  wordBreak: 'normal',
                  overflowWrap: 'normal',
                  hyphens: 'none',
                  whiteSpace: 'normal',
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
