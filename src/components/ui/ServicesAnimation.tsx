import { useState, useEffect, useRef } from 'react';

interface Service {
  title: string;
  description: string;
}

interface ServicesAnimationProps {
  services: Service[];
  backgroundText: string;
}

// Different background colors for each service
const SERVICE_COLORS = [
  'bg-blue-500/20',
  'bg-purple-500/20',
  'bg-green-500/20',
  'bg-orange-500/20',
  'bg-pink-500/20',
  'bg-teal-500/20',
];

export const ServicesAnimation = ({ services, backgroundText }: ServicesAnimationProps) => {
  const [positions, setPositions] = useState<number[]>(
    services.map((_, index) => (index % 2 === 0 ? 0 : 100))
  );
  const [isHovered, setIsHovered] = useState(false);
  const animationFrameRef = useRef<number | undefined>(undefined);

  const MOVEMENT_SPEED = 0.02; // Speed of movement (% per ms)

  useEffect(() => {
    if (isHovered) {
      // Stop animation when hovered
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = undefined;
      }
      return;
    }

    let lastTimestamp = 0;

    const animate = (timestamp: number) => {
      if (lastTimestamp === 0) {
        lastTimestamp = timestamp;
      }

      const deltaTime = timestamp - lastTimestamp;
      lastTimestamp = timestamp;

      setPositions((prevPositions) => {
        return prevPositions.map((pos, index) => {
          const isLeftToRight = index % 2 === 0;
          const movement = MOVEMENT_SPEED * deltaTime;

          let newPos = pos;

          if (isLeftToRight) {
            // Move from left to right
            newPos = pos + movement;
            if (newPos > 100) {
              newPos = 0; // Loop back to start
            }
          } else {
            // Move from right to left
            newPos = pos - movement;
            if (newPos < 0) {
              newPos = 100; // Loop back to start
            }
          }

          return newPos;
        });
      });

      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animationFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isHovered]);

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
      <div className="relative h-full w-full z-10" style={{ padding: '5px' }}>
        <div className="relative w-full h-full">
          {services.map((service, index) => {
            // Calculate vertical position to avoid overlapping
            const verticalSpacing = 100 / (services.length + 1);
            const top = verticalSpacing * (index + 1);

            // Get horizontal position
            let left = positions[index];

            // When hovered, distribute evenly horizontally and vertically
            if (isHovered) {
              const horizontalSpacing = 100 / (services.length + 1);
              left = horizontalSpacing * (index + 1);
            }

            const backgroundColor = SERVICE_COLORS[index % SERVICE_COLORS.length];

            return (
              <div
                key={index}
                className={`absolute ${backgroundColor} backdrop-blur-sm rounded-lg p-3 transition-all duration-300 ease-in-out`}
                style={{
                  top: `${top}%`,
                  left: `${left}%`,
                  transform: 'translate(-50%, -50%)',
                  maxWidth: '280px',
                  minWidth: '200px',
                  zIndex: 10 + index,
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
