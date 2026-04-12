/**
 * VisualBlockScene — phrase-level visual composition.
 *
 * Drop-in replacement for ContentScene when visualBlocks[] is provided.
 * Each block (2-4s) gets its own text effect, graphic overlay,
 * and background treatment — creating a "visual event stream"
 * instead of a single static image with Ken Burns.
 *
 * Layer stack (bottom → top):
 *   1. Background: image cycling (driven by triggerImageChange) or video
 *   2. Gradient overlay for text readability
 *   3. Per-block: phrase text + motion graphics (Sequence per block)
 *   4. Persistent: subtitles, category badge, lower third, particles
 */
import React from "react";
import {
  AbsoluteFill,
  Img,
  OffthreadVideo,
  Sequence,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
  staticFile,
} from "remotion";
import { AnimatedSubtitles, type SubtitleEntry } from "./AnimatedSubtitles";
import { AnimatedCounter } from "./AnimatedCounter";
import { TypewriterText } from "./TypewriterText";
import { SplitTextReveal } from "./SplitTextReveal";
import { LowerThird } from "./LowerThird";
import { CategoryBadge } from "./CategoryBadge";
import {
  colors,
  gradients,
  typography,
  kenBurns,
  glass,
  fadeTiming,
  clampBoth,
} from "../design-system";
import { getMoodConfig } from "../design-system/moods";
import { Particles, Spawner, Behavior } from "remotion-bits";
import type { VisualBlock } from "../compositions/DailyNewsShow";
import { resolveSceneEffect, SceneEffectRenderer } from "./effects";

// ── Props ──

export interface VisualBlockSceneProps {
  imageSrc: string;
  videoSrc?: string;
  subtitles?: SubtitleEntry[];
  accentColor?: string;
  headline?: string;
  category?: string;
  segmentNumber?: number;
  totalSegments?: number;
  mood?: string;
  alternateImages?: string[];
  visualBlocks: VisualBlock[];
}

// ── Pan direction lookup (per-image variety) ──

const PAN_DIRS = [
  { px: -1, py: -1 },
  { px: 1, py: -0.5 },
  { px: -0.5, py: 1 },
  { px: 1, py: 1 },
  { px: 0, py: -1 },
  { px: -1, py: 0 },
];

// ══════════════════════════════════════════════════════════════════
//  Main component
// ══════════════════════════════════════════════════════════════════

export const VisualBlockScene: React.FC<VisualBlockSceneProps> = ({
  imageSrc,
  videoSrc,
  subtitles = [],
  accentColor = colors.brand,
  headline,
  category,
  segmentNumber,
  totalSegments,
  mood,
  alternateImages,
  visualBlocks,
}) => {
  const frame = useCurrentFrame();
  const { fps, width, height, durationInFrames } = useVideoConfig();
  const isVertical = height > width;
  const moodCfg = getMoodConfig(mood);

  const resolve = (src: string | undefined) =>
    src ? (src.startsWith("http") ? src : staticFile(src)) : "";

  const resolvedVideo = resolve(videoSrc);
  const hasVideo = !!resolvedVideo;

  // ── Image list ──
  const allImages = !hasVideo
    ? [imageSrc, ...(alternateImages || [])].map(resolve).filter(Boolean)
    : [];
  const hasImages = allImages.length > 0;

  // ── Per-phrase images: each block can have its own contextual photo ──
  // Priority: block.phraseImageSrc > cycling from allImages
  const phraseImages: (string | null)[] = visualBlocks.map(b =>
    b.phraseImageSrc ? resolve(b.phraseImageSrc) : null,
  );

  // ── Fallback image index driven by block boundaries ──
  const imageIndexPerBlock: number[] = [];
  let imgIdx = 0;
  for (let i = 0; i < visualBlocks.length; i++) {
    if (i > 0 && visualBlocks[i].triggerImageChange && allImages.length > 1) {
      imgIdx = (imgIdx + 1) % allImages.length;
    }
    imageIndexPerBlock.push(imgIdx);
  }

  // Find active block for current frame
  const currentTime = frame / fps;
  let activeIdx = 0;
  for (let i = 0; i < visualBlocks.length; i++) {
    if (currentTime >= visualBlocks[i].startTime) activeIdx = i;
  }

  // Active image: per-phrase photo if available, else cycling
  const activePhraseImage = phraseImages[activeIdx];
  const curImgIdx = imageIndexPerBlock[activeIdx] ?? 0;

  // When a scene effect is active, dim the background image so effects are visible
  const activeBlockHasEffect = resolveSceneEffect(visualBlocks[activeIdx] || {} as VisualBlock) !== null;
  const bgDimFactor = activeBlockHasEffect ? 0.3 : 1.0; // 30% opacity when effect active

  // Crossfade near block boundary when image changes
  const nextIdx = Math.min(activeIdx + 1, visualBlocks.length - 1);
  const nextImgIdx = imageIndexPerBlock[nextIdx] ?? curImgIdx;
  const XFADE = 12;
  const blockEnd = visualBlocks[activeIdx]?.endTime ?? 0;
  const framesLeft = (blockEnd - currentTime) * fps;
  const isXfading =
    framesLeft > 0 && framesLeft < XFADE && nextImgIdx !== curImgIdx;
  // interpolate requires monotonically increasing inputRange: [0, XFADE]
  // framesElapsedInCrossfade goes from 0 (start) to XFADE (end)
  const framesElapsedInXfade = XFADE - framesLeft;
  const xfadeProgress = isXfading
    ? interpolate(framesElapsedInXfade, [0, XFADE], [0, 1], clampBoth)
    : 0;

  // ── Background effect (from active block) ──
  const bgEffect = visualBlocks[activeIdx]?.backgroundEffect ?? "kenBurns";
  const progress = interpolate(frame, [0, durationInFrames], [0, 1], clampBoth);

  const bgTransform = (effect: string, idx: number): string => {
    const dir = PAN_DIRS[idx % PAN_DIRS.length];
    const moodCfg = mood ? getMoodConfig(mood) : null;

    switch (effect) {
      case "zoomPulse": {
        const phase = Math.sin(progress * Math.PI);
        return `scale(${1 + phase * 0.2})`;
      }
      case "slowPan": {
        const px = dir.px * progress * 4;
        return `scale(1.05) translate(${px}%, 0%)`;
      }
      case "colorShift":
        return `scale(${1 + progress * 0.1})`;
      case "kenBurns":
      default: {
        const scaleEnd = moodCfg?.kenBurnsScale ?? kenBurns.scaleRange.end;
        const s = interpolate(progress, [0, 1], [1, scaleEnd], clampBoth);
        const px = dir.px * interpolate(progress, [0, 1], [0, 1.2], clampBoth);
        const py = dir.py * interpolate(progress, [0, 1], [0, 0.7], clampBoth);
        return `scale(${s}) translate(${px}%, ${py}%)`;
      }
    }
  };

  const bgFilter = (effect: string): string | undefined => {
    if (effect === "colorShift") {
      const hue = interpolate(progress, [0, 1], [0, 30], clampBoth);
      return `hue-rotate(${hue}deg) saturate(1.2)`;
    }
    return undefined;
  };

  // ── Fade transitions ──
  const fadeIn = interpolate(
    frame,
    [0, fadeTiming.fadeInFrames],
    [0, 1],
    clampBoth,
  );
  const fadeOut = interpolate(
    frame,
    [durationInFrames - fadeTiming.fadeOutFrames.standard, durationInFrames],
    [1, 0],
    clampBoth,
  );

  return (
    <AbsoluteFill style={{ opacity: fadeIn * fadeOut }}>
      {/* ─── Layer 1: Background ─── */}
      {hasVideo ? (
        <OffthreadVideo
          src={resolvedVideo}
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
          volume={0}
        />
      ) : (activePhraseImage || hasImages) ? (
        <>
          <Img
            key={`vb-bg-${activePhraseImage || curImgIdx}`}
            src={activePhraseImage || allImages[curImgIdx]}
            style={{
              position: "absolute",
              width: "100%",
              height: "100%",
              objectFit: "cover",
              transform: bgTransform(bgEffect, curImgIdx),
              filter: [bgFilter(bgEffect), activeBlockHasEffect ? `brightness(${bgDimFactor})` : ''].filter(Boolean).join(' ') || undefined,
              opacity: isXfading ? 1 - xfadeProgress : 1,
            }}
          />
          {isXfading && (
            <Img
              key={`vb-bg-next-${nextImgIdx}`}
              src={allImages[nextImgIdx]}
              style={{
                position: "absolute",
                width: "100%",
                height: "100%",
                objectFit: "cover",
                transform: bgTransform(bgEffect, nextImgIdx),
                filter: bgFilter(bgEffect),
                opacity: xfadeProgress,
              }}
            />
          )}
        </>
      ) : (
        <div
          style={{
            width: "100%",
            height: "100%",
            background: `linear-gradient(135deg, ${accentColor}88 0%, ${colors.background} 60%, ${accentColor}44 100%)`,
          }}
        />
      )}

      {/* ─── Layer 1.5: Gradient overlay (mood-driven darkness) ─── */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: `linear-gradient(to bottom, rgba(0,0,0,${moodCfg.overlayDarkness * 0.4}) 0%, rgba(0,0,0,${moodCfg.overlayDarkness * 0.1}) 30%, rgba(0,0,0,${moodCfg.overlayDarkness * 0.2}) 70%, rgba(0,0,0,${moodCfg.overlayDarkness * 0.9}) 100%)`,
        }}
      />

      {/* ─── Layer 2: Per-block text + graphics + key phrase callouts ─── */}
      {visualBlocks.map((block, bi) => {
        const startF = Math.round(block.startTime * fps);
        const durF = Math.max(1, Math.round(block.duration * fps));
        return (
          <Sequence key={bi} from={startF} durationInFrames={durF}>
            <BlockContent
              block={block}
              accentColor={accentColor}
              isVertical={isVertical}
              moodTempo={moodCfg.tempo}
              images={allImages}
              blockIndex={bi}
              allBlocks={visualBlocks}
            />
          </Sequence>
        );
      })}

      {/* Subtitles removed — key data shown via KeyPhraseCallout in BlockContent.
          Full subtitles remain in ContentScene fallback path. */}

      {/* ─── Layer 4: CategoryBadge — only first 2 seconds ─── */}
      {category && (
        <div style={{
          opacity: interpolate(frame, [0, 5, Math.round(fps * 2), Math.round(fps * 2.5)], [0, 1, 1, 0], clampBoth),
        }}>
          <CategoryBadge category={category} accentColor={accentColor} />
        </div>
      )}

      {/* ─── Layer 4: LowerThird — only first 3 seconds, then hide ─── */}
      {headline && segmentNumber != null && totalSegments != null && (
        <div style={{
          opacity: interpolate(frame, [0, 8, Math.round(fps * 3), Math.round(fps * 3.5)], [0, 1, 1, 0], clampBoth),
        }}>
          <LowerThird
            headline={headline}
            category={category}
            segmentNumber={segmentNumber}
            totalSegments={totalSegments}
            accentColor={accentColor}
          />
        </div>
      )}

      {/* Ambient particles (mood-driven density: urgent → more, analytical → fewer) */}
      <AbsoluteFill
        style={{
          pointerEvents: "none",
          opacity: moodCfg.tempo >= 1.2 ? 0.22 : moodCfg.tempo <= 0.9 ? 0.08 : 0.15,
          zIndex: 2,
        }}
      >
        <Particles startFrame={0}>
          <Spawner
            rate={moodCfg.tempo >= 1.2 ? 0.8 : moodCfg.tempo <= 0.9 ? 0.3 : 0.5}
            max={moodCfg.tempo >= 1.2 ? 25 : moodCfg.tempo <= 0.9 ? 8 : 15}
          >
            <div
              style={{
                width: 4,
                height: 4,
                borderRadius: "50%",
                background: "white",
              }}
            />
          </Spawner>
          <Behavior
            gravity={{ y: -0.02 }}
            opacity={[0, 0.8, 0.4, 0]}
            scale={{ start: 0.5, end: 1.5 }}
          />
        </Particles>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// ══════════════════════════════════════════════════════════════════
//  BlockContent — text effect + graphic overlay for a single block
// ══════════════════════════════════════════════════════════════════

// ── Key phrase detection: only show numbers, names, quotes — not every word ──

type CalloutType = "number" | "name" | "quote" | null;
interface CalloutInfo { type: CalloutType; text: string; label?: string }

function detectKeyPhrase(
  block: VisualBlock,
  blockIndex: number,
  allBlocks: VisualBlock[],
): CalloutInfo | null {
  const text = block.phraseText || "";

  // Skip if block already has graphic data (GraphicCard handles it)
  if (block.graphicType !== "none" && block.graphicData != null) return null;

  // 1. Numbers/percentages/money → large callout
  const numMatch = text.match(
    /(\d[\d\s.,]*\d?)\s*(%|prosent|percent|million|milliard|billion|tusen|kroner|dollar|euro|mrd|mill|kr)/i,
  );
  if (numMatch) {
    return { type: "number", text: numMatch[0].trim() };
  }

  // 2. Company/person name (first mention) → lower third
  //    Match 2+ capitalized words not at sentence start
  const nameMatch = text.match(
    /(?:[\s,])((?:[A-ZÆØÅА-ЯІЇЄҐ][a-zA-ZæøåÆØÅа-яіїєґА-ЯІЇЄҐ]+[\s-]){0,2}[A-ZÆØÅА-ЯІЇЄҐ][a-zA-ZæøåÆØÅа-яіїєґА-ЯІЇЄҐ]{2,})/,
  );
  if (nameMatch) {
    const name = nameMatch[1].trim();
    const priorMention = allBlocks
      .slice(0, blockIndex)
      .some((b) => b.phraseText?.includes(name));
    if (!priorMention) {
      return { type: "name", text: name };
    }
  }

  // 3. Quoted text → quote callout
  const quoteMatch = text.match(/["«""]([^"»""]{10,})["»""]/);
  if (quoteMatch) {
    return { type: "quote", text: quoteMatch[1].trim() };
  }

  return null;
}

// ── KeyPhraseCallout: renders number/name/quote overlays ──

const KeyPhraseCallout: React.FC<{
  callout: CalloutInfo;
  accentColor: string;
  isVertical: boolean;
}> = ({ callout, accentColor, isVertical }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const scale = spring({ frame, fps, config: { damping: 14, stiffness: 80, mass: 0.7 } });

  if (callout.type === "number") {
    return (
      <div
        style={{
          position: "absolute",
          top: isVertical ? "30%" : "25%",
          left: "10%",
          right: "10%",
          textAlign: "center",
          zIndex: 6,
          transform: `scale(${scale})`,
        }}
      >
        <div
          style={{
            display: "inline-block",
            background: "rgba(0,0,0,0.7)",
            backdropFilter: "blur(12px)",
            borderRadius: 16,
            padding: isVertical ? "20px 32px" : "16px 40px",
            borderLeft: `4px solid ${accentColor}`,
          }}
        >
          <span
            style={{
              fontSize: isVertical ? 72 : 64,
              fontWeight: 800,
              color: "#fff",
              fontFamily: "Comfortaa, sans-serif",
            }}
          >
            {callout.text}
          </span>
        </div>
      </div>
    );
  }

  if (callout.type === "name") {
    const slideIn = interpolate(frame, [0, 10], [60, 0], clampBoth);
    return (
      <div
        style={{
          position: "absolute",
          bottom: isVertical ? "30%" : "22%",
          left: isVertical ? 24 : 40,
          zIndex: 6,
          transform: `translateX(-${slideIn}px)`,
          opacity: scale,
        }}
      >
        <div
          style={{
            background: "rgba(0,0,0,0.75)",
            backdropFilter: "blur(12px)",
            borderRadius: 8,
            padding: "12px 24px",
            borderLeft: `3px solid ${accentColor}`,
          }}
        >
          <span
            style={{
              fontSize: isVertical ? 36 : 30,
              fontWeight: 700,
              color: "#fff",
              fontFamily: "Comfortaa, sans-serif",
            }}
          >
            {callout.text}
          </span>
        </div>
      </div>
    );
  }

  if (callout.type === "quote") {
    return (
      <div
        style={{
          position: "absolute",
          top: "20%",
          left: "8%",
          right: "8%",
          textAlign: "center",
          zIndex: 6,
          opacity: scale,
          transform: `scale(${scale})`,
        }}
      >
        <div
          style={{
            width: 40,
            height: 3,
            backgroundColor: accentColor,
            margin: "0 auto 16px",
            borderRadius: 2,
          }}
        />
        <span
          style={{
            fontSize: isVertical ? 32 : 28,
            fontWeight: 700,
            color: "#fff",
            fontFamily: "Comfortaa, sans-serif",
            lineHeight: 1.3,
            fontStyle: "italic",
            textShadow: "0 2px 12px rgba(0,0,0,0.8)",
          }}
        >
          &ldquo;{callout.text}&rdquo;
        </span>
      </div>
    );
  }

  return null;
};

// ── BlockContent — renders graphic, scene effect, or key phrase callout ──

const BlockContent: React.FC<{
  block: VisualBlock;
  accentColor: string;
  isVertical: boolean;
  moodTempo?: number;
  images?: string[];
  blockIndex: number;
  allBlocks: VisualBlock[];
}> = ({ block, accentColor, isVertical, moodTempo = 1.0, images = [], blockIndex, allBlocks }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  const blockFade = Math.max(4, Math.round(8 / moodTempo));
  const fadeIn = interpolate(frame, [0, blockFade], [0, 1], clampBoth);
  const fadeOut = interpolate(
    frame,
    [durationInFrames - blockFade, durationInFrames],
    [1, 0],
    clampBoth,
  );
  const opacity = fadeIn * fadeOut;

  const hasGraphic =
    block.graphicType !== "none" && block.graphicData != null;

  const sceneEffect = resolveSceneEffect(block);
  const hasSceneEffect = sceneEffect !== null;

  // For narrative blocks (no graphic, no scene effect), detect key phrases
  const callout =
    !hasGraphic && !hasSceneEffect
      ? detectKeyPhrase(block, blockIndex, allBlocks)
      : null;

  // Show PhraseText only when graphic card is present (labels the data)
  const showText = hasGraphic && !hasSceneEffect;

  return (
    <AbsoluteFill style={{ opacity, zIndex: 5 }}>
      {/* Scene effect layer */}
      {hasSceneEffect && (
        <div style={{ position: "absolute", inset: 0, zIndex: 4 }}>
          <SceneEffectRenderer
            type={sceneEffect}
            block={block}
            accentColor={accentColor}
            images={images}
          />
        </div>
      )}

      {/* Phrase text (only with graphic cards) */}
      {showText && (
        <PhraseText
          block={block}
          isVertical={isVertical}
          hasGraphic={hasGraphic || hasSceneEffect}
        />
      )}

      {/* Motion graphic */}
      {hasGraphic && (
        <div
          style={{
            position: "absolute",
            top: isVertical ? "40%" : "15%",
            right: isVertical ? 20 : 40,
            width: isVertical ? "80%" : "36%",
            zIndex: 8,
          }}
        >
          <GraphicCard block={block} accentColor={accentColor} />
        </div>
      )}

      {/* Key phrase callout (numbers, names, quotes — NOT every word) */}
      {callout && (
        <KeyPhraseCallout
          callout={callout}
          accentColor={accentColor}
          isVertical={isVertical}
        />
      )}
    </AbsoluteFill>
  );
};

// ══════════════════════════════════════════════════════════════════
//  PhraseText — routes to the right text animation component
// ══════════════════════════════════════════════════════════════════

const PhraseText: React.FC<{
  block: VisualBlock;
  isVertical: boolean;
  hasGraphic: boolean;
}> = ({ block, isVertical, hasGraphic }) => {
  const frame = useCurrentFrame();
  const text = block.phraseText;
  if (!text) return null;

  const fontSize = isVertical ? typography.scale.h5 : typography.scale.h4;

  const container: React.CSSProperties = {
    position: "absolute",
    top: hasGraphic ? "8%" : "20%",
    left: "5%",
    right: hasGraphic && !isVertical ? "40%" : "5%",
    display: "flex",
    justifyContent: "center",
    zIndex: 6,
  };

  switch (block.textEffect) {
    case "typewriter":
      return (
        <div style={container}>
          <TypewriterText text={text} fontSize={fontSize} charSpeed={2} />
        </div>
      );
    case "fadeUp":
      return (
        <div style={container}>
          <SplitTextReveal
            text={text}
            fontSize={fontSize}
            effect="fadeUp"
            staggerFrames={3}
          />
        </div>
      );
    case "blurReveal": {
      const blur = interpolate(frame, [0, 15], [12, 0], clampBoth);
      const op = interpolate(frame, [0, 12], [0, 1], clampBoth);
      return (
        <div style={container}>
          <div
            style={{
              opacity: op,
              filter: `blur(${blur}px)`,
              fontSize,
              fontWeight: 700,
              color: colors.text,
              fontFamily: typography.fontFamily.primary,
              textAlign: "center",
              lineHeight: 1.3,
              textShadow: "0 2px 12px rgba(0,0,0,0.8)",
            }}
          >
            {text}
          </div>
        </div>
      );
    }
    case "springPop":
      return (
        <div style={container}>
          <SplitTextReveal
            text={text}
            fontSize={fontSize}
            effect="scaleIn"
            staggerFrames={3}
          />
        </div>
      );
    case "splitScale":
      return (
        <div style={container}>
          <SplitTextReveal
            text={text}
            fontSize={fontSize}
            effect="scaleIn"
            staggerFrames={5}
          />
        </div>
      );
    default:
      return null;
  }
};

// ══════════════════════════════════════════════════════════════════
//  GraphicCard — glass-morphism panel with animated data viz
// ══════════════════════════════════════════════════════════════════

const GraphicCard: React.FC<{
  block: VisualBlock;
  accentColor: string;
}> = ({ block, accentColor }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const slideIn = spring({
    frame,
    fps,
    config: { damping: 14, stiffness: 80, mass: 0.7 },
  });
  const tx = (1 - slideIn) * 60;

  const data = block.graphicData as Record<string, unknown> | null;
  if (!data) return null;

  const panelStyle: React.CSSProperties = {
    position: "relative",
    background: "rgba(0, 0, 0, 0.75)",
    backdropFilter: `blur(${glass.blurStrong}px)`,
    border: `1px solid ${glass.borderStrong}`,
    borderRadius: glass.borderRadiusLarge,
    padding: "28px 24px",
    transform: `translateX(${tx}px)`,
    overflow: "hidden",
  };

  const accentLineStyle: React.CSSProperties = {
    position: "absolute",
    top: 0,
    left: "10%",
    right: "10%",
    height: 3,
    borderRadius: 2,
    background: `linear-gradient(90deg, transparent, ${accentColor}, transparent)`,
  };

  return (
    <div style={panelStyle}>
      <div style={accentLineStyle} />

      {block.graphicType === "counter" && (
        <CounterGraphic data={data} accentColor={accentColor} />
      )}

      {block.graphicType === "keyFigure" && (
        <KeyFigureGraphic data={data} accentColor={accentColor} />
      )}

      {block.graphicType === "comparison" && (
        <ComparisonGraphic data={data} accentColor={accentColor} />
      )}

      {/* barChart + bulletList fallback to keyFigure display */}
      {(block.graphicType === "barChart" ||
        block.graphicType === "bulletList") && (
        <KeyFigureGraphic data={data} accentColor={accentColor} />
      )}
    </div>
  );
};

// ── Counter: animated tick-up ──

const CounterGraphic: React.FC<{
  data: Record<string, unknown>;
  accentColor: string;
}> = ({ data, accentColor }) => {
  const raw = String(data.value ?? "0");
  const numericPart = parseFloat(raw.replace(/[^0-9.,]/g, "").replace(",", ".")) || 0;
  const hasPct = raw.includes("%");
  const label = data.label ? String(data.label) : "";

  return (
    <div style={{ textAlign: "center" }}>
      <AnimatedCounter
        value={numericPart}
        suffix={hasPct ? "%" : ""}
        accentColor={accentColor}
        fontSize={typography.scale.hero}
      />
      {label && (
        <div
          style={{
            fontSize: typography.scale.bodySmall,
            color: colors.textMuted,
            fontFamily: typography.fontFamily.primary,
            marginTop: 8,
          }}
        >
          {label}
        </div>
      )}
    </div>
  );
};

// ── KeyFigure: static large value ──

const KeyFigureGraphic: React.FC<{
  data: Record<string, unknown>;
  accentColor: string;
}> = ({ data, accentColor }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const scale = spring({
    frame,
    fps,
    config: { damping: 10, stiffness: 100, mass: 0.6 },
  });

  return (
    <div style={{ textAlign: "center", transform: `scale(${scale})` }}>
      <div
        style={{
          fontSize: typography.scale.hero,
          fontWeight: 900,
          color: accentColor,
          fontFamily: typography.fontFamily.primary,
          lineHeight: 1,
        }}
      >
        {String(data.value ?? "")}
      </div>
      {String(data.label || "") !== "" && (
        <div
          style={{
            fontSize: typography.scale.bodySmall,
            color: colors.textMuted,
            fontFamily: typography.fontFamily.primary,
            marginTop: 12,
            fontWeight: 600,
          }}
        >
          {String(data.label)}
        </div>
      )}
    </div>
  );
};

// ── Comparison: side-by-side boxes ──

const ComparisonGraphic: React.FC<{
  data: Record<string, unknown>;
  accentColor: string;
}> = ({ data, accentColor }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const left = (data.left as { label: string; value: string }) || {
    label: "",
    value: "",
  };
  const right = (data.right as { label: string; value: string }) || {
    label: "",
    value: "",
  };

  const leftScale = spring({
    frame,
    fps,
    config: { damping: 12, stiffness: 100 },
  });
  const rightScale = spring({
    frame: Math.max(0, frame - 10),
    fps,
    config: { damping: 12, stiffness: 100 },
  });

  const boxStyle = (
    s: number,
    isRight: boolean,
  ): React.CSSProperties => ({
    flex: 1,
    textAlign: "center",
    padding: "16px 8px",
    background: isRight ? `${accentColor}20` : "rgba(255,255,255,0.04)",
    borderRadius: 12,
    transform: `scale(${s})`,
    border: isRight
      ? `1px solid ${accentColor}60`
      : `1px solid ${glass.border}`,
  });

  return (
    <div style={{ display: "flex", gap: 12, alignItems: "stretch" }}>
      <div style={boxStyle(leftScale, false)}>
        <div
          style={{
            fontSize: typography.scale.xs,
            color: colors.textMuted,
            fontFamily: typography.fontFamily.primary,
            marginBottom: 8,
          }}
        >
          {left.label}
        </div>
        <div
          style={{
            fontSize: typography.scale.h5,
            fontWeight: 700,
            color: colors.text,
            fontFamily: typography.fontFamily.primary,
          }}
        >
          {left.value}
        </div>
      </div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          fontSize: typography.scale.body,
          color: accentColor,
          fontWeight: 900,
        }}
      >
        →
      </div>
      <div style={boxStyle(rightScale, true)}>
        <div
          style={{
            fontSize: typography.scale.xs,
            color: colors.textMuted,
            fontFamily: typography.fontFamily.primary,
            marginBottom: 8,
          }}
        >
          {right.label}
        </div>
        <div
          style={{
            fontSize: typography.scale.h5,
            fontWeight: 700,
            color: accentColor,
            fontFamily: typography.fontFamily.primary,
          }}
        >
          {right.value}
        </div>
      </div>
    </div>
  );
};
