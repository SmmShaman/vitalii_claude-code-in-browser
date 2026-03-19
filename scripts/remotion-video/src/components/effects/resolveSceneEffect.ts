/**
 * Keyword-based router: reads sceneDescription + renderHint
 * and returns which scene effect component to render.
 */
import type { VisualBlock } from "../../compositions/DailyNewsShow";

export type SceneEffectType =
  | "counterMosaic"
  | "splitScreen"
  | "mosaicGrid"
  | "iconStagger"
  | "pixelDissolve"
  | "circuitBoard"
  | "progressTimeline"
  | "alertPulse"
  | null;

const PATTERNS: [RegExp, SceneEffectType][] = [
  [/counter\s*tick|giant counter|tick-up|counting\s*up|ticks?\s*from\s*0/i, "counterMosaic"],
  [/split[\s-]?screen|glass divider|left.*side.*right|two\s*halves/i, "splitScreen"],
  [/dissolve|pixel[\s-]by[\s-]pixel|reassembl|shatter|scatter/i, "pixelDissolve"],
  [/stagger.*icon|icon.*stagger|popping in|icons?\s*appear|scales?\s*in\s*with/i, "iconStagger"],
  [/grid|mosaic|filling.*screen|tile.*pattern|bubble.*mosaic/i, "mosaicGrid"],
  [/circuit|data\s*stream|code\s*rain|digital.*pattern|matrix/i, "circuitBoard"],
  [/timeline|roadmap|phase|milestone|step[\s-]by[\s-]step/i, "progressTimeline"],
  [/pulse|alert|breaking|flash|urgent.*visual|shake|red.*glow/i, "alertPulse"],
];

export function resolveSceneEffect(block: VisualBlock): SceneEffectType {
  const combined = `${block.sceneDescription || ""} ${block.renderHint || ""}`;
  if (!combined.trim()) return null;

  for (const [re, effect] of PATTERNS) {
    if (re.test(combined)) return effect;
  }
  return null;
}
