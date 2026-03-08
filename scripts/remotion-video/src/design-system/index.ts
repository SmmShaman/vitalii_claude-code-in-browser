/**
 * Video Design System — Barrel Export
 */

// Tokens
export {
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

// Animations
export {
  springs,
  fadeTiming,
  headlineKeyframes,
  subtitleFadeFrames,
  clampBoth,
} from "./animations";

// Layouts
export { getLayoutConfig, aspectRatios } from "./layouts";
export type { LayoutConfig } from "./layouts";

// Subtitles
export { defaultSubtitleConfig } from "./subtitles";
export type { SubtitleConfig } from "./subtitles";

// Theme
export { defaultTheme, mergeTheme } from "./theme";
export type { VideoTheme } from "./theme";
