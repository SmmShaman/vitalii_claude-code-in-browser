/**
 * IconStagger — 3-6 icons appear one by one with spring-pop + glow circles.
 * Used for industry/category representation.
 */
import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig, spring, interpolate } from "remotion";
import { colors, typography, clampBoth } from "../../design-system";

// Built-in SVG icon paths (24x24 viewBox)
const ICON_PATHS: Record<string, string> = {
  laptop: "M4 6h16v10H4V6zm-2 12h20v2H2v-2z",
  brain: "M12 2a7 7 0 0 0-7 7c0 2.4 1.2 4.5 3 5.7V17h8v-2.3c1.8-1.2 3-3.3 3-5.7a7 7 0 0 0-7-7zm-1 15h2v2h-2v-2z",
  chart: "M3 13h4v8H3v-8zm6-5h4v13H9V8zm6-6h4v19h-4V2z",
  shield: "M12 2L4 5v6.09c0 5.05 3.41 9.76 8 10.91 4.59-1.15 8-5.86 8-10.91V5l-8-3z",
  globe: "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z",
  medical: "M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-2 10h-4v4h-2v-4H7v-2h4V7h2v4h4v2z",
  factory: "M2 21V7l6 3V7l6 3V3h6v18H2zm14-10v2h2v-2h-2zm0 4v2h2v-2h-2zm-4 0v2h2v-2h-2zm-4 0v2h2v-2H8z",
  rocket: "M12 2c-1 4-4 7-4 7v4l-2 2v2l3-1 1 3h4l1-3 3 1v-2l-2-2V9s-3-3-4-7z",
  palette: "M12 2C6.49 2 2 6.49 2 12s4.49 10 10 10a2.5 2.5 0 0 0 2.5-2.5c0-.61-.23-1.21-.64-1.67A1.49 1.49 0 0 1 15 16.5h1.5c3.04 0 5.5-2.46 5.5-5.5C22 5.81 17.52 2 12 2zM6.5 13a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zm3-4a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zm5 0a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zm3 4a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3z",
  dollar: "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1.41 16.09V20h-2.67v-1.93c-1.71-.36-3.16-1.46-3.27-3.4h1.96c.1 1.05.82 1.87 2.65 1.87 1.96 0 2.4-.98 2.4-1.59 0-.83-.44-1.61-2.67-2.14-2.48-.6-4.18-1.62-4.18-3.67 0-1.72 1.39-2.84 3.11-3.21V4h2.67v1.95c1.86.45 2.79 1.86 2.85 3.39H14.3c-.05-1.11-.64-1.87-2.22-1.87-1.5 0-2.4.68-2.4 1.64 0 .84.65 1.39 2.67 1.94s4.18 1.36 4.18 3.85c0 1.89-1.44 2.98-3.12 3.19z",
  target: "M12 2C6.49 2 2 6.49 2 12s4.49 10 10 10 10-4.49 10-10S17.51 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm3-8a3 3 0 1 1-6 0 3 3 0 0 1 6 0z",
  lightning: "M7 2v11h3v9l7-12h-4l4-8z",
};

// Parse icon names from scene description
function parseIcons(description: string): string[] {
  const iconMap: Record<string, string> = {
    laptop: "laptop", computer: "laptop", tech: "laptop", software: "laptop",
    brain: "brain", ai: "brain", intelligence: "brain", neural: "brain",
    chart: "chart", graph: "chart", analytics: "chart", dashboard: "chart", data: "chart",
    shield: "shield", security: "shield", protection: "shield", safe: "shield",
    globe: "globe", world: "globe", global: "globe", international: "globe", earth: "globe",
    medical: "medical", health: "medical", hospital: "medical", healthcare: "medical",
    factory: "factory", manufacturing: "factory", industry: "factory", production: "factory",
    rocket: "rocket", launch: "rocket", startup: "rocket", space: "rocket",
    palette: "palette", creative: "palette", art: "palette", design: "palette",
    dollar: "dollar", money: "dollar", finance: "dollar", bank: "dollar", payment: "dollar",
    target: "target", goal: "target", focus: "target", aim: "target",
    lightning: "lightning", energy: "lightning", power: "lightning", electric: "lightning",
  };

  const desc = description.toLowerCase();
  const found: string[] = [];
  for (const [keyword, icon] of Object.entries(iconMap)) {
    if (desc.includes(keyword) && !found.includes(icon)) {
      found.push(icon);
    }
  }
  return found.length > 0 ? found.slice(0, 6) : ["laptop", "chart", "globe"];
}

interface IconStaggerProps {
  sceneDescription?: string;
  accentColor: string;
  iconSize?: number;
  staggerDelay?: number;
}

export const IconStagger: React.FC<IconStaggerProps> = ({
  sceneDescription = "",
  accentColor,
  iconSize = 72,
  staggerDelay = 8,
}) => {
  const frame = useCurrentFrame();
  const { fps, width, height, durationInFrames } = useVideoConfig();

  const icons = parseIcons(sceneDescription);
  const totalWidth = icons.length * (iconSize + 40);
  const startX = (width - totalWidth) / 2;
  const centerY = height * 0.4;

  // Fade out
  const fadeOut = interpolate(frame, [durationInFrames - 12, durationInFrames], [1, 0], clampBoth);

  return (
    <AbsoluteFill style={{ opacity: fadeOut, pointerEvents: "none" }}>
      {icons.map((iconKey, i) => {
        const delay = 6 + i * staggerDelay;
        const scale = spring({
          frame: Math.max(0, frame - delay),
          fps,
          config: { damping: 10, stiffness: 140, mass: 0.5 },
        });
        const opacity = interpolate(frame, [delay, delay + 6], [0, 1], clampBoth);
        const x = startX + i * (iconSize + 40) + 20;
        const path = ICON_PATHS[iconKey] || ICON_PATHS.globe;

        // Glow circle behind icon
        const glowScale = spring({
          frame: Math.max(0, frame - delay + 4),
          fps,
          config: { damping: 12, stiffness: 80 },
        });

        return (
          <React.Fragment key={i}>
            {/* Glow circle */}
            <div
              style={{
                position: "absolute",
                left: x + iconSize / 2 - iconSize * 0.6,
                top: centerY - iconSize * 0.6,
                width: iconSize * 1.2,
                height: iconSize * 1.2,
                borderRadius: "50%",
                background: `radial-gradient(circle, ${accentColor}30 0%, transparent 70%)`,
                transform: `scale(${glowScale})`,
                opacity: opacity * 0.6,
              }}
            />
            {/* Icon */}
            <div
              style={{
                position: "absolute",
                left: x,
                top: centerY - iconSize / 2,
                width: iconSize,
                height: iconSize,
                transform: `scale(${scale})`,
                opacity,
              }}
            >
              <svg viewBox="0 0 24 24" width={iconSize} height={iconSize}>
                <path d={path} fill={accentColor} />
              </svg>
            </div>
            {/* Label */}
            <div
              style={{
                position: "absolute",
                left: x,
                top: centerY + iconSize / 2 + 12,
                width: iconSize,
                textAlign: "center",
                fontSize: 16,
                fontWeight: 600,
                color: colors.textMuted,
                fontFamily: typography.fontFamily.primary,
                opacity: opacity * 0.8,
                transform: `translateY(${(1 - scale) * 10}px)`,
              }}
            >
              {iconKey}
            </div>
          </React.Fragment>
        );
      })}
    </AbsoluteFill>
  );
};
