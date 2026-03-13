/**
 * ContentScene - Image with Ken Burns + key quote overlay.
 *
 * The main storytelling scene: shows the article image
 * with a slow zoom/pan, overlays a key quote or fact,
 * and plays voiceover audio with animated subtitles.
 *
 * Supports cycling through multiple images with crossfade
 * transitions, and interleaving b-roll video clips.
 */
import React, { useState, useCallback } from "react";
import {
  AbsoluteFill,
  Img,
  OffthreadVideo,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
  staticFile,
} from "remotion";
import { AnimatedSubtitles, type SubtitleEntry } from "./AnimatedSubtitles";
import { LowerThird } from "./LowerThird";
import { CategoryBadge } from "./CategoryBadge";
import { AvatarOverlay } from "./AvatarOverlay";
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
import { getMoodConfig } from "../design-system/moods";

export interface ContentSceneProps {
  imageSrc: string;
  /** Original article video (played muted as background instead of image) */
  videoSrc?: string;
  voiceoverSrc?: string;
  subtitles?: SubtitleEntry[];
  keyQuote?: string;
  accentColor?: string;
  /** Time offset in seconds for subtitle sync (relative to full video) */
  subtitleOffset?: number;
  /** Broadcast graphics */
  headline?: string;
  category?: string;
  segmentNumber?: number;
  totalSegments?: number;
  /** Visual layer overrides from AI director */
  colorGrade?: {
    brightness?: number;
    contrast?: number;
    saturate?: number;
    hueRotate?: number;
  };
  /** Focus area for Ken Burns (0-1 normalized coordinates) */
  focusArea?: { x: number; y: number; scale: number };
  /** Mood for animation speed */
  mood?: string;
  /** Avatar video clip (PiP overlay) */
  avatarSrc?: string;
  /** Additional images for cycling (Pexels stock) */
  alternateImages?: string[];
  /** Seconds per image before crossfade (default: 4) */
  imageCycleDuration?: number;
  /** B-roll video clips to interleave */
  bRollVideos?: string[];
}

export const ContentScene: React.FC<ContentSceneProps> = ({
  imageSrc,
  videoSrc,
  voiceoverSrc,
  subtitles = [],
  keyQuote,
  accentColor = colors.brand,
  subtitleOffset = 0,
  headline,
  category,
  segmentNumber,
  totalSegments,
  colorGrade,
  focusArea,
  mood,
  avatarSrc,
  alternateImages,
  imageCycleDuration = 4,
  bRollVideos,
}) => {
  const frame = useCurrentFrame();
  const { fps, width, height, durationInFrames } = useVideoConfig();
  const isVertical = height > width;

  const resolve = (src: string | undefined) =>
    src ? (src.startsWith("http") ? src : staticFile(src)) : "";

  const resolvedImage = resolve(imageSrc);
  const resolvedVideo = resolve(videoSrc);
  const hasVideo = !!resolvedVideo;
  const hasImage = !!resolvedImage;

  // ── Image Cycling Setup ──
  // Combine primary image with alternates into a full list for cycling
  const hasImageCycling =
    !hasVideo && alternateImages && alternateImages.length > 0;
  const allImages = hasImageCycling
    ? [imageSrc, ...alternateImages!].map((src) => resolve(src))
    : [resolvedImage];
  const imageCount = allImages.length;

  // Frames per image and crossfade duration
  const CROSSFADE_FRAMES = 15; // ~0.5s at 30fps
  const framesPerImage = Math.round(imageCycleDuration * fps);

  // Determine which image index is active and crossfade progress
  const rawImageIndex = hasImageCycling
    ? Math.floor(frame / framesPerImage)
    : 0;
  const currentImageIndex = rawImageIndex % imageCount;
  const nextImageIndex = (rawImageIndex + 1) % imageCount;
  const frameWithinImage = frame - rawImageIndex * framesPerImage;
  const isCrossfading =
    hasImageCycling && frameWithinImage >= framesPerImage - CROSSFADE_FRAMES;
  const crossfadeProgress = isCrossfading
    ? interpolate(
        frameWithinImage,
        [framesPerImage - CROSSFADE_FRAMES, framesPerImage],
        [0, 1],
        clampBoth,
      )
    : 0;

  // ── Per-image Ken Burns offsets ──
  // Each image gets a deterministic but varied pan direction
  // using a simple seed derived from the image index.
  const getImageKenBurns = (imgIdx: number) => {
    // Alternate pan directions per image for visual variety
    const directions = [
      { panXDir: -1, panYDir: -1 },   // top-left
      { panXDir: 1, panYDir: -0.5 },  // right-up
      { panXDir: -0.5, panYDir: 1 },  // left-down
      { panXDir: 1, panYDir: 1 },     // bottom-right
      { panXDir: 0, panYDir: -1 },    // center-up
      { panXDir: -1, panYDir: 0 },    // left-center
    ];
    const dir = directions[imgIdx % directions.length];
    return { panXDir: dir.panXDir, panYDir: dir.panYDir };
  };

  // Ken Burns — resolve end values from focusArea / mood / defaults
  const moodCfg = mood ? getMoodConfig(mood) : null;
  const scaleEnd = focusArea
    ? Math.min(focusArea.scale, 1.8)
    : moodCfg
      ? moodCfg.kenBurnsScale
      : kenBurns.scaleRange.end;

  const panXEnd = focusArea
    ? (focusArea.x - 0.5) * 4
    : kenBurns.panX.end;
  const panYEnd = focusArea
    ? (focusArea.y - 0.5) * 4
    : kenBurns.panY.end;

  // Single-image Ken Burns (used when not cycling)
  const scale = interpolate(
    frame,
    [0, durationInFrames],
    [kenBurns.scaleRange.start, scaleEnd],
    { extrapolateRight: "clamp" },
  );
  const panX = interpolate(
    frame,
    [0, durationInFrames],
    [kenBurns.panX.start, panXEnd],
    { extrapolateRight: "clamp" },
  );
  const panY = interpolate(
    frame,
    [0, durationInFrames],
    [kenBurns.panY.start, panYEnd],
    { extrapolateRight: "clamp" },
  );

  // Per-image Ken Burns transform (used during image cycling)
  const getKenBurnsTransform = (imgIdx: number) => {
    const { panXDir, panYDir } = getImageKenBurns(imgIdx);
    const localFrame = frame - rawImageIndex * framesPerImage;
    const progress = interpolate(
      localFrame,
      [0, framesPerImage],
      [0, 1],
      clampBoth,
    );
    const imgScale = interpolate(
      progress,
      [0, 1],
      [kenBurns.scaleRange.start, scaleEnd],
      clampBoth,
    );
    const imgPanX = panXDir * interpolate(
      progress,
      [0, 1],
      [0, Math.abs(panXEnd)],
      clampBoth,
    );
    const imgPanY = panYDir * interpolate(
      progress,
      [0, 1],
      [0, Math.abs(panYEnd)],
      clampBoth,
    );
    return `scale(${imgScale}) translate(${imgPanX}%, ${imgPanY}%)`;
  };

  // ── B-Roll Video Setup ──
  const resolvedBRollVideos = bRollVideos
    ? bRollVideos.map((src) => resolve(src))
    : [];
  const hasBRoll = resolvedBRollVideos.length > 0;
  // B-roll appears at 40-60% of segment duration
  const bRollStartFrame = Math.round(durationInFrames * 0.4);
  const bRollEndFrame = Math.round(durationInFrames * 0.6);
  const bRollDuration = bRollEndFrame - bRollStartFrame;
  const BROLL_FADE_FRAMES = 10;
  const isBRollActive =
    hasBRoll && frame >= bRollStartFrame && frame <= bRollEndFrame;
  // Cycle through b-roll clips if multiple are provided
  const bRollClipIndex = hasBRoll
    ? Math.floor(
        ((frame - bRollStartFrame) / bRollDuration) *
          resolvedBRollVideos.length,
      ) % resolvedBRollVideos.length
    : 0;
  const bRollOpacity = hasBRoll
    ? interpolate(
        frame,
        [
          bRollStartFrame,
          bRollStartFrame + BROLL_FADE_FRAMES,
          bRollEndFrame - BROLL_FADE_FRAMES,
          bRollEndFrame,
        ],
        [0, 1, 1, 0],
        clampBoth,
      )
    : 0;
  const bRollZoom = hasBRoll
    ? interpolate(
        frame,
        [bRollStartFrame, bRollEndFrame],
        [1.02, 1.08],
        clampBoth,
      )
    : 1;

  // Track b-roll load failures to fall back to image cycling
  const [bRollFailed, setBRollFailed] = useState<Record<number, boolean>>({});
  const handleBRollError = useCallback(
    (idx: number) => {
      setBRollFailed((prev) => ({ ...prev, [idx]: true }));
    },
    [],
  );
  const currentBRollFailed = bRollFailed[bRollClipIndex] ?? false;
  const showBRoll = isBRollActive && !currentBRollFailed;

  // Time-based separation: keyQuote first 40%, subtitles remaining 60%
  const quoteEndFrame = keyQuote ? Math.round(durationInFrames * 0.4) : 0;
  const showQuote = keyQuote && frame < quoteEndFrame;
  const showSubtitles = !keyQuote || frame >= Math.round(durationInFrames * 0.38);

  // Key quote animation (only when visible)
  const quoteDelay = Math.round(fps * 0.5);
  const quoteScale = spring({
    frame: frame - quoteDelay,
    fps,
    config: springs.quoteReveal,
  });
  const quoteIn = interpolate(frame, [quoteDelay, quoteDelay + 10], [0, 1], clampBoth);
  const quoteOut = interpolate(
    frame,
    [quoteEndFrame - 10, quoteEndFrame],
    [1, 0],
    clampBoth,
  );
  const quoteOpacity = quoteIn * quoteOut;

  // Subtitle fade-in (delayed start after quote disappears)
  const subtitleFadeIn = keyQuote
    ? interpolate(frame, [Math.round(durationInFrames * 0.38), Math.round(durationInFrames * 0.42)], [0, 1], clampBoth)
    : 1;

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
      {/* Background: video (muted) → cycling images with Ken Burns → single image → gradient fallback */}
      {hasVideo ? (
        <OffthreadVideo
          src={resolvedVideo}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
          }}
          volume={0}
        />
      ) : hasImageCycling ? (
        <>
          {/* Current image layer */}
          <Img
            key={`img-cycle-${currentImageIndex}`}
            src={allImages[currentImageIndex]}
            style={{
              position: "absolute",
              width: "100%",
              height: "100%",
              objectFit: "cover",
              transform: getKenBurnsTransform(currentImageIndex),
              opacity: isCrossfading ? 1 - crossfadeProgress : 1,
              filter:
                [
                  colorGrade?.brightness != null &&
                    `brightness(${colorGrade.brightness})`,
                  colorGrade?.contrast != null &&
                    `contrast(${colorGrade.contrast})`,
                  colorGrade?.saturate != null &&
                    `saturate(${colorGrade.saturate})`,
                  colorGrade?.hueRotate != null &&
                    `hue-rotate(${colorGrade.hueRotate}deg)`,
                ]
                  .filter(Boolean)
                  .join(" ") || undefined,
            }}
          />
          {/* Next image layer (visible during crossfade) */}
          {isCrossfading && (
            <Img
              key={`img-cycle-next-${nextImageIndex}`}
              src={allImages[nextImageIndex]}
              style={{
                position: "absolute",
                width: "100%",
                height: "100%",
                objectFit: "cover",
                transform: getKenBurnsTransform(nextImageIndex),
                opacity: crossfadeProgress,
                filter:
                  [
                    colorGrade?.brightness != null &&
                      `brightness(${colorGrade.brightness})`,
                    colorGrade?.contrast != null &&
                      `contrast(${colorGrade.contrast})`,
                    colorGrade?.saturate != null &&
                      `saturate(${colorGrade.saturate})`,
                    colorGrade?.hueRotate != null &&
                      `hue-rotate(${colorGrade.hueRotate}deg)`,
                  ]
                    .filter(Boolean)
                    .join(" ") || undefined,
              }}
            />
          )}
        </>
      ) : hasImage ? (
        <Img
          src={resolvedImage}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            transform: `scale(${scale}) translate(${panX}%, ${panY}%)`,
            filter:
              [
                colorGrade?.brightness != null &&
                  `brightness(${colorGrade.brightness})`,
                colorGrade?.contrast != null &&
                  `contrast(${colorGrade.contrast})`,
                colorGrade?.saturate != null &&
                  `saturate(${colorGrade.saturate})`,
                colorGrade?.hueRotate != null &&
                  `hue-rotate(${colorGrade.hueRotate}deg)`,
              ]
                .filter(Boolean)
                .join(" ") || undefined,
          }}
        />
      ) : (
        <div
          style={{
            width: "100%",
            height: "100%",
            background: `linear-gradient(135deg, ${accentColor}88 0%, ${colors.background} 60%, ${accentColor}44 100%)`,
          }}
        />
      )}

      {/* B-roll video overlay (appears at 40-60% of segment, muted with zoom) */}
      {showBRoll && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            opacity: bRollOpacity,
            zIndex: 1,
            overflow: "hidden",
          }}
        >
          <OffthreadVideo
            src={resolvedBRollVideos[bRollClipIndex]}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              transform: `scale(${bRollZoom})`,
            }}
            volume={0}
            onError={() => handleBRollError(bRollClipIndex)}
          />
        </div>
      )}

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

      {/* Key quote overlay (first 40% of scene) */}
      {showQuote && (
        <AbsoluteFill
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            padding: "10% 8%",
            zIndex: 5,
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

      {/* Animated subtitles (last 60% of scene, or always if no quote) */}
      {showSubtitles && offsetSubtitles.length > 0 && (
        <div style={{ position: "absolute", inset: 0, opacity: subtitleFadeIn, zIndex: 10 }}>
          <AnimatedSubtitles subtitles={offsetSubtitles} isVertical={isVertical} />
        </div>
      )}

      {/* Avatar PiP overlay */}
      {avatarSrc && (
        <AvatarOverlay
          src={avatarSrc}
          position="bottom-right"
          size="pip"
          accentColor={accentColor}
        />
      )}

      {/* Category badge (top-left) */}
      {category && (
        <CategoryBadge category={category} accentColor={accentColor} />
      )}

      {/* Lower third (bottom bar with headline + segment counter) */}
      {headline && segmentNumber != null && totalSegments != null && (
        <LowerThird
          headline={headline}
          category={category}
          segmentNumber={segmentNumber}
          totalSegments={totalSegments}
          accentColor={accentColor}
        />
      )}
    </AbsoluteFill>
  );
};
