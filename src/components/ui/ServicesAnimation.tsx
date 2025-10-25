import { useState, useEffect, useRef } from 'react';

interface Service {
  title: string;
  description: string;
}

interface ServicesAnimationProps {
  services: Service[];
  backgroundText: string;
}

export const ServicesAnimation = ({ services, backgroundText }: ServicesAnimationProps) => {
  const [visibleServices, setVisibleServices] = useState<number[]>([]);
  const [isHovered, setIsHovered] = useState(false);
  const animationFrameRef = useRef<number | undefined>(undefined);
  const lastAddTimeRef = useRef<number>(0);

  const SERVICE_DISPLAY_INTERVAL = 800; // 0.8 seconds between each service appearing

  useEffect(() => {
    if (visibleServices.length >= services.length) return;

    let lastTimestamp = 0;
    let accumulatedTime = 0;

    const animate = (timestamp: number) => {
      if (lastTimestamp === 0) {
        lastTimestamp = timestamp;
      }

      const deltaTime = timestamp - lastTimestamp;
      lastTimestamp = timestamp;
      accumulatedTime += deltaTime;

      if (accumulatedTime >= SERVICE_DISPLAY_INTERVAL) {
        setVisibleServices((prev) => {
          if (prev.length < services.length) {
            return [...prev, prev.length];
          }
          return prev;
        });
        accumulatedTime = 0;
        lastAddTimeRef.current = timestamp;
      }

      if (visibleServices.length < services.length) {
        animationFrameRef.current = requestAnimationFrame(animate);
      }
    };

    animationFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [visibleServices.length, services.length]);

  const handleMouseEnter = () => {
    setIsHovered(true);
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
  };

  return (
    <div
      className="h-full w-full overflow-hidden relative"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Background text */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0">
        <h2 className="text-6xl sm:text-7xl md:text-8xl lg:text-9xl font-bold text-white/10 select-none">
          {backgroundText}
        </h2>
      </div>

      {/* Services */}
      <div className="relative h-full w-full flex items-center justify-center p-4 z-10">
        <div className="relative w-full h-full flex items-center justify-center">
          {services.map((service, index) => {
            const isVisible = visibleServices.includes(index);
            const isFromLeft = index % 2 === 0;

            // Calculate position when not hovered
            const normalTop = 10 + (index * 14); // Distribute vertically
            const normalLeft = isFromLeft ? -100 : 100; // Start from sides

            // Calculate position when hovered (gathered in center)
            const gatheredTop = 50 - (services.length * 5) + (index * 10); // Stack vertically in center
            const gatheredLeft = 50; // Center horizontally

            // Animation states
            let opacity = 0;
            let top = normalTop;
            let left = normalLeft;
            let translateX = 0;

            if (!isVisible) {
              // Not yet visible
              opacity = 0;
              top = normalTop;
              left = normalLeft;
              translateX = 0;
            } else if (isHovered) {
              // Hovered: gather in center
              opacity = 1;
              top = gatheredTop;
              left = gatheredLeft;
              translateX = -50; // Center the element
            } else {
              // Visible and not hovered: slide in from side
              opacity = 1;
              top = normalTop;
              left = isFromLeft ? 5 : 95; // Stop near the edges
              translateX = isFromLeft ? 0 : -100; // Align properly
            }

            return (
              <div
                key={index}
                className="absolute bg-white/10 backdrop-blur-sm rounded-lg p-3 transition-all duration-700 ease-in-out"
                style={{
                  top: `${top}%`,
                  left: `${left}%`,
                  transform: `translateX(${translateX}%)`,
                  opacity: opacity,
                  maxWidth: '280px',
                  minWidth: '200px',
                }}
              >
                <h4 className="text-sm sm:text-base font-bold text-white mb-1">
                  {service.title}
                </h4>
                <p className="text-xs sm:text-sm text-white/80">
                  {service.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
