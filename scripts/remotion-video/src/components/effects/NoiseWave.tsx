/**
 * NoiseWave — organic flowing wave pattern using Perlin noise.
 * Creates liquid/aurora-like background effect.
 * Triggered by "wave", "flow", "liquid", "aurora", "organic" in sceneDescription.
 */
import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate } from "remotion";
import { noise2D } from "@remotion/noise";
import { clampBoth } from "../../design-system";

interface NoiseWaveProps {
  accentColor?: string;
  layers?: number;
  speed?: number;
}

export const NoiseWave: React.FC<NoiseWaveProps> = ({
  accentColor = "#FF7A00",
  layers = 3,
  speed = 1,
}) => {
  const frame = useCurrentFrame();
  const { fps, width, height, durationInFrames } = useVideoConfig();

  const t = (frame / fps) * speed;
  const fadeIn = interpolate(frame, [0, 20], [0, 1], clampBoth);
  const fadeOut = interpolate(frame, [durationInFrames - 15, durationInFrames], [1, 0], clampBoth);

  // Generate wave paths using noise
  const wavePaths = Array.from({ length: layers }, (_, layerIdx) => {
    const yBase = height * (0.35 + layerIdx * 0.15);
    const amplitude = 40 + layerIdx * 20;
    const seed = layerIdx * 100;
    const opacity = 0.15 - layerIdx * 0.03;

    const points: string[] = [];
    const steps = 60;
    for (let i = 0; i <= steps; i++) {
      const x = (i / steps) * width;
      const n = noise2D(`wave-${seed}`, x * 0.003, t + layerIdx * 0.5);
      const y = yBase + n * amplitude;
      points.push(`${i === 0 ? "M" : "L"} ${x} ${y}`);
    }
    // Close the path to fill below the wave
    points.push(`L ${width} ${height}`);
    points.push(`L 0 ${height}`);
    points.push("Z");

    return { path: points.join(" "), opacity };
  });

  return (
    <AbsoluteFill style={{ opacity: fadeIn * fadeOut, pointerEvents: "none" }}>
      <svg width={width} height={height} style={{ position: "absolute", inset: 0 }}>
        <defs>
          <linearGradient id="waveGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={accentColor} stopOpacity="0.6" />
            <stop offset="100%" stopColor={accentColor} stopOpacity="0.1" />
          </linearGradient>
        </defs>
        {wavePaths.map((wave, i) => (
          <path
            key={i}
            d={wave.path}
            fill="url(#waveGrad)"
            opacity={wave.opacity}
          />
        ))}
      </svg>
    </AbsoluteFill>
  );
};
