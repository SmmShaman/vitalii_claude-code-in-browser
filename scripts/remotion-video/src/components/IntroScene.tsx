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
import { defaultTheme } from "../design-system";

export interface IntroSceneProps {
  category: string;
  brandName?: string;
  accentColor?: string;
}

const categoryColors: Record<string, string> = {
  tech: "#667eea",
  business: "#f5a623",
  science: "#4ecdc4",
  politics: "#e74c3c",
  ai: "#9b59b6",
  startup: "#2ecc71",
  crypto: "#f39c12",
  health: "#1abc9c",
  default: "#667eea",
};

export const IntroScene: React.FC<IntroSceneProps> = ({
  category,
  brandName = "vitalii.no",
  accentColor,
}) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  const color = accentColor || categoryColors[category.toLowerCase()] || categoryColors.default;

  // Logo scale spring
  const logoScale = spring({ frame, fps, config: { damping: 10, stiffness: 80, mass: 0.8 } });

  // Category badge slides up
  const badgeY = interpolate(frame, [10, 25], [40, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const badgeOpacity = interpolate(frame, [10, 20], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  // Fade out at end
  const fadeOut = interpolate(frame, [durationInFrames - 10, durationInFrames], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Gradient rotation
  const gradientAngle = interpolate(frame, [0, durationInFrames], [135, 180]);

  return (
    <AbsoluteFill
      style={{
        background: `linear-gradient(${gradientAngle}deg, #0a0a0a 0%, ${color}22 50%, #0a0a0a 100%)`,
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
          background: `radial-gradient(circle, ${color}40 0%, transparent 70%)`,
          filter: "blur(60px)",
        }}
      />

      {/* Brand name */}
      <div
        style={{
          transform: `scale(${logoScale})`,
          fontSize: 64,
          fontWeight: 800,
          color: defaultTheme.colors.text,
          fontFamily: defaultTheme.typography.fontFamily.fallback,
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
          padding: "8px 24px",
          borderRadius: 20,
          fontSize: 22,
          fontWeight: 700,
          color: "#fff",
          fontFamily: defaultTheme.typography.fontFamily.fallback,
          textTransform: "uppercase",
          letterSpacing: 2,
        }}
      >
        {category}
      </div>
    </AbsoluteFill>
  );
};
