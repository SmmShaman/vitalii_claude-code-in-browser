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
import { AnimatedText } from "remotion-bits";
import { DigitalGlitchRGB } from "@storybynumbers_/remotion-glitch-effect";

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
        ) : (() => {
          const headlineContent = (
            <AnimatedText
              transition={{
                split: "word",
                y: [30, 0],
                blur: [8, 0],
                opacity: [0, 1],
                splitStagger: 2,
                duration: 15,
                easing: "easeOutCubic",
              }}
              style={{
                fontSize: words.length > 8 ? typography.scale.h2 : typography.scale.h1,
                fontWeight: 800,
                color: colors.text,
                fontFamily: typography.fontFamily.primary,
                lineHeight: 1.2,
                textAlign: 'center' as const,
              }}
            >
              {text}
            </AnimatedText>
          );
          return mood === 'urgent' ? (
            <DigitalGlitchRGB
              splitAmount={4}
              blurAmount={0.8}
              burstSpacing={25}
              burstDuration={[2, 5]}
            >
              {headlineContent}
            </DigitalGlitchRGB>
          ) : headlineContent;
        })()}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
