/**
 * PhotoCollage — mosaic of 3-6 photos appearing with stagger animation.
 * Each photo pops in with spring scale, slight rotation, shadow.
 * Triggered by "collage", "photo mosaic", "multiple photos", "image grid".
 */
import React from "react";
import {
  AbsoluteFill,
  Img,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
} from "remotion";
import { glass, clampBoth } from "../../design-system";

interface PhotoCollageProps {
  images: string[];
  accentColor: string;
}

// Predefined layouts for different image counts
const LAYOUTS: Record<
  number,
  { x: number; y: number; w: number; h: number; rot: number }[]
> = {
  2: [
    { x: 0.08, y: 0.15, w: 0.42, h: 0.55, rot: -3 },
    { x: 0.5, y: 0.2, w: 0.42, h: 0.55, rot: 2 },
  ],
  3: [
    { x: 0.05, y: 0.1, w: 0.38, h: 0.45, rot: -4 },
    { x: 0.35, y: 0.05, w: 0.35, h: 0.5, rot: 1 },
    { x: 0.55, y: 0.35, w: 0.38, h: 0.45, rot: 3 },
  ],
  4: [
    { x: 0.03, y: 0.05, w: 0.35, h: 0.4, rot: -3 },
    { x: 0.4, y: 0.02, w: 0.32, h: 0.38, rot: 2 },
    { x: 0.08, y: 0.45, w: 0.34, h: 0.4, rot: -1 },
    { x: 0.48, y: 0.4, w: 0.36, h: 0.42, rot: 4 },
  ],
  5: [
    { x: 0.02, y: 0.05, w: 0.3, h: 0.35, rot: -4 },
    { x: 0.35, y: 0.0, w: 0.3, h: 0.35, rot: 1 },
    { x: 0.65, y: 0.1, w: 0.3, h: 0.35, rot: 3 },
    { x: 0.1, y: 0.42, w: 0.32, h: 0.38, rot: -2 },
    { x: 0.48, y: 0.45, w: 0.34, h: 0.4, rot: 2 },
  ],
  6: [
    { x: 0.02, y: 0.02, w: 0.28, h: 0.32, rot: -3 },
    { x: 0.33, y: 0.0, w: 0.28, h: 0.3, rot: 1 },
    { x: 0.65, y: 0.05, w: 0.28, h: 0.32, rot: 3 },
    { x: 0.05, y: 0.38, w: 0.28, h: 0.32, rot: -2 },
    { x: 0.36, y: 0.4, w: 0.28, h: 0.3, rot: 2 },
    { x: 0.67, y: 0.38, w: 0.28, h: 0.32, rot: -1 },
  ],
};

export const PhotoCollage: React.FC<PhotoCollageProps> = ({
  images,
  accentColor,
}) => {
  const frame = useCurrentFrame();
  const { fps, width, height, durationInFrames } = useVideoConfig();

  // Images arrive already resolved from VisualBlockScene
  const identity = (src: string) =>
    src;

  const count = Math.min(images.length, 6);
  if (count < 2) return null;

  const layout = LAYOUTS[count] || LAYOUTS[4];
  const fadeOut = interpolate(
    frame,
    [durationInFrames - 10, durationInFrames],
    [1, 0],
    clampBoth,
  );

  return (
    <AbsoluteFill style={{ opacity: fadeOut }}>
      {images.slice(0, count).map((src, i) => {
        const pos = layout[i] || layout[0];
        const delay = 5 + i * 6;

        const popScale = spring({
          frame: Math.max(0, frame - delay),
          fps,
          config: { damping: 10, stiffness: 120, mass: 0.5 },
        });
        const opacity = interpolate(
          frame,
          [delay, delay + 6],
          [0, 1],
          clampBoth,
        );

        // Subtle float animation
        const floatY = Math.sin((frame + i * 30) * 0.03) * 3;

        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: pos.x * width,
              top: pos.y * height,
              width: pos.w * width,
              height: pos.h * height,
              borderRadius: 12,
              overflow: "hidden",
              transform: `scale(${popScale}) rotate(${pos.rot}deg) translateY(${floatY}px)`,
              opacity,
              boxShadow: `0 8px 32px rgba(0,0,0,0.5), 0 0 0 2px ${accentColor}30`,
              zIndex: count - i,
            }}
          >
            <Img
              src={identity(src)}
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
              }}
            />
          </div>
        );
      })}
    </AbsoluteFill>
  );
};
