/**
 * LowerThird — Broadcast-style info bar at bottom of screen.
 *
 * Shows: category badge + headline + segment counter (e.g. "2/5").
 * Slides up with spring animation, glass background.
 */
import React from "react";
import {
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
} from "remotion";
import {
  colors,
  glass,
  typography,
  lowerThird as lt,
  springs,
  clampBoth,
} from "../design-system";

export interface LowerThirdProps {
  headline: string;
  category?: string;
  segmentNumber: number;
  totalSegments: number;
  accentColor?: string;
}

export const LowerThird: React.FC<LowerThirdProps> = ({
  headline,
  category,
  segmentNumber,
  totalSegments,
  accentColor = colors.brand,
}) => {
  const frame = useCurrentFrame();
  const { fps, width, height, durationInFrames } = useVideoConfig();
  const isVertical = height > width;

  // Slide up from bottom
  const slideIn = spring({
    frame: frame - 10,
    fps,
    config: springs.lowerThirdSlide,
  });

  // Slide out before scene ends
  const slideOut = interpolate(
    frame,
    [durationInFrames - 15, durationInFrames - 5],
    [0, 1],
    clampBoth,
  );

  const translateY = interpolate(slideIn, [0, 1], [120, 0]) +
    interpolate(slideOut, [0, 1], [0, 120]);

  const opacity = interpolate(slideIn, [0, 1], [0, 1]) *
    interpolate(slideOut, [0, 1], [1, 0]);

  const bottomOffset = isVertical ? lt.bottomOffset.vertical : lt.bottomOffset.horizontal;

  return (
    <div
      style={{
        position: "absolute",
        bottom: bottomOffset,
        left: isVertical ? 24 : 40,
        right: isVertical ? 24 : 40,
        transform: `translateY(${translateY}px)`,
        opacity,
        display: "flex",
        alignItems: "center",
        gap: lt.gap,
        padding: `${lt.padding.y}px ${lt.padding.x}px`,
        background: glass.backgroundStrong,
        backdropFilter: `blur(${lt.blur}px)`,
        WebkitBackdropFilter: `blur(${lt.blur}px)`,
        borderRadius: lt.borderRadius,
        border: `1px solid ${glass.border}`,
        zIndex: 20,
      }}
    >
      {/* Category badge */}
      {category && (
        <div
          style={{
            backgroundColor: accentColor,
            padding: "4px 12px",
            borderRadius: 6,
            fontSize: typography.scale.xs,
            fontWeight: 700,
            fontFamily: typography.fontFamily.primary,
            color: colors.background,
            textTransform: "uppercase",
            letterSpacing: 1,
            whiteSpace: "nowrap",
          }}
        >
          {category}
        </div>
      )}

      {/* Headline */}
      <div
        style={{
          flex: 1,
          fontSize: isVertical ? typography.scale.bodySmall : typography.scale.body,
          fontWeight: 600,
          fontFamily: typography.fontFamily.primary,
          color: colors.text,
          lineHeight: 1.3,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {headline}
      </div>

      {/* Segment counter */}
      <div
        style={{
          fontSize: typography.scale.small,
          fontWeight: 600,
          fontFamily: typography.fontFamily.primary,
          color: colors.textMuted,
          whiteSpace: "nowrap",
        }}
      >
        {segmentNumber}/{totalSegments}
      </div>
    </div>
  );
};
