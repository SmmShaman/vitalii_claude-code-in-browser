/**
 * PhotoSplitScreen — divide screen into 2-4 panels with different photos.
 * Each panel slides/scales in with stagger. Glass dividers between panels.
 * Triggered by "split screen photos", "multiple images", "side by side photos".
 */
import React from "react";
import {
  AbsoluteFill,
  Img,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
  staticFile,
} from "remotion";
import { colors, glass, clampBoth } from "../../design-system";

interface PhotoSplitScreenProps {
  images: string[];
  accentColor: string;
  layout?: "horizontal" | "vertical" | "grid";
  labels?: string[];
}

export const PhotoSplitScreen: React.FC<PhotoSplitScreenProps> = ({
  images,
  accentColor,
  layout = "horizontal",
  labels = [],
}) => {
  const frame = useCurrentFrame();
  const { fps, width, height, durationInFrames } = useVideoConfig();

  const resolve = (src: string) =>
    src.startsWith("http") ? src : staticFile(src);

  const count = Math.min(images.length, 4);
  if (count === 0) return null;

  const fadeOut = interpolate(
    frame,
    [durationInFrames - 10, durationInFrames],
    [1, 0],
    clampBoth,
  );

  // Divider animation
  const dividerProgress = interpolate(frame, [5, 20], [0, 1], clampBoth);

  const getPanelStyle = (index: number): React.CSSProperties => {
    const delay = 4 + index * 6;
    const slideIn = spring({
      frame: Math.max(0, frame - delay),
      fps,
      config: { damping: 14, stiffness: 100 },
    });
    const panelOpacity = interpolate(
      frame,
      [delay, delay + 8],
      [0, 1],
      clampBoth,
    );

    // Subtle Ken Burns per panel (different direction each)
    const dirs = [
      { sx: 1.0, ex: 1.08, px: 0, py: 0 },
      { sx: 1.05, ex: 1.0, px: -1, py: 0 },
      { sx: 1.0, ex: 1.06, px: 1, py: -1 },
      { sx: 1.03, ex: 1.0, px: 0, py: 1 },
    ];
    const d = dirs[index % dirs.length];
    const progress = frame / durationInFrames;
    const scale = d.sx + (d.ex - d.sx) * progress;
    const px = d.px * progress * 2;
    const py = d.py * progress * 2;

    const base: React.CSSProperties = {
      overflow: "hidden",
      opacity: panelOpacity,
      position: "relative",
    };

    if (layout === "horizontal") {
      return {
        ...base,
        flex: 1,
        transform: `translateX(${(1 - slideIn) * (index % 2 === 0 ? -40 : 40)}px)`,
      };
    }
    if (layout === "vertical") {
      return {
        ...base,
        flex: 1,
        transform: `translateY(${(1 - slideIn) * (index % 2 === 0 ? -30 : 30)}px)`,
      };
    }
    // grid
    return {
      ...base,
      transform: `scale(${slideIn})`,
    };
  };

  const containerStyle: React.CSSProperties =
    layout === "grid"
      ? {
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gridTemplateRows: "1fr 1fr",
          gap: 3,
          height: "100%",
        }
      : {
          display: "flex",
          flexDirection: layout === "vertical" ? "column" : "row",
          height: "100%",
          gap: 3,
        };

  return (
    <AbsoluteFill style={{ opacity: fadeOut }}>
      <div style={containerStyle}>
        {images.slice(0, count).map((src, i) => {
          const dirs = [
            { sx: 1.0, ex: 1.08, px: 0, py: 0 },
            { sx: 1.05, ex: 1.0, px: -1, py: 0 },
            { sx: 1.0, ex: 1.06, px: 1, py: -1 },
            { sx: 1.03, ex: 1.0, px: 0, py: 1 },
          ];
          const d = dirs[i % dirs.length];
          const progress = frame / durationInFrames;
          const scale = d.sx + (d.ex - d.sx) * progress;
          const px = d.px * progress * 2;
          const py = d.py * progress * 2;

          return (
            <div key={i} style={getPanelStyle(i)}>
              <Img
                src={resolve(src)}
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  transform: `scale(${scale}) translate(${px}%, ${py}%)`,
                }}
              />
              {/* Gradient overlay for readability */}
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  background:
                    "linear-gradient(to bottom, transparent 50%, rgba(0,0,0,0.6) 100%)",
                }}
              />
              {/* Label */}
              {labels[i] && (
                <div
                  style={{
                    position: "absolute",
                    bottom: 12,
                    left: 12,
                    right: 12,
                    fontSize: 18,
                    fontWeight: 700,
                    color: colors.text,
                    fontFamily: "'Comfortaa', sans-serif",
                    textShadow: "0 2px 8px rgba(0,0,0,0.8)",
                  }}
                >
                  {labels[i]}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Glass dividers */}
      {layout === "horizontal" &&
        Array.from({ length: count - 1 }, (_, i) => (
          <div
            key={`div-h-${i}`}
            style={{
              position: "absolute",
              left: `${((i + 1) / count) * 100}%`,
              top: 0,
              width: 3,
              height: `${dividerProgress * 100}%`,
              background: `linear-gradient(to bottom, ${accentColor}, ${accentColor}40)`,
              boxShadow: `0 0 12px ${accentColor}60`,
              zIndex: 10,
            }}
          />
        ))}
      {layout === "vertical" &&
        Array.from({ length: count - 1 }, (_, i) => (
          <div
            key={`div-v-${i}`}
            style={{
              position: "absolute",
              top: `${((i + 1) / count) * 100}%`,
              left: 0,
              height: 3,
              width: `${dividerProgress * 100}%`,
              background: `linear-gradient(to right, ${accentColor}, ${accentColor}40)`,
              boxShadow: `0 0 12px ${accentColor}60`,
              zIndex: 10,
            }}
          />
        ))}
    </AbsoluteFill>
  );
};
