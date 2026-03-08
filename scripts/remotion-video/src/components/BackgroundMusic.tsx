/**
 * BackgroundMusic — Looping BGM with voiceover ducking.
 *
 * Volume ducks smoothly when any voiceover is active,
 * with configurable ramp time for natural transitions.
 */
import React from "react";
import { Audio, useVideoConfig, interpolate } from "remotion";
import { audio as audioTokens } from "../design-system";

export interface VoiceoverRange {
  startFrame: number;
  endFrame: number;
}

export interface BackgroundMusicProps {
  src: string;
  voiceoverRanges: VoiceoverRange[];
  baseVolume?: number;
  duckVolume?: number;
}

export const BackgroundMusic: React.FC<BackgroundMusicProps> = ({
  src,
  voiceoverRanges,
  baseVolume = audioTokens.bgm.baseVolume,
  duckVolume = audioTokens.bgm.duckVolume,
}) => {
  const { durationInFrames } = useVideoConfig();
  const ramp = audioTokens.bgm.rampFrames;
  const fadeIn = audioTokens.bgm.fadeInFrames;
  const fadeOut = audioTokens.bgm.fadeOutFrames;
  const clamp = { extrapolateLeft: "clamp" as const, extrapolateRight: "clamp" as const };

  const volumeCallback = (frame: number): number => {
    // Global fade in/out
    const globalIn = interpolate(frame, [0, fadeIn], [0, 1], clamp);
    const globalOut = interpolate(
      frame,
      [durationInFrames - fadeOut, durationInFrames],
      [1, 0],
      clamp,
    );

    // Duck factor: 0 = no duck, 1 = full duck
    let duckFactor = 0;
    for (const range of voiceoverRanges) {
      let contribution = 0;
      if (frame < range.startFrame - ramp) {
        contribution = 0;
      } else if (frame < range.startFrame) {
        contribution = interpolate(
          frame,
          [range.startFrame - ramp, range.startFrame],
          [0, 1],
          clamp,
        );
      } else if (frame <= range.endFrame) {
        contribution = 1;
      } else if (frame <= range.endFrame + ramp) {
        contribution = interpolate(
          frame,
          [range.endFrame, range.endFrame + ramp],
          [1, 0],
          clamp,
        );
      }
      duckFactor = Math.max(duckFactor, contribution);
    }

    const targetVolume = baseVolume - duckFactor * (baseVolume - duckVolume);
    return targetVolume * globalIn * globalOut;
  };

  return <Audio src={src} volume={volumeCallback} loop />;
};
