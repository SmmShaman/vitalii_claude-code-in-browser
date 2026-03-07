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
import { defaultTheme } from "../design-system";

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
  accentColor = "#667eea",
}) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  // Number scales in
  const numScale = spring({
    frame,
    fps,
    config: { damping: 8, stiffness: 100, mass: 0.6 },
  });

  // Progress bar
  const progress = segmentNumber / totalSegments;
  const barWidth = interpolate(frame, [5, 20], [0, progress * 100], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Category fades in
  const catOpacity = interpolate(frame, [10, 18], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Fade out
  const fadeOut = interpolate(frame, [durationInFrames - 6, durationInFrames], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill
      style={{
        backgroundColor: "#0a0a0a",
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
          fontSize: 120,
          fontWeight: 900,
          color: accentColor,
          fontFamily: defaultTheme.typography.fontFamily.fallback,
          lineHeight: 1,
        }}
      >
        {segmentNumber}
      </div>

      {/* "of N" */}
      <div
        style={{
          fontSize: 20,
          fontWeight: 500,
          color: "rgba(255,255,255,0.4)",
          fontFamily: defaultTheme.typography.fontFamily.fallback,
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
            fontSize: 18,
            fontWeight: 600,
            color: "rgba(255,255,255,0.5)",
            fontFamily: defaultTheme.typography.fontFamily.fallback,
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
          height: 3,
          backgroundColor: "rgba(255,255,255,0.1)",
          borderRadius: 2,
        }}
      >
        <div
          style={{
            width: `${barWidth}%`,
            height: "100%",
            backgroundColor: accentColor,
            borderRadius: 2,
          }}
        />
      </div>
    </AbsoluteFill>
  );
};
