/**
 * AlertPulse — urgency/breaking news screen-edge pulse + optional shake.
 * Vignette that pulses accent color with heartbeat rhythm.
 */
import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate } from "remotion";
import { clampBoth } from "../../design-system";

interface AlertPulseProps {
  accentColor?: string;
  intensity?: number;
  pulseSpeed?: number;
}

export const AlertPulse: React.FC<AlertPulseProps> = ({
  accentColor = "#e74c3c",
  intensity = 0.5,
  pulseSpeed = 1.5,
}) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  const t = frame / fps;
  const pulse = (Math.sin(t * pulseSpeed * Math.PI * 2) + 1) / 2;
  const vignetteOpacity = pulse * intensity * 0.4;

  // Fade in/out the whole effect
  const fadeIn = interpolate(frame, [0, 10], [0, 1], clampBoth);
  const fadeOut = interpolate(frame, [durationInFrames - 10, durationInFrames], [1, 0], clampBoth);
  const opacity = fadeIn * fadeOut;

  // Deterministic subtle shake
  const shakeX = Math.sin(frame * 0.7) * intensity * 2;
  const shakeY = Math.cos(frame * 0.9) * intensity * 1.5;

  // Border sweep lines
  const sweepProgress = interpolate(frame, [0, Math.round(fps * 0.5)], [0, 1], clampBoth);

  return (
    <AbsoluteFill style={{ opacity, transform: `translate(${shakeX}px, ${shakeY}px)` }}>
      {/* Pulsing vignette */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: `radial-gradient(ellipse at center, transparent 40%, ${accentColor}${Math.round(vignetteOpacity * 255).toString(16).padStart(2, "0")} 100%)`,
          pointerEvents: "none",
        }}
      />

      {/* Border sweep lines */}
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: accentColor, opacity: sweepProgress * 0.7, transform: `scaleX(${sweepProgress})`, transformOrigin: "left" }} />
      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 3, background: accentColor, opacity: sweepProgress * 0.7, transform: `scaleX(${sweepProgress})`, transformOrigin: "right" }} />
      <div style={{ position: "absolute", top: 0, left: 0, bottom: 0, width: 3, background: accentColor, opacity: sweepProgress * 0.5, transform: `scaleY(${sweepProgress})`, transformOrigin: "top" }} />
      <div style={{ position: "absolute", top: 0, right: 0, bottom: 0, width: 3, background: accentColor, opacity: sweepProgress * 0.5, transform: `scaleY(${sweepProgress})`, transformOrigin: "bottom" }} />
    </AbsoluteFill>
  );
};
