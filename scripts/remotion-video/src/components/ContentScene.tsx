/**
 * ContentScene - Image with Ken Burns + key quote overlay.
 *
 * The main storytelling scene: shows the article image
 * with a slow zoom/pan, overlays a key quote or fact,
 * and plays voiceover audio with animated subtitles.
 */
import React from "react";
import {
  AbsoluteFill,
  Audio,
  Img,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
  staticFile,
} from "remotion";
import { AnimatedSubtitles, type SubtitleEntry } from "./AnimatedSubtitles";
import { defaultTheme } from "../design-system";

export interface ContentSceneProps {
  imageSrc: string;
  voiceoverSrc?: string;
  subtitles?: SubtitleEntry[];
  keyQuote?: string;
  accentColor?: string;
  /** Time offset in seconds for subtitle sync (relative to full video) */
  subtitleOffset?: number;
}

export const ContentScene: React.FC<ContentSceneProps> = ({
  imageSrc,
  voiceoverSrc,
  subtitles = [],
  keyQuote,
  accentColor = "#667eea",
  subtitleOffset = 0,
}) => {
  const frame = useCurrentFrame();
  const { fps, width, height, durationInFrames } = useVideoConfig();
  const isVertical = height > width;

  const resolve = (src: string | undefined) =>
    src ? (src.startsWith("http") ? src : staticFile(src)) : "";

  // Ken Burns
  const scale = interpolate(frame, [0, durationInFrames], [1.0, 1.15], { extrapolateRight: "clamp" });
  const panX = interpolate(frame, [0, durationInFrames], [0, -2], { extrapolateRight: "clamp" });
  const panY = interpolate(frame, [0, durationInFrames], [0, -1], { extrapolateRight: "clamp" });

  // Key quote animation
  const quoteDelay = Math.round(fps * 0.5);
  const quoteScale = spring({
    frame: frame - quoteDelay,
    fps,
    config: { damping: 14, stiffness: 120 },
  });
  const quoteOpacity = interpolate(frame, [quoteDelay, quoteDelay + 10], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Fade transitions
  const fadeIn = interpolate(frame, [0, 8], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const fadeOut = interpolate(frame, [durationInFrames - 8, durationInFrames], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Offset subtitles to be relative to this scene
  const offsetSubtitles = subtitles.map((s) => ({
    ...s,
    startTime: s.startTime - subtitleOffset,
    endTime: s.endTime - subtitleOffset,
  }));

  return (
    <AbsoluteFill style={{ opacity: fadeIn * fadeOut }}>
      {/* Background image with Ken Burns */}
      <Img
        src={resolve(imageSrc)}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
          transform: `scale(${scale}) translate(${panX}%, ${panY}%)`,
        }}
      />

      {/* Gradient overlay for text readability */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: keyQuote
            ? "linear-gradient(to bottom, rgba(0,0,0,0.2) 0%, rgba(0,0,0,0.4) 40%, rgba(0,0,0,0.7) 100%)"
            : "linear-gradient(to bottom, rgba(0,0,0,0.1) 0%, rgba(0,0,0,0.3) 50%, rgba(0,0,0,0.6) 100%)",
        }}
      />

      {/* Voiceover audio */}
      {voiceoverSrc && <Audio src={resolve(voiceoverSrc)} volume={1} />}

      {/* Key quote overlay */}
      {keyQuote && (
        <AbsoluteFill
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: isVertical ? "center" : "flex-end",
            padding: isVertical ? "20% 8%" : "5% 10%",
          }}
        >
          <div
            style={{
              transform: `scale(${quoteScale})`,
              opacity: quoteOpacity,
              maxWidth: "85%",
              textAlign: "center",
            }}
          >
            {/* Accent bar */}
            <div
              style={{
                width: 40,
                height: 3,
                backgroundColor: accentColor,
                margin: "0 auto 16px",
                borderRadius: 2,
              }}
            />
            <span
              style={{
                fontSize: isVertical ? 36 : 40,
                fontWeight: 700,
                color: "#fff",
                fontFamily: defaultTheme.typography.fontFamily.fallback,
                lineHeight: 1.3,
                textShadow: "0 2px 12px rgba(0,0,0,0.8)",
              }}
            >
              &ldquo;{keyQuote}&rdquo;
            </span>
          </div>
        </AbsoluteFill>
      )}

      {/* Animated subtitles */}
      {offsetSubtitles.length > 0 && (
        <AnimatedSubtitles subtitles={offsetSubtitles} isVertical={isVertical} />
      )}
    </AbsoluteFill>
  );
};
