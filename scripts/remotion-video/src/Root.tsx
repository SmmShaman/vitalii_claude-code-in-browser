/**
 * Remotion Root -- registers all available compositions.
 *
 * Templates:
 *  - NewsVideoVertical   (1080x1920, 9:16)  -- static image + voiceover
 *  - NewsVideoHorizontal (1920x1080, 16:9)  -- static image + voiceover
 *  - DirectedVertical    (1080x1920, 9:16)  -- multi-scene, Claude-directed
 *  - DirectedHorizontal  (1920x1080, 16:9)  -- multi-scene, Claude-directed
 */
import React from "react";
import { Composition, Still } from "remotion";
import { loadFont } from "@remotion/google-fonts/Comfortaa";
import { NewsVideo } from "./compositions/NewsVideo";
import { DirectedNewsVideo } from "./compositions/DirectedNewsVideo";
import { DailyNewsShow } from "./compositions/DailyNewsShow";
import { ThumbnailHorizontal } from "./compositions/ThumbnailHorizontal";

// Load Comfortaa globally — must happen at module level before any render
const { fontFamily } = loadFont();
// Re-export so components can reference if needed
export { fontFamily };

const LEGACY_PROPS = {
  videoSrc: "",
  imageSrc: "",
  voiceoverSrc: "",
  subtitles: [] as { text: string; startTime: number; endTime: number }[],
  headline: "Breaking News",
  originalVideoDurationInSeconds: 30,
  muteOriginalAudio: false,
};

const DIRECTED_PROPS = {
  scenes: [] as any[],
  voiceoverSrc: "",
  subtitles: [] as { text: string; startTime: number; endTime: number }[],
  totalDurationSeconds: 30,
};

const DAILY_SHOW_PROPS = {
  date: "",
  showTitle: "Daglig Nyhetsoppdatering",
  language: "no",
  segments: [] as any[],
  voiceoverSrc: "",
  subtitles: [] as { text: string; startTime: number; endTime: number }[],
  totalDurationSeconds: 120,
  introDurationSeconds: 4,
  outroDurationSeconds: 4,
  dividerDurationSeconds: 3.5,
  accentColor: "#FF7A00",
  roundupHeadlines: [] as { text: string; category: string }[],
  roundupVoiceoverSrc: "",
  roundupDurationSeconds: 0,
  overflowCount: 0,
  overflowVoiceoverSrc: "",
  overflowDurationSeconds: 0,
  bgmSrc: "",
  bgmVolume: 0.3,
  bgmDuckVolume: 0.1,
  transitionSfxSrc: "",
};

const THUMBNAIL_PROPS = {
  date: "",
  headlines: [] as { text: string; category: string }[],
  articleCount: 0,
  accentColor: "#FF7A00",
};

export const RemotionRoot: React.FC = () => {
  return (
    <>
      {/* ── Legacy: single-scene templates ── */}
      <Composition
        id="NewsVideoVertical"
        component={NewsVideo as React.FC}
        durationInFrames={30 * 30}
        fps={30}
        width={1080}
        height={1920}
        defaultProps={LEGACY_PROPS}
        calculateMetadata={({ props }) => {
          const seconds = Math.max(
            (props as typeof LEGACY_PROPS).originalVideoDurationInSeconds,
            10,
          );
          return { durationInFrames: Math.ceil(seconds * 30) };
        }}
      />
      <Composition
        id="NewsVideoHorizontal"
        component={NewsVideo as React.FC}
        durationInFrames={30 * 30}
        fps={30}
        width={1920}
        height={1080}
        defaultProps={LEGACY_PROPS}
        calculateMetadata={({ props }) => {
          const seconds = Math.max(
            (props as typeof LEGACY_PROPS).originalVideoDurationInSeconds,
            10,
          );
          return { durationInFrames: Math.ceil(seconds * 30) };
        }}
      />

      {/* ── Multi-scene: Claude-directed templates ── */}
      <Composition
        id="DirectedVertical"
        component={DirectedNewsVideo as React.FC}
        durationInFrames={30 * 30}
        fps={30}
        width={1080}
        height={1920}
        defaultProps={DIRECTED_PROPS}
        calculateMetadata={({ props }) => {
          const seconds = Math.max(
            (props as typeof DIRECTED_PROPS).totalDurationSeconds,
            10,
          );
          return { durationInFrames: Math.ceil(seconds * 30) };
        }}
      />
      <Composition
        id="DirectedHorizontal"
        component={DirectedNewsVideo as React.FC}
        durationInFrames={30 * 30}
        fps={30}
        width={1920}
        height={1080}
        defaultProps={DIRECTED_PROPS}
        calculateMetadata={({ props }) => {
          const seconds = Math.max(
            (props as typeof DIRECTED_PROPS).totalDurationSeconds,
            10,
          );
          return { durationInFrames: Math.ceil(seconds * 30) };
        }}
      />
      {/* ── Daily News Show ── */}
      <Composition
        id="DailyNewsShowVertical"
        component={DailyNewsShow as React.FC}
        durationInFrames={120 * 30}
        fps={30}
        width={1080}
        height={1920}
        defaultProps={DAILY_SHOW_PROPS}
        calculateMetadata={({ props }) => {
          const seconds = Math.max(
            (props as typeof DAILY_SHOW_PROPS).totalDurationSeconds,
            10,
          );
          return { durationInFrames: Math.ceil(seconds * 30) };
        }}
      />
      <Composition
        id="DailyNewsShowHorizontal"
        component={DailyNewsShow as React.FC}
        durationInFrames={120 * 30}
        fps={30}
        width={1920}
        height={1080}
        defaultProps={DAILY_SHOW_PROPS}
        calculateMetadata={({ props }) => {
          const seconds = Math.max(
            (props as typeof DAILY_SHOW_PROPS).totalDurationSeconds,
            10,
          );
          return { durationInFrames: Math.ceil(seconds * 30) };
        }}
      />
      {/* ── Thumbnail (Still) ── */}
      <Still
        id="ThumbnailHorizontal"
        component={ThumbnailHorizontal as React.FC}
        width={1280}
        height={720}
        defaultProps={THUMBNAIL_PROPS}
      />
    </>
  );
};
