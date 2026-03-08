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
import {
  colors,
  gradients,
  typography,
  kenBurns,
  accentLine,
  springs,
  fadeTiming,
  clampBoth,
} from "../design-system";

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
  accentColor = colors.brand,
  subtitleOffset = 0,
}) => {
  const frame = useCurrentFrame();
  const { fps, width, height, durationInFrames } = useVideoConfig();
  const isVertical = height > width;

  const resolve = (src: string | undefined) =>
    src ? (src.startsWith("http") ? src : staticFile(src)) : "";

  // Ken Burns
  const scale = interpolate(
    frame,
    [0, durationInFrames],
    [kenBurns.scaleRange.start, kenBurns.scaleRange.end],
    { extrapolateRight: "clamp" },
  );
  const panX = interpolate(
    frame,
    [0, durationInFrames],
    [kenBurns.panX.start, kenBurns.panX.end],
    { extrapolateRight: "clamp" },
  );
  const panY = interpolate(
    frame,
    [0, durationInFrames],
    [kenBurns.panY.start, kenBurns.panY.end],
    { extrapolateRight: "clamp" },
  );

  // Key quote animation
  const quoteDelay = Math.round(fps * 0.5);
  const quoteScale = spring({
    frame: frame - quoteDelay,
    fps,
    config: springs.quoteReveal,
  });
  const quoteOpacity = interpolate(frame, [quoteDelay, quoteDelay + 10], [0, 1], clampBoth);

  // Fade transitions
  const fadeIn = interpolate(
    frame,
    [0, fadeTiming.fadeInFrames],
    [0, 1],
    clampBoth,
  );
  const fadeOut = interpolate(
    frame,
    [durationInFrames - fadeTiming.fadeOutFrames.standard, durationInFrames],
    [1, 0],
    clampBoth,
  );

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
            ? gradients.contentOverlay
            : gradients.contentOverlayLight,
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
                width: accentLine.width.short,
                height: accentLine.height,
                backgroundColor: accentColor,
                margin: "0 auto 16px",
                borderRadius: accentLine.borderRadius,
              }}
            />
            <span
              style={{
                fontSize: isVertical ? typography.scale.h5 : typography.scale.h4,
                fontWeight: 700,
                color: colors.text,
                fontFamily: typography.fontFamily.primary,
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
