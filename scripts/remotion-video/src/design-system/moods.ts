/**
 * Mood System — emotional tone per video segment.
 * Maps moods to animation configs for dynamic pacing.
 */

export type Mood = 'urgent' | 'energetic' | 'positive' | 'analytical' | 'serious' | 'contemplative' | 'lighthearted' | 'cautionary';

export interface MoodConfig {
  /** Spring damping (lower = bouncier) */
  damping: number;
  /** Spring stiffness (higher = snappier) */
  stiffness: number;
  /** Spring mass */
  mass: number;
  /** Word stagger delay in frames */
  wordStaggerFrames: number;
  /** Overall animation speed multiplier (1.0 = normal) */
  tempo: number;
  /** Ken Burns scale end (1.0 = no zoom) */
  kenBurnsScale: number;
  /** Overlay darkness (0-1) */
  overlayDarkness: number;
}

export const moodConfigs: Record<Mood, MoodConfig> = {
  urgent: {
    damping: 8, stiffness: 180, mass: 0.4,
    wordStaggerFrames: 2, tempo: 1.4,
    kenBurnsScale: 1.3, overlayDarkness: 0.3,
  },
  energetic: {
    damping: 10, stiffness: 140, mass: 0.5,
    wordStaggerFrames: 2, tempo: 1.2,
    kenBurnsScale: 1.25, overlayDarkness: 0.35,
  },
  positive: {
    damping: 12, stiffness: 100, mass: 0.6,
    wordStaggerFrames: 3, tempo: 1.0,
    kenBurnsScale: 1.15, overlayDarkness: 0.4,
  },
  analytical: {
    damping: 14, stiffness: 90, mass: 0.7,
    wordStaggerFrames: 4, tempo: 0.9,
    kenBurnsScale: 1.1, overlayDarkness: 0.5,
  },
  serious: {
    damping: 15, stiffness: 85, mass: 0.8,
    wordStaggerFrames: 4, tempo: 0.85,
    kenBurnsScale: 1.08, overlayDarkness: 0.6,
  },
  contemplative: {
    damping: 16, stiffness: 70, mass: 0.9,
    wordStaggerFrames: 5, tempo: 0.8,
    kenBurnsScale: 1.05, overlayDarkness: 0.55,
  },
  lighthearted: {
    damping: 11, stiffness: 120, mass: 0.55,
    wordStaggerFrames: 3, tempo: 1.15,
    kenBurnsScale: 1.2, overlayDarkness: 0.35,
  },
  cautionary: {
    damping: 13, stiffness: 110, mass: 0.65,
    wordStaggerFrames: 3, tempo: 0.95,
    kenBurnsScale: 1.12, overlayDarkness: 0.5,
  },
};

/** Get mood config with fallback to 'positive' */
export function getMoodConfig(mood?: string): MoodConfig {
  if (mood && mood in moodConfigs) {
    return moodConfigs[mood as Mood];
  }
  return moodConfigs.positive;
}

/** Get spring config from mood */
export function getMoodSpring(mood?: string) {
  const cfg = getMoodConfig(mood);
  return { damping: cfg.damping, stiffness: cfg.stiffness, mass: cfg.mass };
}
