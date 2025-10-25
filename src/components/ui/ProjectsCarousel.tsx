import { useState, useEffect, useRef } from 'react';

interface Project {
  title: string;
  short: string;
  full: string;
}

interface ProjectsCarouselProps {
  projects: Project[];
  onProjectClick: (project: Project) => void;
}

export const ProjectsCarousel = ({ projects, onProjectClick }: ProjectsCarouselProps) => {
  const [scrollPosition, setScrollPosition] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isPaused || !contentRef.current) return;

    const contentHeight = contentRef.current.scrollHeight;
    const containerHeight = containerRef.current?.clientHeight || 0;

    // Scroll from bottom to top in 5 seconds
    const duration = 5000; // 5 seconds
    const distance = contentHeight + containerHeight;
    const pixelsPerMs = distance / duration;

    let startTime: number | null = null;
    let animationFrame: number;

    const animate = (timestamp: number) => {
      if (startTime === null) startTime = timestamp;
      const elapsed = timestamp - startTime;

      // Calculate new position (moving from bottom to top)
      const newPosition = elapsed * pixelsPerMs;

      if (newPosition >= distance) {
        // Reset to start when reaching the end
        startTime = null;
        setScrollPosition(0);
      } else {
        setScrollPosition(newPosition);
      }

      if (!isPaused) {
        animationFrame = requestAnimationFrame(animate);
      }
    };

    animationFrame = requestAnimationFrame(animate);

    return () => {
      if (animationFrame) {
        cancelAnimationFrame(animationFrame);
      }
    };
  }, [isPaused, projects]);

  const handleMouseEnter = () => {
    setIsPaused(true);
  };

  const handleMouseLeave = () => {
    setIsPaused(false);
  };

  const handleProjectClick = (e: React.MouseEvent, project: Project) => {
    e.stopPropagation();
    onProjectClick(project);
  };

  return (
    <div
      ref={containerRef}
      className="h-full w-full overflow-hidden relative"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div
        ref={contentRef}
        className="absolute w-full"
        style={{
          transform: `translateY(${100 - (scrollPosition % (contentRef.current?.scrollHeight || 1000))}%)`,
          transition: isPaused ? 'none' : undefined,
        }}
      >
        {projects.map((project, index) => (
          <div
            key={index}
            className="mb-4 p-4 bg-white/10 backdrop-blur-sm rounded-lg cursor-pointer hover:bg-white/20 transition-all duration-300"
            onClick={(e) => handleProjectClick(e, project)}
          >
            <h4 className="text-lg sm:text-xl font-bold text-white mb-2">
              {project.title}
            </h4>
            <p className="text-sm sm:text-base text-white/80 line-clamp-2">
              {project.short}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
};
