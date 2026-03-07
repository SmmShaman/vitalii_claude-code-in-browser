/**
 * Subtitle Configuration
 *
 * Styling and grouping settings for animated subtitles.
 */

import { shadows, typography } from "./tokens";

export interface SubtitleConfig {
  wordsPerGroup: number;
  fontWeight: number;
  textTransform: "uppercase" | "lowercase" | "none";
  letterSpacing: number;
  stroke: string;
  shadow: string;
}

export const defaultSubtitleConfig: SubtitleConfig = {
  wordsPerGroup: 4,
  fontWeight: typography.subtitle.fontWeight,
  textTransform: typography.subtitle.textTransform,
  letterSpacing: typography.subtitle.letterSpacing,
  stroke: shadows.subtitleStroke,
  shadow: shadows.subtitle,
};
