/**
 * ProgressBar — Thin line at top showing video progress.
 *
 * Color follows current segment's accent color.
 */
import React from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import { colors, progressBar as pb } from "../design-system";

export interface ProgressBarProps {
  accentColor?: string;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  accentColor = colors.brand,
}) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();

  const progress = Math.min(frame / durationInFrames, 1) * 100;

  return (
    <div
      style={{
        position: "absolute",
        top: pb.top,
        left: 0,
        right: 0,
        height: pb.height,
        backgroundColor: colors.textTrack,
        zIndex: 40,
      }}
    >
      <div
        style={{
          height: "100%",
          width: `${progress}%`,
          backgroundColor: accentColor,
          transition: "background-color 0.5s ease",
        }}
      />
    </div>
  );
};
