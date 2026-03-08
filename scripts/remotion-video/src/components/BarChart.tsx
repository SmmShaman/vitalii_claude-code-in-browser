/**
 * BarChart — animated horizontal bar visualization.
 *
 * Bars grow from left to right with staggered timing.
 * Auto-normalizes values to the maximum.
 */
import React from "react";
import {
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
} from "remotion";
import { colors, glass, typography, fadeTiming, clampBoth } from "../design-system";

export interface BarItem {
  label: string;
  value: number;
  color?: string;
}

export interface BarChartProps {
  data: BarItem[];
  accentColor?: string;
  /** Maximum bar width in pixels */
  maxBarWidth?: number;
  barHeight?: number;
  showValues?: boolean;
}

export const BarChart: React.FC<BarChartProps> = ({
  data,
  accentColor = colors.brand,
  maxBarWidth = 500,
  barHeight = 36,
  showValues = true,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const maxValue = Math.max(...data.map((d) => d.value), 1);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 20,
        width: "100%",
        maxWidth: maxBarWidth + 200,
      }}
    >
      {data.map((item, i) => {
        const stagger = fadeTiming.staggerBaseDelay + i * fadeTiming.staggerIncrement;

        // Label fades in
        const labelOpacity = interpolate(
          frame - stagger,
          [0, 8],
          [0, 1],
          clampBoth,
        );

        // Bar grows
        const barProgress = spring({
          frame: Math.max(0, frame - stagger - 4),
          fps,
          config: { damping: 14, stiffness: 80 },
        });
        const barWidth = (item.value / maxValue) * maxBarWidth * barProgress;

        // Value counter
        const valueOpacity = interpolate(
          frame - stagger - 10,
          [0, 8],
          [0, 1],
          clampBoth,
        );

        const barColor = item.color || accentColor;

        return (
          <div key={i} style={{ opacity: labelOpacity }}>
            {/* Label */}
            <div
              style={{
                fontSize: typography.scale.small,
                fontWeight: 600,
                color: colors.textMuted,
                fontFamily: typography.fontFamily.primary,
                marginBottom: 6,
              }}
            >
              {item.label}
            </div>

            {/* Bar + value */}
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div
                style={{
                  width: maxBarWidth,
                  height: barHeight,
                  backgroundColor: glass.background,
                  borderRadius: barHeight / 2,
                  overflow: "hidden",
                  border: `1px solid ${glass.border}`,
                }}
              >
                <div
                  style={{
                    width: barWidth,
                    height: "100%",
                    backgroundColor: barColor,
                    borderRadius: barHeight / 2,
                    boxShadow: `0 0 12px ${barColor}40`,
                  }}
                />
              </div>

              {showValues && (
                <span
                  style={{
                    opacity: valueOpacity,
                    fontSize: typography.scale.body,
                    fontWeight: 800,
                    color: colors.text,
                    fontFamily: typography.fontFamily.primary,
                    minWidth: 60,
                  }}
                >
                  {Math.round(item.value * barProgress)}
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};
