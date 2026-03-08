/**
 * ThumbnailHorizontal — YouTube thumbnail (Still, 1280x720).
 *
 * Rendered as a single PNG frame via `npx remotion still`.
 * Shows date, top headlines, article count, and branding.
 */
import React from "react";
import { AbsoluteFill } from "remotion";
import { CategoryIcon } from "../components/CategoryIcon";
import {
  colors,
  gradients,
  glass,
  typography,
  accentLine,
  thumbnail as th,
} from "../design-system";

export interface ThumbnailProps {
  date: string;
  headlines: { text: string; category: string }[];
  articleCount: number;
  accentColor?: string;
}

const categoryColor = (cat: string): string =>
  colors.categories[cat.toLowerCase()] || colors.brand;

export const ThumbnailHorizontal: React.FC<ThumbnailProps> = ({
  date,
  headlines,
  articleCount,
  accentColor = colors.brand,
}) => {
  const topHeadlines = headlines.slice(0, 3);

  return (
    <AbsoluteFill
      style={{
        background: gradients.sceneRadial(accentColor),
        fontFamily: typography.fontFamily.primary,
        padding: `${th.padding.y}px ${th.padding.x}px`,
        display: "flex",
        flexDirection: "row",
      }}
    >
      {/* Top accent line */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: accentLine.height,
          background: accentColor,
        }}
      />

      {/* Left side: date + headlines */}
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          gap: 20,
          paddingRight: 40,
        }}
      >
        {/* Date */}
        <div
          style={{
            fontSize: th.date.fontSize,
            fontWeight: th.date.fontWeight,
            color: colors.textMuted,
            textTransform: "uppercase",
            letterSpacing: 2,
          }}
        >
          {date}
        </div>

        {/* Top 3 headlines */}
        {topHeadlines.map((h, i) => (
          <div
            key={i}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 14,
              padding: "14px 20px",
              background: glass.background,
              borderRadius: 12,
              borderLeft: `4px solid ${categoryColor(h.category)}`,
            }}
          >
            <CategoryIcon
              category={h.category}
              size={22}
              color={categoryColor(h.category)}
              animated={false}
            />
            <span
              style={{
                fontSize: th.headline.fontSize,
                fontWeight: th.headline.fontWeight,
                color: colors.text,
                lineHeight: th.headline.lineHeight,
                overflow: "hidden",
                display: "-webkit-box",
                WebkitLineClamp: 2,
                WebkitBoxOrient: "vertical",
              }}
            >
              {h.text}
            </span>
          </div>
        ))}
      </div>

      {/* Right side: article count + branding */}
      <div
        style={{
          width: 320,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
        }}
      >
        <div
          style={{
            fontSize: 140,
            fontWeight: 900,
            color: accentColor,
            lineHeight: 1,
          }}
        >
          {articleCount}
        </div>
        <div
          style={{
            fontSize: 24,
            fontWeight: 700,
            color: colors.textMuted,
            textTransform: "uppercase",
            letterSpacing: 4,
          }}
        >
          SAKER I DAG
        </div>
      </div>

      {/* Bottom branding */}
      <div
        style={{
          position: "absolute",
          bottom: 24,
          right: th.padding.x,
          fontSize: th.brand.fontSize,
          fontWeight: th.brand.fontWeight,
          color: colors.text,
          letterSpacing: 1.5,
        }}
      >
        vitalii<span style={{ color: accentColor }}>.no</span>
      </div>
    </AbsoluteFill>
  );
};
