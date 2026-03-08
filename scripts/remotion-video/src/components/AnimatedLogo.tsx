/**
 * AnimatedLogo — Persistent "vitalii.no" branding in top-right.
 *
 * Fades in with scale, subtle pulse on segment changes.
 */
import React from "react";
import {
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
} from "remotion";
import {
  colors,
  glass,
  typography,
  logo,
  springs,
  branding,
  clampBoth,
} from "../design-system";

export interface AnimatedLogoProps {
  accentColor?: string;
}

export const AnimatedLogo: React.FC<AnimatedLogoProps> = ({
  accentColor = colors.brand,
}) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const isVertical = height > width;

  // Fade + scale entrance
  const entrance = spring({
    frame: frame - 5,
    fps,
    config: springs.logoFade,
  });

  const opacity = interpolate(entrance, [0, 1], [0, 0.85]);
  const scale = interpolate(entrance, [0, 1], [0.8, 1]);

  return (
    <div
      style={{
        position: "absolute",
        top: isVertical ? logo.top.vertical : logo.top.horizontal,
        right: isVertical ? logo.right.vertical : logo.right.horizontal,
        opacity,
        transform: `scale(${scale})`,
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "6px 14px",
        background: glass.background,
        backdropFilter: `blur(${glass.blur}px)`,
        WebkitBackdropFilter: `blur(${glass.blur}px)`,
        borderRadius: 8,
        border: `1px solid ${glass.border}`,
        zIndex: 30,
      }}
    >
      {/* Accent dot */}
      <div
        style={{
          width: 6,
          height: 6,
          borderRadius: 3,
          backgroundColor: accentColor,
        }}
      />
      <span
        style={{
          fontSize: logo.fontSize,
          fontWeight: logo.fontWeight,
          fontFamily: typography.fontFamily.primary,
          color: colors.text,
          letterSpacing: logo.letterSpacing,
        }}
      >
        {branding.watermarkText}
      </span>
    </div>
  );
};
