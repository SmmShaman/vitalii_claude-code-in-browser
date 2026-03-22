'use client'

import { useEffect, useRef, useState, useCallback } from 'react';
import gsap from 'gsap';
import { SplitText } from 'gsap/SplitText';
import { debugLog, debugWarn, debugError } from '@/utils/debug';

// Register GSAP plugins
gsap.registerPlugin(SplitText);

interface Service {
  title: string;
  description: string;
  detailedDescription: string;
  simpleExplanation: string;
}

interface ServiceCategory {
  category: string;
  icon: string;
  services: Service[];
}

interface ServicesAnimationProps {
  categories: ServiceCategory[];
  backgroundText: string;
  currentLanguage?: string;
}

export const ServicesAnimation = ({ categories, currentLanguage = 'EN' }: ServicesAnimationProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isHovered, setIsHovered] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [hoverFontSize, setHoverFontSize] = useState('2rem');
  const timelineRef = useRef<gsap.core.Timeline | null>(null);
  const intervalRef = useRef<number | null>(null);
  const retryCountRef = useRef<number>(0);
  const maxRetries = 10;
  const splitTextsRef = useRef<SplitText[]>([]);


  // Calculate optimal font size for all categories to fit
  useEffect(() => {
    if (!containerRef.current || !isHovered) return;

    const container = containerRef.current;
    const containerHeight = container.clientHeight;

    // 3 categories + sub-services labels
    const totalItems = categories.length;
    const subItemsCount = categories.reduce((sum, cat) => sum + cat.services.length, 0);
    const lineHeight = 1.3;
    const isUkrainian = currentLanguage.toLowerCase() === 'ua';
    const gapBetweenLines = isUkrainian ? 3 : 5;

    // Category titles are bigger, sub-items are smaller
    let fontSize = 32;
    const minFontSize = 10;
    const subFontRatio = 0.45;

    while (fontSize > minFontSize) {
      const categoryHeight = fontSize * lineHeight * totalItems;
      const subItemHeight = fontSize * subFontRatio * lineHeight * subItemsCount;
      const gaps = gapBetweenLines * (totalItems + subItemsCount - 1);
      const totalHeight = categoryHeight + subItemHeight + gaps;

      if (totalHeight < containerHeight * 0.9) {
        break;
      }
      fontSize -= 2;
    }

    setHoverFontSize(`${fontSize}px`);
  }, [isHovered, categories, currentLanguage]);

  // Function to start rotation animation
  const startRotation = useCallback(() => {
    if (!containerRef.current) return;

    const container = containerRef.current;
    const serviceElements = container.querySelectorAll('.service-item');

    const animateService = (index: number) => {
      if (!serviceElements || serviceElements.length === 0) return;

      debugLog(`🎯 Starting animation for category ${index}`);

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
      setCurrentIndex((prev) => (prev + 1) % categories.length);
    }, 3000);
  }, [currentIndex, categories.length]);

  // Main initialization effect - runs when categories change (language change)
  useEffect(() => {
    if (!containerRef.current) {
      debugWarn('ServicesAnimation: Container not ready');
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
        debugWarn('ServicesAnimation: No service elements found');
        return false;
      }

      if (!hasTextContent(serviceElements)) {
        debugWarn('ServicesAnimation: Text elements are empty, retrying...');
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
            debugError('ServicesAnimation: Error creating SplitText:', error);
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
          debugError(`❌ ServicesAnimation: Failed after ${maxRetries} attempts`);
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
  }, [categories]); // Removed startRotation to prevent infinite loop

  // Effect for currentIndex changes (rotation)
  useEffect(() => {
    if (!isHovered && containerRef.current) {
      const container = containerRef.current;
      const serviceElements = container.querySelectorAll('.service-item');

      if (!serviceElements || serviceElements.length === 0) return;

      debugLog('🔄 ANIMATION CYCLE - Starting transition to index:', currentIndex);

      // Hide all services
      gsap.set(serviceElements, { autoAlpha: 0 });

      const currentElement = serviceElements[currentIndex] as HTMLElement;
      if (!currentElement) return;

      // Show current service
      gsap.set(currentElement, { autoAlpha: 1 });

      const chars = currentElement.querySelectorAll('.char');
      if (!chars || chars.length === 0) return;

      debugLog(`✨ Animating category ${currentIndex} with ${chars.length} chars`);

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
          debugLog('✅ Animation complete for category', currentIndex);
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
  }, [currentIndex, isHovered, categories.length]);

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
            amount: 0.2,
            from: 'random',
          },
        });
      });
    } else {
      // IMPORTANT: ANIMATE scatter of all chars BEFORE resuming rotation to prevent piling
      debugLog('🌪️ Mouse left - scattering all chars before rotation');

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
            debugLog('✅ Scatter complete - starting rotation');
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

      {isHovered ? (
        /* Hover state: show all categories with sub-services */
        <div className="relative w-full h-full flex flex-col justify-center px-4 gap-1">
          {categories.map((cat, catIndex) => (
            <div key={catIndex} className="mb-1">
              {/* Category title */}
              <div
                className="service-item relative"
                style={{ visibility: 'visible', opacity: 1 }}
              >
                <div
                  className="service-text font-bold uppercase"
                  style={{
                    fontSize: hoverFontSize,
                    fontWeight: 900,
                    color: '#c24628',
                    lineHeight: 1.2,
                  }}
                >
                  {cat.icon} {cat.category}
                </div>
              </div>
              {/* Sub-services */}
              {cat.services.map((service, sIndex) => (
                <div
                  key={sIndex}
                  className="pl-6"
                  style={{ opacity: 0.7 }}
                >
                  <span
                    style={{
                      fontSize: `calc(${hoverFontSize} * 0.45)`,
                      fontWeight: 500,
                      color: '#9B97B0',
                      lineHeight: 1.4,
                    }}
                  >
                    {service.title}
                  </span>
                </div>
              ))}
            </div>
          ))}
        </div>
      ) : (
        /* Default state: rotate through category names */
        <div className="relative w-full h-full flex items-center justify-center">
          {categories.map((cat, index) => (
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
                  fontSize: 'clamp(1.2rem, 3.5vw, 2.5rem)',
                  fontWeight: 900,
                  color: '#EEEDF5',
                  lineHeight: 1.3,
                  wordBreak: 'normal',
                  overflowWrap: 'normal',
                  hyphens: 'none',
                  whiteSpace: 'normal',
                }}
              >
                {cat.icon} {cat.category}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
