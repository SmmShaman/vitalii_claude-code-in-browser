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
import {
  colors,
  gradients,
  typography,
  accentLine,
  springs,
  fadeTiming,
  clampBoth,
} from "../design-system";

export interface OutroSceneProps {
  message?: string;
  url?: string;
  accentColor?: string;
}

export const OutroScene: React.FC<OutroSceneProps> = ({
  message = "Read more on",
  url = "vitalii.no",
  accentColor = colors.brand,
}) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  // Message fade in
  const msgScale = spring({
    frame,
    fps,
    config: springs.gentleScale,
  });
  const msgOpacity = interpolate(
    frame,
    [0, fadeTiming.titleRevealFrames],
    [0, 1],
    clampBoth,
  );

  // URL slides up with delay
  const urlDelay = 12;
  const urlY = interpolate(frame - urlDelay, [0, 15], [30, 0], clampBoth);
  const urlOpacity = interpolate(frame - urlDelay, [0, 15], [0, 1], clampBoth);

  // Line expands
  const lineWidth = interpolate(
    frame,
    [8, 25],
    [0, accentLine.width.long],
    clampBoth,
  );

  // Fade out at very end
  const fadeOut = interpolate(
    frame,
    [durationInFrames - fadeTiming.fadeOutFrames.short, durationInFrames],
    [1, 0],
    clampBoth,
  );

  return (
    <AbsoluteFill
      style={{
        background: gradients.sceneDark(accentColor),
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
          fontSize: typography.scale.body,
          fontWeight: 500,
          color: colors.textMuted,
          fontFamily: typography.fontFamily.primary,
        }}
      >
        {message}
      </div>

      {/* Accent line */}
      <div
        style={{
          width: lineWidth,
          height: accentLine.height,
          backgroundColor: accentColor,
          borderRadius: accentLine.borderRadius,
          margin: "20px 0",
        }}
      />

      {/* URL */}
      <div
        style={{
          transform: `translateY(${urlY}px)`,
          opacity: urlOpacity,
          fontSize: typography.scale.h1,
          fontWeight: 800,
          color: colors.text,
          fontFamily: typography.fontFamily.primary,
          letterSpacing: -1,
        }}
      >
        {url}
      </div>
    </AbsoluteFill>
  );
};
