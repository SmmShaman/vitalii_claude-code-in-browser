/**
 * PhotoFilterTransition — photo transitions through CSS filters.
 * Grayscale → color, blur → sharp, dark → light, sepia → vivid.
 * Triggered by "filter transition", "grayscale to color", "blur to sharp", "reveal image".
 */
import React from "react";
import {
  AbsoluteFill,
  Img,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  staticFile,
} from "remotion";
import { clampBoth } from "../../design-system";

type FilterMode = "grayscaleToColor" | "blurToSharp" | "darkToLight" | "sepiaToVivid";

interface PhotoFilterTransitionProps {
  imageSrc: string;
  mode?: FilterMode;
  accentColor: string;
}

export const PhotoFilterTransition: React.FC<PhotoFilterTransitionProps> = ({
  imageSrc,
  mode = "grayscaleToColor",
  accentColor,
}) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();

  const resolve = (src: string) =>
    src.startsWith("http") ? src : staticFile(src);

  // Transition happens in first 60% of duration
  const progress = interpolate(
    frame,
    [5, durationInFrames * 0.6],
    [0, 1],
    clampBoth,
  );

  const fadeIn = interpolate(frame, [0, 8], [0, 1], clampBoth);
  const fadeOut = interpolate(
    frame,
    [durationInFrames - 8, durationInFrames],
    [1, 0],
    clampBoth,
  );

  let filter: string;
  let scale: number;

  switch (mode) {
    case "grayscaleToColor":
      filter = `grayscale(${1 - progress}) contrast(${0.8 + progress * 0.3}) saturate(${0.5 + progress * 0.8})`;
      scale = 1.02 + progress * 0.03;
      break;
    case "blurToSharp":
      filter = `blur(${(1 - progress) * 15}px) brightness(${0.7 + progress * 0.3})`;
      scale = 1.1 - progress * 0.05;
      break;
    case "darkToLight":
      filter = `brightness(${0.2 + progress * 0.8}) contrast(${0.7 + progress * 0.3})`;
      scale = 1.05 - progress * 0.03;
      break;
    case "sepiaToVivid":
      filter = `sepia(${1 - progress}) saturate(${0.3 + progress * 1.4}) hue-rotate(${(1 - progress) * 20}deg)`;
      scale = 1.0 + progress * 0.05;
      break;
    default:
      filter = "";
      scale = 1.0;
  }

  return (
    <AbsoluteFill style={{ opacity: fadeIn * fadeOut, overflow: "hidden" }}>
      <Img
        src={resolve(imageSrc)}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
          filter,
          transform: `scale(${scale})`,
        }}
      />

      {/* Accent line sweep during transition */}
      {progress < 1 && (
        <div
          style={{
            position: "absolute",
            left: `${progress * 100}%`,
            top: 0,
            bottom: 0,
            width: 3,
            background: accentColor,
            opacity: 0.6 * (1 - progress),
            boxShadow: `0 0 30px ${accentColor}`,
            pointerEvents: "none",
          }}
        />
      )}
    </AbsoluteFill>
  );
};
