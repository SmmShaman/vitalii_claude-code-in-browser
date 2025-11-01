import { useEffect, useRef, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import gsap from 'gsap';
import { X } from 'lucide-react';

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
}

export const ServicesDetail = ({ services, isOpen, onClose }: ServicesDetailProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const wheelTimeoutRef = useRef<number | null>(null);

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

  // Animate lines and descriptions when active service changes
  useEffect(() => {
    if (!isOpen) return;

    console.log(`🎨 Active service changed to: ${activeIndex}`);

    // Animate detailed description entry
    const detailBox = document.querySelector(`#detail-box`);
    const simpleBox = document.querySelector(`#simple-box`);
    const line1 = document.querySelector(`#line1`);
    const line2 = document.querySelector(`#line2`);

    if (detailBox && simpleBox && line1 && line2) {
      gsap.fromTo(
        line1,
        { scaleX: 0, opacity: 0 },
        { scaleX: 1, opacity: 1, duration: 0.5, ease: 'power2.out' }
      );

      gsap.fromTo(
        detailBox,
        { opacity: 0, x: -30 },
        { opacity: 1, x: 0, duration: 0.6, delay: 0.3, ease: 'power2.out' }
      );

      gsap.fromTo(
        line2,
        { scaleX: 0, opacity: 0 },
        { scaleX: 1, opacity: 1, duration: 0.5, delay: 0.6, ease: 'power2.out' }
      );

      gsap.fromTo(
        simpleBox,
        { opacity: 0, x: -30 },
        { opacity: 1, x: 0, duration: 0.6, delay: 0.9, ease: 'power2.out' }
      );
    }
  }, [activeIndex, isOpen]);

  const handleClose = useCallback(() => {
    console.log('❌ ServicesDetail: Closing');
    setActiveIndex(0);
    onClose();
  }, [onClose]);

  if (!isOpen) return null;

  const currentService = services[activeIndex];

  return createPortal(
    <AnimatePresence>
      <motion.div
        ref={containerRef}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-white"
        style={{
          overflow: 'hidden',
        }}
      >
        {/* Close button */}
        <button
          onClick={handleClose}
          className="fixed top-6 right-6 z-50 rounded-full p-3 bg-black/10 hover:bg-black/20 transition-colors"
          aria-label="Close"
        >
          <X className="w-6 h-6 text-black" />
        </button>

        {/* Main content - no scroll */}
        <div className="w-full h-full flex items-center justify-center px-12">
          <div className="w-full max-w-7xl h-full flex items-center gap-12">
            {/* Left side: All services (1/3 width) */}
            <div className="w-1/3 h-full flex flex-col justify-center gap-4">
              {services.map((service, index) => (
                <div
                  key={index}
                  onClick={() => setActiveIndex(index)}
                  className={`cursor-pointer transition-all duration-500 p-3 rounded-lg ${
                    activeIndex === index
                      ? 'bg-black text-white scale-105'
                      : 'text-gray-300 hover:text-gray-500 hover:bg-gray-50'
                  }`}
                >
                  <h3
                    className={`font-black uppercase transition-all duration-500`}
                    style={{
                      fontSize: 'clamp(0.9rem, 1.8vw, 1.5rem)',
                      lineHeight: 1.2,
                    }}
                  >
                    {index + 1}. {service.title}
                  </h3>
                </div>
              ))}
            </div>

            {/* Right side: Active service details (2/3 width) */}
            <div className="w-2/3 h-full flex flex-col justify-center gap-8">
              {/* Line 1 */}
              <svg
                id="line1"
                className="w-full h-1"
                style={{ transformOrigin: 'left center' }}
              >
                <line
                  x1="0"
                  y1="50%"
                  x2="100%"
                  y2="50%"
                  stroke="#000"
                  strokeWidth="2"
                />
              </svg>

              {/* Detailed description box */}
              <div
                id="detail-box"
                className="bg-gradient-to-br from-slate-100 to-slate-200 p-8 rounded-lg shadow-lg border-l-4 border-black"
              >
                <div className="flex items-start gap-4">
                  <span className="text-3xl">🧠</span>
                  <div>
                    <p className="text-sm uppercase font-bold text-gray-500 mb-2">
                      Серйозний опис
                    </p>
                    <p className="text-xl text-gray-800 leading-relaxed">
                      {currentService.detailedDescription}
                    </p>
                  </div>
                </div>
              </div>

              {/* Line 2 */}
              <svg
                id="line2"
                className="w-full h-1"
                style={{ transformOrigin: 'left center' }}
              >
                <line
                  x1="0"
                  y1="50%"
                  x2="100%"
                  y2="50%"
                  stroke="#000"
                  strokeWidth="2"
                />
              </svg>

              {/* Simple explanation box */}
              <div
                id="simple-box"
                className="bg-gradient-to-br from-blue-50 to-blue-100 p-8 rounded-lg shadow-lg border-l-4 border-blue-500"
              >
                <div className="flex items-start gap-4">
                  <span className="text-3xl">💬</span>
                  <div>
                    <p className="text-sm uppercase font-bold text-blue-600 mb-2">
                      Просте пояснення
                    </p>
                    <p className="text-xl text-gray-700 leading-relaxed">
                      {currentService.simpleExplanation}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Scroll indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
          className="fixed bottom-8 left-1/2 transform -translate-x-1/2 flex flex-col items-center gap-2"
        >
          <span className="text-sm text-gray-400 uppercase tracking-wider">
            Scroll to navigate ({activeIndex + 1}/{services.length})
          </span>
          <motion.div
            animate={{ y: [0, 10, 0] }}
            transition={{ duration: 1.5, repeat: Infinity }}
            className="w-6 h-10 border-2 border-gray-300 rounded-full flex items-start justify-center p-2"
          >
            <div className="w-1 h-2 bg-gray-400 rounded-full" />
          </motion.div>
        </motion.div>
      </motion.div>
    </AnimatePresence>,
    document.body
  );
};
