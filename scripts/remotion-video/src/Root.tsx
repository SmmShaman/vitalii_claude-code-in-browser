/**
 * Remotion Root — registers all available compositions.
 *
 * We register two templates:
 *  - NewsVideoVertical  (1080×1920, 9:16 — for TikTok / Reels / Shorts)
 *  - NewsVideoHorizontal (1920×1080, 16:9 — for YouTube / LinkedIn / Facebook)
 */
import React from "react";
import { Composition } from "remotion";
import { NewsVideo, type NewsVideoProps } from "./compositions/NewsVideo";

const DEFAULT_PROPS: NewsVideoProps = {
  videoSrc: "",
  voiceoverSrc: "",
  subtitles: [],
  headline: "Breaking News",
  originalVideoDurationInSeconds: 30,
};

export const RemotionRoot: React.FC = () => {
  return (
    <>
      {/* Vertical format for TikTok / Reels / Shorts */}
      <Composition
        id="NewsVideoVertical"
        component={NewsVideo}
        durationInFrames={30 * 30} // placeholder, will be calculated from props
        fps={30}
        width={1080}
        height={1920}
        defaultProps={DEFAULT_PROPS}
        calculateMetadata={({ props }) => {
          // Duration = voiceover length + 1 second buffer, minimum 10s
          const seconds = Math.max(props.originalVideoDurationInSeconds, 10);
          return {
            durationInFrames: Math.ceil(seconds * 30),
          };
        }}
      />

      {/* Horizontal format for YouTube / LinkedIn / Facebook */}
      <Composition
        id="NewsVideoHorizontal"
        component={NewsVideo}
        durationInFrames={30 * 30}
        fps={30}
        width={1920}
        height={1080}
        defaultProps={DEFAULT_PROPS}
        calculateMetadata={({ props }) => {
          const seconds = Math.max(props.originalVideoDurationInSeconds, 10);
          return {
            durationInFrames: Math.ceil(seconds * 30),
          };
        }}
      />
    </>
  );
};
