/**
 * LowerThird — Broadcast-style info bar at bottom of screen.
 *
 * Shows: category badge + headline + segment counter (e.g. "2/5").
 * Slides in with remotion-animated entrance, glass background.
 */
import React from "react";
import {
  useCurrentFrame,
  useVideoConfig,
  interpolate,
} from "remotion";
import {
  colors,
  glass,
  typography,
  lowerThird as lt,
  clampBoth,
} from "../design-system";
import { Animated, Fade, Move, Ease } from "remotion-animated";

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
  const { width, height, durationInFrames } = useVideoConfig();
  const isVertical = height > width;

  // Exit fade near scene end
  const exitOpacity = interpolate(
    frame,
    [durationInFrames - 15, durationInFrames - 5],
    [1, 0],
    clampBoth,
  );

  const bottomOffset = isVertical ? lt.bottomOffset.vertical : lt.bottomOffset.horizontal;

  return (
    <div
      style={{
        position: "absolute",
        bottom: bottomOffset,
        left: isVertical ? 24 : 40,
        right: isVertical ? 24 : 40,
        opacity: exitOpacity,
        zIndex: 20,
      }}
    >
      <Animated
        in={10}
        animations={[
          Fade({ to: 1, initial: 0, duration: 15, ease: Ease.CubicOut }),
          Move({ y: 0, initialY: 120, duration: 20, ease: Ease.ExponentialOut }),
        ]}
        style={{
          display: "flex",
          alignItems: "center",
          gap: lt.gap,
          padding: `${lt.padding.y}px ${lt.padding.x}px`,
          background: glass.backgroundStrong,
          backdropFilter: `blur(${lt.blur}px)`,
          WebkitBackdropFilter: `blur(${lt.blur}px)`,
          borderRadius: lt.borderRadius,
          border: `1px solid ${glass.border}`,
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
      </Animated>
    </div>
  );
};
