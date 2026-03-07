/**
 * ShowIntroScene - Daily news show opening.
 *
 * Displays the show title, date, and article count
 * with a professional broadcast-style animation.
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

export interface ShowIntroSceneProps {
  date: string;
  articleCount: number;
  showTitle?: string;
  accentColor?: string;
  language?: string;
}

export const ShowIntroScene: React.FC<ShowIntroSceneProps> = ({
  date,
  articleCount,
  showTitle = "Daglig Nyhetsoppdatering",
  accentColor = "#667eea",
  language = "no",
}) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  // Line sweep from left
  const lineWidth = interpolate(frame, [0, 20], [0, 100], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Title drops in
  const titleScale = spring({
    frame: frame - 5,
    fps,
    config: { damping: 12, stiffness: 80 },
  });
  const titleOpacity = interpolate(frame, [5, 15], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Date fades up
  const dateY = interpolate(frame, [18, 32], [20, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const dateOpacity = interpolate(frame, [18, 28], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Article count badge pops
  const badgeScale = spring({
    frame: frame - 30,
    fps,
    config: { damping: 10, stiffness: 120 },
  });
  const badgeOpacity = interpolate(frame, [30, 38], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Fade out
  const fadeOut = interpolate(frame, [durationInFrames - 12, durationInFrames], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const countLabel = language === "no"
    ? `${articleCount} ${articleCount === 1 ? "sak" : "saker"} i dag`
    : `${articleCount} ${articleCount === 1 ? "story" : "stories"} today`;

  return (
    <AbsoluteFill
      style={{
        background: `radial-gradient(ellipse at 30% 40%, ${accentColor}20 0%, #0a0a0a 70%)`,
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        opacity: fadeOut,
      }}
    >
      {/* Accent line */}
      <div
        style={{
          width: `${lineWidth}%`,
          height: 3,
          backgroundColor: accentColor,
          marginBottom: 40,
          borderRadius: 2,
          maxWidth: 200,
        }}
      />

      {/* Show title */}
      <div
        style={{
          transform: `scale(${titleScale})`,
          opacity: titleOpacity,
          fontSize: 52,
          fontWeight: 800,
          color: defaultTheme.colors.text,
          fontFamily: defaultTheme.typography.fontFamily.fallback,
          textAlign: "center",
          lineHeight: 1.2,
          maxWidth: "85%",
        }}
      >
        {showTitle}
      </div>

      {/* Date */}
      <div
        style={{
          marginTop: 20,
          transform: `translateY(${dateY}px)`,
          opacity: dateOpacity,
          fontSize: 28,
          fontWeight: 500,
          color: "rgba(255,255,255,0.6)",
          fontFamily: defaultTheme.typography.fontFamily.fallback,
        }}
      >
        {date}
      </div>

      {/* Article count badge */}
      <div
        style={{
          marginTop: 32,
          transform: `scale(${badgeScale})`,
          opacity: badgeOpacity,
          background: `${accentColor}30`,
          border: `1px solid ${accentColor}60`,
          padding: "10px 28px",
          borderRadius: 24,
          fontSize: 20,
          fontWeight: 600,
          color: accentColor,
          fontFamily: defaultTheme.typography.fontFamily.fallback,
        }}
      >
        {countLabel}
      </div>

      {/* Brand */}
      <div
        style={{
          position: "absolute",
          bottom: 80,
          fontSize: 18,
          fontWeight: 600,
          color: "rgba(255,255,255,0.3)",
          fontFamily: defaultTheme.typography.fontFamily.fallback,
          letterSpacing: 2,
        }}
      >
        vitalii.no
      </div>
    </AbsoluteFill>
  );
};
