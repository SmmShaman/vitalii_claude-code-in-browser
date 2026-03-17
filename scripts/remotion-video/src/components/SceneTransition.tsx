/**
 * SceneTransition — wraps a scene with entry/exit transition effects.
 *
 * Supports: fade, wipeLeft, wipeRight, slideUp, slideDown, zoomIn, zoomOut,
 * filmBurn (gradient sweep overlay), glitchWipe (brief RGB split during transition).
 * Uses clip-path and transform for GPU-accelerated transitions.
 */
import React from "react";
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
} from "remotion";
import type { TransitionType } from "../design-system/transitions";
import { getTransitionConfig } from "../design-system/transitions";
import { clampBoth } from "../design-system";

export interface SceneTransitionProps {
  type?: TransitionType;
  children: React.ReactNode;
}

export const SceneTransition: React.FC<SceneTransitionProps> = ({
  type = "fade",
  children,
}) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const config = getTransitionConfig(type);

  // Entry animation progress (0→1)
  const entryProgress = spring({
    frame,
    fps,
    config: config.spring,
  });

  // Exit fade (last frames)
  const exitFrames = Math.min(config.durationFrames, 10);
  const exitOpacity = interpolate(
    frame,
    [durationInFrames - exitFrames, durationInFrames],
    [1, 0],
    clampBoth,
  );

  // Calculate transition styles based on type
  const getTransitionStyle = (): React.CSSProperties => {
    switch (type) {
      case "wipeLeft":
        return {
          clipPath: `inset(0 ${(1 - entryProgress) * 100}% 0 0)`,
          opacity: exitOpacity,
        };
      case "wipeRight":
        return {
          clipPath: `inset(0 0 0 ${(1 - entryProgress) * 100}%)`,
          opacity: exitOpacity,
        };
      case "slideUp": {
        const translateY = interpolate(entryProgress, [0, 1], [100, 0]);
        return {
          transform: `translateY(${translateY}%)`,
          opacity: entryProgress * exitOpacity,
        };
      }
      case "slideDown": {
        const translateY = interpolate(entryProgress, [0, 1], [-100, 0]);
        return {
          transform: `translateY(${translateY}%)`,
          opacity: entryProgress * exitOpacity,
        };
      }
      case "zoomIn": {
        const scale = interpolate(entryProgress, [0, 1], [0.5, 1]);
        return {
          transform: `scale(${scale})`,
          opacity: entryProgress * exitOpacity,
        };
      }
      case "zoomOut": {
        const scale = interpolate(entryProgress, [0, 1], [1.5, 1]);
        return {
          transform: `scale(${scale})`,
          opacity: entryProgress * exitOpacity,
        };
      }
      case "filmBurn": {
        // Content fades in while a gradient overlay sweeps across
        const fadeIn = interpolate(
          frame,
          [0, config.durationFrames],
          [0, 1],
          clampBoth,
        );
        return {
          opacity: fadeIn * exitOpacity,
        };
      }
      case "glitchWipe": {
        // Content fades in quickly
        const fadeIn = interpolate(
          frame,
          [0, Math.ceil(config.durationFrames * 0.6)],
          [0, 1],
          clampBoth,
        );
        return {
          opacity: fadeIn * exitOpacity,
        };
      }
      case "fade":
      default: {
        const fadeIn = interpolate(
          frame,
          [0, config.durationFrames],
          [0, 1],
          clampBoth,
        );
        return {
          opacity: fadeIn * exitOpacity,
        };
      }
    }
  };

  // Film burn overlay: gradient sweep from left to right
  const renderFilmBurnOverlay = () => {
    if (type !== "filmBurn") return null;
    const sweepProgress = interpolate(
      frame,
      [0, config.durationFrames],
      [-100, 150],
      clampBoth,
    );
    const overlayOpacity = interpolate(
      frame,
      [0, config.durationFrames * 0.4, config.durationFrames],
      [0, 0.7, 0],
      clampBoth,
    );
    return (
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: `linear-gradient(90deg, transparent ${sweepProgress - 30}%, rgba(255, 180, 50, 0.6) ${sweepProgress}%, rgba(255, 100, 20, 0.4) ${sweepProgress + 15}%, transparent ${sweepProgress + 30}%)`,
          opacity: overlayOpacity,
          pointerEvents: "none",
          zIndex: 50,
        }}
      />
    );
  };

  // Glitch wipe overlay: brief RGB split effect during transition
  const renderGlitchWipeOverlay = () => {
    if (type !== "glitchWipe") return null;
    const glitchActive = frame < config.durationFrames;
    if (!glitchActive) return null;

    const glitchIntensity = interpolate(
      frame,
      [0, config.durationFrames * 0.3, config.durationFrames],
      [0, 1, 0],
      clampBoth,
    );
    const rgbOffset = glitchIntensity * 6;
    // Scanline position sweeps down the screen
    const scanY = interpolate(
      frame,
      [0, config.durationFrames],
      [0, 100],
      clampBoth,
    );
    return (
      <>
        {/* RGB split: red channel offset */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: `rgba(255, 0, 0, ${glitchIntensity * 0.15})`,
            transform: `translateX(${rgbOffset}px)`,
            mixBlendMode: "screen",
            pointerEvents: "none",
            zIndex: 50,
          }}
        />
        {/* RGB split: cyan channel offset */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: `rgba(0, 255, 255, ${glitchIntensity * 0.12})`,
            transform: `translateX(${-rgbOffset}px)`,
            mixBlendMode: "screen",
            pointerEvents: "none",
            zIndex: 50,
          }}
        />
        {/* Scanline */}
        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            top: `${scanY}%`,
            height: 3,
            background: `rgba(255, 255, 255, ${glitchIntensity * 0.4})`,
            boxShadow: `0 0 10px rgba(255, 255, 255, ${glitchIntensity * 0.3})`,
            pointerEvents: "none",
            zIndex: 51,
          }}
        />
      </>
    );
  };

  return (
    <AbsoluteFill style={getTransitionStyle()}>
      {children}
      {renderFilmBurnOverlay()}
      {renderGlitchWipeOverlay()}
    </AbsoluteFill>
  );
};
