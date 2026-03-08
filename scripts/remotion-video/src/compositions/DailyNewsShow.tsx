/**
 * DailyNewsShow Composition
 *
 * A multi-segment daily news compilation video.
 * Structure: ShowIntro → [Divider → Headline → Content] × N → Outro
 *
 * Each news story is a "segment" with its own visuals,
 * Each segment has its own voiceover audio and subtitles
 * for precise sync between narration and visuals.
 */
import React from "react";
import {
  AbsoluteFill,
  Audio,
  Sequence,
  useVideoConfig,
  staticFile,
} from "remotion";
import { ShowIntroScene } from "../components/ShowIntroScene";
import { SegmentDividerScene } from "../components/SegmentDividerScene";
import { HeadlineScene } from "../components/HeadlineScene";
import { ContentScene } from "../components/ContentScene";
import { StatsScene } from "../components/StatsScene";
import { OutroScene } from "../components/OutroScene";
import { AnimatedLogo } from "../components/AnimatedLogo";
import { ProgressBar } from "../components/ProgressBar";
import { type SubtitleEntry } from "../components/AnimatedSubtitles";
import { colors } from "../design-system";

// ── Segment Types ──

export interface NewsSegment {
  headline: string;
  imageSrc: string;
  keyQuote?: string;
  category?: string;
  accentColor?: string;
  durationSeconds: number;
  /** Per-segment voiceover audio file */
  voiceoverSrc?: string;
  /** Per-segment subtitles (local timestamps, starting from 0) */
  subtitles?: SubtitleEntry[];
  /** Optional stats for this segment */
  facts?: { value: string; label: string }[];
}

export interface DailyNewsShowProps {
  /** Show metadata */
  date: string;
  showTitle?: string;
  language?: string;
  /** News segments (one per article) */
  segments: NewsSegment[];
  /** Voiceover */
  voiceoverSrc: string;
  subtitles: SubtitleEntry[];
  /** Timing */
  totalDurationSeconds: number;
  /** Show intro duration */
  introDurationSeconds?: number;
  /** Outro duration */
  outroDurationSeconds?: number;
  /** Divider duration between segments */
  dividerDurationSeconds?: number;
  /** Global accent color */
  accentColor?: string;
}

export const DailyNewsShow: React.FC<DailyNewsShowProps> = ({
  date,
  showTitle,
  language = "no",
  segments,
  voiceoverSrc,
  subtitles,
  introDurationSeconds = 4,
  outroDurationSeconds = 4,
  dividerDurationSeconds = 2,
  accentColor = colors.brand,
}) => {
  const { fps, width, height } = useVideoConfig();
  const isVertical = height > width;

  const resolve = (src: string | undefined) =>
    src ? (src.startsWith("http") ? src : staticFile(src)) : "";

  // Build the timeline
  const sequences: {
    component: React.ReactNode;
    startFrame: number;
    durationFrames: number;
  }[] = [];

  let currentFrame = 0;

  // ── Show Intro ──
  const introFrames = Math.ceil(introDurationSeconds * fps);
  sequences.push({
    component: (
      <ShowIntroScene
        date={date}
        articleCount={segments.length}
        showTitle={showTitle}
        accentColor={accentColor}
        language={language}
      />
    ),
    startFrame: currentFrame,
    durationFrames: introFrames,
  });
  currentFrame += introFrames;

  // ── News Segments ──
  segments.forEach((segment, i) => {
    const segColor = segment.accentColor || accentColor;
    const dividerFrames = Math.ceil(dividerDurationSeconds * fps);

    // Segment divider
    sequences.push({
      component: (
        <SegmentDividerScene
          segmentNumber={i + 1}
          totalSegments={segments.length}
          category={segment.category}
          accentColor={segColor}
        />
      ),
      startFrame: currentFrame,
      durationFrames: dividerFrames,
    });
    currentFrame += dividerFrames;

    // Split segment time: 30% headline, 70% content (or 25/50/25 if stats)
    const segFrames = Math.ceil(segment.durationSeconds * fps);

    if (segment.facts && segment.facts.length > 0) {
      // With stats: headline 25% → content 50% → stats 25%
      const headlineFrames = Math.ceil(segFrames * 0.25);
      const contentFrames = Math.ceil(segFrames * 0.5);
      const statsFrames = segFrames - headlineFrames - contentFrames;

      sequences.push({
        component: (
          <HeadlineScene
            text={segment.headline}
            imageSrc={segment.imageSrc}
            accentColor={segColor}
          />
        ),
        startFrame: currentFrame,
        durationFrames: headlineFrames,
      });
      currentFrame += headlineFrames;

      sequences.push({
        component: (
          <ContentScene
            imageSrc={segment.imageSrc}
            voiceoverSrc={segment.voiceoverSrc}
            keyQuote={segment.keyQuote}
            accentColor={segColor}
            subtitles={segment.subtitles || []}
            headline={segment.headline}
            category={segment.category}
            segmentNumber={i + 1}
            totalSegments={segments.length}
          />
        ),
        startFrame: currentFrame,
        durationFrames: contentFrames,
      });
      currentFrame += contentFrames;

      sequences.push({
        component: (
          <StatsScene
            facts={segment.facts}
            accentColor={segColor}
          />
        ),
        startFrame: currentFrame,
        durationFrames: statsFrames,
      });
      currentFrame += statsFrames;
    } else {
      // Without stats: headline 30% → content 70%
      const headlineFrames = Math.ceil(segFrames * 0.3);
      const contentFrames = segFrames - headlineFrames;

      sequences.push({
        component: (
          <HeadlineScene
            text={segment.headline}
            imageSrc={segment.imageSrc}
            accentColor={segColor}
          />
        ),
        startFrame: currentFrame,
        durationFrames: headlineFrames,
      });
      currentFrame += headlineFrames;

      sequences.push({
        component: (
          <ContentScene
            imageSrc={segment.imageSrc}
            voiceoverSrc={segment.voiceoverSrc}
            keyQuote={segment.keyQuote}
            accentColor={segColor}
            subtitles={segment.subtitles || []}
            headline={segment.headline}
            category={segment.category}
            segmentNumber={i + 1}
            totalSegments={segments.length}
          />
        ),
        startFrame: currentFrame,
        durationFrames: contentFrames,
      });
      currentFrame += contentFrames;
    }
  });

  // ── Show Outro ──
  const outroFrames = Math.ceil(outroDurationSeconds * fps);
  sequences.push({
    component: (
      <OutroScene
        message={language === "no" ? "Les mer p\u00e5" : "Read more on"}
        accentColor={accentColor}
      />
    ),
    startFrame: currentFrame,
    durationFrames: outroFrames,
  });

  return (
    <AbsoluteFill style={{ backgroundColor: colors.background }}>
      {/* Render all sequences */}
      {sequences.map((seq, i) => (
        <Sequence key={i} from={seq.startFrame} durationInFrames={seq.durationFrames}>
          {seq.component}
        </Sequence>
      ))}

      {/* Global voiceover fallback (only when no per-segment audio) */}
      {voiceoverSrc && !segments.some((s) => s.voiceoverSrc) && (
        <Audio src={resolve(voiceoverSrc)} volume={1} />
      )}

      {/* Persistent broadcast graphics */}
      <ProgressBar accentColor={accentColor} />
      <AnimatedLogo accentColor={accentColor} />
    </AbsoluteFill>
  );
};
