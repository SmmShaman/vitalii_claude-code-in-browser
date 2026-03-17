/**
 * InfoGraphicOverlay — Animated data visualizations overlaid on content scenes.
 *
 * Renders timed infographic elements (key figures, bar charts, bullet lists,
 * mini tables, comparisons) that appear and disappear in sync with narration.
 *
 * Positioned on the left or right side of the frame to avoid conflicting
 * with subtitles (bottom-center) and broadcast graphics.
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
  shadows,
  springs,
  fadeTiming,
  clampBoth,
} from "../design-system";
import { StaggeredMotion } from "remotion-bits";

// ── Types ──

export interface KeyFigureData {
  value: string;
  label: string;
  trend?: "up" | "down" | "neutral";
  icon?: string;
}

export interface BarChartData {
  title?: string;
  items: { label: string; value: number; color?: string }[];
}

export interface BulletListData {
  title?: string;
  items: string[];
}

export interface MiniTableData {
  headers: string[];
  rows: string[][];
}

export interface ComparisonData {
  title?: string;
  left: { label: string; value: string };
  right: { label: string; value: string };
}

export interface DataOverlayItem {
  type: "keyFigure" | "barChart" | "bulletList" | "miniTable" | "comparison";
  /** When to show (0-1 fraction of scene duration) */
  showAt: number;
  /** When to hide (0-1 fraction of scene duration) */
  hideAt: number;
  /** Screen position */
  position?: "right" | "left";
  data:
    | KeyFigureData
    | BarChartData
    | BulletListData
    | MiniTableData
    | ComparisonData;
}

interface InfoGraphicOverlayProps {
  overlays: DataOverlayItem[];
  accentColor?: string;
}

// ── Shared styles ──

const PANEL_WIDTH_RATIO = 0.36;
const PANEL_MARGIN = 40;
const FADE_FRAMES = 10;

const panelStyle = (
  position: "right" | "left",
  width: number,
): React.CSSProperties => ({
  position: "absolute",
  top: "15%",
  [position]: PANEL_MARGIN,
  width: width * PANEL_WIDTH_RATIO,
  maxHeight: "55%",
  background: "rgba(0, 0, 0, 0.75)",
  backdropFilter: `blur(${glass.blurStrong}px)`,
  border: `1px solid ${glass.borderStrong}`,
  borderRadius: glass.borderRadiusLarge,
  padding: "28px 24px",
  overflow: "hidden",
  zIndex: 15,
});

const titleStyle = (accent: string): React.CSSProperties => ({
  fontSize: typography.scale.bodySmall,
  fontWeight: 700,
  color: accent,
  fontFamily: typography.fontFamily.primary,
  marginBottom: 16,
  textTransform: "uppercase" as const,
  letterSpacing: 1.5,
});

const labelStyle: React.CSSProperties = {
  fontSize: typography.scale.small,
  fontWeight: 500,
  color: colors.textMuted,
  fontFamily: typography.fontFamily.primary,
};

const valueStyle: React.CSSProperties = {
  fontSize: typography.scale.body,
  fontWeight: 700,
  color: colors.text,
  fontFamily: typography.fontFamily.primary,
};

// ── Sub-components ──

const KeyFigure: React.FC<{
  data: KeyFigureData;
  accent: string;
  progress: number;
  fps: number;
  frame: number;
}> = ({ data, accent, progress, fps, frame }) => {
  const scale = spring({
    frame: Math.max(0, frame),
    fps,
    config: { damping: 10, stiffness: 100, mass: 0.6 },
  });

  const trendArrow =
    data.trend === "up" ? "\u2191" : data.trend === "down" ? "\u2193" : "";
  const trendColor =
    data.trend === "up" ? "#2ecc71" : data.trend === "down" ? "#e74c3c" : accent;

  return (
    <div style={{ textAlign: "center", transform: `scale(${scale})` }}>
      {data.icon && (
        <div style={{ fontSize: 48, marginBottom: 8 }}>{data.icon}</div>
      )}
      <div
        style={{
          fontSize: typography.scale.hero,
          fontWeight: 900,
          color: accent,
          fontFamily: typography.fontFamily.primary,
          lineHeight: 1,
          textShadow: shadows.glow(accent),
        }}
      >
        {data.value}
        {trendArrow && (
          <span
            style={{
              fontSize: typography.scale.h3,
              color: trendColor,
              marginLeft: 8,
            }}
          >
            {trendArrow}
          </span>
        )}
      </div>
      <div
        style={{
          fontSize: typography.scale.bodySmall,
          color: colors.textMuted,
          fontFamily: typography.fontFamily.primary,
          marginTop: 12,
          fontWeight: 600,
        }}
      >
        {data.label}
      </div>
    </div>
  );
};

const BarChartOverlay: React.FC<{
  data: BarChartData;
  accent: string;
  progress: number;
  fps: number;
  frame: number;
}> = ({ data, accent, progress, fps, frame }) => {
  const maxVal = Math.max(...data.items.map((i) => i.value), 1);

  return (
    <div>
      {data.title && <div style={titleStyle(accent)}>{data.title}</div>}
      <StaggeredMotion
        transition={{
          y: [20, 0],
          opacity: [0, 1],
          duration: 18,
          stagger: 5,
          staggerDirection: "forward",
          easing: "easeOutCubic",
        }}
      >
        {data.items.map((item, idx) => {
          const itemDelay = idx * 6;
          const barProgress = spring({
            frame: Math.max(0, frame - itemDelay),
            fps,
            config: { damping: 14, stiffness: 80 },
          });
          const barWidth = (item.value / maxVal) * 100 * barProgress;

          return (
            <div key={idx} style={{ marginBottom: 14 }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginBottom: 4,
                }}
              >
                <span style={labelStyle}>{item.label}</span>
                <span style={{ ...valueStyle, fontSize: typography.scale.small }}>
                  {item.value}
                </span>
              </div>
              <div
                style={{
                  height: 10,
                  borderRadius: 5,
                  background: "rgba(255,255,255,0.08)",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    height: "100%",
                    width: `${barWidth}%`,
                    borderRadius: 5,
                    background: `linear-gradient(90deg, ${item.color || accent}, ${item.color || accent}cc)`,
                    boxShadow: `0 0 12px ${item.color || accent}60`,
                  }}
                />
              </div>
            </div>
          );
        })}
      </StaggeredMotion>
    </div>
  );
};

const BulletList: React.FC<{
  data: BulletListData;
  accent: string;
  fps: number;
  frame: number;
}> = ({ data, accent, fps, frame }) => (
  <div>
    {data.title && <div style={titleStyle(accent)}>{data.title}</div>}
    <StaggeredMotion
      transition={{
        y: [30, 0],
        opacity: [0, 1],
        scale: [0.9, 1],
        duration: 20,
        stagger: 4,
        staggerDirection: "forward",
        easing: "easeOutCubic",
      }}
    >
      {data.items.map((item, idx) => (
        <div
          key={idx}
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: 12,
            marginBottom: 14,
          }}
        >
          <div
            style={{
              width: 8,
              height: 8,
              borderRadius: 4,
              backgroundColor: accent,
              marginTop: 8,
              flexShrink: 0,
              boxShadow: `0 0 8px ${accent}80`,
            }}
          />
          <span
            style={{
              ...valueStyle,
              fontSize: typography.scale.bodySmall,
              fontWeight: 600,
            }}
          >
            {item}
          </span>
        </div>
      ))}
    </StaggeredMotion>
  </div>
);

const MiniTable: React.FC<{
  data: MiniTableData;
  accent: string;
  fps: number;
  frame: number;
}> = ({ data, accent, fps, frame }) => (
  <div>
    {/* Header row */}
    <div
      style={{
        display: "flex",
        borderBottom: `2px solid ${accent}`,
        paddingBottom: 8,
        marginBottom: 8,
      }}
    >
      {data.headers.map((h, i) => (
        <div
          key={i}
          style={{
            flex: 1,
            ...labelStyle,
            fontSize: typography.scale.xs,
            color: accent,
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: 1,
          }}
        >
          {h}
        </div>
      ))}
    </div>
    {/* Data rows */}
    {data.rows.map((row, rIdx) => {
      const rowDelay = rIdx * 6;
      const rowOpacity = interpolate(
        frame,
        [rowDelay, rowDelay + 8],
        [0, 1],
        clampBoth,
      );
      const rowSlide = interpolate(
        frame,
        [rowDelay, rowDelay + 10],
        [15, 0],
        clampBoth,
      );

      return (
        <div
          key={rIdx}
          style={{
            display: "flex",
            padding: "6px 0",
            borderBottom: `1px solid ${glass.border}`,
            opacity: rowOpacity,
            transform: `translateY(${rowSlide}px)`,
          }}
        >
          {row.map((cell, cIdx) => (
            <div
              key={cIdx}
              style={{
                flex: 1,
                ...valueStyle,
                fontSize: typography.scale.small,
                fontWeight: cIdx === 0 ? 600 : 700,
                color: cIdx === 0 ? colors.textMuted : colors.text,
              }}
            >
              {cell}
            </div>
          ))}
        </div>
      );
    })}
  </div>
);

const Comparison: React.FC<{
  data: ComparisonData;
  accent: string;
  fps: number;
  frame: number;
}> = ({ data, accent, fps, frame }) => {
  const leftScale = spring({
    frame,
    fps,
    config: { damping: 12, stiffness: 100 },
  });
  const rightScale = spring({
    frame: Math.max(0, frame - 10),
    fps,
    config: { damping: 12, stiffness: 100 },
  });

  const boxStyle = (
    scale: number,
    isRight: boolean,
  ): React.CSSProperties => ({
    flex: 1,
    textAlign: "center",
    padding: "16px 8px",
    background: isRight
      ? `${accent}20`
      : "rgba(255,255,255,0.04)",
    borderRadius: 12,
    transform: `scale(${scale})`,
    border: isRight ? `1px solid ${accent}60` : `1px solid ${glass.border}`,
  });

  return (
    <div>
      {data.title && <div style={titleStyle(accent)}>{data.title}</div>}
      <div style={{ display: "flex", gap: 12, alignItems: "stretch" }}>
        <div style={boxStyle(leftScale, false)}>
          <div style={{ ...labelStyle, marginBottom: 8, fontSize: typography.scale.xs }}>
            {data.left.label}
          </div>
          <div style={{ ...valueStyle, fontSize: typography.scale.h5 }}>
            {data.left.value}
          </div>
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            fontSize: typography.scale.body,
            color: accent,
            fontWeight: 900,
          }}
        >
          →
        </div>
        <div style={boxStyle(rightScale, true)}>
          <div style={{ ...labelStyle, marginBottom: 8, fontSize: typography.scale.xs }}>
            {data.right.label}
          </div>
          <div
            style={{
              ...valueStyle,
              fontSize: typography.scale.h5,
              color: accent,
            }}
          >
            {data.right.value}
          </div>
        </div>
      </div>
    </div>
  );
};

// ── Main Component ──

export const InfoGraphicOverlay: React.FC<InfoGraphicOverlayProps> = ({
  overlays,
  accentColor = colors.brand,
}) => {
  const frame = useCurrentFrame();
  const { fps, width, durationInFrames } = useVideoConfig();

  if (!overlays || overlays.length === 0) return null;

  return (
    <>
      {overlays.map((overlay, idx) => {
        const showFrame = Math.round(overlay.showAt * durationInFrames);
        const hideFrame = Math.round(overlay.hideAt * durationInFrames);
        const position = overlay.position || "right";

        // Not yet visible or already gone
        if (frame < showFrame - 2 || frame > hideFrame + 2) return null;

        // Local frame relative to overlay start
        const localFrame = frame - showFrame;

        // Fade in/out
        const fadeIn = interpolate(
          frame,
          [showFrame, showFrame + FADE_FRAMES],
          [0, 1],
          clampBoth,
        );
        const fadeOut = interpolate(
          frame,
          [hideFrame - FADE_FRAMES, hideFrame],
          [1, 0],
          clampBoth,
        );
        const opacity = fadeIn * fadeOut;

        // Slide entrance
        const slideIn = spring({
          frame: localFrame,
          fps,
          config: { damping: 14, stiffness: 80, mass: 0.7 },
        });
        const translateX =
          position === "right"
            ? (1 - slideIn) * 60
            : -(1 - slideIn) * 60;

        return (
          <div
            key={idx}
            style={{
              ...panelStyle(position, width),
              opacity,
              transform: `translateX(${translateX}px)`,
            }}
          >
            {/* Accent top line */}
            <div
              style={{
                position: "absolute",
                top: 0,
                left: "10%",
                right: "10%",
                height: 3,
                borderRadius: 2,
                background: `linear-gradient(90deg, transparent, ${accentColor}, transparent)`,
              }}
            />

            {overlay.type === "keyFigure" && (
              <KeyFigure
                data={overlay.data as KeyFigureData}
                accent={accentColor}
                progress={slideIn}
                fps={fps}
                frame={localFrame}
              />
            )}
            {overlay.type === "barChart" && (
              <BarChartOverlay
                data={overlay.data as BarChartData}
                accent={accentColor}
                progress={slideIn}
                fps={fps}
                frame={localFrame}
              />
            )}
            {overlay.type === "bulletList" && (
              <BulletList
                data={overlay.data as BulletListData}
                accent={accentColor}
                fps={fps}
                frame={localFrame}
              />
            )}
            {overlay.type === "miniTable" && (
              <MiniTable
                data={overlay.data as MiniTableData}
                accent={accentColor}
                fps={fps}
                frame={localFrame}
              />
            )}
            {overlay.type === "comparison" && (
              <Comparison
                data={overlay.data as ComparisonData}
                accent={accentColor}
                fps={fps}
                frame={localFrame}
              />
            )}
          </div>
        );
      })}
    </>
  );
};
