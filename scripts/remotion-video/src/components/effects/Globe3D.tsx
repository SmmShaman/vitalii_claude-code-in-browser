/**
 * Globe3D — rotating wireframe globe effect using CSS/SVG.
 * Pure CSS implementation — no Three.js dependency.
 * Renders a sphere with latitude/longitude lines that rotate.
 */
import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate } from "remotion";
import { clampBoth } from "../../design-system";

interface Globe3DProps {
  accentColor?: string;
  rotationSpeed?: number;
}

export const Globe3D: React.FC<Globe3DProps> = ({
  accentColor = "#4ecdc4",
  rotationSpeed = 1,
}) => {
  const frame = useCurrentFrame();
  const { fps, width, height, durationInFrames } = useVideoConfig();

  const t = frame / fps;
  const cx = width / 2;
  const cy = height * 0.45;
  const r = Math.min(width, height) * 0.28;

  const scaleIn = interpolate(frame, [0, 20], [0.3, 1], clampBoth);
  const fadeIn = interpolate(frame, [0, 15], [0, 1], clampBoth);
  const fadeOut = interpolate(frame, [durationInFrames - 12, durationInFrames], [1, 0], clampBoth);

  // Longitude lines (vertical great circles that rotate)
  const lonLines = Array.from({ length: 8 }, (_, i) => {
    const angle = (i / 8) * Math.PI + t * rotationSpeed * 0.5;
    const cosA = Math.cos(angle);
    // Project ellipse: rx varies with cos(angle) to simulate 3D rotation
    const rx = Math.abs(cosA) * r;
    return { rx, opacity: 0.3 + Math.abs(cosA) * 0.4 };
  });

  // Latitude lines (horizontal circles at different heights)
  const latLines = Array.from({ length: 5 }, (_, i) => {
    const lat = ((i + 1) / 6 - 0.5) * 2; // -0.67 to 0.67
    const ry = Math.sqrt(1 - lat * lat) * r;
    const yOffset = lat * r;
    return { ry, yOffset };
  });

  // Pulse dots on surface
  const dots = Array.from({ length: 12 }, (_, i) => {
    const phi = (i / 12) * Math.PI * 2 + t * 0.8;
    const theta = Math.PI * 0.3 + (i % 4) * 0.5;
    const x = r * Math.sin(theta) * Math.cos(phi) * scaleIn;
    const y = r * Math.cos(theta) * scaleIn;
    const z = Math.sin(theta) * Math.sin(phi);
    const pulse = (Math.sin(t * 3 + i * 1.2) + 1) / 2;
    // Only show dots on the "front" half of the globe
    if (z < -0.1) return null;
    return { x: cx + x, y: cy - y, size: 3 + pulse * 3, opacity: 0.4 + pulse * 0.6 };
  }).filter(Boolean);

  return (
    <AbsoluteFill style={{ opacity: fadeIn * fadeOut, pointerEvents: "none" }}>
      <svg width={width} height={height}>
        <defs>
          <filter id="globeGlow">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Outer glow circle */}
        <circle
          cx={cx} cy={cy} r={r * scaleIn * 1.05}
          fill="none" stroke={accentColor} strokeWidth={1}
          opacity={0.15} filter="url(#globeGlow)"
        />

        {/* Main circle (equator outline) */}
        <circle
          cx={cx} cy={cy} r={r * scaleIn}
          fill="none" stroke={accentColor} strokeWidth={1.5}
          opacity={0.6}
        />

        {/* Longitude lines (vertical ellipses) */}
        {lonLines.map((line, i) => (
          <ellipse
            key={`lon-${i}`}
            cx={cx} cy={cy}
            rx={line.rx * scaleIn}
            ry={r * scaleIn}
            fill="none" stroke={accentColor} strokeWidth={0.8}
            opacity={line.opacity * 0.5}
          />
        ))}

        {/* Latitude lines (horizontal ellipses) */}
        {latLines.map((line, i) => (
          <ellipse
            key={`lat-${i}`}
            cx={cx} cy={cy - line.yOffset * scaleIn}
            rx={line.ry * scaleIn}
            ry={line.ry * 0.3 * scaleIn}
            fill="none" stroke={accentColor} strokeWidth={0.6}
            opacity={0.3}
          />
        ))}

        {/* Orbit ring */}
        <ellipse
          cx={cx} cy={cy}
          rx={r * scaleIn * 1.3}
          ry={r * scaleIn * 0.35}
          fill="none" stroke={accentColor} strokeWidth={1}
          opacity={0.3}
          transform={`rotate(-15, ${cx}, ${cy})`}
          strokeDasharray="8 4"
          strokeDashoffset={frame * 0.5}
        />

        {/* Pulse dots */}
        {dots.map((dot, i) => dot && (
          <circle
            key={`dot-${i}`}
            cx={dot.x} cy={dot.y}
            r={dot.size}
            fill="white"
            opacity={dot.opacity}
          />
        ))}
      </svg>
    </AbsoluteFill>
  );
};
