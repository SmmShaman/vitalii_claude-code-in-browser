/**
 * ShowIntroScene - Daily news show opening.
 *
 * Displays cycling website/profile images with Ken Burns effect,
 * profile photo, show title, date, and article count
 * with a professional broadcast-style animation.
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
  glass,
  gradients,
  typography,
  accentLine,
  badge,
  springs,
  fadeTiming,
  clampBoth,
} from "../design-system";
import { GradientTransition } from "remotion-bits";

export interface ShowIntroSceneProps {
  date: string;
  articleCount: number;
  showTitle?: string;
  accentColor?: string;
  language?: string;
  /** Background images to cycle through (Ken Burns) */
  backgroundImages?: string[];
  /** Profile/logo image (circular overlay) */
  profileImageSrc?: string;
}

export const ShowIntroScene: React.FC<ShowIntroSceneProps> = ({
  date,
  articleCount,
  showTitle = "Daglig Nyhetsoppdatering",
  accentColor = colors.brand,
  language = "no",
  backgroundImages = [],
  profileImageSrc,
}) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  // ── Background image cycling with Ken Burns ──
  const framesPerImage = Math.ceil(fps * 2.5); // 2.5s per image
  const allBgImages = backgroundImages.length > 0 ? backgroundImages : [];
  const totalBgImages = allBgImages.length;
  const crossfadeFrames = 15; // 0.5s crossfade

  // Ken Burns directions per image
  const kenBurnsDirections = [
    { x: -1, y: -0.5 },
    { x: 1, y: -0.3 },
    { x: -0.5, y: 0.8 },
    { x: 0.8, y: -0.8 },
    { x: 0, y: -1 },
    { x: -1, y: 0 },
  ];

  // ── Animations ──

  // Line sweep from left
  const lineWidth = interpolate(frame, [0, 25], [0, 100], clampBoth);

  // Profile image pops in
  const profileScale = spring({
    frame: frame - 3,
    fps,
    config: { damping: 12, stiffness: 120, mass: 0.8 },
  });
  const profileOpacity = interpolate(frame, [3, 12], [0, 1], clampBoth);
  // Subtle glow pulse
  const glowPulse = interpolate(
    frame % 60,
    [0, 30, 60],
    [0.4, 0.8, 0.4],
    clampBoth,
  );

  // Title drops in (after profile)
  const titleScale = spring({
    frame: frame - 15,
    fps,
    config: springs.titleDrop,
  });
  const titleOpacity = interpolate(frame, [15, 25], [0, 1], clampBoth);

  // Date fades up
  const dateY = interpolate(frame, [25, 38], [20, 0], clampBoth);
  const dateOpacity = interpolate(frame, [25, 35], [0, 1], clampBoth);

  // Article count badge pops
  const badgeScale = spring({
    frame: frame - 38,
    fps,
    config: springs.badgePop,
  });
  const badgeOpacity = interpolate(frame, [38, 46], [0, 1], clampBoth);

  // Fade out
  const fadeOut = interpolate(
    frame,
    [durationInFrames - fadeTiming.fadeOutFrames.intro, durationInFrames],
    [1, 0],
    clampBoth,
  );

  const countLabel =
    language === "no"
      ? `${articleCount} ${articleCount === 1 ? "sak" : "saker"} i dag`
      : `${articleCount} ${articleCount === 1 ? "story" : "stories"} today`;

  const resolve = (src: string) =>
    src.startsWith("http") ? src : staticFile(src);

  return (
    <AbsoluteFill style={{ opacity: fadeOut }}>
      {/* Background: cycling images with Ken Burns OR gradient fallback */}
      {totalBgImages > 0 ? (
        <>
          {allBgImages.map((imgSrc, idx) => {
            const imageStartFrame = idx * framesPerImage;
            const localFrame = frame - imageStartFrame;

            // Only render visible images
            if (localFrame < -crossfadeFrames || localFrame > framesPerImage + crossfadeFrames) {
              return null;
            }

            // Opacity: fade in at start, fade out at end
            const opacity = interpolate(
              localFrame,
              [-crossfadeFrames, 0, framesPerImage - crossfadeFrames, framesPerImage],
              [0, 1, 1, 0],
              clampBoth,
            );

            // Ken Burns zoom + pan
            const dir = kenBurnsDirections[idx % kenBurnsDirections.length];
            const progress = interpolate(localFrame, [0, framesPerImage], [0, 1], clampBoth);
            const scale = 1.05 + progress * 0.12;
            const tx = dir.x * progress * 15;
            const ty = dir.y * progress * 10;

            return (
              <AbsoluteFill
                key={idx}
                style={{
                  opacity,
                  overflow: "hidden",
                }}
              >
                <Img
                  src={resolve(imgSrc)}
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                    transform: `scale(${scale}) translate(${tx}px, ${ty}px)`,
                    filter: "brightness(0.35) saturate(1.3)",
                  }}
                />
              </AbsoluteFill>
            );
          })}
          {/* Gradient overlay for text readability */}
          <AbsoluteFill
            style={{
              background: `radial-gradient(ellipse at center, rgba(10,10,10,0.5) 0%, rgba(10,10,10,0.85) 100%)`,
            }}
          />
        </>
      ) : (
        <GradientTransition
          gradient={[
            `linear-gradient(135deg, #1a1a2e, #16213e)`,
            `linear-gradient(135deg, ${accentColor}cc, #0f3460)`,
            `linear-gradient(135deg, #1a1a2e, ${accentColor}88)`,
          ]}
          duration={durationInFrames}
          easing="easeInOutCubic"
          style={{
            position: 'absolute',
            inset: 0,
          }}
        />
      )}

      {/* Content layer */}
      <AbsoluteFill
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        {/* Profile image (circular with glow) */}
        {profileImageSrc && (
          <div
            style={{
              transform: `scale(${profileScale})`,
              opacity: profileOpacity,
              marginBottom: 30,
              position: "relative",
            }}
          >
            {/* Glow ring */}
            <div
              style={{
                position: "absolute",
                top: -6,
                left: -6,
                right: -6,
                bottom: -6,
                borderRadius: "50%",
                border: `3px solid ${accentColor}`,
                boxShadow: `0 0 ${20 + glowPulse * 20}px ${accentColor}`,
                opacity: glowPulse,
              }}
            />
            <Img
              src={resolve(profileImageSrc)}
              style={{
                width: 120,
                height: 120,
                borderRadius: "50%",
                objectFit: "cover",
                border: `3px solid rgba(255,255,255,0.3)`,
              }}
            />
          </div>
        )}

        {/* Accent line */}
        <div
          style={{
            width: `${lineWidth}%`,
            height: accentLine.height,
            backgroundColor: accentColor,
            marginBottom: 30,
            borderRadius: accentLine.borderRadius,
            maxWidth: accentLine.width.full,
            boxShadow: `0 0 15px ${accentColor}40`,
          }}
        />

        {/* Show title */}
        <div
          style={{
            transform: `scale(${titleScale})`,
            opacity: titleOpacity,
            fontSize: typography.scale.h1,
            fontWeight: 800,
            color: colors.text,
            fontFamily: typography.fontFamily.primary,
            textAlign: "center",
            lineHeight: 1.2,
            maxWidth: "85%",
            textShadow: "0 2px 20px rgba(0,0,0,0.8)",
          }}
        >
          {showTitle}
        </div>

        {/* Date */}
        <div
          style={{
            marginTop: 20,
            transform: `translateY(${dateY}px)`,
            opacity: dateOpacity,
            fontSize: typography.scale.body,
            fontWeight: 500,
            color: colors.textSubtle,
            fontFamily: typography.fontFamily.primary,
            textShadow: "0 1px 10px rgba(0,0,0,0.6)",
          }}
        >
          {date}
        </div>

        {/* Article count badge (glass effect) */}
        <div
          style={{
            marginTop: 32,
            transform: `scale(${badgeScale})`,
            opacity: badgeOpacity,
            background: glass.background,
            border: `1px solid ${glass.border}`,
            backdropFilter: `blur(${glass.blur}px)`,
            padding: `${badge.paddingLarge.y}px ${badge.paddingLarge.x}px`,
            borderRadius: badge.borderRadiusLarge,
            fontSize: typography.scale.small,
            fontWeight: 600,
            color: accentColor,
            fontFamily: typography.fontFamily.primary,
          }}
        >
          {countLabel}
        </div>

        {/* Brand */}
        <div
          style={{
            position: "absolute",
            bottom: 80,
            fontSize: typography.scale.xs,
            fontWeight: 600,
            color: colors.textWhisper,
            fontFamily: typography.fontFamily.primary,
            letterSpacing: 2,
          }}
        >
          vitalii.no
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
