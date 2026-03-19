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
  | "globe3D"
  | "noiseWave"
  | "dataDashboard"
  // Photo-native effects
  | "photoSplitScreen"
  | "photoZoomReveal"
  | "photoCollage"
  | "photoCompareSlider"
  | "photoVerticalScroll"
  | "photoFilterTransition"
  | null;

const PATTERNS: [RegExp, SceneEffectType][] = [
  // Photo-native effects (high priority — use actual images)
  [/photos?\s*side\s*by\s*side|split.*photos?|multiple\s*images.*screen|divide.*screen.*photos/i, "photoSplitScreen"],
  [/zoom\s*into|close[\s-]up|detail\s*reveal|focus\s*on\s*part|magnif|navig.*into/i, "photoZoomReveal"],
  [/collage|photo\s*mosaic|scattered\s*photos|photo\s*grid|images?\s*popping/i, "photoCollage"],
  [/before[\s\/]*after|compare.*slider|versus\s*photos?|slider\s*reveal/i, "photoCompareSlider"],
  [/scroll|vertical\s*pan|scrolling\s*through|long\s*image|webpage\s*scroll/i, "photoVerticalScroll"],
  [/grayscale.*color|blur.*sharp|dark.*light|sepia.*vivid|filter\s*transition|photo.*reveal|image.*transforms/i, "photoFilterTransition"],
  // 3D & spatial
  [/globe|earth|world\s*map|rotating\s*sphere|planet|wireframe\s*sphere/i, "globe3D"],
  [/dashboard|multiple\s*charts|analytics\s*panel|several\s*metrics|multi[\s-]panel/i, "dataDashboard"],
  [/wave|flow|liquid|aurora|organic\s*pattern|undulat/i, "noiseWave"],
  // Data & graphics
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
