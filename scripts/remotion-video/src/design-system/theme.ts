/**
 * Unified Video Theme
 *
 * Composes all design tokens into a single theme object.
 * Extensible for future video types (news, promo, tutorial, etc.).
 */

import {
  colors,
  glass,
  gradients,
  typography,
  spacing,
  accentLine,
  badge,
  kenBurns,
  opacity,
  shadows,
  video,
  branding,
} from "./tokens";
import { springs, fadeTiming, subtitleFadeFrames, clampBoth } from "./animations";
import { defaultSubtitleConfig, type SubtitleConfig } from "./subtitles";

export interface VideoTheme {
  colors: typeof colors;
  glass: typeof glass;
  gradients: typeof gradients;
  typography: typeof typography;
  spacing: typeof spacing;
  accentLine: typeof accentLine;
  badge: typeof badge;
  kenBurns: typeof kenBurns;
  opacity: typeof opacity;
  shadows: typeof shadows;
  video: typeof video;
  branding: typeof branding;
  animations: {
    springs: typeof springs;
    fadeTiming: typeof fadeTiming;
    subtitleFadeFrames: number;
    clampBoth: { extrapolateLeft: "clamp"; extrapolateRight: "clamp" };
  };
  subtitles: SubtitleConfig;
}

/** Default theme — current vitalii.no brand. */
export const defaultTheme: VideoTheme = {
  colors,
  glass,
  gradients,
  typography,
  spacing,
  accentLine,
  badge,
  kenBurns,
  opacity,
  shadows,
  video,
  branding,
  animations: {
    springs,
    fadeTiming,
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
    glass: { ...defaultTheme.glass, ...overrides.glass },
    gradients: { ...defaultTheme.gradients, ...overrides.gradients },
    typography: { ...defaultTheme.typography, ...overrides.typography },
    spacing: { ...defaultTheme.spacing, ...overrides.spacing },
    accentLine: { ...defaultTheme.accentLine, ...overrides.accentLine },
    badge: { ...defaultTheme.badge, ...overrides.badge },
    kenBurns: { ...defaultTheme.kenBurns, ...overrides.kenBurns },
    opacity: { ...defaultTheme.opacity, ...overrides.opacity },
    shadows: { ...defaultTheme.shadows, ...overrides.shadows },
    video: { ...defaultTheme.video, ...overrides.video },
    branding: { ...defaultTheme.branding, ...overrides.branding },
    animations: { ...defaultTheme.animations, ...overrides.animations },
    subtitles: { ...defaultTheme.subtitles, ...overrides.subtitles },
  };
}
