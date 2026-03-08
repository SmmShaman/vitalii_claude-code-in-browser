/**
 * Animation Presets
 *
 * Centralized spring configurations and timing helpers.
 */

// ── Spring Configs ──

export const springs = {
  // Legacy (used by NewsVideo composition)
  headline: { damping: 12, stiffness: 100 },
  subtitle: { damping: 15, stiffness: 200, mass: 0.5 },

  // Scene springs
  logoEntrance: { damping: 10, stiffness: 80, mass: 0.8 },
  wordPunch: { damping: 12, stiffness: 150, mass: 0.5 },
  quoteReveal: { damping: 14, stiffness: 120 },
  gentleScale: { damping: 10, stiffness: 80 },
  titleDrop: { damping: 12, stiffness: 80 },
  badgePop: { damping: 10, stiffness: 120 },
  numberScale: { damping: 8, stiffness: 100, mass: 0.6 },
  staggerItem: { damping: 12, stiffness: 100 },
} as const;

// ── Fade Timing ──

export const fadeTiming = {
  fadeInFrames: 8,
  fadeOutFrames: {
    short: 6,
    standard: 8,
    long: 10,
    intro: 12,
  },
  titleRevealFrames: 15,
  staggerBaseDelay: 15,
  staggerIncrement: 12,
} as const;

// ── Headline Timing ──

/** Keyframes for headline fade-in / hold / fade-out (in frames). */
export function headlineKeyframes(fps: number) {
  return {
    fadeIn: [0, 15],
    hold: [15, Math.round(fps * 1.5)],
    fadeOut: [Math.round(fps * 1.5), Math.round(fps * 2)],
    inputRange: [0, 15, Math.round(fps * 1.5), Math.round(fps * 2)] as const,
    outputRange: [0, 1, 1, 0] as const,
  };
}

// ── Subtitle Timing ──

export const subtitleFadeFrames = 3;

// ── Interpolation defaults ──

export const clampBoth = {
  extrapolateLeft: "clamp" as const,
  extrapolateRight: "clamp" as const,
};
