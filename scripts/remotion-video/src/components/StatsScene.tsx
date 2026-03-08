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
import {
  colors,
  gradients,
  typography,
  springs,
  fadeTiming,
  clampBoth,
} from "../design-system";
import { AnimatedCounter } from "./AnimatedCounter";
import { BarChart } from "./BarChart";

export interface StatItem {
  value: string;
  label: string;
  /** If set, value is parsed as number and animated */
  numericValue?: number;
  /** Suffix for counter display */
  suffix?: string;
  /** For bar chart normalization */
  barValue?: number;
}

export interface StatsSceneProps {
  facts: StatItem[];
  accentColor?: string;
  title?: string;
  /** Display type: 'list' (default), 'counters', 'bars' */
  visualType?: 'list' | 'counters' | 'bars';
}

export const StatsScene: React.FC<StatsSceneProps> = ({
  facts,
  accentColor = colors.brand,
  title = "Key Facts",
  visualType = "list",
}) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  // Title animation
  const titleOpacity = interpolate(frame, [0, 12], [0, 1], clampBoth);
  const titleY = interpolate(frame, [0, 12], [20, 0], clampBoth);

  // Fade out
  const fadeOut = interpolate(
    frame,
    [durationInFrames - fadeTiming.fadeOutFrames.standard, durationInFrames],
    [1, 0],
    clampBoth,
  );

  // Counters visualisation
  if (visualType === "counters") {
    return (
      <AbsoluteFill
        style={{
          background: gradients.sceneSubtle(accentColor),
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
            fontSize: typography.scale.bodySmall,
            fontWeight: 600,
            color: accentColor,
            fontFamily: typography.fontFamily.primary,
            textTransform: "uppercase",
            letterSpacing: 3,
            marginBottom: 48,
          }}
        >
          {title}
        </div>

        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            justifyContent: "center",
            gap: 48,
            maxWidth: 700,
          }}
        >
          {facts.map((fact, i) => {
            const stagger =
              fadeTiming.staggerBaseDelay + i * fadeTiming.staggerIncrement;
            return (
              <div key={i} style={{ textAlign: "center", minWidth: 150 }}>
                <AnimatedCounter
                  value={(fact.numericValue ?? parseFloat(fact.value)) || 0}
                  suffix={fact.suffix || ""}
                  startDelay={stagger}
                  accentColor={accentColor}
                />
                <div
                  style={{
                    fontSize: typography.scale.small,
                    fontWeight: 500,
                    color: colors.textSubtle,
                    fontFamily: typography.fontFamily.primary,
                    marginTop: 8,
                  }}
                >
                  {fact.label}
                </div>
              </div>
            );
          })}
        </div>
      </AbsoluteFill>
    );
  }

  // Bar chart visualisation
  if (visualType === "bars") {
    return (
      <AbsoluteFill
        style={{
          background: gradients.sceneSubtle(accentColor),
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
            fontSize: typography.scale.bodySmall,
            fontWeight: 600,
            color: accentColor,
            fontFamily: typography.fontFamily.primary,
            textTransform: "uppercase",
            letterSpacing: 3,
            marginBottom: 48,
          }}
        >
          {title}
        </div>

        <BarChart
          data={facts.map((f) => ({
            label: f.label,
            value: (f.barValue ?? parseFloat(f.value)) || 0,
          }))}
          accentColor={accentColor}
        />
      </AbsoluteFill>
    );
  }

  // Default: list visualisation
  return (
    <AbsoluteFill
      style={{
        background: gradients.sceneSubtle(accentColor),
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
          fontSize: typography.scale.bodySmall,
          fontWeight: 600,
          color: accentColor,
          fontFamily: typography.fontFamily.primary,
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
          const stagger = fadeTiming.staggerBaseDelay + i * fadeTiming.staggerIncrement;
          const itemScale = spring({
            frame: frame - stagger,
            fps,
            config: springs.staggerItem,
          });
          const itemOpacity = interpolate(
            frame - stagger,
            [0, fadeTiming.fadeInFrames],
            [0, 1],
            clampBoth,
          );

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
                    fontSize: typography.scale.h3,
                    fontWeight: 800,
                    color: colors.text,
                    fontFamily: typography.fontFamily.primary,
                    lineHeight: 1.1,
                  }}
                >
                  {fact.value}
                </div>
                {/* Label */}
                <div
                  style={{
                    fontSize: typography.scale.small,
                    fontWeight: 500,
                    color: colors.textSubtle,
                    fontFamily: typography.fontFamily.primary,
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
