/**
 * TypewriterText — character-by-character text reveal.
 *
 * Creates a typing effect where each character appears sequentially.
 * Optional blinking cursor at the end.
 */
import React from "react";
import {
  useCurrentFrame,
  useVideoConfig,
  interpolate,
} from "remotion";
import { colors, typography, clampBoth } from "../design-system";

export interface TypewriterTextProps {
  text: string;
  fontSize?: number;
  fontWeight?: number;
  color?: string;
  /** Delay before typing starts (frames) */
  startDelay?: number;
  /** Frames per character */
  charSpeed?: number;
  /** Show blinking cursor */
  showCursor?: boolean;
  textAlign?: "left" | "center" | "right";
}

export const TypewriterText: React.FC<TypewriterTextProps> = ({
  text,
  fontSize = typography.scale.h3,
  fontWeight = 700,
  color = colors.text,
  startDelay = 0,
  charSpeed = 2,
  showCursor = true,
  textAlign = "center",
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const elapsed = Math.max(0, frame - startDelay);
  const visibleChars = Math.min(Math.floor(elapsed / charSpeed), text.length);
  const displayText = text.slice(0, visibleChars);
  const isTyping = visibleChars < text.length;

  // Cursor blink (every 15 frames)
  const cursorVisible = showCursor && (isTyping || Math.floor(frame / 15) % 2 === 0);

  // Fade in the whole block
  const fadeIn = interpolate(frame, [startDelay, startDelay + 6], [0, 1], clampBoth);

  return (
    <div
      style={{
        opacity: fadeIn,
        fontSize,
        fontWeight,
        color,
        fontFamily: typography.fontFamily.primary,
        lineHeight: 1.3,
        textAlign,
        whiteSpace: "pre-wrap",
      }}
    >
      {displayText}
      {cursorVisible && (
        <span
          style={{
            display: "inline-block",
            width: fontSize * 0.05,
            height: fontSize * 0.8,
            backgroundColor: color,
            marginLeft: 2,
            verticalAlign: "middle",
          }}
        />
      )}
    </div>
  );
};
