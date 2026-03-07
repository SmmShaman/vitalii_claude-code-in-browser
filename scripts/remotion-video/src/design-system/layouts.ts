/**
 * Aspect-Ratio-Aware Layout Configs
 *
 * Returns the correct layout values based on video dimensions.
 */

import { spacing, typography, video } from "./tokens";

export interface LayoutConfig {
  isVertical: boolean;
  video: {
    maxHeight: string;
    borderRadius: number;
    backgroundFilter: string;
    backgroundScale: number;
  };
  headline: {
    fontSize: number;
    padding: string;
    borderRadius: number;
    maxWidth: string;
  };
  subtitle: {
    fontSize: number;
    paddingBottom: string;
    maxWidth: string;
    padding: string;
  };
  watermark: {
    bottom: number;
    right: number;
  };
}

/** Predefined aspect ratios. */
export const aspectRatios = {
  vertical: { width: 1080, height: 1920 },
  horizontal: { width: 1920, height: 1080 },
  square: { width: 1080, height: 1080 },
} as const;

/**
 * Derive layout config from composition dimensions.
 * Any height > width is treated as vertical.
 */
export function getLayoutConfig(width: number, height: number): LayoutConfig {
  const isVertical = height > width;
  const variant = isVertical ? "vertical" : "horizontal";

  return {
    isVertical,
    video: {
      maxHeight: video[variant].maxHeight,
      borderRadius: video[variant].borderRadius,
      backgroundFilter: video[variant].backgroundFilter,
      backgroundScale: video[variant].backgroundScale,
    },
    headline: {
      fontSize: typography.headline.fontSize[variant],
      padding: spacing.headline.padding[variant],
      borderRadius: spacing.headline.borderRadius,
      maxWidth: spacing.headline.maxWidth,
    },
    subtitle: {
      fontSize: typography.subtitle.fontSize[variant],
      paddingBottom: spacing.subtitle.paddingBottom[variant],
      maxWidth: spacing.subtitle.maxWidth,
      padding: spacing.subtitle.padding,
    },
    watermark: {
      bottom: spacing.watermark.bottom[variant],
      right: spacing.watermark.right,
    },
  };
}
