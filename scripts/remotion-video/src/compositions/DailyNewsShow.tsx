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
import { HeadlinesRoundupScene, type RoundupHeadline } from "../components/HeadlinesRoundupScene";
import { SceneTransition } from "../components/SceneTransition";
import { AnimatedLogo } from "../components/AnimatedLogo";
import { ProgressBar } from "../components/ProgressBar";
import { type SubtitleEntry } from "../components/AnimatedSubtitles";
import { colors } from "../design-system";
import type { TransitionType } from "../design-system/transitions";

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
  /** Mood for animation pacing */
  mood?: string;
  /** Transition type into this segment */
  transition?: string;
  /** Text reveal style for headline */
  textReveal?: string;
  /** Stats display type */
  statsVisualType?: 'list' | 'counters' | 'bars';
  /** Color grading for content scene */
  colorGrade?: {
    brightness?: number;
    contrast?: number;
    saturate?: number;
    hueRotate?: number;
  };
  /** Focus area for Ken Burns */
  focusArea?: { x: number; y: number; scale: number };
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
  /** Intro voiceover audio file */
  introVoiceoverSrc?: string;
  /** Outro voiceover audio file */
  outroVoiceoverSrc?: string;
  /** Headlines for cold-open roundup scene (all articles) */
  roundupHeadlines?: RoundupHeadline[];
  /** Roundup voiceover audio file */
  roundupVoiceoverSrc?: string;
  /** Roundup scene duration in seconds */
  roundupDurationSeconds?: number;
  /** Number of overflow articles (beyond max 10 detailed) */
  overflowCount?: number;
  /** Overflow CTA voiceover audio file */
  overflowVoiceoverSrc?: string;
  /** Overflow CTA duration in seconds */
  overflowDurationSeconds?: number;
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
  dividerDurationSeconds = 3.5,
  accentColor = colors.brand,
  introVoiceoverSrc,
  outroVoiceoverSrc,
  roundupHeadlines,
  roundupVoiceoverSrc,
  roundupDurationSeconds = 0,
  overflowCount = 0,
  overflowVoiceoverSrc,
  overflowDurationSeconds = 0,
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

  // Separate list for segment-level audio (spans Headline + Content + Stats)
  const audioSequences: {
    src: string;
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

  // Intro voiceover (covers full intro sequence)
  if (introVoiceoverSrc) {
    audioSequences.push({
      src: introVoiceoverSrc,
      startFrame: currentFrame,
      durationFrames: introFrames,
    });
  }

  currentFrame += introFrames;

  // ── Headlines Roundup (cold open) ──
  if (roundupHeadlines && roundupHeadlines.length > 0 && roundupDurationSeconds > 0) {
    const roundupFrames = Math.ceil(roundupDurationSeconds * fps);
    sequences.push({
      component: (
        <HeadlinesRoundupScene
          headlines={roundupHeadlines}
          accentColor={accentColor}
        />
      ),
      startFrame: currentFrame,
      durationFrames: roundupFrames,
    });

    if (roundupVoiceoverSrc) {
      audioSequences.push({
        src: roundupVoiceoverSrc,
        startFrame: currentFrame,
        durationFrames: roundupFrames,
      });
    }

    currentFrame += roundupFrames;
  }

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

    // Remember segment start for audio sequence
    const segmentStartFrame = currentFrame;

    if (segment.facts && segment.facts.length > 0) {
      // With stats: headline 25% → content 50% → stats 25%
      const headlineFrames = Math.ceil(segFrames * 0.25);
      const contentFrames = Math.ceil(segFrames * 0.5);
      const statsFrames = segFrames - headlineFrames - contentFrames;

      sequences.push({
        component: (
          <SceneTransition type={(segment.transition as TransitionType) || "fade"}>
            <HeadlineScene
              text={segment.headline}
              imageSrc={segment.imageSrc}
              accentColor={segColor}
              mood={segment.mood}
              textReveal={segment.textReveal as any}
            />
          </SceneTransition>
        ),
        startFrame: currentFrame,
        durationFrames: headlineFrames,
      });
      currentFrame += headlineFrames;

      sequences.push({
        component: (
          <ContentScene
            imageSrc={segment.imageSrc}
            keyQuote={segment.keyQuote}
            accentColor={segColor}
            subtitles={segment.subtitles || []}
            headline={segment.headline}
            category={segment.category}
            segmentNumber={i + 1}
            totalSegments={segments.length}
            mood={segment.mood}
            colorGrade={segment.colorGrade}
            focusArea={segment.focusArea}
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
            visualType={segment.statsVisualType}
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
          <SceneTransition type={(segment.transition as TransitionType) || "fade"}>
            <HeadlineScene
              text={segment.headline}
              imageSrc={segment.imageSrc}
              accentColor={segColor}
              mood={segment.mood}
              textReveal={segment.textReveal as any}
            />
          </SceneTransition>
        ),
        startFrame: currentFrame,
        durationFrames: headlineFrames,
      });
      currentFrame += headlineFrames;

      sequences.push({
        component: (
          <ContentScene
            imageSrc={segment.imageSrc}
            keyQuote={segment.keyQuote}
            accentColor={segColor}
            subtitles={segment.subtitles || []}
            headline={segment.headline}
            category={segment.category}
            segmentNumber={i + 1}
            totalSegments={segments.length}
            mood={segment.mood}
            colorGrade={segment.colorGrade}
            focusArea={segment.focusArea}
          />
        ),
        startFrame: currentFrame,
        durationFrames: contentFrames,
      });
      currentFrame += contentFrames;
    }

    // Segment-level audio: spans from Headline start to end of last scene (Content or Stats)
    if (segment.voiceoverSrc) {
      audioSequences.push({
        src: segment.voiceoverSrc,
        startFrame: segmentStartFrame,
        durationFrames: currentFrame - segmentStartFrame,
      });
    }
  });

  // ── Overflow CTA (if >10 articles) ──
  if (overflowCount > 0 && overflowDurationSeconds > 0) {
    const overflowFrames = Math.ceil(overflowDurationSeconds * fps);
    sequences.push({
      component: (
        <OutroScene
          message={
            language === "no"
              ? `${overflowCount} nyheter til på`
              : `${overflowCount} more stories on`
          }
          accentColor={accentColor}
        />
      ),
      startFrame: currentFrame,
      durationFrames: overflowFrames,
    });

    if (overflowVoiceoverSrc) {
      audioSequences.push({
        src: overflowVoiceoverSrc,
        startFrame: currentFrame,
        durationFrames: overflowFrames,
      });
    }

    currentFrame += overflowFrames;
  }

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

  // Outro voiceover (covers full outro sequence)
  if (outroVoiceoverSrc) {
    audioSequences.push({
      src: outroVoiceoverSrc,
      startFrame: currentFrame,
      durationFrames: outroFrames,
    });
  }

  return (
    <AbsoluteFill style={{ backgroundColor: colors.background }}>
      {/* Render all visual sequences */}
      {sequences.map((seq, i) => (
        <Sequence key={i} from={seq.startFrame} durationInFrames={seq.durationFrames}>
          {seq.component}
        </Sequence>
      ))}

      {/* Segment-level audio sequences (span full segment: Headline + Content + Stats) */}
      {audioSequences.map((audio, i) => (
        <Sequence key={`audio-${i}`} from={audio.startFrame} durationInFrames={audio.durationFrames}>
          <Audio src={resolve(audio.src)} volume={1} />
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
