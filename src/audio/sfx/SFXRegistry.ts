/**
 * SFX Registry
 * Maps game sound identifiers to audio asset configurations and synthesized fallbacks.
 */

import { soundManager } from "../../ui/audio/soundManager";

export type SFXType =
  | "pitSelect"
  | "seedPickup"
  | "seedPlacement"
  | "continuousSow"
  | "capture"
  | "bonusAvailable"
  | "bonusClaim"
  | "turnChange"
  | "roundSettlement"
  | "matchVictory"
  | "matchDefeat";

export interface SFXConfig {
  id: SFXType;
  sources: string[];
  volumeScale: number; // 0.0 - 1.0 relative gain
  maxSimultaneous: number; // Voice limiter count
  duckMusic?: boolean;
  synthesizedFallback: () => void;
}

export const SFX_REGISTRY: Record<SFXType, SFXConfig> = {
  pitSelect: {
    id: "pitSelect",
    sources: ["/audio/sfx/pit_select.webm", "/audio/sfx/pit_select.mp3"],
    volumeScale: 0.7,
    maxSimultaneous: 2,
    synthesizedFallback: () => {
      // Clean wood tap fallback using SoundManager
      soundManager.playSound("scoop");
    },
  },
  seedPickup: {
    id: "seedPickup",
    sources: ["/audio/sfx/seed_pickup.webm", "/audio/sfx/seed_pickup.mp3"],
    volumeScale: 0.85,
    maxSimultaneous: 2,
    synthesizedFallback: () => {
      soundManager.playSound("scoop");
    },
  },
  seedPlacement: {
    id: "seedPlacement",
    sources: ["/audio/sfx/seed_drop.webm", "/audio/sfx/seed_drop.mp3"],
    volumeScale: 0.9,
    maxSimultaneous: 3,
    synthesizedFallback: () => {
      soundManager.playSound("sowDrop");
    },
  },
  continuousSow: {
    id: "continuousSow",
    sources: ["/audio/sfx/continuous_scoop.webm", "/audio/sfx/continuous_scoop.mp3"],
    volumeScale: 0.9,
    maxSimultaneous: 2,
    synthesizedFallback: () => {
      soundManager.playSound("scoop");
    },
  },
  capture: {
    id: "capture",
    sources: ["/audio/sfx/capture.webm", "/audio/sfx/capture.mp3"],
    volumeScale: 1.0,
    maxSimultaneous: 1,
    duckMusic: true,
    synthesizedFallback: () => {
      soundManager.playSound("capture");
    },
  },
  bonusAvailable: {
    id: "bonusAvailable",
    sources: ["/audio/sfx/bonus_available.webm", "/audio/sfx/bonus_available.mp3"],
    volumeScale: 0.8,
    maxSimultaneous: 2,
    synthesizedFallback: () => {
      soundManager.playSound("bonusClaim");
    },
  },
  bonusClaim: {
    id: "bonusClaim",
    sources: ["/audio/sfx/bonus_claim.webm", "/audio/sfx/bonus_claim.mp3"],
    volumeScale: 1.0,
    maxSimultaneous: 1,
    duckMusic: true,
    synthesizedFallback: () => {
      soundManager.playSound("bonusClaim");
    },
  },
  turnChange: {
    id: "turnChange",
    sources: ["/audio/sfx/turn_change.webm", "/audio/sfx/turn_change.mp3"],
    volumeScale: 0.7,
    maxSimultaneous: 1,
    synthesizedFallback: () => {
      soundManager.playSound("scoop");
    },
  },
  roundSettlement: {
    id: "roundSettlement",
    sources: ["/audio/sfx/round_settlement.webm", "/audio/sfx/round_settlement.mp3"],
    volumeScale: 1.0,
    maxSimultaneous: 1,
    duckMusic: true,
    synthesizedFallback: () => {
      soundManager.playSound("roundSettlement");
    },
  },
  matchVictory: {
    id: "matchVictory",
    sources: ["/audio/sfx/match_victory.webm", "/audio/sfx/match_victory.mp3"],
    volumeScale: 1.0,
    maxSimultaneous: 1,
    duckMusic: true,
    synthesizedFallback: () => {
      soundManager.playSound("matchVictory");
    },
  },
  matchDefeat: {
    id: "matchDefeat",
    sources: ["/audio/sfx/match_defeat.webm", "/audio/sfx/match_defeat.mp3"],
    volumeScale: 0.8,
    maxSimultaneous: 1,
    duckMusic: true,
    synthesizedFallback: () => {
      soundManager.playSound("roundSettlement");
    },
  },
};
