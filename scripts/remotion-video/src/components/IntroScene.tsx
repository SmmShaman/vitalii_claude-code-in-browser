/**
 * IntroScene - Brand intro with category badge and animated gradient.
 *
 * Displays the vitalii.no brand with a pulsing category badge,
 * then fades out to transition to the next scene.
 */
import React from "react";
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
} from "remotion";
import {
  colors,
  gradients,
  typography,
  badge,
  springs,
  fadeTiming,
  clampBoth,
} from "../design-system";

export interface IntroSceneProps {
  category: string;
  brandName?: string;
  accentColor?: string;
}

export const IntroScene: React.FC<IntroSceneProps> = ({
  category,
  brandName = "vitalii.no",
  accentColor,
}) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  const color =
    accentColor ||
    colors.categories[category.toLowerCase()] ||
    colors.brand;

  // Logo scale spring
  const logoScale = spring({ frame, fps, config: springs.logoEntrance });

  // Category badge slides up
  const badgeY = interpolate(frame, [10, 25], [40, 0], clampBoth);
  const badgeOpacity = interpolate(frame, [10, 20], [0, 1], clampBoth);

  // Fade out at end
  const fadeOut = interpolate(
    frame,
    [durationInFrames - fadeTiming.fadeOutFrames.intro, durationInFrames],
    [1, 0],
    clampBoth,
  );

  // Gradient rotation
  const gradientAngle = interpolate(frame, [0, durationInFrames], [135, 180]);

  return (
    <AbsoluteFill
      style={{
        background: gradients.introRotating(color, gradientAngle),
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        opacity: fadeOut,
      }}
    >
      {/* Accent glow */}
      <div
        style={{
          position: "absolute",
          width: 300,
          height: 300,
          borderRadius: "50%",
          background: gradients.glow(color),
          filter: "blur(60px)",
        }}
      />

      {/* Brand name */}
      <div
        style={{
          transform: `scale(${logoScale})`,
          fontSize: typography.scale.hero,
          fontWeight: 800,
          color: colors.text,
          fontFamily: typography.fontFamily.primary,
          letterSpacing: -1,
        }}
      >
        {brandName}
      </div>

      {/* Category badge */}
      <div
        style={{
          marginTop: 24,
          transform: `translateY(${badgeY}px)`,
          opacity: badgeOpacity,
          background: color,
          padding: `${badge.padding.y}px ${badge.padding.x}px`,
          borderRadius: badge.borderRadius,
          fontSize: badge.fontSize,
          fontWeight: badge.fontWeight,
          color: "#fff",
          fontFamily: typography.fontFamily.primary,
          textTransform: "uppercase",
          letterSpacing: badge.letterSpacing,
        }}
      >
        {category}
      </div>
    </AbsoluteFill>
  );
};
