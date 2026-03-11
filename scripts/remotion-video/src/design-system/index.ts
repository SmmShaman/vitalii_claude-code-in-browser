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
  lowerThird,
  progressBar,
  logo,
  branding,
  audio,
  thumbnail,
  avatar,
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

// Moods
export { moodConfigs, getMoodConfig, getMoodSpring } from "./moods";
export type { Mood, MoodConfig } from "./moods";

// Presets
export { presets, getPreset, detectPreset } from "./presets";
export type { PresetId, ThemePreset } from "./presets";

// Transitions
export { transitionConfigs, getTransitionConfig } from "./transitions";
export type { TransitionType, TransitionConfig } from "./transitions";
