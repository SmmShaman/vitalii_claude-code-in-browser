import { useState, useEffect, useRef } from 'react';

interface Project {
  title: string;
  short: string;
  full: string;
}

interface ProjectsCarouselProps {
  projects: Project[];
  onCardClick: (activeProjectIndex: number) => void;
}

export const ProjectsCarousel = ({ projects, onCardClick }: ProjectsCarouselProps) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [progress, setProgress] = useState(0); // 0 to 100
  const [isPaused, setIsPaused] = useState(false);
  const [isCentered, setIsCentered] = useState(false);
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
    setIsCentered(true);
  };

  const handleMouseLeave = () => {
    setIsPaused(false);
    setIsCentered(false);
  };

  const handleClick = () => {
    onCardClick(currentIndex);
  };

  const currentProject = projects[currentIndex];

  // Calculate position: starts at 100% (bottom) and moves to -100% (top)
  // progress 0% = bottom (translateY(100%))
  // progress 50% = center (translateY(0%))
  // progress 100% = top (translateY(-100%))
  const translateY = isCentered ? 0 : 100 - progress * 2;

  return (
    <div
      className="h-full w-full overflow-hidden relative cursor-pointer"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={handleClick}
    >
      <div
        className="absolute w-full transition-all duration-300"
        style={{
          top: '50%',
          transform: `translateY(${isCentered ? '-50%' : `${translateY}%`})`,
          transition: isCentered ? 'transform 0.3s ease-out' : 'none',
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
    </div>
  );
};
