/**
 * CounterMosaic — giant animated counter center-screen
 * with MosaicGrid background. The "hero number" scene.
 */
import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig, spring, interpolate } from "remotion";
import { colors, typography, clampBoth } from "../../design-system";
import { AnimatedCounter } from "../AnimatedCounter";
import { MosaicGrid } from "./MosaicGrid";

interface CounterMosaicProps {
  value: number;
  suffix?: string;
  prefix?: string;
  label?: string;
  accentColor: string;
}

export const CounterMosaic: React.FC<CounterMosaicProps> = ({
  value,
  suffix = "",
  prefix = "",
  label = "",
  accentColor,
}) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  // Bounce scale for the counter
  const bounce = spring({
    frame: Math.max(0, frame - 5),
    fps,
    config: { damping: 8, stiffness: 100, mass: 0.6 },
  });

  const fadeOut = interpolate(frame, [durationInFrames - 10, durationInFrames], [1, 0], clampBoth);

  return (
    <AbsoluteFill style={{ opacity: fadeOut }}>
      {/* Background mosaic */}
      <MosaicGrid
        cols={10}
        rows={8}
        cellShape="circle"
        fillColor={accentColor}
        staggerPattern="center-out"
        maxOpacity={0.15}
      />

      {/* Giant counter */}
      <AbsoluteFill style={{ display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", zIndex: 5 }}>
        <div style={{ transform: `scale(${bounce})` }}>
          <AnimatedCounter
            value={value}
            suffix={suffix}
            prefix={prefix}
            accentColor={accentColor}
            fontSize={typography.scale.display}
            fontWeight={900}
            startDelay={8}
          />
        </div>
        {label && (
          <div
            style={{
              fontSize: typography.scale.h4,
              fontWeight: 600,
              color: colors.textMuted,
              fontFamily: typography.fontFamily.primary,
              marginTop: 20,
              opacity: interpolate(frame, [15, 25], [0, 1], clampBoth),
              transform: `translateY(${interpolate(frame, [15, 25], [20, 0], clampBoth)}px)`,
            }}
          >
            {label}
          </div>
        )}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
