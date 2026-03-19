/**
 * SplitScreenPanel — screen divides into left/right halves
 * with animated glass divider and spring-in content.
 */
import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig, spring, interpolate } from "remotion";
import { colors, glass, typography, clampBoth } from "../../design-system";
import { AnimatedCounter } from "../AnimatedCounter";

interface SplitScreenPanelProps {
  leftLabel: string;
  leftContent: string;
  rightLabel: string;
  rightContent: string;
  accentColor: string;
}

export const SplitScreenPanel: React.FC<SplitScreenPanelProps> = ({
  leftLabel,
  leftContent,
  rightLabel,
  rightContent,
  accentColor,
}) => {
  const frame = useCurrentFrame();
  const { fps, width, height, durationInFrames } = useVideoConfig();

  // Divider draws top to bottom
  const dividerProgress = interpolate(frame, [0, 15], [0, 1], clampBoth);

  // Panels slide in from sides
  const leftSlide = spring({ frame: Math.max(0, frame - 8), fps, config: { damping: 14, stiffness: 100 } });
  const rightSlide = spring({ frame: Math.max(0, frame - 12), fps, config: { damping: 14, stiffness: 100 } });

  // Fade out
  const fadeOut = interpolate(frame, [durationInFrames - 10, durationInFrames], [1, 0], clampBoth);

  // Parse numbers from content
  const leftNum = parseFloat(leftContent.replace(/[^0-9.,]/g, "").replace(",", "."));
  const rightNum = parseFloat(rightContent.replace(/[^0-9.,]/g, "").replace(",", "."));
  const leftHasNum = !isNaN(leftNum) && leftNum > 0;
  const rightHasNum = !isNaN(rightNum) && rightNum > 0;
  const leftSuffix = leftContent.includes("%") ? "%" : "";
  const rightSuffix = rightContent.includes("%") ? "%" : "";

  const panelStyle = (isRight: boolean): React.CSSProperties => ({
    flex: 1,
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
    padding: "40px 20px",
    background: isRight ? `${accentColor}12` : "rgba(255,255,255,0.03)",
    backdropFilter: `blur(${glass.blur}px)`,
    gap: 16,
  });

  return (
    <AbsoluteFill style={{ opacity: fadeOut }}>
      <div style={{ display: "flex", height: "100%", position: "relative" }}>
        {/* Left panel */}
        <div style={{
          ...panelStyle(false),
          transform: `translateX(${(1 - leftSlide) * -60}px)`,
          opacity: leftSlide,
        }}>
          <div style={{ fontSize: typography.scale.bodySmall, color: colors.textMuted, fontFamily: typography.fontFamily.primary, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1.5 }}>
            {leftLabel}
          </div>
          {leftHasNum ? (
            <AnimatedCounter value={leftNum} suffix={leftSuffix} accentColor={colors.textMuted} fontSize={typography.scale.hero} startDelay={12} />
          ) : (
            <div style={{ fontSize: typography.scale.h3, fontWeight: 700, color: colors.text, fontFamily: typography.fontFamily.primary, textAlign: "center" }}>
              {leftContent}
            </div>
          )}
        </div>

        {/* Divider */}
        <div style={{
          position: "absolute",
          left: "50%",
          top: 0,
          width: 2,
          height: `${dividerProgress * 100}%`,
          background: `linear-gradient(to bottom, ${accentColor}, ${accentColor}40)`,
          boxShadow: `0 0 20px ${accentColor}60`,
          zIndex: 10,
        }} />

        {/* Right panel */}
        <div style={{
          ...panelStyle(true),
          transform: `translateX(${(1 - rightSlide) * 60}px)`,
          opacity: rightSlide,
        }}>
          <div style={{ fontSize: typography.scale.bodySmall, color: accentColor, fontFamily: typography.fontFamily.primary, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1.5 }}>
            {rightLabel}
          </div>
          {rightHasNum ? (
            <AnimatedCounter value={rightNum} suffix={rightSuffix} accentColor={accentColor} fontSize={typography.scale.hero} startDelay={16} />
          ) : (
            <div style={{ fontSize: typography.scale.h3, fontWeight: 700, color: accentColor, fontFamily: typography.fontFamily.primary, textAlign: "center" }}>
              {rightContent}
            </div>
          )}
        </div>
      </div>
    </AbsoluteFill>
  );
};
