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
  Sequence,
  interpolate,
  spring,
} from "remotion";
import { AnimatedSubtitles, type SubtitleEntry } from "../components/AnimatedSubtitles";

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
}

export const NewsVideo: React.FC<NewsVideoProps> = ({
  videoSrc,
  voiceoverSrc,
  subtitles,
  headline,
  originalVideoDurationInSeconds,
}) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const isVertical = height > width; // 9:16 vs 16:9

  // ── Headline intro animation (first 2 seconds) ──
  const headlineOpacity = interpolate(frame, [0, 15, fps * 1.5, fps * 2], [0, 1, 1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const headlineScale = spring({
    frame,
    fps,
    config: { damping: 12, stiffness: 100 },
  });

  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>
      {/* ── Layer 1: Background video ── */}
      {videoSrc && (
        <>
          {/* Blurred background (fills entire canvas for vertical crops) */}
          {isVertical && (
            <OffthreadVideo
              src={videoSrc}
              style={{
                position: "absolute",
                width: "100%",
                height: "100%",
                objectFit: "cover",
                filter: "blur(30px) brightness(0.4)",
                transform: "scale(1.2)",
              }}
              volume={0}
            />
          )}

          {/* Main video — centered, preserving aspect ratio */}
          <AbsoluteFill
            style={{
              display: "flex",
              justifyContent: "center",
              alignItems: isVertical ? "center" : "center",
            }}
          >
            <OffthreadVideo
              src={videoSrc}
              style={{
                width: isVertical ? "100%" : "100%",
                height: isVertical ? "auto" : "100%",
                maxHeight: isVertical ? "60%" : "100%",
                objectFit: "contain",
                borderRadius: isVertical ? 12 : 0,
              }}
              volume={0.1} // Lower original audio to 10%
            />
          </AbsoluteFill>
        </>
      )}

      {/* ── Layer 2: AI Voiceover audio ── */}
      {voiceoverSrc && <Audio src={voiceoverSrc} volume={1.0} />}

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
              background: "rgba(0, 0, 0, 0.7)",
              backdropFilter: "blur(10px)",
              padding: isVertical ? "20px 32px" : "16px 40px",
              borderRadius: 16,
              maxWidth: "85%",
              textAlign: "center",
            }}
          >
            <span
              style={{
                color: "#fff",
                fontSize: isVertical ? 42 : 48,
                fontWeight: 800,
                fontFamily:
                  "'Inter', 'SF Pro Display', -apple-system, sans-serif",
                lineHeight: 1.2,
                textShadow: "0 2px 8px rgba(0,0,0,0.5)",
              }}
            >
              {headline}
            </span>
          </div>
        </AbsoluteFill>
      )}

      {/* ── Layer 4: Animated subtitles ── */}
      {subtitles.length > 0 && (
        <AnimatedSubtitles subtitles={subtitles} isVertical={isVertical} />
      )}

      {/* ── Layer 5: Subtle branding watermark (bottom corner) ── */}
      <div
        style={{
          position: "absolute",
          bottom: isVertical ? 80 : 20,
          right: 20,
          opacity: 0.5,
          fontSize: 14,
          color: "#fff",
          fontFamily: "'Inter', sans-serif",
          fontWeight: 600,
          letterSpacing: 1,
        }}
      >
        vitalii.no
      </div>
    </AbsoluteFill>
  );
};
