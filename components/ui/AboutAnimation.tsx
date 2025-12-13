'use client'

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import gsap from 'gsap';
import { SplitText } from 'gsap/SplitText';

// Register GSAP plugins
gsap.registerPlugin(SplitText);

interface AboutAnimationProps {
  text: string;
  isExploding: boolean;
  gridContainerRef: React.RefObject<HTMLDivElement | null>;
  onClose: () => void;
}

export const AboutAnimation = ({ text, isExploding, gridContainerRef, onClose }: AboutAnimationProps) => {
  const textRef = useRef<HTMLDivElement>(null);
  const [gridBounds, setGridBounds] = useState<DOMRect | null>(null);
  const splitTextRef = useRef<SplitText | null>(null);
  const timelineRef = useRef<gsap.core.Timeline | null>(null);
  const [currentText, setCurrentText] = useState(text);

  // Log component lifecycle
  useEffect(() => {
    console.log('🎭 AboutAnimation: Component MOUNTED');
    return () => {
      console.log('🎭 AboutAnimation: Component UNMOUNTED');
    };
  }, []);

  // Log prop changes
  useEffect(() => {
    console.log('🔄 AboutAnimation: isExploding changed to:', isExploding);
  }, [isExploding]);

  // Update text when it changes
  useEffect(() => {
    console.log('🌐 AboutAnimation: text changed, updating currentText');
    setCurrentText(text);
  }, [text]);

  // Calculate grid bounds when explosion starts
  useEffect(() => {
    console.log('📍 AboutAnimation: useEffect[isExploding] triggered. isExploding:', isExploding);
    if (isExploding && gridContainerRef.current) {
      const bounds = gridContainerRef.current.getBoundingClientRect();
      setGridBounds(bounds);
      console.log('📐 About: Grid bounds calculated:', bounds);
    } else {
      console.log('🚫 About: Clearing grid bounds (isExploding:', isExploding, ')');
      setGridBounds(null);
    }
  }, [isExploding, gridContainerRef]);

  // Animate text when exploding
  useEffect(() => {
    console.log('🎬 AboutAnimation: Animation useEffect triggered. isExploding:', isExploding, 'textRef:', !!textRef.current, 'gridBounds:', !!gridBounds, 'currentText length:', currentText.length);

    if (!isExploding || !textRef.current || !gridBounds) {
      // Cleanup
      console.log('🧹 About: Cleaning up animation (isExploding:', isExploding, ')');
      if (splitTextRef.current) {
        splitTextRef.current.revert();
        splitTextRef.current = null;
      }
      if (timelineRef.current) {
        timelineRef.current.kill();
        timelineRef.current = null;
      }
      return;
    }

    console.log('🎬 About: Starting chaotic cloud animation');

    // Wait for next frame to ensure DOM is ready
    requestAnimationFrame(() => {
      if (!textRef.current) return;

      // Create SplitText
      try {
        splitTextRef.current = new SplitText(textRef.current, {
          type: 'chars,words',
          charsClass: 'char',
          wordsClass: 'word',
        });

        const chars = textRef.current.querySelectorAll('.char');

        if (!chars || chars.length === 0) {
          console.warn('⚠️ About: No characters found');
          return;
        }

        console.log(`✅ About: Found ${chars.length} characters`);

        // Create timeline
        const tl = gsap.timeline();

        // Animate from chaotic cloud to readable text
        tl.fromTo(
          chars,
          {
            opacity: 0,
            x: () => (Math.random() - 0.5) * 600,
            y: () => (Math.random() - 0.5) * 600,
            rotation: () => (Math.random() - 0.5) * 720,
            scale: 0,
          },
          {
            duration: 1.5,
            opacity: 1,
            x: 0,
            y: 0,
            rotation: 0,
            scale: 1,
            ease: 'elastic.out(1, 0.5)',
            stagger: {
              amount: 1.2,
              from: 'random',
            },
          }
        );

        timelineRef.current = tl;
      } catch (error) {
        console.error('❌ About: Error creating animation:', error);
      }
    });

    return () => {
      console.log('🧹 About: Cleanup function called from animation useEffect');
      if (splitTextRef.current) {
        splitTextRef.current.revert();
        splitTextRef.current = null;
      }
      if (timelineRef.current) {
        timelineRef.current.kill();
        timelineRef.current = null;
      }
    };
  }, [isExploding, gridBounds, currentText]);

  console.log('🖼️ AboutAnimation: Render called. isExploding:', isExploding, 'gridBounds:', !!gridBounds);

  if (!isExploding || !gridBounds) {
    console.log('⏹️ AboutAnimation: Returning null (not rendering)');
    return null;
  }

  console.log('✅ AboutAnimation: Rendering portal');

  // Process text: remove ** markdown and split into paragraphs
  const cleanText = currentText.replace(/\*\*/g, '');
  const paragraphs = cleanText.split('\n\n').filter(p => p.trim());
  console.log('📝 AboutAnimation: Paragraphs count:', paragraphs.length);

  // Function to split paragraph into bold start and rest
  const renderParagraph = (text: string, index: number) => {
    const trimmed = text.trim();
    const words = trimmed.split(' ');

    // First 2-3 words will be bold
    const boldWordCount = Math.min(3, words.length);
    const boldPart = words.slice(0, boldWordCount).join(' ');
    const restPart = words.slice(boldWordCount).join(' ');

    return (
      <p key={index} className="mb-6 first:mt-0">
        <span className="font-bold text-gray-900" style={{ fontWeight: 700 }}>
          {boldPart}
        </span>
        {restPart && ' ' + restPart}
      </p>
    );
  };

  return createPortal(
    <AnimatePresence mode="wait">
      {isExploding && (
        <motion.div
          key={`about-explosion-${currentText.substring(0, 50)}`}
          className="fixed bg-white"
          style={{
            left: gridBounds.left,
            top: gridBounds.top,
            width: gridBounds.width,
            height: gridBounds.height,
            zIndex: 100,
          }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
          {/* Close button */}
          <button
            onClick={() => {
              console.log('❌ AboutAnimation: Close button CLICKED');
              onClose();
            }}
            className="absolute top-4 right-4 w-10 h-10 flex items-center justify-center bg-gray-200 hover:bg-gray-300 rounded-full transition-colors z-10"
            aria-label="Close"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          <div className="w-full h-full overflow-auto pt-16 pb-8 px-12">
            <div
              ref={textRef}
              className="text-gray-900 w-full"
              style={{
                fontSize: 'clamp(0.9rem, 2vw, 1.2rem)',
                lineHeight: 1.8,
              }}
            >
              {paragraphs.map(renderParagraph)}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
};
