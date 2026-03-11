/**
 * AvatarOverlay — PiP avatar video composited on top of scenes.
 *
 * Renders a talking-head avatar as a Picture-in-Picture overlay.
 * Supports different sizes and positions for intro/content/outro scenes.
 *
 * Features:
 *  - Circular or rounded mask
 *  - Animated position transitions (moves between corners)
 *  - Accent-colored border ring
 *  - Fade in/out at scene boundaries
 *  - Volume: 0 (audio handled by separate voiceover track)
 */
import React from "react";
import {
  Video,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
  staticFile,
} from "remotion";
import { avatar as avatarTokens } from "../design-system/tokens";
import { clampBoth } from "../design-system";

export type AvatarPosition = "bottom-right" | "bottom-left" | "top-right" | "center";
export type AvatarSize = "pip" | "large";

export interface AvatarOverlayProps {
  /** Avatar video source filename (in public/) */
  src: string;
  /** Position on screen */
  position?: AvatarPosition;
  /** Size mode: pip (15-20% of frame) or large (40-50% for intro/outro) */
  size?: AvatarSize;
  /** Accent color for border ring */
  accentColor?: string;
}

export const AvatarOverlay: React.FC<AvatarOverlayProps> = ({
  src,
  position = "bottom-right",
  size = "pip",
  accentColor = "#FF7A00",
}) => {
  const frame = useCurrentFrame();
  const { fps, width, height, durationInFrames } = useVideoConfig();
  const isVertical = height > width;

  const resolve = (s: string) =>
    s.startsWith("http") ? s : staticFile(s);

  // Size calculation
  const tokens = size === "large" ? avatarTokens.large : avatarTokens.pip;
  const avatarSize = Math.round(
    (isVertical ? width : width) * (isVertical ? tokens.sizeRatio.vertical : tokens.sizeRatio.horizontal)
  );

  // Position calculation
  const margin = avatarTokens.margin;
  const positionStyles = getPositionStyles(position, avatarSize, margin, width, height);

  // Entry animation — scale pop
  const entryScale = spring({
    frame,
    fps,
    config: { damping: 12, stiffness: 120, mass: 0.6 },
  });

  // Fade in/out
  const fadeIn = interpolate(frame, [0, 12], [0, 1], clampBoth);
  const fadeOut = interpolate(
    frame,
    [durationInFrames - 8, durationInFrames],
    [1, 0],
    clampBoth,
  );

  const borderWidth = size === "large" ? avatarTokens.borderWidth.large : avatarTokens.borderWidth.pip;
  const borderRadius = tokens.shape === "circle" ? "50%" : `${avatarTokens.roundedRadius}px`;

  return (
    <div
      style={{
        position: "absolute",
        ...positionStyles,
        width: avatarSize,
        height: avatarSize,
        zIndex: avatarTokens.zIndex,
        opacity: fadeIn * fadeOut,
        transform: `scale(${Math.min(entryScale, 1)})`,
      }}
    >
      {/* Border ring */}
      <div
        style={{
          position: "absolute",
          inset: -borderWidth,
          borderRadius,
          border: `${borderWidth}px solid ${accentColor}`,
          boxShadow: `0 0 20px ${accentColor}40, 0 4px 12px rgba(0,0,0,0.5)`,
        }}
      />

      {/* Avatar video */}
      <Video
        src={resolve(src)}
        volume={0}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
          borderRadius,
        }}
      />
    </div>
  );
};

/**
 * Calculate absolute position styles based on named position
 */
function getPositionStyles(
  position: AvatarPosition,
  size: number,
  margin: number,
  _width: number,
  height: number,
): React.CSSProperties {
  switch (position) {
    case "bottom-right":
      return { bottom: margin + 100, right: margin }; // +100 for lower third clearance
    case "bottom-left":
      return { bottom: margin + 100, left: margin };
    case "top-right":
      return { top: margin + 40, right: margin }; // +40 for logo clearance
    case "center":
      return {
        top: height * 0.3,
        left: "50%",
        marginLeft: -(size / 2),
      };
    default:
      return { bottom: margin + 100, right: margin };
  }
}
