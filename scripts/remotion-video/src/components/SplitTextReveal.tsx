/**
 * SplitTextReveal — words animate in separately with configurable effects.
 *
 * Split modes: word (each word), line (each line).
 * Effects: fadeUp (slide from bottom), scaleIn (grow), fadeIn (simple opacity).
 */
import React from "react";
import {
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
} from "remotion";
import { colors, typography, clampBoth } from "../design-system";

export type SplitEffect = "fadeUp" | "scaleIn" | "fadeIn";

export interface SplitTextRevealProps {
  text: string;
  fontSize?: number;
  fontWeight?: number;
  color?: string;
  effect?: SplitEffect;
  /** Frames between each unit reveal */
  staggerFrames?: number;
  /** Delay before animation starts */
  startDelay?: number;
  textAlign?: "left" | "center" | "right";
}

export const SplitTextReveal: React.FC<SplitTextRevealProps> = ({
  text,
  fontSize = typography.scale.h3,
  fontWeight = 700,
  color = colors.text,
  effect = "fadeUp",
  staggerFrames = 4,
  startDelay = 0,
  textAlign = "center",
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const words = text.split(/\s+/);

  return (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        justifyContent: textAlign === "center" ? "center" : textAlign === "right" ? "flex-end" : "flex-start",
        gap: "6px 10px",
        maxWidth: "90%",
      }}
    >
      {words.map((word, i) => {
        const unitDelay = startDelay + i * staggerFrames;
        const elapsed = frame - unitDelay;

        let unitOpacity = interpolate(elapsed, [0, 8], [0, 1], clampBoth);
        let transform = "";

        if (effect === "fadeUp") {
          const y = interpolate(elapsed, [0, 10], [30, 0], clampBoth);
          transform = `translateY(${y}px)`;
        } else if (effect === "scaleIn") {
          const s = spring({ frame: Math.max(0, elapsed), fps, config: { damping: 12, stiffness: 150, mass: 0.5 } });
          transform = `scale(${s})`;
          unitOpacity = s;
        }

        return (
          <span
            key={i}
            style={{
              display: "inline-block",
              opacity: unitOpacity,
              transform,
              fontSize,
              fontWeight,
              color,
              fontFamily: typography.fontFamily.primary,
              lineHeight: 1.3,
            }}
          >
            {word}
          </span>
        );
      })}
    </div>
  );
};
