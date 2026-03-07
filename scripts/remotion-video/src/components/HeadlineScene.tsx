/**
 * HeadlineScene - Kinetic typography headline.
 *
 * Words appear one by one with spring animation,
 * creating a dynamic "punch" effect.
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
import { defaultTheme } from "../design-system";

export interface HeadlineSceneProps {
  text: string;
  imageSrc?: string;
  accentColor?: string;
}

export const HeadlineScene: React.FC<HeadlineSceneProps> = ({
  text,
  imageSrc,
  accentColor = "#667eea",
}) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  const resolve = (src: string | undefined) =>
    src ? (src.startsWith("http") ? src : staticFile(src)) : "";
  const resolvedImage = resolve(imageSrc);

  const words = text.split(/\s+/);
  const framesPerWord = Math.max(3, Math.floor((durationInFrames * 0.6) / words.length));

  // Fade out
  const fadeOut = interpolate(frame, [durationInFrames - 8, durationInFrames], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Background Ken Burns
  const bgScale = interpolate(frame, [0, durationInFrames], [1.1, 1.2], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ backgroundColor: "#0a0a0a", opacity: fadeOut }}>
      {/* Background image (dimmed) */}
      {resolvedImage && (
        <AbsoluteFill>
          <Img
            src={resolvedImage}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              transform: `scale(${bgScale})`,
              filter: "blur(20px) brightness(0.3)",
            }}
          />
        </AbsoluteFill>
      )}

      {/* Accent line */}
      <div
        style={{
          position: "absolute",
          top: "15%",
          left: "8%",
          width: interpolate(frame, [0, 15], [0, 60], { extrapolateRight: "clamp" }),
          height: 4,
          backgroundColor: accentColor,
          borderRadius: 2,
        }}
      />

      {/* Words container */}
      <AbsoluteFill
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          padding: "10% 8%",
        }}
      >
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            justifyContent: "center",
            gap: "8px 12px",
            maxWidth: "90%",
          }}
        >
          {words.map((word, i) => {
            const wordStart = i * framesPerWord;
            const scale = spring({
              frame: frame - wordStart,
              fps,
              config: { damping: 12, stiffness: 150, mass: 0.5 },
            });
            const opacity = interpolate(frame - wordStart, [0, 3], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            });

            return (
              <span
                key={i}
                style={{
                  display: "inline-block",
                  transform: `scale(${scale})`,
                  opacity,
                  fontSize: words.length > 8 ? 48 : 56,
                  fontWeight: 800,
                  color: defaultTheme.colors.text,
                  fontFamily: defaultTheme.typography.fontFamily.fallback,
                  lineHeight: 1.2,
                }}
              >
                {word}
              </span>
            );
          })}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
