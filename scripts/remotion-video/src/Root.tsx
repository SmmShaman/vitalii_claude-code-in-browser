/**
 * Remotion Root — registers all available compositions.
 *
 * We register two templates:
 *  - NewsVideoVertical  (1080x1920, 9:16 — for TikTok / Reels / Shorts)
 *  - NewsVideoHorizontal (1920x1080, 16:9 — for YouTube / LinkedIn / Facebook)
 */
import React from "react";
import { Composition } from "remotion";
import { NewsVideo } from "./compositions/NewsVideo";

const DEFAULT_PROPS = {
  videoSrc: "",
  imageSrc: "",
  voiceoverSrc: "",
  subtitles: [] as { text: string; startTime: number; endTime: number }[],
  headline: "Breaking News",
  originalVideoDurationInSeconds: 30,
  muteOriginalAudio: false,
};

export const RemotionRoot: React.FC = () => {
  return (
    <>
      {/* Vertical format for TikTok / Reels / Shorts */}
      <Composition
        id="NewsVideoVertical"
        component={NewsVideo as React.FC}
        durationInFrames={30 * 30}
        fps={30}
        width={1080}
        height={1920}
        defaultProps={DEFAULT_PROPS}
        calculateMetadata={({ props }) => {
          const seconds = Math.max(
            (props as typeof DEFAULT_PROPS).originalVideoDurationInSeconds,
            10,
          );
          return { durationInFrames: Math.ceil(seconds * 30) };
        }}
      />

      {/* Horizontal format for YouTube / LinkedIn / Facebook */}
      <Composition
        id="NewsVideoHorizontal"
        component={NewsVideo as React.FC}
        durationInFrames={30 * 30}
        fps={30}
        width={1920}
        height={1080}
        defaultProps={DEFAULT_PROPS}
        calculateMetadata={({ props }) => {
          const seconds = Math.max(
            (props as typeof DEFAULT_PROPS).originalVideoDurationInSeconds,
            10,
          );
          return { durationInFrames: Math.ceil(seconds * 30) };
        }}
      />
    </>
  );
};
