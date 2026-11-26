/**
 * Animation Timing & Easing Curves
 * Synchronized with SLOW and FAST animation profiles from game engine.
 */

export interface AnimationDurationConfig {
  dropDuration: number;
  liftDuration: number;
  captureDuration: number;
  bonusDuration: number;
  settlementDuration: number;
  arcHeight: number;
}

export const ANIMATION_PRESETS: Record<"SLOW" | "FAST", AnimationDurationConfig> = {
  SLOW: {
    dropDuration: 0.36,
    liftDuration: 0.24,
    captureDuration: 0.58,
    bonusDuration: 0.62,
    settlementDuration: 0.85,
    arcHeight: 0.95,
  },
  FAST: {
    dropDuration: 0.11,
    liftDuration: 0.08,
    captureDuration: 0.24,
    bonusDuration: 0.28,
    settlementDuration: 0.42,
    arcHeight: 0.65,
  },
};
