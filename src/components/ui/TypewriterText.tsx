import { useState, useEffect, useRef } from 'react';

interface TypewriterTextProps {
  text: string;
  speed?: number; // milliseconds per character
  pauseAfterTyping?: number; // pause before erasing
  className?: string;
}

export const TypewriterText = ({
  text,
  speed = 50,
  pauseAfterTyping = 2000,
  className = ''
}: TypewriterTextProps) => {
  const [displayedText, setDisplayedText] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isTyping, setIsTyping] = useState(true); // true = typing, false = erasing
  const containerRef = useRef<HTMLDivElement>(null);

  // Reset when text changes (language switch)
  useEffect(() => {
    setDisplayedText('');
    setCurrentIndex(0);
    setIsPaused(false);
    setIsTyping(true);
  }, [text]);

  useEffect(() => {
    if (isPaused) {
      return;
    }

    // Typing phase
    if (isTyping && currentIndex < text.length) {
      const timer = setTimeout(() => {
        setDisplayedText(text.substring(0, currentIndex + 1));
        setCurrentIndex((prev) => prev + 1);

        // Auto-scroll to bottom as text appears
        if (containerRef.current) {
          containerRef.current.scrollTop = containerRef.current.scrollHeight;
        }
      }, speed);

      return () => clearTimeout(timer);
    }

    // Pause after typing is complete
    if (isTyping && currentIndex >= text.length) {
      const pauseTimer = setTimeout(() => {
        setIsTyping(false);
      }, pauseAfterTyping);

      return () => clearTimeout(pauseTimer);
    }

    // Erasing phase
    if (!isTyping && currentIndex > 0) {
      const timer = setTimeout(() => {
        setCurrentIndex((prev) => prev - 1);
        setDisplayedText(text.substring(0, currentIndex - 1));

        // Auto-scroll to bottom as text disappears
        if (containerRef.current) {
          containerRef.current.scrollTop = containerRef.current.scrollHeight;
        }
      }, speed);

      return () => clearTimeout(timer);
    }

    // Start typing again after erasing is complete
    if (!isTyping && currentIndex === 0) {
      const restartTimer = setTimeout(() => {
        setIsTyping(true);
      }, 500);

      return () => clearTimeout(restartTimer);
    }
  }, [currentIndex, text, speed, isPaused, isTyping, pauseAfterTyping]);

  // Format text with basic markdown support
  const formatText = (rawText: string) => {
    return rawText.split('\n').map((line, index) => {
      // Handle bold text **text**
      const parts = line.split(/(\*\*.*?\*\*)/g);
      const formattedLine = parts.map((part, i) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return (
            <strong key={i} className="font-bold text-gray-900">
              {part.slice(2, -2)}
            </strong>
          );
        }
        return part;
      });

      return (
        <span key={index}>
          {formattedLine}
          {index < rawText.split('\n').length - 1 && <br />}
        </span>
      );
    });
  };

  const handleMouseEnter = () => {
    setIsPaused(true);
  };

  const handleMouseLeave = () => {
    setIsPaused(false);
  };

  const showCursor = currentIndex < text.length || !isTyping;

  return (
    <div
      ref={containerRef}
      className={`overflow-y-auto h-full max-h-full ${className}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      style={{
        scrollbarWidth: 'thin',
        scrollbarColor: 'rgba(0, 0, 0, 0.3) transparent',
      }}
    >
      <div
        className="text-gray-800 leading-relaxed whitespace-pre-wrap break-words"
        style={{ fontSize: 'clamp(0.65rem, 1.2vw, 1rem)' }}
      >
        {formatText(displayedText)}
        {showCursor && (
          <span
            className="inline-block bg-gray-800 ml-0.5 sm:ml-1 animate-pulse"
            style={{
              width: 'clamp(4px, 0.5vw, 8px)',
              height: 'clamp(10px, 1.5vw, 16px)'
            }}
          />
        )}
      </div>
    </div>
  );
};
