/**
 * StatsScene - Animated facts and statistics.
 *
 * Displays key numbers/facts from the article with
 * counting animations and staggered reveal.
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

export interface StatItem {
  value: string;
  label: string;
}

export interface StatsSceneProps {
  facts: StatItem[];
  accentColor?: string;
  title?: string;
}

export const StatsScene: React.FC<StatsSceneProps> = ({
  facts,
  accentColor = "#667eea",
  title = "Key Facts",
}) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  // Title animation
  const titleOpacity = interpolate(frame, [0, 12], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const titleY = interpolate(frame, [0, 12], [20, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Fade out
  const fadeOut = interpolate(frame, [durationInFrames - 8, durationInFrames], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill
      style={{
        background: `linear-gradient(160deg, #0a0a0a 0%, ${accentColor}15 100%)`,
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        padding: "10% 8%",
        opacity: fadeOut,
      }}
    >
      {/* Section title */}
      <div
        style={{
          opacity: titleOpacity,
          transform: `translateY(${titleY}px)`,
          fontSize: 24,
          fontWeight: 600,
          color: accentColor,
          fontFamily: defaultTheme.typography.fontFamily.fallback,
          textTransform: "uppercase",
          letterSpacing: 3,
          marginBottom: 48,
        }}
      >
        {title}
      </div>

      {/* Facts grid */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 32,
          width: "100%",
          maxWidth: 600,
        }}
      >
        {facts.map((fact, i) => {
          const stagger = 15 + i * 12;
          const itemScale = spring({
            frame: frame - stagger,
            fps,
            config: { damping: 12, stiffness: 100 },
          });
          const itemOpacity = interpolate(frame - stagger, [0, 8], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          });

          return (
            <div
              key={i}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 20,
                transform: `scale(${itemScale})`,
                opacity: itemOpacity,
              }}
            >
              {/* Accent dot */}
              <div
                style={{
                  width: 12,
                  height: 12,
                  borderRadius: "50%",
                  backgroundColor: accentColor,
                  flexShrink: 0,
                }}
              />

              <div style={{ flex: 1 }}>
                {/* Value */}
                <div
                  style={{
                    fontSize: 44,
                    fontWeight: 800,
                    color: defaultTheme.colors.text,
                    fontFamily: defaultTheme.typography.fontFamily.fallback,
                    lineHeight: 1.1,
                  }}
                >
                  {fact.value}
                </div>
                {/* Label */}
                <div
                  style={{
                    fontSize: 20,
                    fontWeight: 500,
                    color: "rgba(255,255,255,0.6)",
                    fontFamily: defaultTheme.typography.fontFamily.fallback,
                    marginTop: 4,
                  }}
                >
                  {fact.label}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
