/**
 * CategoryIcon — SVG icon per content category.
 *
 * 9 categories: tech, business, science, politics, ai, startup, crypto, health, news.
 * Each rendered as a minimal SVG icon with optional spring animation.
 */
import React from "react";
import {
  useCurrentFrame,
  useVideoConfig,
  spring,
} from "remotion";
import { colors, springs } from "../design-system";

// Minimal SVG paths for each category (24x24 viewBox)
const categoryPaths: Record<string, string> = {
  tech: "M9 2h6v2H9V2zM4 6h16v12H4V6zm2 2v8h12V8H6zm3 2h6v4H9v-4z",
  business: "M20 6h-4V4c0-1.1-.9-2-2-2h-4c-1.1 0-2 .9-2 2v2H4c-1.1 0-2 .9-2 2v11c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zM10 4h4v2h-4V4z",
  science: "M13 2v6.26l3.93 6.12C17.6 15.51 16.83 17 15.6 17H8.4c-1.23 0-2-1.49-1.33-2.62L11 8.26V2h2zm-4 0H7v2h1V2h1zm5 0h1v2h-1V2h1zM8.4 19h7.2c.66 0 1.05-.73.66-1.25L12 10.5 7.74 17.75c-.39.52 0 1.25.66 1.25z",
  politics: "M12 2L2 8v2h20V8L12 2zm0 2.84L18.16 8H5.84L12 4.84zM4 12v7h3v-7H4zm5 0v7h3v-7H9zm5 0v7h3v-7h-3zm5 0v7h3v-7h-3zM2 21h20v2H2v-2z",
  ai: "M12 2a7 7 0 00-7 7c0 2.38 1.19 4.47 3 5.74V17c0 .55.45 1 1 1h6c.55 0 1-.45 1-1v-2.26c1.81-1.27 3-3.36 3-5.74a7 7 0 00-7-7zm2 13h-4v-1h4v1zm1.31-4.17L14 11.83V13h-4v-1.17l-1.31-1c-.94-.72-1.49-1.8-1.49-2.96A4.82 4.82 0 0112 3.2a4.82 4.82 0 014.8 4.67c0 1.16-.55 2.24-1.49 2.96zM12 19h-2v1c0 .55.45 1 1 1s1-.45 1-1v-1z",
  startup: "M12 2.5L5 14h4.09L7 21.5l10-13h-4.09L15 2.5h-3z",
  crypto: "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 17.93V18h-2v1.93C7.06 19.44 4.56 16.94 4.07 13H6v-2H4.07c.49-3.94 2.99-6.44 6.93-6.93V6h2V4.07C16.94 4.56 19.44 7.06 19.93 11H18v2h1.93c-.49 3.94-2.99 6.44-6.93 6.93zM12 8a4 4 0 100 8 4 4 0 000-8z",
  health: "M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-2 10h-4v4h-2v-4H7v-2h4V7h2v4h4v2z",
  news: "M4 4h16v2H4V4zm0 4h16v2H4V8zm0 4h10v2H4v-2zm0 4h10v2H4v-2zm14-4h2v6h-2v-6zm-4 0h2v6h-2v-6z",
};

export interface CategoryIconProps {
  category: string;
  size?: number;
  color?: string;
  animated?: boolean;
}

export const CategoryIcon: React.FC<CategoryIconProps> = ({
  category,
  size = 20,
  color = colors.text,
  animated = true,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const scale = animated
    ? spring({ frame: frame - 5, fps, config: springs.categoryBadgePop })
    : 1;

  const pathData = categoryPaths[category.toLowerCase()] || categoryPaths.news;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      style={{ transform: `scale(${scale})`, flexShrink: 0 }}
    >
      <path d={pathData} fill={color} />
    </svg>
  );
};
