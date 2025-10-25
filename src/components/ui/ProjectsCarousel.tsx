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

  const ANIMATION_DURATION = 5000; // 5 seconds

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
  }, [isPaused, projects.length, currentIndex]);

  const handleMouseEnter = () => {
    setIsPaused(true);
  };

  const handleMouseLeave = () => {
    setIsPaused(false);
  };

  const handleClick = () => {
    onCardClick(currentIndex);
  };

  const currentProject = projects[currentIndex];
  const nextProject = projects[(currentIndex + 1) % projects.length];

  // Animation timeline (5 seconds):
  // 0-70%: Current project moves and is fully visible
  // 70-80%: Current project fades out (0.5s)
  // 80-90%: Pause - nothing visible (0.5s)
  // 90-100%: Next project fades in (0.5s)

  // Current project: moves from bottom to top
  // Progress 0-70%: moves from bottom (100%) to top (-40%)
  const currentTranslateY = progress <= 70
    ? 100 - (progress / 70) * 140  // Moves from 100% to -40%
    : -40; // Stay at top

  // Current project opacity
  // Progress 0-70%: opacity 1 (fully visible)
  // Progress 70-80%: opacity 1 → 0 (fade out)
  // Progress 80-100%: opacity 0 (invisible)
  const currentOpacity = progress <= 70
    ? 1
    : progress <= 80
      ? 1 - ((progress - 70) / 10)
      : 0;

  // Next project position: starts from bottom
  // Progress 90-100%: moves from bottom (100%) to center (0%)
  const nextTranslateY = progress >= 90
    ? 100 - ((progress - 90) / 10) * 100  // Moves from 100% to 0%
    : 100; // Stay at bottom (not visible yet)

  // Next project opacity
  // Progress 0-90%: opacity 0 (invisible)
  // Progress 90-100%: opacity 0 → 1 (fade in)
  const nextOpacity = progress < 90
    ? 0
    : (progress - 90) / 10;

  // Show next project only when it should start appearing
  const showNextProject = progress >= 90;

  return (
    <div
      className="h-full w-full overflow-hidden relative cursor-pointer"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={handleClick}
    >
      {/* Background text "Projects" */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <h2 className="text-6xl sm:text-7xl md:text-8xl lg:text-9xl font-bold text-white/10 select-none">
          {backgroundText}
        </h2>
      </div>

      {/* Current Project */}
      <div
        className="absolute w-full px-4"
        style={{
          top: '50%',
          transform: `translateY(${currentTranslateY}%)`,
          opacity: currentOpacity,
          transition: isPaused ? 'opacity 0.3s' : 'none',
        }}
      >
        <div className="p-4 bg-white/10 backdrop-blur-sm rounded-lg hover:bg-white/20 transition-all duration-300">
          <h4 className="text-lg sm:text-xl font-bold text-white mb-2">
            {currentProject?.title}
          </h4>
          <p className="text-sm sm:text-base text-white/80">
            {currentProject?.short}
          </p>
        </div>
      </div>

      {/* Next Project (appears after 0.5s pause) */}
      {showNextProject && (
        <div
          className="absolute w-full px-4"
          style={{
            top: '50%',
            transform: `translateY(${nextTranslateY}%)`,
            opacity: nextOpacity,
            transition: isPaused ? 'opacity 0.3s' : 'none',
          }}
        >
          <div className="p-4 bg-white/10 backdrop-blur-sm rounded-lg hover:bg-white/20 transition-all duration-300">
            <h4 className="text-lg sm:text-xl font-bold text-white mb-2">
              {nextProject?.title}
            </h4>
            <p className="text-sm sm:text-base text-white/80">
              {nextProject?.short}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
