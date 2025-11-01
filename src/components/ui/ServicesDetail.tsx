import { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import gsap from 'gsap';
import { X } from 'lucide-react';

// Import Host Grotesk font
const FONT_IMPORT = `
@import url('https://fonts.googleapis.com/css2?family=Host+Grotesk:ital,wght@0,300..800;1,300..800&display=swap');
`;

interface Service {
  title: string;
  description: string;
  detailedDescription: string;
  simpleExplanation: string;
}

interface ServicesDetailProps {
  services: Service[];
  isOpen: boolean;
  onClose: () => void;
  gridContainerRef?: React.RefObject<HTMLDivElement | null>;
}

export const ServicesDetail = ({ services, isOpen, onClose }: ServicesDetailProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const wheelTimeoutRef = useRef<number | null>(null);
  const detailBoxRef = useRef<HTMLDivElement>(null);
  const simpleBoxRef = useRef<HTMLDivElement>(null);
  const line1Ref = useRef<SVGLineElement>(null);
  const line2Ref = useRef<SVGLineElement>(null);

  // Handle wheel scroll to navigate between services
  useEffect(() => {
    if (!isOpen || !containerRef.current) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();

      // Debounce wheel events
      if (wheelTimeoutRef.current) return;

      if (e.deltaY > 0) {
        // Scroll down - next service
        setActiveIndex((prev) => Math.min(prev + 1, services.length - 1));
      } else {
        // Scroll up - previous service
        setActiveIndex((prev) => Math.max(prev - 1, 0));
      }

      // Set timeout to prevent too rapid changes
      wheelTimeoutRef.current = window.setTimeout(() => {
        wheelTimeoutRef.current = null;
      }, 500);
    };

    const container = containerRef.current;
    container.addEventListener('wheel', handleWheel, { passive: false });

    return () => {
      container.removeEventListener('wheel', handleWheel);
      if (wheelTimeoutRef.current) {
        clearTimeout(wheelTimeoutRef.current);
      }
    };
  }, [isOpen, services.length]);

  // Animate boxes and lines when active service changes (like template)
  useEffect(() => {
    if (!isOpen) return;

    console.log(`🎨 Active service changed to: ${activeIndex}`);

    // Use GSAP animations similar to template
    gsap.defaults({
      duration: 0.55,
      ease: 'expo.out',
    });

    const detailBox = detailBoxRef.current;
    const simpleBox = simpleBoxRef.current;
    const line1 = line1Ref.current;
    const line2 = line2Ref.current;

    if (detailBox && simpleBox && line1 && line2) {
      // Animate first line - appears first
      gsap.set(line1, {
        strokeDasharray: 1000,
        strokeDashoffset: 1000,
        opacity: 0,
      });

      gsap.to(line1, {
        strokeDashoffset: 0,
        opacity: 1,
        duration: 0.5,
        ease: 'power2.out',
      });

      // Animate first box (detailed description) - appears after line
      gsap.set(detailBox, {
        scale: 0.8,
        xPercent: -10,
        yPercent: 20,
        rotation: -8,
        opacity: 0,
      });

      gsap.to(detailBox, {
        opacity: 1,
        scale: 1,
        xPercent: 0,
        yPercent: 0,
        rotation: 0,
        duration: 0.7,
        delay: 0.3,
        ease: 'expo.out',
      });

      // Animate second line - appears after 1 second
      gsap.set(line2, {
        strokeDasharray: 1000,
        strokeDashoffset: 1000,
        opacity: 0,
      });

      gsap.to(line2, {
        strokeDashoffset: 0,
        opacity: 1,
        duration: 0.5,
        delay: 1.0,
        ease: 'power2.out',
      });

      // Animate second box (simple explanation) - appears after line 2
      gsap.set(simpleBox, {
        scale: 0.8,
        xPercent: -10,
        yPercent: 20,
        rotation: -8,
        opacity: 0,
      });

      gsap.to(simpleBox, {
        opacity: 1,
        scale: 1,
        xPercent: 0,
        yPercent: 0,
        rotation: 0,
        duration: 0.7,
        delay: 1.3, // After line 2
        ease: 'expo.out',
      });
    }
  }, [activeIndex, isOpen]);

  const handleClose = useCallback(() => {
    console.log('❌ ServicesDetail: Closing');
    setActiveIndex(0);
    onClose();
  }, [onClose]);

  if (!isOpen) return null;

  const currentService = services[activeIndex];

  // Color palette for each service (like template)
  const colors = [
    '#6495ed', // cornflowerblue - AI Integration
    '#ffe4b5', // moccasin - Growth Marketing
    '#66cdaa', // mediumaquamarine - Marketing Analytics
    '#800000', // maroon - Digital Strategy
    '#ee82ee', // violet - EdTech
    '#ffa500', // orange - E-commerce
    '#20b2aa', // lightseagreen - AI Workshops
  ];

  const detailColor = colors[activeIndex] || '#6495ed';
  const simpleColor = colors[(activeIndex + 1) % colors.length] || '#66cdaa';

  // Determine text color based on background brightness
  const getTextColor = (bgColor: string) => {
    const hex = bgColor.replace('#', '');
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);
    const brightness = (r * 299 + g * 587 + b * 114) / 1000;
    return brightness > 155 ? '#131313' : '#ffffff';
  };

  const detailTextColor = getTextColor(detailColor);
  const simpleTextColor = getTextColor(simpleColor);

  return (
    <AnimatePresence>
      <motion.div
        ref={containerRef}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 z-50 rounded-lg"
        style={{
          overflow: 'hidden',
          backgroundColor: '#131313', // Dark background like template
        }}
      >
        {/* Import font */}
        <style>{FONT_IMPORT}</style>

        {/* Close button */}
        <button
          onClick={handleClose}
          className="absolute top-6 right-6 z-50 rounded-full p-3 bg-white/10 hover:bg-white/20 transition-colors"
          aria-label="Close"
        >
          <X className="w-6 h-6 text-white" />
        </button>

        {/* Main content - no scroll */}
        <div className="w-full h-full flex items-center justify-center px-8 md:px-12">
          <div className="w-full h-full flex items-center gap-8 md:gap-12">
            {/* Left side: All services (1/3 width) */}
            <div className="w-1/3 h-full flex flex-col justify-center gap-3">
              {services.map((service, index) => {
                // Calculate translateY based on position relative to active
                const getTransform = () => {
                  if (index === activeIndex) return 'translateY(0)';
                  if (index < activeIndex) return 'translateY(-40px)'; // Push up
                  return 'translateY(40px)'; // Push down
                };

                return (
                  <div
                    key={index}
                    onClick={() => setActiveIndex(index)}
                    className={`cursor-pointer transition-all duration-500 p-3 ${
                      activeIndex === index
                        ? 'opacity-100'
                        : 'opacity-50 hover:opacity-75'
                    }`}
                    style={{
                      transform: getTransform(),
                    }}
                  >
                    <h3
                      className="uppercase transition-all duration-500"
                      style={{
                        fontFamily: '"Host Grotesk", sans-serif',
                        fontWeight: 700,
                        fontSize: activeIndex === index
                          ? 'clamp(2rem, 4vw, 3.6rem)' // 2x larger for active
                          : 'clamp(1rem, 2vw, 1.8rem)',
                        lineHeight: 1.1,
                        color: activeIndex === index ? '#c24628' : '#e6e3d8',
                        whiteSpace: activeIndex === index ? 'normal' : 'nowrap', // Multi-line for active
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {service.title}
                    </h3>
                  </div>
                );
              })}
            </div>

            {/* Right side: Active service details (2/3 width) */}
            <div className="w-2/3 h-full flex flex-col justify-center gap-6 relative">
              {/* Line 1: from active service to first box */}
              <svg
                className="absolute"
                style={{
                  width: '150px',
                  height: '150px',
                  left: '-150px',
                  top: 'calc(25% - 75px)',
                  pointerEvents: 'none',
                }}
              >
                <line
                  ref={line1Ref}
                  x1="0"
                  y1="75"
                  x2="150"
                  y2="75"
                  stroke="#e6e3d8"
                  strokeWidth="2"
                  opacity="0"
                />
              </svg>

              {/* Detailed description box - more square */}
              <div
                ref={detailBoxRef}
                className="relative shadow-2xl"
                style={{
                  backgroundColor: detailColor,
                  opacity: 0, // Initial state for GSAP
                  padding: 'clamp(2rem, 4vw, 3.5rem)',
                  minHeight: '200px',
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                <p
                  style={{
                    fontFamily: '"Host Grotesk", sans-serif',
                    fontWeight: 500,
                    fontSize: 'clamp(1.1rem, 2.2vw, 1.6rem)',
                    lineHeight: 1.5,
                    color: detailTextColor,
                  }}
                >
                  {currentService.detailedDescription}
                </p>
              </div>

              {/* Line 2: from first box to second box */}
              <svg
                className="absolute"
                style={{
                  width: '150px',
                  height: '150px',
                  left: '-150px',
                  top: 'calc(75% - 75px)',
                  pointerEvents: 'none',
                }}
              >
                <line
                  ref={line2Ref}
                  x1="0"
                  y1="75"
                  x2="150"
                  y2="75"
                  stroke="#e6e3d8"
                  strokeWidth="2"
                  opacity="0"
                />
              </svg>

              {/* Simple explanation box - more square */}
              <div
                ref={simpleBoxRef}
                className="relative shadow-2xl"
                style={{
                  backgroundColor: simpleColor,
                  opacity: 0, // Initial state for GSAP
                  padding: 'clamp(2rem, 4vw, 3.5rem)',
                  minHeight: '200px',
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                <p
                  style={{
                    fontFamily: '"Host Grotesk", sans-serif',
                    fontWeight: 500,
                    fontSize: 'clamp(1.1rem, 2.2vw, 1.6rem)',
                    lineHeight: 1.5,
                    color: simpleTextColor,
                  }}
                >
                  {currentService.simpleExplanation}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Scroll indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5 }}
          className="absolute bottom-8 left-1/2 transform -translate-x-1/2 flex flex-col items-center gap-2"
        >
          <span
            className="uppercase tracking-wider"
            style={{
              fontFamily: '"Host Grotesk", sans-serif',
              fontSize: '0.75rem',
              fontWeight: 600,
              color: '#e6e3d8',
              opacity: 0.6,
            }}
          >
            Scroll to navigate ({activeIndex + 1}/{services.length})
          </span>
          <motion.div
            animate={{ y: [0, 10, 0] }}
            transition={{ duration: 1.5, repeat: Infinity }}
            className="w-6 h-10 border-2 rounded-full flex items-start justify-center p-2"
            style={{
              borderColor: '#e6e3d8',
              opacity: 0.4,
            }}
          >
            <div
              className="w-1 h-2 rounded-full"
              style={{ backgroundColor: '#e6e3d8' }}
            />
          </motion.div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
