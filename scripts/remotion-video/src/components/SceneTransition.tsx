/**
 * SceneTransition — wraps a scene with entry/exit transition effects.
 *
 * Supports: fade, wipeLeft, wipeRight, slideUp, slideDown, zoomIn, zoomOut.
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

  return (
    <AbsoluteFill style={getTransitionStyle()}>
      {children}
    </AbsoluteFill>
  );
};
