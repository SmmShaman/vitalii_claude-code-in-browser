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
import {
  colors,
  typography,
  kenBurns,
  accentLine,
  springs,
  fadeTiming,
  clampBoth,
} from "../design-system";
import { getMoodConfig, getMoodSpring } from "../design-system/moods";
import { TypewriterText } from "./TypewriterText";
import { SplitTextReveal } from "./SplitTextReveal";

export interface HeadlineSceneProps {
  text: string;
  imageSrc?: string;
  accentColor?: string;
  mood?: string;
  textReveal?: 'default' | 'typewriter' | 'splitFade' | 'splitScale';
}

export const HeadlineScene: React.FC<HeadlineSceneProps> = ({
  text,
  imageSrc,
  accentColor = colors.brand,
  mood,
  textReveal = 'default',
}) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  const moodCfg = getMoodConfig(mood);

  const resolve = (src: string | undefined) =>
    src ? (src.startsWith("http") ? src : staticFile(src)) : "";
  const resolvedImage = resolve(imageSrc);

  const words = text.split(/\s+/);
  const framesPerWord = Math.max(moodCfg.wordStaggerFrames, Math.floor((durationInFrames * 0.6) / words.length));

  // Fade out
  const fadeOut = interpolate(
    frame,
    [durationInFrames - fadeTiming.fadeOutFrames.standard, durationInFrames],
    [1, 0],
    clampBoth,
  );

  // Background Ken Burns
  const bgScale = interpolate(
    frame,
    [0, durationInFrames],
    [kenBurns.backgroundScale.start, kenBurns.backgroundScale.end],
    { extrapolateRight: "clamp" },
  );

  // Accent line reveal
  const lineW = interpolate(
    frame,
    [0, fadeTiming.titleRevealFrames],
    [0, accentLine.width.medium],
    { extrapolateRight: "clamp" },
  );

  return (
    <AbsoluteFill style={{ backgroundColor: colors.background, opacity: fadeOut }}>
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
              filter: kenBurns.backgroundBlur,
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
          width: lineW,
          height: accentLine.height,
          backgroundColor: accentColor,
          borderRadius: accentLine.borderRadius,
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
        {textReveal === 'typewriter' ? (
          <TypewriterText
            text={text}
            fontSize={words.length > 8 ? typography.scale.h2 : typography.scale.h1}
            startDelay={10}
          />
        ) : textReveal === 'splitFade' ? (
          <SplitTextReveal
            text={text}
            effect="fadeUp"
            fontSize={words.length > 8 ? typography.scale.h2 : typography.scale.h1}
            startDelay={10}
          />
        ) : textReveal === 'splitScale' ? (
          <SplitTextReveal
            text={text}
            effect="scaleIn"
            fontSize={words.length > 8 ? typography.scale.h2 : typography.scale.h1}
            startDelay={10}
          />
        ) : (
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
                config: getMoodSpring(mood),
              });
              const opacity = interpolate(frame - wordStart, [0, 3], [0, 1], clampBoth);

              return (
                <span
                  key={i}
                  style={{
                    display: "inline-block",
                    transform: `scale(${scale})`,
                    opacity,
                    fontSize: words.length > 8 ? typography.scale.h2 : typography.scale.h1,
                    fontWeight: 800,
                    color: colors.text,
                    fontFamily: typography.fontFamily.primary,
                    lineHeight: 1.2,
                  }}
                >
                  {word}
                </span>
              );
            })}
          </div>
        )}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
