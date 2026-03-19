/**
 * CircuitBoard — animated circuit traces with glowing dots.
 * Tech/AI visual atmosphere. Uses SVG path animation.
 */
import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig, spring, interpolate } from "remotion";
import { clampBoth } from "../../design-system";

interface CircuitBoardProps {
  accentColor: string;
  complexity?: "simple" | "medium" | "dense";
  lineWidth?: number;
}

// Generate deterministic circuit paths
function generatePaths(
  width: number,
  height: number,
  count: number,
  seed: number,
): { path: string; dots: { x: number; y: number }[] }[] {
  const paths: { path: string; dots: { x: number; y: number }[] }[] = [];
  let s = seed;
  const next = () => { s = (s * 16807) % 2147483647; return (s % 1000) / 1000; };

  for (let i = 0; i < count; i++) {
    const dots: { x: number; y: number }[] = [];
    let x = next() * width;
    let y = next() * height;
    const segments: string[] = [`M ${x} ${y}`];
    dots.push({ x, y });

    const steps = 3 + Math.floor(next() * 4);
    for (let j = 0; j < steps; j++) {
      // Alternate horizontal and vertical moves (circuit style)
      if (j % 2 === 0) {
        x = Math.min(width - 20, Math.max(20, x + (next() - 0.3) * width * 0.4));
      } else {
        y = Math.min(height - 20, Math.max(20, y + (next() - 0.3) * height * 0.4));
      }
      segments.push(`L ${x} ${y}`);
      dots.push({ x, y });
    }

    paths.push({ path: segments.join(" "), dots });
  }
  return paths;
}

export const CircuitBoard: React.FC<CircuitBoardProps> = ({
  accentColor,
  complexity = "medium",
  lineWidth = 2,
}) => {
  const frame = useCurrentFrame();
  const { fps, width, height, durationInFrames } = useVideoConfig();

  const count = complexity === "simple" ? 5 : complexity === "dense" ? 16 : 10;
  const circuits = React.useMemo(
    () => generatePaths(width, height, count, 12345),
    [width, height, count],
  );

  const fadeOut = interpolate(frame, [durationInFrames - 12, durationInFrames], [1, 0], clampBoth);

  return (
    <AbsoluteFill style={{ opacity: fadeOut * 0.6, pointerEvents: "none" }}>
      <svg width={width} height={height} style={{ position: "absolute", inset: 0 }}>
        <defs>
          <filter id="glow">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {circuits.map((circuit, i) => {
          const delay = i * 4;
          const drawProgress = spring({
            frame: Math.max(0, frame - delay),
            fps,
            config: { damping: 20, stiffness: 60, mass: 1 },
          });

          return (
            <g key={i}>
              {/* Trace line */}
              <path
                d={circuit.path}
                fill="none"
                stroke={accentColor}
                strokeWidth={lineWidth}
                strokeDasharray="1000"
                strokeDashoffset={1000 * (1 - drawProgress)}
                opacity={0.6}
                filter="url(#glow)"
              />

              {/* Intersection dots */}
              {circuit.dots.map((dot, j) => {
                const dotDelay = delay + j * 6 + 10;
                const dotScale = spring({
                  frame: Math.max(0, frame - dotDelay),
                  fps,
                  config: { damping: 10, stiffness: 150 },
                });

                return (
                  <circle
                    key={j}
                    cx={dot.x}
                    cy={dot.y}
                    r={4 * dotScale}
                    fill={accentColor}
                    opacity={dotScale * 0.8}
                  />
                );
              })}
            </g>
          );
        })}
      </svg>
    </AbsoluteFill>
  );
};
