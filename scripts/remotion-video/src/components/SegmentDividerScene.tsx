/**
 * SegmentDividerScene - Transition between news stories.
 *
 * Shows the segment number and a brief category/topic indicator
 * to give the viewer context for the next story.
 */
import React from "react";
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
} from "remotion";
import {
  colors,
  typography,
  accentLine,
  springs,
  fadeTiming,
  clampBoth,
} from "../design-system";

export interface SegmentDividerSceneProps {
  segmentNumber: number;
  totalSegments: number;
  category?: string;
  accentColor?: string;
}

export const SegmentDividerScene: React.FC<SegmentDividerSceneProps> = ({
  segmentNumber,
  totalSegments,
  category,
  accentColor = colors.brand,
}) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  // Number scales in
  const numScale = spring({
    frame,
    fps,
    config: springs.numberScale,
  });

  // Progress bar
  const progress = segmentNumber / totalSegments;
  const barWidth = interpolate(frame, [5, 20], [0, progress * 100], clampBoth);

  // Category fades in
  const catOpacity = interpolate(frame, [10, 18], [0, 1], clampBoth);

  // Fade out
  const fadeOut = interpolate(
    frame,
    [durationInFrames - fadeTiming.fadeOutFrames.short, durationInFrames],
    [1, 0],
    clampBoth,
  );

  return (
    <AbsoluteFill
      style={{
        backgroundColor: colors.background,
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        opacity: fadeOut,
      }}
    >
      {/* Segment number */}
      <div
        style={{
          transform: `scale(${numScale})`,
          fontSize: typography.scale.display,
          fontWeight: 900,
          color: accentColor,
          fontFamily: typography.fontFamily.primary,
          lineHeight: 1,
        }}
      >
        {segmentNumber}
      </div>

      {/* "of N" */}
      <div
        style={{
          fontSize: typography.scale.small,
          fontWeight: 500,
          color: colors.textGhost,
          fontFamily: typography.fontFamily.primary,
          marginTop: 8,
        }}
      >
        / {totalSegments}
      </div>

      {/* Category */}
      {category && (
        <div
          style={{
            marginTop: 20,
            opacity: catOpacity,
            fontSize: typography.scale.xs,
            fontWeight: 600,
            color: colors.textFaint,
            fontFamily: typography.fontFamily.primary,
            textTransform: "uppercase",
            letterSpacing: 3,
          }}
        >
          {category}
        </div>
      )}

      {/* Progress bar */}
      <div
        style={{
          position: "absolute",
          bottom: 120,
          width: "70%",
          height: accentLine.height,
          backgroundColor: colors.textTrack,
          borderRadius: accentLine.borderRadius,
        }}
      >
        <div
          style={{
            width: `${barWidth}%`,
            height: "100%",
            backgroundColor: accentColor,
            borderRadius: accentLine.borderRadius,
          }}
        />
      </div>
    </AbsoluteFill>
  );
};
