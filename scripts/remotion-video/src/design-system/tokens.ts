/**
 * Video Design Tokens
 *
 * Single source of truth for all visual styling.
 * Dark-orange glassmorphism theme for vitalii.no news videos.
 *
 * No Remotion dependencies — pure values only.
 */

// ── Colors ──

export const colors = {
  // Base
  background: "#0a0a0a",
  backgroundAlt: "#1a1a1a",
  surface: "#1e1e1e",
  text: "#ffffff",

  // Brand (orange)
  brand: "#FF7A00",
  brandLight: "#FF8C42",
  brandDark: "#FF6B35",

  // Overlays
  overlay: "rgba(0, 0, 0, 0.7)",
  overlayLight: "rgba(0, 0, 0, 0.4)",
  overlayHeavy: "rgba(0, 0, 0, 0.85)",

  // Text opacity variants
  textMuted: "rgba(255, 255, 255, 0.7)",
  textSubtle: "rgba(255, 255, 255, 0.6)",
  textFaint: "rgba(255, 255, 255, 0.5)",
  textGhost: "rgba(255, 255, 255, 0.4)",
  textWhisper: "rgba(255, 255, 255, 0.3)",
  textTrack: "rgba(255, 255, 255, 0.1)",

  // Category palette
  categories: {
    tech: "#FF7A00",
    business: "#f5a623",
    science: "#4ecdc4",
    politics: "#e74c3c",
    ai: "#9b59b6",
    startup: "#2ecc71",
    crypto: "#f39c12",
    health: "#1abc9c",
    news: "#FF8C42",
    default: "#FF7A00",
  } as Record<string, string>,
} as const;

// ── Glass Effects ──

export const glass = {
  background: "rgba(255, 255, 255, 0.05)",
  backgroundStrong: "rgba(255, 255, 255, 0.08)",
  border: "rgba(255, 255, 255, 0.1)",
  borderStrong: "rgba(255, 255, 255, 0.15)",
  blur: 20,
  blurStrong: 40,
  borderRadius: 16,
  borderRadiusLarge: 24,
} as const;

// ── Gradients ──

export const gradients = {
  // Scene backgrounds
  sceneDark: (hex: string) =>
    `linear-gradient(135deg, #0a0a0a 0%, ${hex}18 100%)`,
  sceneRadial: (hex: string) =>
    `radial-gradient(ellipse at 30% 40%, ${hex}20 0%, #0a0a0a 70%)`,
  sceneSubtle: (hex: string, angle = 160) =>
    `linear-gradient(${angle}deg, #0a0a0a 0%, ${hex}15 100%)`,
  introRotating: (hex: string, angle: number) =>
    `linear-gradient(${angle}deg, #0a0a0a 0%, ${hex}22 50%, #0a0a0a 100%)`,

  // Overlays for text readability
  contentOverlay:
    "linear-gradient(to bottom, rgba(0,0,0,0.15) 0%, rgba(0,0,0,0.3) 40%, rgba(0,0,0,0.55) 100%)",
  contentOverlayLight:
    "linear-gradient(to bottom, rgba(0,0,0,0.05) 0%, rgba(0,0,0,0.15) 50%, rgba(0,0,0,0.45) 100%)",
  imageOverlay:
    "linear-gradient(to bottom, rgba(0,0,0,0.3) 0%, rgba(0,0,0,0.5) 50%, rgba(0,0,0,0.7) 100%)",

  // Glow
  glow: (hex: string) =>
    `radial-gradient(circle, ${hex}40 0%, transparent 70%)`,

  // Brand gradient (orange → purple)
  brandGradient:
    "linear-gradient(135deg, #FF6B35 0%, #9b59b6 50%, #667eea 100%)",
} as const;

// ── Typography ──

export const typography = {
  fontFamily: {
    primary: "'Comfortaa', sans-serif",
    fallback:
      "'Inter', 'SF Pro Display', -apple-system, BlinkMacSystemFont, sans-serif",
  },
  scale: {
    display: 120,
    hero: 64,
    h1: 52,
    h2: 48,
    h3: 44,
    h4: 40,
    h5: 36,
    body: 28,
    bodySmall: 24,
    caption: 22,
    small: 20,
    xs: 18,
    watermark: 14,
  },
  headline: {
    fontWeight: 700 as const,
    lineHeight: 1.2,
    fontSize: { vertical: 42, horizontal: 48 },
  },
  subtitle: {
    fontWeight: 700 as const,
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

// ── Accent Line ──

export const accentLine = {
  height: 3,
  borderRadius: 2,
  width: {
    short: 40,
    medium: 60,
    long: 80,
    full: 200,
  },
} as const;

// ── Badge ──

export const badge = {
  padding: { x: 24, y: 8 },
  paddingLarge: { x: 28, y: 10 },
  borderRadius: 20,
  borderRadiusLarge: 24,
  fontSize: 22,
  fontWeight: 700,
  letterSpacing: 2,
} as const;

// ── Ken Burns ──

export const kenBurns = {
  scaleRange: { start: 1.0, end: 1.15 },
  panX: { start: 0, end: -2 },
  panY: { start: 0, end: -1 },
  backgroundScale: { start: 1.1, end: 1.2 },
  backgroundBlur: "brightness(0.5)",
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
  glow: (hex: string) => `0 0 30px ${hex}40, 0 0 60px ${hex}20`,
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

// ── Lower Third ──

export const lowerThird = {
  height: 100,
  padding: { x: 32, y: 16 },
  blur: 20,
  gap: 12,
  borderRadius: 12,
  bottomOffset: { vertical: 160, horizontal: 80 },
} as const;

// ── Progress Bar ──

export const progressBar = {
  height: 3,
  top: 0,
} as const;

// ── Logo ──

export const logo = {
  top: { vertical: 40, horizontal: 20 },
  right: { vertical: 32, horizontal: 24 },
  fontSize: 18,
  fontWeight: 700 as const,
  letterSpacing: 1.5,
} as const;

// ── Branding ──

export const branding = {
  watermarkText: "vitalii.no",
} as const;
