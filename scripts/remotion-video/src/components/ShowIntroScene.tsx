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
import {
  colors,
  glass,
  gradients,
  typography,
  accentLine,
  badge,
  springs,
  fadeTiming,
  clampBoth,
} from "../design-system";

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
  accentColor = colors.brand,
  language = "no",
}) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  // Line sweep from left
  const lineWidth = interpolate(frame, [0, 20], [0, 100], clampBoth);

  // Title drops in
  const titleScale = spring({
    frame: frame - 5,
    fps,
    config: springs.titleDrop,
  });
  const titleOpacity = interpolate(frame, [5, 15], [0, 1], clampBoth);

  // Date fades up
  const dateY = interpolate(frame, [18, 32], [20, 0], clampBoth);
  const dateOpacity = interpolate(frame, [18, 28], [0, 1], clampBoth);

  // Article count badge pops
  const badgeScale = spring({
    frame: frame - 30,
    fps,
    config: springs.badgePop,
  });
  const badgeOpacity = interpolate(frame, [30, 38], [0, 1], clampBoth);

  // Fade out
  const fadeOut = interpolate(
    frame,
    [durationInFrames - fadeTiming.fadeOutFrames.intro, durationInFrames],
    [1, 0],
    clampBoth,
  );

  const countLabel =
    language === "no"
      ? `${articleCount} ${articleCount === 1 ? "sak" : "saker"} i dag`
      : `${articleCount} ${articleCount === 1 ? "story" : "stories"} today`;

  return (
    <AbsoluteFill
      style={{
        background: gradients.sceneRadial(accentColor),
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
          height: accentLine.height,
          backgroundColor: accentColor,
          marginBottom: 40,
          borderRadius: accentLine.borderRadius,
          maxWidth: accentLine.width.full,
        }}
      />

      {/* Show title */}
      <div
        style={{
          transform: `scale(${titleScale})`,
          opacity: titleOpacity,
          fontSize: typography.scale.h1,
          fontWeight: 800,
          color: colors.text,
          fontFamily: typography.fontFamily.primary,
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
          fontSize: typography.scale.body,
          fontWeight: 500,
          color: colors.textSubtle,
          fontFamily: typography.fontFamily.primary,
        }}
      >
        {date}
      </div>

      {/* Article count badge (glass effect) */}
      <div
        style={{
          marginTop: 32,
          transform: `scale(${badgeScale})`,
          opacity: badgeOpacity,
          background: glass.background,
          border: `1px solid ${glass.border}`,
          backdropFilter: `blur(${glass.blur}px)`,
          padding: `${badge.paddingLarge.y}px ${badge.paddingLarge.x}px`,
          borderRadius: badge.borderRadiusLarge,
          fontSize: typography.scale.small,
          fontWeight: 600,
          color: accentColor,
          fontFamily: typography.fontFamily.primary,
        }}
      >
        {countLabel}
      </div>

      {/* Brand */}
      <div
        style={{
          position: "absolute",
          bottom: 80,
          fontSize: typography.scale.xs,
          fontWeight: 600,
          color: colors.textWhisper,
          fontFamily: typography.fontFamily.primary,
          letterSpacing: 2,
        }}
      >
        vitalii.no
      </div>
    </AbsoluteFill>
  );
};
