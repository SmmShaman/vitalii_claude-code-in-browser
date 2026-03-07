/**
 * Unified Video Theme
 *
 * Composes all design tokens into a single theme object.
 * Extensible for future video types (news, promo, tutorial, etc.).
 */

import { colors, typography, spacing, opacity, shadows, video, branding } from "./tokens";
import { springs, subtitleFadeFrames, clampBoth } from "./animations";
import { defaultSubtitleConfig, type SubtitleConfig } from "./subtitles";

export interface VideoTheme {
  colors: typeof colors;
  typography: typeof typography;
  spacing: typeof spacing;
  opacity: typeof opacity;
  shadows: typeof shadows;
  video: typeof video;
  branding: typeof branding;
  animations: {
    springs: typeof springs;
    subtitleFadeFrames: number;
    clampBoth: { extrapolateLeft: "clamp"; extrapolateRight: "clamp" };
  };
  subtitles: SubtitleConfig;
}

/** Default theme — current vitalii.no brand. */
export const defaultTheme: VideoTheme = {
  colors,
  typography,
  spacing,
  opacity,
  shadows,
  video,
  branding,
  animations: {
    springs,
    subtitleFadeFrames,
    clampBoth,
  },
  subtitles: defaultSubtitleConfig,
};

/**
 * Merge a partial theme override with the default theme.
 */
export function mergeTheme(overrides?: Partial<VideoTheme>): VideoTheme {
  if (!overrides) return defaultTheme;
  return {
    ...defaultTheme,
    ...overrides,
    colors: { ...defaultTheme.colors, ...overrides.colors },
    typography: { ...defaultTheme.typography, ...overrides.typography },
    spacing: { ...defaultTheme.spacing, ...overrides.spacing },
    opacity: { ...defaultTheme.opacity, ...overrides.opacity },
    shadows: { ...defaultTheme.shadows, ...overrides.shadows },
    video: { ...defaultTheme.video, ...overrides.video },
    branding: { ...defaultTheme.branding, ...overrides.branding },
    animations: { ...defaultTheme.animations, ...overrides.animations },
    subtitles: { ...defaultTheme.subtitles, ...overrides.subtitles },
  };
}
