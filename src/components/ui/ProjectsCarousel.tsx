import { useState, useEffect, useRef } from 'react';

interface Project {
  title: string;
  short: string;
  full: string;
}

interface ProjectsCarouselProps {
  projects: Project[];
  onCardClick: (activeProjectIndex: number) => void;
  backgroundText: string;
}

export const ProjectsCarousel = ({ projects, onCardClick, backgroundText }: ProjectsCarouselProps) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [progress, setProgress] = useState(0); // 0 to 100
  const [isPaused, setIsPaused] = useState(false);
  const animationFrameRef = useRef<number | undefined>(undefined);

  const ANIMATION_DURATION = 5000; // 5 seconds total
  const MOVE_DURATION_PERCENT = 80; // 80% of time for movement (4 seconds), 20% for pause

  useEffect(() => {
    if (isPaused || projects.length === 0) return;

    let lastTimestamp = 0;
    let accumulatedTime = (progress / 100) * ANIMATION_DURATION;

    const animate = (timestamp: number) => {
      if (lastTimestamp === 0) {
        lastTimestamp = timestamp;
      }

      const deltaTime = timestamp - lastTimestamp;
      lastTimestamp = timestamp;
      accumulatedTime += deltaTime;

      const newProgress = (accumulatedTime / ANIMATION_DURATION) * 100;

      if (newProgress >= 100) {
        // Move to next project
        setCurrentIndex((prev) => (prev + 1) % projects.length);
        setProgress(0);
        accumulatedTime = 0;
        lastTimestamp = 0;
      } else {
        setProgress(newProgress);
      }

      if (!isPaused) {
        animationFrameRef.current = requestAnimationFrame(animate);
      }
    };

    animationFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isPaused, projects.length, currentIndex, progress]);

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

  // Calculate position and opacity
  // Progress 0-80%: Project moves from bottom (100%) to top (-100%)
  // Progress 80-100%: Pause (project invisible, waiting for next)

  let translateY = 100;
  let opacity = 0;

  if (progress <= MOVE_DURATION_PERCENT) {
    // During movement phase (0-80%)
    const moveProgress = progress / MOVE_DURATION_PERCENT; // 0 to 1
    translateY = 100 - (moveProgress * 200); // 100% to -100%
    opacity = 1; // Fully visible
  } else {
    // During pause phase (80-100%)
    translateY = -100; // Stay at top
    opacity = 0; // Invisible (preparing for next project)
  }

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
        className="absolute w-full px-4 pointer-events-none z-10"
        style={{
          top: '50%',
          transform: `translateY(${translateY}%)`,
          opacity: opacity,
          transition: isPaused ? 'none' : 'none',
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
