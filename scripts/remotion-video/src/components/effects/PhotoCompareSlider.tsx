/**
 * PhotoCompareSlider — before/after comparison with animated slider line.
 * Two photos overlaid, slider reveals one over the other.
 * Triggered by "before after", "compare", "slider", "versus photos".
 */
import React from "react";
import {
  AbsoluteFill,
  Img,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
} from "remotion";
import { colors, typography, clampBoth } from "../../design-system";

interface PhotoCompareSliderProps {
  imageBefore: string;
  imageAfter: string;
  labelBefore?: string;
  labelAfter?: string;
  accentColor: string;
}

export const PhotoCompareSlider: React.FC<PhotoCompareSliderProps> = ({
  imageBefore,
  imageAfter,
  labelBefore = "Før",
  labelAfter = "Nå",
  accentColor,
}) => {
  const frame = useCurrentFrame();
  const { fps, width, height, durationInFrames } = useVideoConfig();

  // Images arrive already resolved from VisualBlockScene
  const identity = (src: string) =>
    src;

  // Slider moves from 20% to 80% then settles at 50%
  const rawProgress = interpolate(
    frame,
    [10, durationInFrames * 0.4, durationInFrames * 0.7],
    [0.15, 0.85, 0.5],
    clampBoth,
  );
  // Add spring smoothing
  const sliderX = rawProgress;

  // Fade
  const fadeIn = interpolate(frame, [0, 10], [0, 1], clampBoth);
  const fadeOut = interpolate(
    frame,
    [durationInFrames - 10, durationInFrames],
    [1, 0],
    clampBoth,
  );

  // Label pop
  const labelScale = spring({
    frame: Math.max(0, frame - 15),
    fps,
    config: { damping: 12, stiffness: 120 },
  });

  return (
    <AbsoluteFill style={{ opacity: fadeIn * fadeOut }}>
      {/* After image (full background) */}
      <Img
        src={identity(imageAfter)}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
        }}
      />

      {/* Before image (clipped by slider position) */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          clipPath: `inset(0 ${(1 - sliderX) * 100}% 0 0)`,
          overflow: "hidden",
        }}
      >
        <Img
          src={identity(imageBefore)}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
          }}
        />
      </div>

      {/* Slider line */}
      <div
        style={{
          position: "absolute",
          left: `${sliderX * 100}%`,
          top: 0,
          bottom: 0,
          width: 4,
          marginLeft: -2,
          background: accentColor,
          boxShadow: `0 0 20px ${accentColor}80, 0 0 40px ${accentColor}40`,
          zIndex: 10,
        }}
      />

      {/* Slider handle */}
      <div
        style={{
          position: "absolute",
          left: `${sliderX * 100}%`,
          top: "50%",
          width: 48,
          height: 48,
          marginLeft: -24,
          marginTop: -24,
          borderRadius: "50%",
          background: accentColor,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: `0 0 20px ${accentColor}80`,
          zIndex: 11,
          fontSize: 20,
          color: "white",
          fontWeight: 900,
        }}
      >
        ⟷
      </div>

      {/* Labels */}
      <div
        style={{
          position: "absolute",
          top: 20,
          left: 20,
          padding: "8px 16px",
          background: "rgba(0,0,0,0.6)",
          backdropFilter: "blur(10px)",
          borderRadius: 8,
          fontSize: typography.scale.small,
          fontWeight: 700,
          color: colors.text,
          fontFamily: typography.fontFamily.primary,
          transform: `scale(${labelScale})`,
          zIndex: 5,
        }}
      >
        {labelBefore}
      </div>
      <div
        style={{
          position: "absolute",
          top: 20,
          right: 20,
          padding: "8px 16px",
          background: `${accentColor}cc`,
          backdropFilter: "blur(10px)",
          borderRadius: 8,
          fontSize: typography.scale.small,
          fontWeight: 700,
          color: colors.text,
          fontFamily: typography.fontFamily.primary,
          transform: `scale(${labelScale})`,
          zIndex: 5,
        }}
      >
        {labelAfter}
      </div>
    </AbsoluteFill>
  );
};
