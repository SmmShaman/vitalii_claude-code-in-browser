'use client'

import { useEffect, useRef } from 'react';
import { splitText, stagger, createTimeline } from 'animejs';

interface AnimatedDescriptionProps {
  text: string;
}

export const AnimatedDescription = ({ text }: AnimatedDescriptionProps) => {
  const containerRef = useRef<HTMLParagraphElement>(null);
  const splitRef = useRef<any>(null);
  const timelineRef = useRef<any>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // Clean up previous animations
    if (timelineRef.current) {
      timelineRef.current.pause();
      timelineRef.current = null;
    }

    if (splitRef.current) {
      splitRef.current.revert();
    }

    // Split text into characters with 3D structure
    splitRef.current = splitText(containerRef.current, {
      chars: `<span class="char-3d char-{i}">
        <em class="face face-top">{value}</em>
        <em class="face face-front">{value}</em>
        <em class="face face-bottom">{value}</em>
      </span>`,
    });

    // Create stagger timing
    const charsStagger = stagger(50, { start: 0 });

    // Create 3D rotation animation timeline
    timelineRef.current = createTimeline({
      defaults: {
        ease: 'inOut(2)',
        loop: true,
        duration: 600,
      }
    })
    .add('.char-3d', { rotateX: [0, -90], delay: charsStagger })
    .add('.char-3d .face-top', { opacity: [0.5, 0], delay: charsStagger }, 0)
    .add('.char-3d .face-front', { opacity: [1, 0.5], delay: charsStagger }, 0)
    .add('.char-3d .face-bottom', { opacity: [0, 1], delay: charsStagger }, 0)
    .add('.char-3d', { rotateX: [-90, -180], delay: charsStagger }, 600)
    .add('.char-3d .face-top', { opacity: [0, 0.5], delay: charsStagger }, 600)
    .add('.char-3d .face-front', { opacity: [0.5, 0], delay: charsStagger }, 600)
    .add('.char-3d .face-bottom', { opacity: [1, 0.5], delay: charsStagger }, 600)
    .add('.char-3d', { rotateX: [-180, -270], delay: charsStagger }, 1200)
    .add('.char-3d .face-top', { opacity: [0.5, 1], delay: charsStagger }, 1200)
    .add('.char-3d .face-front', { opacity: [0, 0.5], delay: charsStagger }, 1200)
    .add('.char-3d .face-bottom', { opacity: [0.5, 0], delay: charsStagger }, 1200)
    .add('.char-3d', { rotateX: [-270, -360], delay: charsStagger }, 1800)
    .add('.char-3d .face-top', { opacity: [1, 0.5], delay: charsStagger }, 1800)
    .add('.char-3d .face-front', { opacity: [0.5, 1], delay: charsStagger }, 1800)
    .add('.char-3d .face-bottom', { opacity: [0, 0], delay: charsStagger }, 1800);

    // Intersection Observer to pause animation when not visible
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (timelineRef.current) {
          if (entry.isIntersecting) {
            timelineRef.current.play();
          } else {
            timelineRef.current.pause();
          }
        }
      },
      { threshold: 0.1 }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => {
      observer.disconnect();
      if (timelineRef.current) {
        timelineRef.current.pause();
        timelineRef.current = null;
      }
      if (splitRef.current) {
        splitRef.current.revert();
      }
    };
  }, [text]);

  return (
    <p
      ref={containerRef}
      className="text-white mt-1.5 leading-tight char-3d-container"
      style={{
        fontSize: 'clamp(0.75rem, 1.2vw, 0.875rem)', // Reduced from clamp(0.875rem, 1.5vw, 1.125rem)
        perspective: '600px',
        perspectiveOrigin: '50% 50%'
      }}
    >
      {text}
    </p>
  );
};
