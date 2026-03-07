/**
 * OutroScene - Call-to-action and branding.
 *
 * Shows a closing message with the site URL and a subtle animation.
 */
import React from "react";
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
} from "remotion";
import { defaultTheme } from "../design-system";

export interface OutroSceneProps {
  message?: string;
  url?: string;
  accentColor?: string;
}

export const OutroScene: React.FC<OutroSceneProps> = ({
  message = "Read more on",
  url = "vitalii.no",
  accentColor = "#667eea",
}) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  // Message fade in
  const msgScale = spring({
    frame,
    fps,
    config: { damping: 10, stiffness: 80 },
  });
  const msgOpacity = interpolate(frame, [0, 15], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // URL slides up with delay
  const urlDelay = 12;
  const urlY = interpolate(frame - urlDelay, [0, 15], [30, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const urlOpacity = interpolate(frame - urlDelay, [0, 15], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Line expands
  const lineWidth = interpolate(frame, [8, 25], [0, 80], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Fade out at very end
  const fadeOut = interpolate(frame, [durationInFrames - 6, durationInFrames], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill
      style={{
        background: `linear-gradient(135deg, #0a0a0a 0%, ${accentColor}18 100%)`,
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        opacity: fadeOut,
      }}
    >
      {/* Message */}
      <div
        style={{
          transform: `scale(${msgScale})`,
          opacity: msgOpacity,
          fontSize: 28,
          fontWeight: 500,
          color: "rgba(255,255,255,0.7)",
          fontFamily: defaultTheme.typography.fontFamily.fallback,
        }}
      >
        {message}
      </div>

      {/* Accent line */}
      <div
        style={{
          width: lineWidth,
          height: 3,
          backgroundColor: accentColor,
          borderRadius: 2,
          margin: "20px 0",
        }}
      />

      {/* URL */}
      <div
        style={{
          transform: `translateY(${urlY}px)`,
          opacity: urlOpacity,
          fontSize: 52,
          fontWeight: 800,
          color: defaultTheme.colors.text,
          fontFamily: defaultTheme.typography.fontFamily.fallback,
          letterSpacing: -1,
        }}
      >
        {url}
      </div>
    </AbsoluteFill>
  );
};
