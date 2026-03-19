/**
 * PhotoZoomReveal — zoom into a specific area of the photo, then pull back.
 * Creates cinematic "reveal" effect from detail to full picture.
 * Triggered by "zoom into", "close-up", "detail reveal", "focus on".
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

interface PhotoZoomRevealProps {
  imageSrc: string;
  /** Focus point (0-1 normalized), default center */
  focusX?: number;
  focusY?: number;
  /** Direction: zoom-in (wide→close) or zoom-out (close→wide) */
  direction?: "in" | "out";
  /** Max zoom level */
  maxZoom?: number;
  accentColor: string;
}

export const PhotoZoomReveal: React.FC<PhotoZoomRevealProps> = ({
  imageSrc,
  focusX = 0.5,
  focusY = 0.4,
  direction = "out",
  maxZoom = 2.5,
  accentColor,
}) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  const resolve = (src: string) =>
    src.startsWith("http") ? src : staticFile(src);

  const progress = interpolate(
    frame,
    [0, durationInFrames * 0.8],
    [0, 1],
    clampBoth,
  );

  // Eased progress for smooth zoom
  const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic

  let scale: number;
  let tx: number;
  let ty: number;

  if (direction === "out") {
    // Start zoomed in, pull back to full
    scale = maxZoom - (maxZoom - 1) * eased;
    tx = (focusX - 0.5) * 100 * (1 - eased);
    ty = (focusY - 0.5) * 100 * (1 - eased);
  } else {
    // Start full, zoom into detail
    scale = 1 + (maxZoom - 1) * eased;
    tx = -(focusX - 0.5) * 100 * eased;
    ty = -(focusY - 0.5) * 100 * eased;
  }

  // Vignette that follows zoom (stronger when zoomed in)
  const vignetteIntensity =
    direction === "out" ? 0.6 * (1 - eased) : 0.6 * eased;

  // Fade in/out
  const fadeIn = interpolate(frame, [0, 8], [0, 1], clampBoth);
  const fadeOut = interpolate(
    frame,
    [durationInFrames - 8, durationInFrames],
    [1, 0],
    clampBoth,
  );

  return (
    <AbsoluteFill style={{ opacity: fadeIn * fadeOut, overflow: "hidden" }}>
      <Img
        src={resolve(imageSrc)}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
          transform: `scale(${scale}) translate(${tx}%, ${ty}%)`,
          transformOrigin: `${focusX * 100}% ${focusY * 100}%`,
        }}
      />

      {/* Dynamic vignette */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: `radial-gradient(ellipse at ${focusX * 100}% ${focusY * 100}%, transparent 30%, rgba(0,0,0,${vignetteIntensity}) 100%)`,
          pointerEvents: "none",
        }}
      />

      {/* Focus ring when zoomed in */}
      {direction === "in" && eased > 0.5 && (
        <div
          style={{
            position: "absolute",
            left: `${focusX * 100}%`,
            top: `${focusY * 100}%`,
            width: 120,
            height: 120,
            marginLeft: -60,
            marginTop: -60,
            borderRadius: "50%",
            border: `2px solid ${accentColor}`,
            opacity: (eased - 0.5) * 2 * 0.4,
            boxShadow: `0 0 20px ${accentColor}40`,
            pointerEvents: "none",
          }}
        />
      )}
    </AbsoluteFill>
  );
};
