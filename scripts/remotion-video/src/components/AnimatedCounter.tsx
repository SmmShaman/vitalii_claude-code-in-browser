/**
 * AnimatedCounter — numeric tick-up animation.
 *
 * Smoothly animates a number from 0 to the target value.
 * Supports suffixes like %, M, K, $.
 */
import React from "react";
import {
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
} from "remotion";
import { colors, typography, clampBoth } from "../design-system";

export interface AnimatedCounterProps {
  /** Target numeric value */
  value: number;
  /** Suffix (%, M, $, etc.) */
  suffix?: string;
  /** Prefix ($, €, etc.) */
  prefix?: string;
  /** Decimal places to show */
  decimals?: number;
  /** Delay before animation starts (frames) */
  startDelay?: number;
  fontSize?: number;
  fontWeight?: number;
  color?: string;
  accentColor?: string;
}

export const AnimatedCounter: React.FC<AnimatedCounterProps> = ({
  value,
  suffix = "",
  prefix = "",
  decimals = 0,
  startDelay = 0,
  fontSize = typography.scale.h2,
  fontWeight = 800,
  color = colors.text,
  accentColor = colors.brand,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Spring-driven progress
  const progress = spring({
    frame: Math.max(0, frame - startDelay),
    fps,
    config: { damping: 20, stiffness: 80, mass: 0.8 },
  });

  const currentValue = value * progress;
  const displayValue = decimals > 0
    ? currentValue.toFixed(decimals)
    : Math.round(currentValue).toString();

  // Opacity fade in
  const opacity = interpolate(frame, [startDelay, startDelay + 8], [0, 1], clampBoth);

  // Scale pop
  const scale = spring({
    frame: Math.max(0, frame - startDelay),
    fps,
    config: { damping: 12, stiffness: 120, mass: 0.5 },
  });

  return (
    <div
      style={{
        opacity,
        transform: `scale(${scale})`,
        textAlign: "center",
      }}
    >
      <span
        style={{
          fontSize,
          fontWeight,
          color: accentColor,
          fontFamily: typography.fontFamily.primary,
          lineHeight: 1.1,
        }}
      >
        {prefix}{displayValue}{suffix}
      </span>
    </div>
  );
};
