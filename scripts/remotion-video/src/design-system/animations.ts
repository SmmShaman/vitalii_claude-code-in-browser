/**
 * Animation Presets
 *
 * Spring configurations and timing helpers for Remotion compositions.
 */
// ── Spring Configs ──

export const springs = {
  headline: { damping: 12, stiffness: 100 },
  subtitle: { damping: 15, stiffness: 200, mass: 0.5 },
} as const;

// ── Headline Timing ──

/** Keyframes for headline fade-in / hold / fade-out (in frames). */
export function headlineKeyframes(fps: number) {
  return {
    fadeIn: [0, 15],
    hold: [15, Math.round(fps * 1.5)],
    fadeOut: [Math.round(fps * 1.5), Math.round(fps * 2)],
    /** Flat array suitable for Remotion `interpolate` input range. */
    inputRange: [0, 15, Math.round(fps * 1.5), Math.round(fps * 2)] as const,
    /** Corresponding opacity values. */
    outputRange: [0, 1, 1, 0] as const,
  };
}

// ── Subtitle Timing ──

/** Number of frames used for subtitle fade-in and fade-out. */
export const subtitleFadeFrames = 3;

// ── Interpolation defaults ──

export const clampBoth = {
  extrapolateLeft: "clamp" as const,
  extrapolateRight: "clamp" as const,
};
