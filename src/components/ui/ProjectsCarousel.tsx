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
  const timelineRef = useRef<gsap.core.Timeline | null>(null);

  // Notify parent when index changes
  useEffect(() => {
    if (onIndexChange) {
      onIndexChange(currentIndex);
    }
  }, [currentIndex, onIndexChange]);

  // Create GSAP Timeline for project animation
  useEffect(() => {
    if (!projectRef.current || projects.length === 0) return;

    // Kill previous timeline
    if (timelineRef.current) {
      timelineRef.current.kill();
    }

    const element = projectRef.current;

    // Create timeline
    const tl = gsap.timeline({
      repeat: 0, // Don't repeat, we'll manually restart
      onComplete: () => {
        // Move to next project after completion
        setCurrentIndex((prev) => (prev + 1) % projects.length);
      }
    });

    // Phase 1: Fade in from bottom (0-10% of time = 0.5s)
    tl.fromTo(element,
      {
        yPercent: 100,
        opacity: 0,
      },
      {
        opacity: 1,
        duration: 0.5,
        ease: 'power2.out',
      },
      0 // Start at 0s
    );

    // Phase 2: Move from bottom to top (10-85% of time = 3.75s)
    tl.to(element,
      {
        yPercent: -100,
        duration: 3.75,
        ease: 'none', // Linear movement
      },
      0.5 // Start at 0.5s (after fade in)
    );

    // Phase 3: Fade out at top (85-95% of time = 0.5s)
    tl.to(element,
      {
        opacity: 0,
        duration: 0.5,
        ease: 'power2.in',
      },
      4.25 // Start at 4.25s
    );

    // Phase 4: Pause (95-100% of time = 0.25s)
    tl.to(element,
      {
        // Just wait, no changes
        duration: 0.25,
      },
      4.75 // Start at 4.75s
    );

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
        <h2 className="text-6xl sm:text-7xl md:text-8xl lg:text-9xl font-bold text-white/10 select-none">
          {backgroundText}
        </h2>
      </div>

      {/* Current Project - ONLY ONE VISIBLE */}
      <div
        ref={projectRef}
        className="absolute w-full px-4 pointer-events-none z-10"
        style={{
          top: '50%',
        }}
      >
        <div className="p-4 bg-white/10 backdrop-blur-sm rounded-lg pointer-events-auto">
          <h4 className="text-lg sm:text-xl font-bold text-white mb-2">
            {currentProject?.title}
          </h4>
          <p className="text-sm sm:text-base text-white/80">
            {currentProject?.short}
          </p>
        </div>
      </div>
    </div>
  );
};
