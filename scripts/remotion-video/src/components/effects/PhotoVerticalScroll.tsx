/**
 * PhotoVerticalScroll — photo scrolls vertically through the frame.
 * Like reading a long document or scrolling a webpage.
 * Triggered by "scroll", "vertical pan", "scrolling through", "long image".
 */
import React from "react";
import {
  AbsoluteFill,
  Img,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
} from "remotion";
import { clampBoth } from "../../design-system";

interface PhotoVerticalScrollProps {
  imageSrc: string;
  direction?: "up" | "down";
  /** How much of the image to traverse (1 = full height) */
  scrollAmount?: number;
  accentColor: string;
}

export const PhotoVerticalScroll: React.FC<PhotoVerticalScrollProps> = ({
  imageSrc,
  direction = "up",
  scrollAmount = 0.6,
  accentColor,
}) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();

  // Images arrive already resolved from VisualBlockScene
  const identity = (src: string) =>
    src;

  const progress = interpolate(
    frame,
    [0, durationInFrames],
    [0, 1],
    clampBoth,
  );
  // Ease-in-out for natural feel
  const eased = progress < 0.5
    ? 2 * progress * progress
    : 1 - Math.pow(-2 * progress + 2, 2) / 2;

  const scrollY = direction === "up"
    ? -eased * scrollAmount * 100
    : eased * scrollAmount * 100;

  const fadeIn = interpolate(frame, [0, 8], [0, 1], clampBoth);
  const fadeOut = interpolate(
    frame,
    [durationInFrames - 8, durationInFrames],
    [1, 0],
    clampBoth,
  );

  return (
    <AbsoluteFill style={{ opacity: fadeIn * fadeOut, overflow: "hidden" }}>
      <Img
        src={identity(imageSrc)}
        style={{
          width: "100%",
          height: "180%",
          objectFit: "cover",
          objectPosition: "center top",
          transform: `translateY(${scrollY}%)`,
        }}
      />

      {/* Top/bottom fade gradient */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "linear-gradient(to bottom, rgba(0,0,0,0.4) 0%, transparent 15%, transparent 85%, rgba(0,0,0,0.4) 100%)",
          pointerEvents: "none",
        }}
      />

      {/* Scroll indicator */}
      <div
        style={{
          position: "absolute",
          right: 16,
          top: "10%",
          bottom: "10%",
          width: 4,
          borderRadius: 2,
          background: "rgba(255,255,255,0.15)",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: `${eased * 70}%`,
            width: 4,
            height: "30%",
            borderRadius: 2,
            background: accentColor,
            boxShadow: `0 0 8px ${accentColor}60`,
          }}
        />
      </div>
    </AbsoluteFill>
  );
};
