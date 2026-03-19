/**
 * PixelDissolve — pixels appear/disappear in random order.
 * Creates dissolve/reassemble transition effect.
 */
import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate } from "remotion";
import { clampBoth } from "../../design-system";

interface PixelDissolveProps {
  direction?: "assemble" | "dissolve";
  gridSize?: number;
  color: string;
}

export const PixelDissolve: React.FC<PixelDissolveProps> = ({
  direction = "assemble",
  gridSize = 16,
  color,
}) => {
  const frame = useCurrentFrame();
  const { width, height, durationInFrames } = useVideoConfig();

  const cellW = width / gridSize;
  const cellH = height / gridSize;
  const total = gridSize * gridSize;

  // Deterministic shuffle
  const order = React.useMemo(() => {
    const arr = Array.from({ length: total }, (_, i) => i);
    let seed = 42;
    for (let i = arr.length - 1; i > 0; i--) {
      seed = (seed * 16807) % 2147483647;
      const j = seed % (i + 1);
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }, [total]);

  const activeDuration = durationInFrames * 0.7;

  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      {order.map((shuffledIdx, i) => {
        const col = i % gridSize;
        const row = Math.floor(i / gridSize);
        const delay = (shuffledIdx / total) * activeDuration;

        let opacity: number;
        if (direction === "assemble") {
          opacity = interpolate(frame, [delay, delay + 4], [0, 0.5], clampBoth);
        } else {
          const dissStart = activeDuration - delay;
          opacity = interpolate(frame, [dissStart, dissStart + 4], [0.5, 0], clampBoth);
        }

        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: col * cellW,
              top: row * cellH,
              width: cellW + 1,
              height: cellH + 1,
              background: color,
              opacity,
            }}
          />
        );
      })}
    </AbsoluteFill>
  );
};
