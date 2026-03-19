/**
 * DataDashboard — multi-panel analytics dashboard with animated charts.
 * Shows 2-4 glass cards with different visualizations simultaneously.
 * Triggered by "dashboard", "analytics", "multiple charts", "panels" in sceneDescription.
 */
import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig, spring, interpolate } from "remotion";
import { colors, glass, typography, clampBoth } from "../../design-system";
import { AnimatedCounter } from "../AnimatedCounter";

interface DataDashboardProps {
  accentColor: string;
  values?: { label: string; value: string }[];
}

// Parse values from graphicData
function extractValues(data: Record<string, unknown>): { label: string; value: string }[] {
  if (data.items && Array.isArray(data.items)) {
    return (data.items as { label: string; value: string | number }[]).map(i => ({
      label: String(i.label || ""),
      value: String(i.value || ""),
    }));
  }
  if (data.value) {
    return [{ label: String(data.label || ""), value: String(data.value) }];
  }
  return [];
}

const DashCard: React.FC<{
  label: string;
  value: string;
  accent: string;
  delay: number;
  index: number;
}> = ({ label, value, accent, delay, index }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const slideIn = spring({
    frame: Math.max(0, frame - delay),
    fps,
    config: { damping: 14, stiffness: 100, mass: 0.6 },
  });
  const opacity = interpolate(frame, [delay, delay + 8], [0, 1], clampBoth);

  const num = parseFloat(value.replace(/[^0-9.,]/g, "").replace(",", "."));
  const hasNum = !isNaN(num) && num > 0;
  const suffix = value.includes("%") ? "%" : value.includes("M") ? "M" : value.includes("K") ? "K" : "";

  // Mini bar chart for variety (every other card)
  const showBar = index % 2 === 1 && hasNum;

  return (
    <div
      style={{
        background: "rgba(0, 0, 0, 0.7)",
        backdropFilter: `blur(${glass.blur}px)`,
        border: `1px solid ${glass.border}`,
        borderRadius: glass.borderRadius,
        padding: "20px 16px",
        opacity,
        transform: `translateY(${(1 - slideIn) * 30}px)`,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 8,
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Top accent line */}
      <div style={{
        position: "absolute", top: 0, left: "15%", right: "15%", height: 2,
        background: `linear-gradient(90deg, transparent, ${accent}, transparent)`,
        borderRadius: 1,
      }} />

      <div style={{
        fontSize: typography.scale.xs,
        color: colors.textMuted,
        fontFamily: typography.fontFamily.primary,
        fontWeight: 600,
        textTransform: "uppercase",
        letterSpacing: 1,
      }}>
        {label}
      </div>

      {hasNum && !showBar ? (
        <AnimatedCounter
          value={num}
          suffix={suffix}
          accentColor={accent}
          fontSize={typography.scale.h3}
          startDelay={delay + 5}
        />
      ) : showBar ? (
        <BarMini value={num} max={num * 1.3} accent={accent} delay={delay} />
      ) : (
        <div style={{
          fontSize: typography.scale.h4,
          fontWeight: 700,
          color: accent,
          fontFamily: typography.fontFamily.primary,
        }}>
          {value}
        </div>
      )}
    </div>
  );
};

const BarMini: React.FC<{
  value: number;
  max: number;
  accent: string;
  delay: number;
}> = ({ value, max, accent, delay }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const barProgress = spring({
    frame: Math.max(0, frame - delay - 8),
    fps,
    config: { damping: 18, stiffness: 70 },
  });

  return (
    <div style={{ width: "100%", padding: "0 4px" }}>
      <div style={{
        height: 8, borderRadius: 4,
        background: "rgba(255,255,255,0.08)",
        overflow: "hidden",
      }}>
        <div style={{
          height: "100%",
          width: `${(value / max) * 100 * barProgress}%`,
          borderRadius: 4,
          background: `linear-gradient(90deg, ${accent}, ${accent}cc)`,
          boxShadow: `0 0 8px ${accent}40`,
        }} />
      </div>
      <div style={{
        fontSize: typography.scale.xs,
        color: accent,
        fontFamily: typography.fontFamily.primary,
        fontWeight: 700,
        textAlign: "right",
        marginTop: 4,
      }}>
        {Math.round(value * barProgress)}
      </div>
    </div>
  );
};

export const DataDashboard: React.FC<DataDashboardProps> = ({
  accentColor,
  values = [],
}) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();

  const items = values.length > 0 ? values.slice(0, 4) : [
    { label: "Total", value: "100" },
    { label: "Growth", value: "24%" },
  ];

  const fadeOut = interpolate(frame, [durationInFrames - 10, durationInFrames], [1, 0], clampBoth);

  return (
    <AbsoluteFill style={{ opacity: fadeOut, pointerEvents: "none" }}>
      <div style={{
        position: "absolute",
        top: "15%",
        left: "8%",
        right: "8%",
        display: "grid",
        gridTemplateColumns: items.length <= 2 ? "1fr 1fr" : "1fr 1fr",
        gap: 16,
        maxWidth: 600,
        margin: "0 auto",
      }}>
        {items.map((item, i) => (
          <DashCard
            key={i}
            label={item.label}
            value={item.value}
            accent={accentColor}
            delay={6 + i * 8}
            index={i}
          />
        ))}
      </div>
    </AbsoluteFill>
  );
};

export { extractValues };
