/**
 * Remotion Entry Point
 *
 * Registers all video compositions (templates) that can be rendered.
 * Each composition defines its dimensions, FPS, and default props.
 */
import { registerRoot } from "remotion";
import { RemotionRoot } from "./Root";

registerRoot(RemotionRoot);
