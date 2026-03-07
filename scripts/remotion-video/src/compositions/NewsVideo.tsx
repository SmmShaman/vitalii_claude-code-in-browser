/**
 * NewsVideo Composition
 *
 * The main Remotion composition that assembles the final video:
 *  1. Plays the original Telegram video (scaled / cropped to fit)
 *  2. Overlays the AI-generated voiceover audio
 *  3. Renders animated captions synced to the voiceover timestamps
 *  4. Shows a headline / lower-third and branding
 *
 * Props are passed in via the Remotion CLI --props flag so this template
 * works identically for every single video without any manual editing.
 */
import React from "react";
import {
  AbsoluteFill,
  Audio,
  OffthreadVideo,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
  staticFile,
} from "remotion";
import { AnimatedSubtitles, type SubtitleEntry } from "../components/AnimatedSubtitles";
import {
  defaultTheme,
  mergeTheme,
  getLayoutConfig,
  headlineKeyframes,
  type VideoTheme,
} from "../design-system";

export interface NewsVideoProps {
  /** Absolute path or URL to the source video (downloaded from Telegram) */
  videoSrc: string;
  /** Absolute path or URL to the AI voiceover audio */
  voiceoverSrc: string;
  /** Word-level or sentence-level subtitle entries with timestamps */
  subtitles: SubtitleEntry[];
  /** Headline text to display at the start */
  headline: string;
  /** Duration of the output video in seconds */
  originalVideoDurationInSeconds: number;
  /** Optional theme overrides */
  theme?: Partial<VideoTheme>;
}

export const NewsVideo: React.FC<NewsVideoProps> = ({
  videoSrc,
  voiceoverSrc,
  subtitles,
  headline,
  originalVideoDurationInSeconds,
  theme: themeOverrides,
}) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const theme = mergeTheme(themeOverrides);
  const layout = getLayoutConfig(width, height);

  // Resolve media sources: bare filenames → staticFile(), URLs → as-is
  const resolvedVideoSrc = videoSrc && !videoSrc.startsWith("http") ? staticFile(videoSrc) : videoSrc;
  const resolvedVoiceoverSrc = voiceoverSrc && !voiceoverSrc.startsWith("http") ? staticFile(voiceoverSrc) : voiceoverSrc;

  // ── Headline intro animation (first 2 seconds) ──
  const hk = headlineKeyframes(fps);
  const headlineOpacity = interpolate(
    frame,
    [...hk.inputRange],
    [...hk.outputRange],
    theme.animations.clampBoth,
  );

  const headlineScale = spring({
    frame,
    fps,
    config: theme.animations.springs.headline,
  });

  return (
    <AbsoluteFill style={{ backgroundColor: theme.colors.background }}>
      {/* ── Layer 1: Background video ── */}
      {resolvedVideoSrc && (
        <>
          {/* Blurred background (fills entire canvas for vertical crops) */}
          {layout.isVertical && (
            <OffthreadVideo
              src={resolvedVideoSrc}
              style={{
                position: "absolute",
                width: "100%",
                height: "100%",
                objectFit: "cover",
                filter: layout.video.backgroundFilter,
                transform: `scale(${layout.video.backgroundScale})`,
              }}
              volume={0}
            />
          )}

          {/* Main video — centered, preserving aspect ratio */}
          <AbsoluteFill
            style={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <OffthreadVideo
              src={resolvedVideoSrc}
              style={{
                width: "100%",
                height: layout.isVertical ? "auto" : "100%",
                maxHeight: layout.video.maxHeight,
                objectFit: "contain",
                borderRadius: layout.video.borderRadius,
              }}
              volume={theme.opacity.backgroundVideoVolume}
            />
          </AbsoluteFill>
        </>
      )}

      {/* ── Layer 2: AI Voiceover audio ── */}
      {resolvedVoiceoverSrc && <Audio src={resolvedVoiceoverSrc} volume={theme.opacity.voiceoverVolume} />}

      {/* ── Layer 3: Headline overlay (first 2 seconds) ── */}
      {headline && (
        <AbsoluteFill
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            opacity: headlineOpacity,
            transform: `scale(${headlineScale})`,
            pointerEvents: "none",
          }}
        >
          <div
            style={{
              background: theme.colors.overlay,
              backdropFilter: "blur(10px)",
              padding: layout.headline.padding,
              borderRadius: layout.headline.borderRadius,
              maxWidth: layout.headline.maxWidth,
              textAlign: "center",
            }}
          >
            <span
              style={{
                color: theme.colors.text,
                fontSize: layout.headline.fontSize,
                fontWeight: theme.typography.headline.fontWeight,
                fontFamily: theme.typography.fontFamily.fallback,
                lineHeight: theme.typography.headline.lineHeight,
                textShadow: theme.shadows.headline,
              }}
            >
              {headline}
            </span>
          </div>
        </AbsoluteFill>
      )}

      {/* ── Layer 4: Animated subtitles ── */}
      {subtitles.length > 0 && (
        <AnimatedSubtitles subtitles={subtitles} isVertical={layout.isVertical} />
      )}

      {/* ── Layer 5: Subtle branding watermark (bottom corner) ── */}
      <div
        style={{
          position: "absolute",
          bottom: layout.watermark.bottom,
          right: layout.watermark.right,
          opacity: theme.opacity.watermark,
          fontSize: theme.typography.watermark.fontSize,
          color: theme.colors.text,
          fontFamily: theme.typography.fontFamily.fallback,
          fontWeight: theme.typography.watermark.fontWeight,
          letterSpacing: theme.typography.watermark.letterSpacing,
        }}
      >
        {theme.branding.watermarkText}
      </div>
    </AbsoluteFill>
  );
};
