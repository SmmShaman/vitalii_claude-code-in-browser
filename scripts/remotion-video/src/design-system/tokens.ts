/**
 * Video Design Tokens
 *
 * Raw design values with no Remotion dependencies.
 * These are the single source of truth for all visual styling.
 */

// ── Colors ──

export const colors = {
  background: "#000",
  overlay: "rgba(0, 0, 0, 0.7)",
  text: "#fff",
  brand: "#667eea",
} as const;

// ── Typography ──

export const typography = {
  fontFamily: {
    primary: "'Comfortaa', 'Inter', 'SF Pro Display', -apple-system, sans-serif",
    fallback: "'Inter', 'SF Pro Display', -apple-system, BlinkMacSystemFont, sans-serif",
  },
  headline: {
    fontWeight: 800 as const,
    lineHeight: 1.2,
    fontSize: { vertical: 42, horizontal: 48 },
  },
  subtitle: {
    fontWeight: 900 as const,
    lineHeight: 1.3,
    fontSize: { vertical: 52, horizontal: 56 },
    textTransform: "uppercase" as const,
    letterSpacing: -0.5,
  },
  watermark: {
    fontSize: 14,
    fontWeight: 600 as const,
    letterSpacing: 1,
  },
} as const;

// ── Spacing ──

export const spacing = {
  headline: {
    padding: { vertical: "20px 32px", horizontal: "16px 40px" },
    borderRadius: 16,
    maxWidth: "85%",
  },
  subtitle: {
    maxWidth: "90%",
    padding: "8px 16px",
    paddingBottom: { vertical: "22%", horizontal: "10%" },
  },
  watermark: {
    bottom: { vertical: 80, horizontal: 20 },
    right: 20,
  },
} as const;

// ── Opacity ──

export const opacity = {
  watermark: 0.5,
  overlay: 0.7,
  backgroundVideoVolume: 0.1,
  voiceoverVolume: 1.0,
} as const;

// ── Shadows & Strokes ──

export const shadows = {
  headline: "0 2px 8px rgba(0,0,0,0.5)",
  subtitle:
    "0 0 10px rgba(0,0,0,0.9), 0 4px 12px rgba(0,0,0,0.7), 0 0 40px rgba(0,0,0,0.5)",
  subtitleStroke: "1.5px rgba(0,0,0,0.3)",
} as const;

// ── Video ──

export const video = {
  vertical: {
    maxHeight: "60%",
    borderRadius: 12,
    backgroundFilter: "blur(30px) brightness(0.4)",
    backgroundScale: 1.2,
  },
  horizontal: {
    maxHeight: "100%",
    borderRadius: 0,
    backgroundFilter: "none",
    backgroundScale: 1,
  },
} as const;

// ── Branding ──

export const branding = {
  watermarkText: "vitalii.no",
} as const;
