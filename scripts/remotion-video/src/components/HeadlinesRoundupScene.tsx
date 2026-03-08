/**
 * HeadlinesRoundupScene — Cold open teaser showing ALL headlines.
 *
 * Inspired by TV newscast cold opens: a fast-paced preview
 * of all stories before diving into detailed coverage.
 * Each headline appears with staggered spring animation.
 */
import React from "react";
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
} from "remotion";
import { CategoryIcon } from "./CategoryIcon";
import {
  colors,
  gradients,
  typography,
  glass,
  springs,
  fadeTiming,
  clampBoth,
} from "../design-system";

export interface RoundupHeadline {
  text: string;
  category: string;
}

export interface HeadlinesRoundupProps {
  headlines: RoundupHeadline[];
  accentColor?: string;
}

export const HeadlinesRoundupScene: React.FC<HeadlinesRoundupProps> = ({
  headlines,
  accentColor = colors.brand,
}) => {
  const frame = useCurrentFrame();
  const { fps, width, height, durationInFrames } = useVideoConfig();
  const isVertical = height > width;

  // Stagger: each headline appears 6 frames after the previous
  const staggerFrames = 6;
  const itemHeight = isVertical ? 52 : 44;
  const maxVisibleItems = isVertical ? 10 : 8;

  // If many headlines, scroll the list up
  const totalItemsHeight = headlines.length * itemHeight;
  const viewportHeight = maxVisibleItems * itemHeight;
  const needsScroll = headlines.length > maxVisibleItems;

  // Scroll starts after all items have appeared, scrolls slowly
  const allAppearedFrame = headlines.length * staggerFrames + 15;
  const scrollY = needsScroll
    ? interpolate(
        frame,
        [allAppearedFrame, durationInFrames - 20],
        [0, -(totalItemsHeight - viewportHeight)],
        clampBoth,
      )
    : 0;

  // Fade out at end
  const fadeOut = interpolate(
    frame,
    [durationInFrames - fadeTiming.fadeOutFrames.standard, durationInFrames],
    [1, 0],
    clampBoth,
  );

  // Title animation
  const titleScale = spring({
    frame,
    fps,
    config: springs.gentleScale,
  });

  const categoryColor = (cat: string): string =>
    colors.categories[cat.toLowerCase()] || accentColor;

  return (
    <AbsoluteFill
      style={{
        background: gradients.sceneDark(accentColor),
        opacity: fadeOut,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: isVertical ? "40px 24px" : "24px 40px",
      }}
    >
      {/* Section title */}
      <div
        style={{
          transform: `scale(${titleScale})`,
          fontSize: isVertical ? typography.scale.body : typography.scale.bodySmall,
          fontWeight: 700,
          color: colors.textMuted,
          fontFamily: typography.fontFamily.primary,
          textTransform: "uppercase",
          letterSpacing: 3,
          marginBottom: isVertical ? 24 : 16,
        }}
      >
        {headlines.length} SAKER I DAG
      </div>

      {/* Headlines list */}
      <div
        style={{
          flex: 1,
          width: "100%",
          maxWidth: isVertical ? "100%" : "85%",
          overflow: "hidden",
          position: "relative",
        }}
      >
        <div
          style={{
            transform: `translateY(${scrollY}px)`,
            display: "flex",
            flexDirection: "column",
            gap: 4,
          }}
        >
          {headlines.map((h, i) => {
            const itemDelay = i * staggerFrames + 5;
            const itemSpring = spring({
              frame: frame - itemDelay,
              fps,
              config: { damping: 14, stiffness: 120, mass: 0.6 },
            });
            const itemOpacity = interpolate(
              frame - itemDelay,
              [0, 8],
              [0, 1],
              clampBoth,
            );
            const slideX = interpolate(itemSpring, [0, 1], [40, 0]);

            return (
              <div
                key={i}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: `${isVertical ? 10 : 8}px 16px`,
                  opacity: itemOpacity,
                  transform: `translateX(${slideX}px)`,
                  background: glass.background,
                  borderRadius: 10,
                  borderLeft: `3px solid ${categoryColor(h.category)}`,
                }}
              >
                {/* Number */}
                <span
                  style={{
                    fontSize: isVertical ? typography.scale.bodySmall : typography.scale.small,
                    fontWeight: 800,
                    color: categoryColor(h.category),
                    fontFamily: typography.fontFamily.primary,
                    minWidth: 24,
                    textAlign: "right",
                  }}
                >
                  {i + 1}
                </span>

                {/* Category icon */}
                <CategoryIcon
                  category={h.category}
                  size={isVertical ? 16 : 14}
                  color={categoryColor(h.category)}
                  animated={false}
                />

                {/* Headline text */}
                <span
                  style={{
                    fontSize: isVertical ? typography.scale.bodySmall : typography.scale.small,
                    fontWeight: 600,
                    color: colors.text,
                    fontFamily: typography.fontFamily.primary,
                    lineHeight: 1.3,
                    flex: 1,
                  }}
                >
                  {h.text}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </AbsoluteFill>
  );
};
