import { useEffect, useRef, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { X } from 'lucide-react';

// Register GSAP plugins
gsap.registerPlugin(ScrollTrigger);

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
  const serviceRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);

  // Setup scroll-triggered animations
  useEffect(() => {
    if (!isOpen || !containerRef.current) return;

    console.log('🎬 ServicesDetail: Setting up scroll triggers');

    // Clear previous scroll triggers
    ScrollTrigger.getAll().forEach(trigger => trigger.kill());

    // Setup scroll trigger for each service
    serviceRefs.current.forEach((ref, index) => {
      if (!ref) return;

      ScrollTrigger.create({
        trigger: ref,
        start: 'top center',
        end: 'bottom center',
        onEnter: () => {
          console.log(`📍 Service ${index} ACTIVE`);
          setActiveIndex(index);
        },
        onEnterBack: () => {
          console.log(`📍 Service ${index} ACTIVE (scroll back)`);
          setActiveIndex(index);
        },
      });
    });

    return () => {
      ScrollTrigger.getAll().forEach(trigger => trigger.kill());
    };
  }, [isOpen, services]);

  // Animate lines and descriptions when active service changes
  useEffect(() => {
    if (!isOpen) return;

    console.log(`🎨 Active service changed to: ${activeIndex}`);

    // Animate detailed description entry
    const detailBox = document.querySelector(`#detail-${activeIndex}`);
    const simpleBox = document.querySelector(`#simple-${activeIndex}`);
    const line1 = document.querySelector(`#line1-${activeIndex}`);
    const line2 = document.querySelector(`#line2-${activeIndex}`);

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
    ScrollTrigger.getAll().forEach(trigger => trigger.kill());
    onClose();
  }, [onClose]);

  if (!isOpen) return null;

  return createPortal(
    <AnimatePresence>
      <motion.div
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

        {/* Scrollable content */}
        <div
          ref={containerRef}
          className="w-full h-full overflow-y-auto overflow-x-hidden"
          style={{
            scrollBehavior: 'smooth',
          }}
        >
          <div className="max-w-7xl mx-auto px-8 py-20">
            {/* Header */}
            <motion.h1
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-5xl font-black uppercase mb-20 text-center"
            >
              Services
            </motion.h1>

            {/* Services list */}
            <div className="space-y-32">
              {services.map((service, index) => (
                <div
                  key={index}
                  ref={(el) => {
                    serviceRefs.current[index] = el;
                  }}
                  className="relative min-h-screen flex items-center"
                >
                  {/* Left side: Service title */}
                  <div className="w-1/3 pr-8">
                    <h2
                      className={`text-4xl font-black uppercase transition-all duration-500 ${
                        activeIndex === index
                          ? 'text-black opacity-100 scale-110'
                          : 'text-gray-300 opacity-50'
                      }`}
                      style={{
                        fontSize: 'clamp(1.5rem, 4vw, 3rem)',
                        lineHeight: 1.2,
                      }}
                    >
                      {service.title}
                    </h2>
                  </div>

                  {/* Right side: Descriptions (only visible when active) */}
                  <div className="w-2/3 flex flex-col gap-8">
                    {activeIndex === index && (
                      <>
                        {/* Line 1 */}
                        <svg
                          id={`line1-${index}`}
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
                          id={`detail-${index}`}
                          className="bg-gradient-to-br from-slate-100 to-slate-200 p-6 rounded-lg shadow-lg border-l-4 border-black"
                        >
                          <div className="flex items-start gap-3">
                            <span className="text-2xl">🧠</span>
                            <p className="text-lg text-gray-800 leading-relaxed">
                              {service.detailedDescription}
                            </p>
                          </div>
                        </div>

                        {/* Line 2 */}
                        <svg
                          id={`line2-${index}`}
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
                          id={`simple-${index}`}
                          className="bg-gradient-to-br from-blue-50 to-blue-100 p-6 rounded-lg shadow-lg border-l-4 border-blue-500"
                        >
                          <div className="flex items-start gap-3">
                            <span className="text-2xl">💬</span>
                            <p className="text-lg text-gray-700 leading-relaxed">
                              {service.simpleExplanation}
                            </p>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Bottom spacer */}
            <div className="h-32" />
          </div>
        </div>

        {/* Scroll indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
          className="fixed bottom-8 left-1/2 transform -translate-x-1/2 flex flex-col items-center gap-2"
        >
          <span className="text-sm text-gray-400 uppercase tracking-wider">Scroll</span>
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
