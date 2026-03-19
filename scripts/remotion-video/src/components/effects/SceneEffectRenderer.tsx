/**
 * SceneEffectRenderer — routes resolved effect type to the right component.
 * Extracts props from VisualBlock's sceneDescription/graphicData.
 */
import React from "react";
import type { SceneEffectType } from "./resolveSceneEffect";
import type { VisualBlock } from "../../compositions/DailyNewsShow";
import { AlertPulse } from "./AlertPulse";
import { MosaicGrid } from "./MosaicGrid";
import { IconStagger } from "./IconStagger";
import { CounterMosaic } from "./CounterMosaic";
import { SplitScreenPanel } from "./SplitScreenPanel";
import { PixelDissolve } from "./PixelDissolve";
import { CircuitBoard } from "./CircuitBoard";
import { ProgressTimeline, parseMilestones } from "./ProgressTimeline";
import { Globe3D } from "./Globe3D";
import { NoiseWave } from "./NoiseWave";
import { DataDashboard, extractValues } from "./DataDashboard";

interface SceneEffectRendererProps {
  type: SceneEffectType;
  block: VisualBlock;
  accentColor: string;
}

export const SceneEffectRenderer: React.FC<SceneEffectRendererProps> = ({
  type,
  block,
  accentColor,
}) => {
  if (!type) return null;

  const desc = block.sceneDescription || "";
  const data = (block.graphicData || {}) as Record<string, unknown>;

  switch (type) {
    case "alertPulse":
      return <AlertPulse accentColor={accentColor} intensity={0.5} />;

    case "mosaicGrid":
      return (
        <MosaicGrid
          fillColor={accentColor}
          cellShape={desc.includes("circle") || desc.includes("bubble") ? "circle" : "square"}
          staggerPattern={desc.includes("diagonal") ? "diagonal" : "center-out"}
        />
      );

    case "iconStagger":
      return (
        <IconStagger
          sceneDescription={desc}
          accentColor={accentColor}
        />
      );

    case "counterMosaic": {
      const raw = String(data.value || "");
      const num = parseFloat(raw.replace(/[^0-9.,]/g, "").replace(",", ".")) || 0;
      const suffix = raw.includes("%") ? "%" : raw.includes("M") ? "M" : "";
      const label = String(data.label || "");
      return (
        <CounterMosaic
          value={num}
          suffix={suffix}
          label={label}
          accentColor={accentColor}
        />
      );
    }

    case "splitScreen": {
      // Extract left/right from graphicData (comparison type) or parse from description
      const left = data.left as { label: string; value: string } | undefined;
      const right = data.right as { label: string; value: string } | undefined;
      return (
        <SplitScreenPanel
          leftLabel={left?.label || "Før"}
          leftContent={left?.value || ""}
          rightLabel={right?.label || "Nå"}
          rightContent={right?.value || ""}
          accentColor={accentColor}
        />
      );
    }

    case "pixelDissolve":
      return (
        <PixelDissolve
          direction={desc.includes("reassembl") || desc.includes("assembl") ? "assemble" : "dissolve"}
          color={accentColor}
          gridSize={14}
        />
      );

    case "circuitBoard":
      return (
        <CircuitBoard
          accentColor={accentColor}
          complexity={desc.includes("dense") ? "dense" : desc.includes("simple") ? "simple" : "medium"}
        />
      );

    case "progressTimeline": {
      const milestones = parseMilestones(desc);
      return (
        <ProgressTimeline
          milestones={milestones}
          accentColor={accentColor}
        />
      );
    }

    case "globe3D":
      return <Globe3D accentColor={accentColor} />;

    case "noiseWave":
      return <NoiseWave accentColor={accentColor} />;

    case "dataDashboard": {
      const values = extractValues(data);
      return <DataDashboard accentColor={accentColor} values={values} />;
    }

    default:
      return null;
  }
};
