import { useState, useEffect, useRef } from 'react';

interface TypewriterTextProps {
  text: string;
  speed?: number; // milliseconds per character
  className?: string;
}

export const TypewriterText = ({ text, speed = 50, className = '' }: TypewriterTextProps) => {
  const [displayedText, setDisplayedText] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Reset when text changes (language switch)
  useEffect(() => {
    setDisplayedText('');
    setCurrentIndex(0);
    setIsPaused(false);
  }, [text]);

  useEffect(() => {
    if (isPaused || currentIndex >= text.length) {
      return;
    }

    const timer = setTimeout(() => {
      setDisplayedText((prev) => prev + text[currentIndex]);
      setCurrentIndex((prev) => prev + 1);

      // Auto-scroll to bottom as text appears
      if (containerRef.current) {
        containerRef.current.scrollTop = containerRef.current.scrollHeight;
      }
    }, speed);

    return () => clearTimeout(timer);
  }, [currentIndex, text, speed, isPaused]);

  // Format text with basic markdown support
  const formatText = (rawText: string) => {
    return rawText.split('\n').map((line, index) => {
      // Handle bold text **text**
      const parts = line.split(/(\*\*.*?\*\*)/g);
      const formattedLine = parts.map((part, i) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return (
            <strong key={i} className="font-bold text-white">
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

  return (
    <div
      ref={containerRef}
      className={`overflow-y-auto ${className}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      style={{
        scrollbarWidth: 'thin',
        scrollbarColor: 'rgba(255, 255, 255, 0.3) transparent',
      }}
    >
      <div className="text-white/90 text-sm leading-relaxed whitespace-pre-wrap">
        {formatText(displayedText)}
        {currentIndex < text.length && (
          <span className="inline-block w-2 h-4 bg-white/70 ml-1 animate-pulse" />
        )}
      </div>
    </div>
  );
};
