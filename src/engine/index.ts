/**
 * Channemane Core Game Engine Entry Point
 */

export const ENGINE_INFO = {
  name: "Channemane Game Engine",
  version: "0.2.0",
  phase: "Phase 2 - Complete Engine Core",
} as const;

export * from "./constants";
export * from "./types";
export * from "./board";
export * from "./traversal";
export * from "./selection";
export * from "./pickup";
export * from "./sowing";
export * from "./capture";
export * from "./bonus";
export * from "./turnStateMachine";
export * from "./roundEnd";
export * from "./settlement";
export * from "./roundSetup";
export * from "./matchEnd";
export * from "./game";
export * from "./simulation";
