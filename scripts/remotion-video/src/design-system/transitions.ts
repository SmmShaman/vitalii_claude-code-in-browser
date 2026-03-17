/**
 * Scene Transition Definitions
 *
 * CSS-based transition effects between video scenes.
 * Used by SceneTransition wrapper component.
 */

export type TransitionType =
  | 'fade'
  | 'wipeLeft'
  | 'wipeRight'
  | 'slideUp'
  | 'slideDown'
  | 'zoomIn'
  | 'zoomOut'
  | 'filmBurn'
  | 'glitchWipe';

export interface TransitionConfig {
  /** Default duration in frames */
  durationFrames: number;
  /** Spring config for the transition */
  spring: { damping: number; stiffness: number; mass?: number };
}

export const transitionConfigs: Record<TransitionType, TransitionConfig> = {
  fade: {
    durationFrames: 12,
    spring: { damping: 15, stiffness: 100 },
  },
  wipeLeft: {
    durationFrames: 15,
    spring: { damping: 12, stiffness: 120 },
  },
  wipeRight: {
    durationFrames: 15,
    spring: { damping: 12, stiffness: 120 },
  },
  slideUp: {
    durationFrames: 12,
    spring: { damping: 14, stiffness: 110 },
  },
  slideDown: {
    durationFrames: 12,
    spring: { damping: 14, stiffness: 110 },
  },
  zoomIn: {
    durationFrames: 15,
    spring: { damping: 10, stiffness: 80 },
  },
  zoomOut: {
    durationFrames: 15,
    spring: { damping: 10, stiffness: 80 },
  },
  filmBurn: {
    durationFrames: 18,
    spring: { damping: 10, stiffness: 100 },
  },
  glitchWipe: {
    durationFrames: 12,
    spring: { damping: 8, stiffness: 150 },
  },
};

/** Get transition config with fallback to fade */
export function getTransitionConfig(type?: string): TransitionConfig {
  if (type && type in transitionConfigs) {
    return transitionConfigs[type as TransitionType];
  }
  return transitionConfigs.fade;
}
