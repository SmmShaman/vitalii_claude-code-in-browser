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


  // Calculate optimal font size for all categories to fit on hover
  useEffect(() => {
    if (!containerRef.current || !isHovered) return;

    const container = containerRef.current;
    const containerHeight = container.clientHeight;

    const containerWidth = container.clientWidth;
    const numCategories = categories.length;
    const lineHeight = 1.3;
    const isUkrainian = currentLanguage.toLowerCase() === 'ua';
    const gapBetweenLines = isUkrainian ? 5 : 10;

    // Find longest category name to constrain by width too
    const longestName = Math.max(...categories.map(c => c.category.length));
    const charWidthRatio = 0.55;

    let fontSize = 48;
    const minFontSize = 12;

    while (fontSize > minFontSize) {
      const estimatedLineHeight = fontSize * lineHeight;
      const totalHeight = (estimatedLineHeight * numCategories) + (gapBetweenLines * (numCategories - 1));
      const estimatedWidth = longestName * fontSize * charWidthRatio;

      if (totalHeight < containerHeight * 0.9 && estimatedWidth < containerWidth * 0.85) {
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

      gsap.set(serviceElements, { autoAlpha: 0 });

      const currentElement = serviceElements[index] as HTMLElement;
      if (!currentElement) return;

      gsap.set(currentElement, { autoAlpha: 1 });

      const chars = currentElement.querySelectorAll('.char');
      if (!chars || chars.length === 0) return;

      gsap.set(chars, {
        opacity: 0,
        x: () => (Math.random() - 0.5) * 800,
        y: () => (Math.random() - 0.5) * 800,
        rotation: () => (Math.random() - 0.5) * 720,
        scale: 0,
      });

      const tl = gsap.timeline();

      tl.to(chars, {
        duration: 2,
        opacity: 1,
        x: 0,
        y: 0,
        rotation: 0,
        scale: 1,
        ease: 'power3.out',
        stagger: {
          amount: 0.3,
          from: 'random',
        },
      });

      tl.to({}, { duration: 1 });
      timelineRef.current = tl;
    };

    animateService(currentIndex);

    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    intervalRef.current = window.setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % categories.length);
    }, 3000);
  }, [currentIndex, categories.length]);

  // Main initialization effect
  useEffect(() => {
    if (!containerRef.current) {
      debugWarn('ServicesAnimation: Container not ready');
      return;
    }

    const container = containerRef.current;

    if (splitTextsRef.current.length > 0) {
      splitTextsRef.current.forEach((split) => split.revert());
      splitTextsRef.current = [];
    }

    const hasTextContent = (elements: NodeListOf<Element>): boolean => {
      return Array.from(elements).some(el => {
        const text = el.querySelector('.service-text');
        return text && text.textContent && text.textContent.trim().length > 0;
      });
    };

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
  }, [categories]);

  // Effect for currentIndex changes (rotation)
  useEffect(() => {
    if (!isHovered && containerRef.current) {
      const container = containerRef.current;
      const serviceElements = container.querySelectorAll('.service-item');

      if (!serviceElements || serviceElements.length === 0) return;

      debugLog('🔄 ANIMATION CYCLE - Starting transition to index:', currentIndex);

      gsap.set(serviceElements, { autoAlpha: 0 });

      const currentElement = serviceElements[currentIndex] as HTMLElement;
      if (!currentElement) return;

      gsap.set(currentElement, { autoAlpha: 1 });

      const chars = currentElement.querySelectorAll('.char');
      if (!chars || chars.length === 0) return;

      debugLog(`✨ Animating category ${currentIndex} with ${chars.length} chars`);

      gsap.set(chars, {
        opacity: 0,
        x: () => (Math.random() - 0.5) * 800,
        y: () => (Math.random() - 0.5) * 800,
        rotation: () => (Math.random() - 0.5) * 720,
        scale: 0,
      });

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
        ease: 'power3.out',
        stagger: {
          amount: 0.3,
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
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      if (timelineRef.current) {
        timelineRef.current.pause();
      }

      gsap.to(serviceElements, {
        autoAlpha: 1,
        duration: 0.3,
        stagger: 0.05,
      });

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
      debugLog('🌪️ Mouse left - scattering all chars before rotation');

      if (timelineRef.current) {
        timelineRef.current.kill();
      }

      const allChars: Element[] = [];
      serviceElements.forEach((element) => {
        const chars = element.querySelectorAll('.char');
        allChars.push(...Array.from(chars));
      });

      if (allChars.length > 0) {
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

      {/* Same DOM structure for both states — only CSS changes based on isHovered */}
      <div
        className={`relative w-full h-full flex items-center justify-center ${
          isHovered ? `flex-col ${currentLanguage.toLowerCase() === 'ua' ? 'gap-1' : 'gap-2'}` : ''
        }`}
        style={{
          padding: isHovered ? '1rem' : '0',
        }}
      >
        {categories.map((cat, index) => (
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
                  color: '#EEEDF5',
                  lineHeight: 1.3,
                  wordBreak: 'normal',
                  overflowWrap: 'normal',
                  hyphens: 'none',
                  whiteSpace: 'normal',
                }}
              >
                {cat.category}
              </div>
            </div>
        ))}
      </div>
    </div>
  );
};
