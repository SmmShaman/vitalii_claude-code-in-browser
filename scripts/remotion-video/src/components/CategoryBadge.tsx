/**
 * CategoryBadge — Persistent category label shown during content scenes.
 *
 * Positioned top-left, pops in with spring animation.
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
  badge,
  springs,
  clampBoth,
} from "../design-system";
import { CategoryIcon } from "./CategoryIcon";

export interface CategoryBadgeProps {
  category: string;
  accentColor?: string;
}

export const CategoryBadge: React.FC<CategoryBadgeProps> = ({
  category,
  accentColor = colors.brand,
}) => {
  const frame = useCurrentFrame();
  const { fps, width, height, durationInFrames } = useVideoConfig();
  const isVertical = height > width;

  // Pop in
  const popIn = spring({
    frame: frame - 8,
    fps,
    config: springs.categoryBadgePop,
  });

  // Fade out
  const fadeOut = interpolate(
    frame,
    [durationInFrames - 10, durationInFrames],
    [1, 0],
    clampBoth,
  );

  const scale = interpolate(popIn, [0, 1], [0.5, 1]);
  const opacity = popIn * fadeOut;

  return (
    <div
      style={{
        position: "absolute",
        top: isVertical ? 44 : 24,
        left: isVertical ? 28 : 36,
        opacity,
        transform: `scale(${scale})`,
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: `${badge.padding.y}px ${badge.padding.x}px`,
        background: glass.backgroundStrong,
        backdropFilter: `blur(${glass.blur}px)`,
        WebkitBackdropFilter: `blur(${glass.blur}px)`,
        borderRadius: badge.borderRadius,
        border: `1px solid ${glass.border}`,
        zIndex: 25,
      }}
    >
      <CategoryIcon category={category} size={14} color={accentColor} animated={false} />
      <span
        style={{
          fontSize: badge.fontSize,
          fontWeight: badge.fontWeight,
          fontFamily: typography.fontFamily.primary,
          color: colors.text,
          textTransform: "uppercase",
          letterSpacing: badge.letterSpacing,
        }}
      >
        {category}
      </span>
    </div>
  );
};
