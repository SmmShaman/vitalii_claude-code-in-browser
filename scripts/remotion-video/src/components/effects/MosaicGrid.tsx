/**
 * MosaicGrid — staggered grid of cells that fill the screen.
 * Creates a "wall of data" / "mosaic" background effect.
 */
import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig, spring, interpolate } from "remotion";
import { clampBoth } from "../../design-system";

interface MosaicGridProps {
  cols?: number;
  rows?: number;
  cellShape?: "square" | "circle";
  fillColor: string;
  staggerPattern?: "center-out" | "left-right" | "diagonal";
  maxOpacity?: number;
}

// Deterministic shuffle using seed
function seededShuffle<T>(arr: T[], seed: number): T[] {
  const out = [...arr];
  let s = seed;
  for (let i = out.length - 1; i > 0; i--) {
    s = (s * 16807 + 0) % 2147483647;
    const j = s % (i + 1);
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export const MosaicGrid: React.FC<MosaicGridProps> = ({
  cols = 8,
  rows = 6,
  cellShape = "square",
  fillColor,
  staggerPattern = "center-out",
  maxOpacity = 0.25,
}) => {
  const frame = useCurrentFrame();
  const { fps, width, height, durationInFrames } = useVideoConfig();

  const cellW = width / cols;
  const cellH = height / rows;
  const total = cols * rows;
  const centerX = cols / 2;
  const centerY = rows / 2;

  // Compute delay order based on pattern
  const indices = Array.from({ length: total }, (_, i) => i);
  let ordered: number[];

  if (staggerPattern === "center-out") {
    ordered = indices.sort((a, b) => {
      const ax = (a % cols) - centerX, ay = Math.floor(a / cols) - centerY;
      const bx = (b % cols) - centerX, by = Math.floor(b / cols) - centerY;
      return Math.sqrt(ax * ax + ay * ay) - Math.sqrt(bx * bx + by * by);
    });
  } else if (staggerPattern === "diagonal") {
    ordered = indices.sort((a, b) => {
      return ((a % cols) + Math.floor(a / cols)) - ((b % cols) + Math.floor(b / cols));
    });
  } else {
    ordered = indices;
  }

  // Map index to delay frame
  const maxDelay = Math.min(durationInFrames * 0.6, total * 1.5);
  const delayMap = new Map<number, number>();
  ordered.forEach((idx, rank) => {
    delayMap.set(idx, (rank / total) * maxDelay);
  });

  // Fade out the whole grid near the end
  const gridFadeOut = interpolate(frame, [durationInFrames - 15, durationInFrames], [1, 0], clampBoth);

  return (
    <AbsoluteFill style={{ opacity: gridFadeOut, pointerEvents: "none" }}>
      {indices.map((i) => {
        const col = i % cols;
        const row = Math.floor(i / cols);
        const delay = delayMap.get(i) || 0;

        const cellScale = spring({
          frame: Math.max(0, frame - delay),
          fps,
          config: { damping: 15, stiffness: 120, mass: 0.5 },
        });

        const cellOpacity = interpolate(
          frame,
          [delay, delay + 8],
          [0, maxOpacity],
          clampBoth,
        );

        const size = Math.min(cellW, cellH) * 0.7;

        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: col * cellW + (cellW - size) / 2,
              top: row * cellH + (cellH - size) / 2,
              width: size,
              height: size,
              borderRadius: cellShape === "circle" ? "50%" : 4,
              background: fillColor,
              opacity: cellOpacity,
              transform: `scale(${cellScale})`,
            }}
          />
        );
      })}
    </AbsoluteFill>
  );
};
