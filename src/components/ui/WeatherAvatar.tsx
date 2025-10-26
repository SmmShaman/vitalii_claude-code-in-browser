import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { getAvatarState } from '../../utils/footerApi';
import type { WeatherData } from '../../utils/footerApi';

interface WeatherAvatarProps {
  weather: WeatherData | null;
  className?: string;
}

export const WeatherAvatar = ({ weather, className = '' }: WeatherAvatarProps) => {
  const [eyePosition, setEyePosition] = useState({ x: 0, y: 0 });
  const avatarRef = useRef<HTMLDivElement>(null);

  const { outfit, accessory } = getAvatarState(weather);

  // Track mouse movement for eye animation
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!avatarRef.current) return;

      const rect = avatarRef.current.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;

      const deltaX = e.clientX - centerX;
      const deltaY = e.clientY - centerY;

      // Limit eye movement
      const maxDistance = 8;
      const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
      const limitedDistance = Math.min(distance, maxDistance * 10);
      const angle = Math.atan2(deltaY, deltaX);

      const x = Math.cos(angle) * Math.min(limitedDistance / 10, maxDistance);
      const y = Math.sin(angle) * Math.min(limitedDistance / 10, maxDistance);

      setEyePosition({ x, y });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  return (
    <motion.div
      ref={avatarRef}
      className={`relative ${className}`}
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 0.5 }}
      whileHover={{ scale: 1.05 }}
    >
      <svg
        width="120"
        height="120"
        viewBox="0 0 120 120"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="drop-shadow-lg"
      >
        {/* Head */}
        <circle cx="60" cy="60" r="35" fill="#FFD9A0" stroke="#333" strokeWidth="2" />

        {/* Hat (if snow) */}
        {accessory === 'hat' && (
          <g>
            <rect x="40" y="20" width="40" height="8" rx="2" fill="#333" />
            <rect x="45" y="10" width="30" height="12" rx="2" fill="#8B4513" />
            <circle cx="60" cy="12" r="4" fill="#FF6B6B" />
          </g>
        )}

        {/* Scarf (if cold) */}
        {outfit === 'scarf' && (
          <g>
            <path
              d="M 45 75 Q 45 80 50 82 L 52 90 Q 50 92 48 90 L 46 82 Q 42 80 42 75 Z"
              fill="#FF6B6B"
              stroke="#333"
              strokeWidth="1"
            />
            <path
              d="M 42 75 Q 60 78 78 75"
              stroke="#FF6B6B"
              strokeWidth="6"
              strokeLinecap="round"
            />
            <path
              d="M 75 75 Q 75 80 70 82 L 68 90 Q 70 92 72 90 L 74 82 Q 78 80 78 75 Z"
              fill="#FF6B6B"
              stroke="#333"
              strokeWidth="1"
            />
          </g>
        )}

        {/* Eyes */}
        <g>
          {/* Left eye */}
          <ellipse cx="48" cy="55" rx="6" ry="8" fill="white" stroke="#333" strokeWidth="1.5" />
          <circle
            cx={48 + eyePosition.x}
            cy={55 + eyePosition.y}
            r="3"
            fill="#333"
            className="transition-transform duration-100"
          />
          <circle
            cx={48 + eyePosition.x + 1}
            cy={55 + eyePosition.y - 1}
            r="1"
            fill="white"
          />

          {/* Right eye */}
          <ellipse cx="72" cy="55" rx="6" ry="8" fill="white" stroke="#333" strokeWidth="1.5" />
          <circle
            cx={72 + eyePosition.x}
            cy={55 + eyePosition.y}
            r="3"
            fill="#333"
            className="transition-transform duration-100"
          />
          <circle
            cx={72 + eyePosition.x + 1}
            cy={55 + eyePosition.y - 1}
            r="1"
            fill="white"
          />
        </g>

        {/* Nose */}
        <path d="M 60 60 L 58 68 L 62 68 Z" fill="#FFB380" />

        {/* Mouth - smiling */}
        <motion.path
          d="M 48 72 Q 60 78 72 72"
          stroke="#333"
          strokeWidth="2"
          strokeLinecap="round"
          fill="none"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        />

        {/* Umbrella (if rain) */}
        {accessory === 'umbrella' && (
          <g transform="translate(75, 35)">
            <path
              d="M 0 0 Q -15 -8 -30 0 Q -15 5 0 0"
              fill="#4A90E2"
              stroke="#333"
              strokeWidth="1.5"
            />
            <line x1="0" y1="0" x2="0" y2="25" stroke="#8B4513" strokeWidth="2" />
            <path d="M -2 25 Q 0 28 2 25" stroke="#8B4513" strokeWidth="2" fill="none" />
          </g>
        )}

        {/* T-shirt indicator (if hot) */}
        {outfit === 'tshirt' && (
          <g>
            <path
              d="M 40 75 L 40 95 L 80 95 L 80 75"
              fill="#FFD700"
              stroke="#333"
              strokeWidth="1.5"
            />
            <text
              x="60"
              y="88"
              fontSize="12"
              fill="#333"
              textAnchor="middle"
              fontFamily="Arial, sans-serif"
              fontWeight="bold"
            >
              ☀️
            </text>
          </g>
        )}
      </svg>

      {/* Weather emoji badge */}
      {weather && (
        <motion.div
          className="absolute -top-2 -right-2 bg-white rounded-full p-2 shadow-lg border-2 border-gray-200"
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: 'spring', stiffness: 260, damping: 20, delay: 0.3 }}
        >
          <span className="text-2xl">{weather.emoji}</span>
        </motion.div>
      )}

      {/* Temperature badge */}
      {weather && (
        <motion.div
          className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-full px-3 py-1 shadow-lg text-sm font-bold"
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.4 }}
        >
          {weather.temperature > 0 ? '+' : ''}
          {weather.temperature}°C
        </motion.div>
      )}
    </motion.div>
  );
};
