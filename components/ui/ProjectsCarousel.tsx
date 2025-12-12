'use client';

import { useState, useEffect, useRef } from 'react';
import gsap from 'gsap';

interface Project {
  title: string;
  short: string;
  full: string;
}

interface ProjectsCarouselProps {
  projects: Project[];
  onCardClick: (activeProjectIndex: number) => void;
  backgroundText: string;
  onIndexChange?: (index: number) => void;
}

export const ProjectsCarousel = ({ projects, onCardClick, backgroundText, onIndexChange }: ProjectsCarouselProps) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const projectRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const descriptionRef = useRef<HTMLParagraphElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  const timelineRef = useRef<gsap.core.Timeline | null>(null);

  // Unique neon colors for each project
  const projectColors = [
    { from: '#fc51c9', via: '#e707f7', to: '#9c27b0' }, // Pink/Magenta/Purple
    { from: '#05ddfa', via: '#00bfff', to: '#4169e1' }, // Cyan/Blue
    { from: '#ffeb3b', via: '#ffc107', to: '#ff9800' }, // Yellow/Amber/Orange
    { from: '#4caf50', via: '#8bc34a', to: '#cddc39' }, // Green/Light Green/Lime
    { from: '#ff6b6b', via: '#ff5252', to: '#f44336' }, // Red/Pink Red/Red
  ];

  // Notify parent when index changes
  useEffect(() => {
    if (onIndexChange) {
      onIndexChange(currentIndex);
    }
  }, [currentIndex, onIndexChange]);

  // Create GSAP Timeline for project animation with all 5 improvements
  useEffect(() => {
    if (!projectRef.current || !titleRef.current || !descriptionRef.current || !progressRef.current || projects.length === 0) return;

    // Kill previous timeline
    if (timelineRef.current) {
      timelineRef.current.kill();
    }

    const element = projectRef.current;
    const title = titleRef.current;
    const description = descriptionRef.current;
    const progress = progressRef.current;

    // Reset progress bar and text elements
    gsap.set(progress, { width: '0%' });
    gsap.set([title, description], { opacity: 1, y: 0 }); // Reset text to initial state

    // Create timeline
    const tl = gsap.timeline({
      repeat: 0,
      onComplete: () => {
        setCurrentIndex((prev) => (prev + 1) % projects.length);
      }
    });

    // === IMPROVEMENT 1, 2, 3, 4: Fade in with scale, rotation, and back.out easing ===
    tl.fromTo(element,
      {
        yPercent: 100,
        opacity: 0,
        scale: 0.85,        // Improvement 3: starts at 85% size
        rotation: -3        // Improvement 4: tilted -3 degrees
      },
      {
        opacity: 1,
        scale: 1,           // Improvement 3: grows to 100%
        rotation: 0,        // Improvement 4: straightens to 0°
        duration: 0.6,
        ease: 'back.out(1.5)' // Improvement 2: back.out with overshoot
      },
      0 // Start at 0s
    );

    // === IMPROVEMENT 1: Stagger animation for title and description ===
    tl.from([title, description], {
      opacity: 0,
      y: 15,
      stagger: 0.12,      // 0.12s delay between elements
      duration: 0.4,
      ease: 'power2.out'
    }, 0.3);              // Start at 0.3s (after entrance begins)

    // === IMPROVEMENT 5: Progress bar (runs parallel to entire animation) ===
    tl.to(progress, {
      width: '100%',
      duration: 5,        // Full 5 second cycle
      ease: 'none'        // Linear progress
    }, 0);                // Start at 0s (parallel)

    // Phase 2: Move from bottom to top
    tl.to(element, {
      yPercent: -100,
      duration: 3.5,
      ease: 'none'
    }, 0.8);              // Start at 0.8s (after entrance)

    // === IMPROVEMENT 3, 4: Fade out with scale and rotation ===
    tl.to(element, {
      opacity: 0,
      scale: 0.95,        // Improvement 3: shrinks to 95%
      rotation: 2,        // Improvement 4: tilts +2 degrees
      duration: 0.5,
      ease: 'power2.in'
    }, 4.3);              // Start at 4.3s

    // Phase 4: Pause
    tl.to(element, {
      duration: 0.2
    }, 4.8);              // Start at 4.8s

    timelineRef.current = tl;

    return () => {
      if (timelineRef.current) {
        timelineRef.current.kill();
      }
    };
  }, [currentIndex, projects.length]);

  // Handle pause/resume on hover
  useEffect(() => {
    if (!timelineRef.current) return;

    if (isPaused) {
      timelineRef.current.pause();
    } else {
      timelineRef.current.resume();
    }
  }, [isPaused]);

  const handleMouseEnter = () => {
    setIsPaused(true);
  };

  const handleMouseLeave = () => {
    setIsPaused(false);
  };

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    console.log('Card clicked, currentIndex:', currentIndex);
    onCardClick(currentIndex);
  };

  const currentProject = projects[currentIndex];
  const currentColor = projectColors[currentIndex % projectColors.length];

  return (
    <div
      className="h-full w-full overflow-hidden relative cursor-pointer"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={handleClick}
      style={{ position: 'relative', zIndex: 1 }}
    >
      {/* Background text "Projects" */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0">
        <h2
          className="font-bold text-white/10 select-none text-center"
          style={{ fontSize: 'clamp(2.5rem, 6vw, 5rem)' }}
        >
          {backgroundText}
        </h2>
      </div>

      {/* Current Project - ONLY ONE VISIBLE */}
      <div
        ref={projectRef}
        className="absolute w-full px-4 pointer-events-none z-50"
        style={{
          top: '50%',
        }}
      >
        <div className="p-4 bg-white rounded-lg pointer-events-auto relative overflow-hidden shadow-lg">
          {/* === IMPROVEMENT 5: Progress indicator bar === */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-white/10 rounded-full overflow-hidden">
            <div
              ref={progressRef}
              className="h-full"
              style={{
                width: '0%',
                background: `linear-gradient(to right, ${currentColor.from}, ${currentColor.via}, ${currentColor.to})`
              }}
            />
          </div>

          <h4
            ref={titleRef}
            className="font-bold text-gray-900 mb-2 mt-1"
            style={{ fontSize: 'clamp(0.875rem, 2vw, 1.25rem)' }}
          >
            {currentProject?.title}
          </h4>
          <p
            ref={descriptionRef}
            className="text-gray-800"
            style={{ fontSize: 'clamp(0.75rem, 1.5vw, 1rem)' }}
          >
            {currentProject?.short}
          </p>
        </div>
      </div>
    </div>
  );
};
