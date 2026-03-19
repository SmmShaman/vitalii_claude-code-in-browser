/**
 * ProgressTimeline — horizontal line with milestone dots.
 * Roadmap/timeline visualization.
 */
import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig, spring, interpolate } from "remotion";
import { colors, typography, clampBoth } from "../../design-system";

interface ProgressTimelineProps {
  milestones: string[];
  accentColor: string;
  lineY?: number; // fraction 0-1, default 0.5
}

// Parse milestones from scene description
export function parseMilestones(desc: string): string[] {
  // Try numbered items: "1. X, 2. Y, 3. Z"
  const numbered = desc.match(/\d+\.\s*([^,.\n]+)/g);
  if (numbered && numbered.length >= 2) {
    return numbered.map(m => m.replace(/^\d+\.\s*/, "").trim()).slice(0, 5);
  }
  // Try "milestones:" or "phases:" followed by comma-separated items
  const afterLabel = desc.match(/(?:milestone|phase|step|stage)[s:]?\s*[:]\s*([^.]+)/i);
  if (afterLabel) {
    return afterLabel[1].split(/[,;]/).map(s => s.trim()).filter(Boolean).slice(0, 5);
  }
  return ["Start", "Progress", "Goal"];
}

export const ProgressTimeline: React.FC<ProgressTimelineProps> = ({
  milestones,
  accentColor,
  lineY = 0.45,
}) => {
  const frame = useCurrentFrame();
  const { fps, width, height, durationInFrames } = useVideoConfig();

  const y = height * lineY;
  const marginX = width * 0.1;
  const lineWidth = width - marginX * 2;

  // Line draws left to right
  const lineProgress = interpolate(frame, [0, Math.round(fps * 1.2)], [0, 1], clampBoth);

  // Fade out
  const fadeOut = interpolate(frame, [durationInFrames - 10, durationInFrames], [1, 0], clampBoth);

  return (
    <AbsoluteFill style={{ opacity: fadeOut, pointerEvents: "none" }}>
      {/* Main horizontal line */}
      <div
        style={{
          position: "absolute",
          left: marginX,
          top: y - 1.5,
          width: lineWidth * lineProgress,
          height: 3,
          background: `linear-gradient(90deg, ${accentColor}, ${accentColor}80)`,
          borderRadius: 2,
          boxShadow: `0 0 12px ${accentColor}40`,
        }}
      />

      {/* Milestone dots + labels */}
      {milestones.map((label, i) => {
        const position = milestones.length > 1 ? i / (milestones.length - 1) : 0.5;
        const x = marginX + lineWidth * position;
        const reachFrame = Math.round(position * fps * 1.2);

        const dotScale = spring({
          frame: Math.max(0, frame - reachFrame),
          fps,
          config: { damping: 10, stiffness: 140, mass: 0.5 },
        });

        const labelOpacity = interpolate(frame, [reachFrame + 4, reachFrame + 12], [0, 1], clampBoth);
        const labelSlide = interpolate(frame, [reachFrame + 4, reachFrame + 12], [15, 0], clampBoth);

        return (
          <React.Fragment key={i}>
            {/* Glow ring */}
            <div
              style={{
                position: "absolute",
                left: x - 16,
                top: y - 16,
                width: 32,
                height: 32,
                borderRadius: "50%",
                border: `2px solid ${accentColor}60`,
                transform: `scale(${dotScale})`,
                boxShadow: `0 0 16px ${accentColor}30`,
              }}
            />
            {/* Dot */}
            <div
              style={{
                position: "absolute",
                left: x - 8,
                top: y - 8,
                width: 16,
                height: 16,
                borderRadius: "50%",
                background: accentColor,
                transform: `scale(${dotScale})`,
                boxShadow: `0 0 8px ${accentColor}80`,
              }}
            />
            {/* Label */}
            <div
              style={{
                position: "absolute",
                left: x - 60,
                top: y + 28,
                width: 120,
                textAlign: "center",
                fontSize: typography.scale.small,
                fontWeight: 600,
                color: colors.text,
                fontFamily: typography.fontFamily.primary,
                opacity: labelOpacity,
                transform: `translateY(${labelSlide}px)`,
              }}
            >
              {label}
            </div>
          </React.Fragment>
        );
      })}
    </AbsoluteFill>
  );
};
