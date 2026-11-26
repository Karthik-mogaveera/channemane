/**
 * Central Animation Coordinator
 * Coordinates GSAP seed trajectories, queues engine-driven visual events,
 * tracks virtual hovering hand cluster + incoming/outgoing reserves so seeds never
 * duplicate or vanish during flight, supports cancellation/cleanup, and reconciles
 * displayed 3D counts cleanly with authoritative engine state.
 */

import gsap from "gsap";
import type { GameState, Player } from "../../engine/types";
import type { VisualSeedAnimationEvent } from "../../adapters/engineToVisualEvents";
import {
  getPitWorldPosition,
  getStorageWorldPosition,
  type SupportedPlayerCount,
} from "../config/boardVisualConfigs";
import { getPitSeedPositions3D } from "../seeds/SeedLayout";
import type { SeedVariant } from "../seeds/SeedMaterials";
import { SowingAnimation } from "./SowingAnimation";
import { CaptureAnimation } from "./CaptureAnimation";
import { BonusAnimation } from "./BonusAnimation";
import { ANIMATION_PRESETS, type AnimationDurationConfig } from "./TransitionAnimation";
import { audioManager } from "../../audio/AudioManager";

export interface ActiveFlyingSeed {
  id: string;
  position: [number, number, number];
  rotation: [number, number, number];
  scale?: [number, number, number];
  variant?: SeedVariant;
  toneIndex?: number;
}

export interface HandClusterState {
  visible: boolean;
  position: [number, number, number];
  seedCount: number;
}

export interface CoordinatorVisualSnapshot {
  flyingSeeds: ActiveFlyingSeed[];
  handCluster: HandClusterState;
  pitIncomingReserve: Record<number, number>;
  storageIncomingReserve: Partial<Record<Player, number>>;
  pitSeedOverrides: Record<number, number>;
  activeSettlement: boolean;
  isBusy: boolean;
}

export type AnimationListener = (flyingSeeds: ActiveFlyingSeed[]) => void;
export type SnapshotListener = (snapshot: CoordinatorVisualSnapshot) => void;

const INITIAL_HAND_STATE: HandClusterState = {
  visible: false,
  position: [0, 1.38, 0],
  seedCount: 0,
};

export class AnimationCoordinator {
  private activeTweens: Set<gsap.core.Tween> = new Set();
  private activeTimelines: Set<gsap.core.Timeline> = new Set();
  private flyingSeeds: Map<string, ActiveFlyingSeed> = new Map();
  private listeners: Set<AnimationListener> = new Set();
  private snapshotListeners: Set<SnapshotListener> = new Set();

  private speed: "SLOW" | "FAST" = "FAST";
  private playerCount: SupportedPlayerCount = 2;
  private audioEnabled: boolean = true;
  private lastProcessedSequence: number = -1;

  private handCluster: HandClusterState = { ...INITIAL_HAND_STATE };
  private pitIncomingReserve: Record<number, number> = {};
  private storageIncomingReserve: Partial<Record<Player, number>> = {};
  private pitSeedOverrides: Record<number, number> = {};
  private activeSettlement: boolean = false;
  private pendingSettlementCallback: (() => void) | null = null;
  private settlementSafetyTimer: ReturnType<typeof setTimeout> | null = null;
  private seedUidCounter: number = 0;

  constructor() {
    if (typeof document !== "undefined") {
      document.addEventListener("visibilitychange", this.handleVisibilityChange);
    }
  }

  private handleVisibilityChange = (): void => {
    if (typeof document !== "undefined" && !document.hidden && this.activeSettlement) {
      // Force active timelines cleanly forward if browser backgrounded mid-settlement
      for (const tl of Array.from(this.activeTimelines)) {
        try {
          tl.progress(1);
        } catch {
          // ignore
        }
      }
    }
  };

  public setSpeed(speed: "SLOW" | "FAST"): void {
    this.speed = speed;
  }

  public setPlayerCount(playerCount: SupportedPlayerCount): void {
    this.playerCount = playerCount;
  }

  public setAudioEnabled(enabled: boolean): void {
    this.audioEnabled = enabled;
  }

  public getTiming(): AnimationDurationConfig {
    return ANIMATION_PRESETS[this.speed];
  }

  public subscribe(listener: AnimationListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  public subscribeSnapshot(listener: SnapshotListener): () => void {
    this.snapshotListeners.add(listener);
    listener(this.getSnapshot());
    return () => this.snapshotListeners.delete(listener);
  }

  public getSnapshot(): CoordinatorVisualSnapshot {
    const flyingList = Array.from(this.flyingSeeds.values());
    const hasPitReserves = Object.values(this.pitIncomingReserve).some((v) => v > 0);
    const hasStorageReserves = Object.values(this.storageIncomingReserve).some((v) => (v ?? 0) > 0);
    return {
      flyingSeeds: flyingList,
      handCluster: {
        visible: this.handCluster.visible,
        position: [...this.handCluster.position],
        seedCount: this.handCluster.seedCount,
      },
      pitIncomingReserve: { ...this.pitIncomingReserve },
      storageIncomingReserve: { ...this.storageIncomingReserve },
      pitSeedOverrides: { ...this.pitSeedOverrides },
      activeSettlement: this.activeSettlement,
      isBusy:
        this.activeSettlement ||
        this.activeTweens.size > 0 ||
        this.activeTimelines.size > 0 ||
        flyingList.length > 0 ||
        hasPitReserves ||
        hasStorageReserves,
    };
  }

  private nextSeedId(prefix: string): string {
    this.seedUidCounter += 1;
    return `${prefix}-${this.seedUidCounter}`;
  }

  private playAudio(sfx: Parameters<typeof audioManager.sfx.play>[0]): void {
    if (!this.audioEnabled) return;
    try {
      audioManager.sfx.play(sfx);
    } catch {
      // ignore audio failures cleanly
    }
  }

  private notify(): void {
    const seeds = Array.from(this.flyingSeeds.values());
    for (const listener of this.listeners) {
      listener(seeds);
    }
    if (this.snapshotListeners.size > 0) {
      const snap = this.getSnapshot();
      for (const listener of this.snapshotListeners) {
        listener(snap);
      }
    }
  }

  private adjustPitReserve(pitId: number, delta: number): void {
    const next = Math.max(0, (this.pitIncomingReserve[pitId] ?? 0) + delta);
    if (next === 0) {
      delete this.pitIncomingReserve[pitId];
    } else {
      this.pitIncomingReserve[pitId] = next;
    }
  }

  private adjustStorageReserve(player: Player, delta: number): void {
    const next = Math.max(0, (this.storageIncomingReserve[player] ?? 0) + delta);
    if (next === 0) {
      delete this.storageIncomingReserve[player];
    } else {
      this.storageIncomingReserve[player] = next;
    }
  }

  private trackTween(tween: gsap.core.Tween): void {
    this.activeTweens.add(tween);
  }

  private untrackTween(tween: gsap.core.Tween): void {
    this.activeTweens.delete(tween);
  }

  /**
   * Triggers a single legacy sowing seed leap between two pits.
   */
  public triggerSowStep(
    fromPitId: number,
    toPitId: number,
    onStepSettled?: () => void
  ): void {
    const timing = this.getTiming();
    const seedId = this.nextSeedId("flying");

    this.adjustPitReserve(toPitId, 1);

    const tween = SowingAnimation.animateSeedDrop(
      fromPitId,
      toPitId,
      timing.dropDuration,
      timing.arcHeight,
      (pos, rot) => {
        this.flyingSeeds.set(seedId, { id: seedId, position: pos, rotation: rot });
        this.notify();
      },
      () => {
        this.untrackTween(tween);
        this.flyingSeeds.delete(seedId);
        this.adjustPitReserve(toPitId, -1);
        this.notify();
        this.playAudio("seedPlacement");
        if (onStepSettled) onStepSettled();
      },
      this.playerCount
    );

    this.trackTween(tween);
    this.notify();
  }

  /**
   * Processes monotonic engine visual events through GSAP trajectories and reserve locking.
   */
  public enqueueEvents(
    events: VisualSeedAnimationEvent[],
    options?: {
      playerCount?: SupportedPlayerCount;
      onSettlementComplete?: () => void;
    }
  ): void {
    if (options?.playerCount) {
      this.playerCount = options.playerCount;
    }

    for (const event of events) {
      if (event.sequence !== undefined) {
        if (event.sequence <= this.lastProcessedSequence) continue;
        this.lastProcessedSequence = event.sequence;
      }

      if (event.playerCount) {
        this.playerCount = event.playerCount;
      }

      switch (event.type) {
        case "LIFT_FROM_PIT":
          this.handlePickupOrScoop(event.sourcePitId ?? 0, event.seedsCount, false);
          break;

        case "SCOOP_FROM_PIT":
          this.handlePickupOrScoop(event.sourcePitId ?? 0, event.seedsCount, true);
          break;

        case "DROP_INTO_PIT":
          if (event.targetPitId !== undefined) {
            this.handleDropIntoPit(event);
          }
          break;

        case "CAPTURE_TO_STORAGE":
          if (event.sourcePitId !== undefined && event.targetPlayerStorage) {
            this.handleCaptureToStorage(
              event.sourcePitId,
              event.targetPlayerStorage,
              event.seedsCount
            );
          }
          break;

        case "CLAIM_BONUS_TO_STORAGE":
          if (event.sourcePitId !== undefined && event.targetPlayerStorage) {
            this.handleBonusToStorage(
              event.sourcePitId,
              event.targetPlayerStorage,
              Math.max(1, event.seedsCount || 4)
            );
          }
          break;

        case "ROUND_SETTLEMENT":
          this.handleRoundSettlement(event, options?.onSettlementComplete);
          break;

        case "NEXT_ROUND":
          this.clearActiveAnimationsOnly();
          this.notify();
          break;

        default:
          break;
      }
    }
  }

  private handlePickupOrScoop(pitId: number, seedsCount: number, isScoop: boolean): void {
    const timing = this.getTiming();
    const pitPos = getPitWorldPosition(pitId, this.playerCount);
    const targetHandPos: [number, number, number] = [pitPos[0], 1.38, pitPos[2]];

    this.playAudio(isScoop ? "continuousSow" : "seedPickup");

    // Glide hand cluster smoothly over the scooped pit (or place above start pit)
    if (this.handCluster.visible) {
      const startHand: [number, number, number] = [...this.handCluster.position];
      const handObj = { t: 0 };
      const glideTween = gsap.to(handObj, {
        t: 1,
        duration: timing.liftDuration,
        ease: "power2.out",
        onUpdate: () => {
          this.handCluster.position = [
            startHand[0] + (targetHandPos[0] - startHand[0]) * handObj.t,
            startHand[1] + (targetHandPos[1] - startHand[1]) * handObj.t,
            startHand[2] + (targetHandPos[2] - startHand[2]) * handObj.t,
          ];
          this.notify();
        },
        onComplete: () => {
          this.untrackTween(glideTween);
        },
      });
      this.trackTween(glideTween);
    } else {
      this.handCluster.position = targetHandPos;
    }

    this.handCluster.visible = seedsCount > 0;
    this.handCluster.seedCount = seedsCount;

    // Animate representative seeds rising from the pit cavity into the hand cluster
    const beadCount = Math.min(seedsCount, 6);
    for (let i = 0; i < beadCount; i++) {
      const seedId = this.nextSeedId(isScoop ? "scoop" : "pickup");
      const angle = (i / Math.max(1, beadCount)) * Math.PI * 2;
      const spreadX = Math.cos(angle) * 0.14;
      const spreadZ = Math.sin(angle) * 0.14;
      const fromPos: [number, number, number] = [pitPos[0] + spreadX, -0.22, pitPos[2] + spreadZ];
      const toPos: [number, number, number] = [
        targetHandPos[0] + spreadX * 0.7,
        targetHandPos[1] - 0.08,
        targetHandPos[2] + spreadZ * 0.7,
      ];

      const tween = SowingAnimation.animateSeedArc(
        fromPos,
        toPos,
        timing.liftDuration,
        0.16,
        (pos, rot) => {
          this.flyingSeeds.set(seedId, {
            id: seedId,
            position: pos,
            rotation: rot,
            variant: i % 2 === 0 ? "light" : "dark",
            toneIndex: i % 3,
          });
          this.notify();
        },
        () => {
          this.untrackTween(tween);
          this.flyingSeeds.delete(seedId);
          this.notify();
        },
        "power2.out"
      );
      this.trackTween(tween);
    }

    this.notify();
  }

  private handleDropIntoPit(event: VisualSeedAnimationEvent): void {
    const targetPitId = event.targetPitId!;
    const timing = this.getTiming();
    const pitPos = getPitWorldPosition(targetPitId, this.playerCount);

    // Exact target seed bowl coordinate matching SeedLayout slot
    const targetCount = Math.max(1, event.resultingSeedsInTarget ?? 1);
    const bowlTransforms = getPitSeedPositions3D(targetCount, pitPos, targetPitId);
    const landedTransform = bowlTransforms[targetCount - 1];
    const toPos: [number, number, number] = landedTransform
      ? landedTransform.position
      : [pitPos[0], -0.22, pitPos[2]];

    const startHandPos: [number, number, number] = this.handCluster.visible
      ? [...this.handCluster.position]
      : event.fromPitId !== undefined
        ? (() => {
            const fp = getPitWorldPosition(event.fromPitId, this.playerCount);
            return [fp[0], 1.38, fp[2]];
          })()
        : [pitPos[0], 1.38, pitPos[2]];

    const nextHandPos: [number, number, number] = [pitPos[0], 1.38, pitPos[2]];

    // Update hand count immediately when seed detaches for flight
    const nextHandCount =
      event.remainingInHand !== undefined
        ? Math.max(0, event.remainingInHand)
        : Math.max(0, this.handCluster.seedCount - 1);

    this.handCluster.seedCount = nextHandCount;
    this.handCluster.visible = nextHandCount > 0;

    if (nextHandCount > 0) {
      const glideObj = { t: 0 };
      const glideTween = gsap.to(glideObj, {
        t: 1,
        duration: Math.max(0.05, timing.dropDuration * 0.72),
        ease: "power2.out",
        onUpdate: () => {
          this.handCluster.position = [
            startHandPos[0] + (nextHandPos[0] - startHandPos[0]) * glideObj.t,
            startHandPos[1] + (nextHandPos[1] - startHandPos[1]) * glideObj.t,
            startHandPos[2] + (nextHandPos[2] - startHandPos[2]) * glideObj.t,
          ];
          this.notify();
        },
        onComplete: () => {
          this.untrackTween(glideTween);
        },
      });
      this.trackTween(glideTween);
    } else {
      this.handCluster.position = nextHandPos;
    }

    // Reserve incoming seed in target pit until parabolic drop lands
    this.adjustPitReserve(targetPitId, 1);

    const seedId = this.nextSeedId("drop");
    const dropFrom: [number, number, number] = [
      startHandPos[0],
      Math.max(0.95, startHandPos[1] - 0.1),
      startHandPos[2],
    ];

    const tween = SowingAnimation.animateSeedArc(
      dropFrom,
      toPos,
      timing.dropDuration,
      timing.arcHeight * 0.45,
      (pos, rot) => {
        this.flyingSeeds.set(seedId, {
          id: seedId,
          position: pos,
          rotation: rot,
          scale: landedTransform?.scale,
          variant: landedTransform?.variant,
          toneIndex: landedTransform?.toneIndex,
        });
        this.notify();
      },
      () => {
        this.untrackTween(tween);
        this.flyingSeeds.delete(seedId);
        this.adjustPitReserve(targetPitId, -1);
        this.notify();
        this.playAudio("seedPlacement");
      },
      "power1.inOut"
    );

    this.trackTween(tween);
    this.notify();
  }

  private handleCaptureToStorage(
    sourcePitId: number,
    targetPlayer: Player,
    seedsCount: number
  ): void {
    if (seedsCount <= 0) return;

    const timing = this.getTiming();
    const batchKey = this.nextSeedId("capture");
    let releasedSoFar = 0;

    this.adjustStorageReserve(targetPlayer, seedsCount);
    this.playAudio("capture");

    const tl = CaptureAnimation.animateCaptureToStorage(
      sourcePitId,
      targetPlayer,
      seedsCount,
      timing.captureDuration,
      (positions, arrivedRatio = 0) => {
        // Clear stale entries in this capture batch before rewriting active positions
        for (const k of Array.from(this.flyingSeeds.keys())) {
          if (k.startsWith(batchKey)) {
            this.flyingSeeds.delete(k);
          }
        }
        positions.forEach((pos, idx) => {
          const id = `${batchKey}-${idx}`;
          this.flyingSeeds.set(id, {
            id,
            position: pos,
            rotation: [pos[1] * 0.8, idx * 0.9, pos[0] * 0.25],
            variant: idx % 2 === 0 ? "light" : "dark",
            toneIndex: idx % 3,
          });
        });

        const expectedReleased = Math.min(seedsCount, Math.floor(arrivedRatio * seedsCount));
        const delta = expectedReleased - releasedSoFar;
        if (delta > 0) {
          releasedSoFar += delta;
          this.adjustStorageReserve(targetPlayer, -delta);
        }

        this.notify();
      },
      () => {
        this.activeTimelines.delete(tl);
        for (const k of Array.from(this.flyingSeeds.keys())) {
          if (k.startsWith(batchKey)) {
            this.flyingSeeds.delete(k);
          }
        }
        const remaining = seedsCount - releasedSoFar;
        if (remaining > 0) {
          this.adjustStorageReserve(targetPlayer, -remaining);
        }
        this.notify();
      },
      this.playerCount
    );

    this.activeTimelines.add(tl);
    this.notify();
  }

  private handleBonusToStorage(
    sourcePitId: number,
    owner: Player,
    seedsCount: number
  ): void {
    const timing = this.getTiming();
    const batchKey = this.nextSeedId("bonus");
    let releasedSoFar = 0;

    this.adjustStorageReserve(owner, seedsCount);
    this.playAudio("bonusClaim");

    const tl = BonusAnimation.animateBonusClaim(
      sourcePitId,
      owner,
      timing.bonusDuration,
      (positions, arrivedCount = 0) => {
        for (const k of Array.from(this.flyingSeeds.keys())) {
          if (k.startsWith(batchKey)) {
            this.flyingSeeds.delete(k);
          }
        }
        positions.forEach((pos, idx) => {
          const id = `${batchKey}-${idx}`;
          this.flyingSeeds.set(id, {
            id,
            position: pos,
            rotation: [pos[1] * 0.7, idx * 1.1, pos[2] * 0.3],
            variant: idx % 2 === 0 ? "light" : "dark",
            toneIndex: idx % 3,
          });
        });

        const clampedArrived = Math.min(seedsCount, arrivedCount);
        const delta = clampedArrived - releasedSoFar;
        if (delta > 0) {
          releasedSoFar += delta;
          this.adjustStorageReserve(owner, -delta);
        }

        this.notify();
      },
      () => {
        this.activeTimelines.delete(tl);
        for (const k of Array.from(this.flyingSeeds.keys())) {
          if (k.startsWith(batchKey)) {
            this.flyingSeeds.delete(k);
          }
        }
        const remaining = seedsCount - releasedSoFar;
        if (remaining > 0) {
          this.adjustStorageReserve(owner, -remaining);
        }
        this.notify();
      },
      this.playerCount
    );

    this.activeTimelines.add(tl);
    this.notify();
  }

  private handleRoundSettlement(
    event: VisualSeedAnimationEvent,
    onSettlementComplete?: () => void
  ): void {
    const transfers = event.pitTransfers ?? [];
    if (this.settlementSafetyTimer) {
      clearTimeout(this.settlementSafetyTimer);
      this.settlementSafetyTimer = null;
    }

    if (transfers.length === 0) {
      this.activeSettlement = false;
      this.pitSeedOverrides = {};
      this.notify();
      if (onSettlementComplete) {
        onSettlementComplete();
      }
      return;
    }

    const timing = this.getTiming();
    this.activeSettlement = true;
    this.pendingSettlementCallback = onSettlementComplete ?? null;
    this.pitSeedOverrides = {};

    const addedStorageReserve: Partial<Record<Player, number>> = {};
    for (const transfer of transfers) {
      this.pitSeedOverrides[transfer.pitId] = transfer.seeds;
      this.adjustStorageReserve(transfer.owner, transfer.seeds);
      addedStorageReserve[transfer.owner] =
        (addedStorageReserve[transfer.owner] ?? 0) + transfer.seeds;
    }

    const finishSettlement = () => {
      if (this.settlementSafetyTimer) {
        clearTimeout(this.settlementSafetyTimer);
        this.settlementSafetyTimer = null;
      }
      for (const k of Array.from(this.flyingSeeds.keys())) {
        if (k.startsWith("settle-")) {
          this.flyingSeeds.delete(k);
        }
      }
      this.pitSeedOverrides = {};
      this.storageIncomingReserve = {};
      this.activeSettlement = false;
      const cb = this.pendingSettlementCallback;
      this.pendingSettlementCallback = null;
      this.notify();
      if (cb) cb();
    };

    const masterTl = gsap.timeline({
      onComplete: () => {
        this.activeTimelines.delete(masterTl);
        finishSettlement();
      },
    });

    const staggerSec = this.speed === "SLOW" ? 0.075 : 0.04;
    const itemDurSec = this.speed === "SLOW" ? 0.42 : 0.22;

    transfers.forEach((transfer, idx) => {
      const fromPos = getPitWorldPosition(transfer.pitId, this.playerCount);
      const toPos = getStorageWorldPosition(transfer.owner, this.playerCount);
      const batchKey = `settle-${transfer.pitId}`;
      const visibleBeads = Math.min(transfer.seeds, 5);
      const animObj = { t: 0 };
      let started = false;
      let released = false;

      masterTl.to(
        animObj,
        {
          t: 1,
          duration: itemDurSec,
          ease: "power2.inOut",
          onStart: () => {
            if (started) return;
            started = true;
            this.pitSeedOverrides[transfer.pitId] = 0;
            this.notify();
          },
          onUpdate: () => {
            const t = animObj.t;
            for (let b = 0; b < visibleBeads; b++) {
              const id = `${batchKey}-${b}`;
              const spread = (b - (visibleBeads - 1) / 2) * 0.16 * Math.sin(t * Math.PI);
              const x = fromPos[0] + (toPos[0] - fromPos[0]) * t + spread;
              const z = fromPos[2] + (toPos[2] - fromPos[2]) * t + spread * 0.65;
              const arc = Math.sin(t * Math.PI) * (timing.arcHeight * 1.35);
              const y = -0.18 + arc;
              this.flyingSeeds.set(id, {
                id,
                position: [x, y, z],
                rotation: [t * Math.PI * 1.4, b * 0.8 + t * Math.PI, Math.sin(t * Math.PI) * 0.3],
                variant: b % 2 === 0 ? "light" : "dark",
                toneIndex: b % 3,
              });
            }
            this.notify();
          },
          onComplete: () => {
            if (released) return;
            released = true;
            for (let b = 0; b < visibleBeads; b++) {
              this.flyingSeeds.delete(`${batchKey}-${b}`);
            }
            this.adjustStorageReserve(transfer.owner, -transfer.seeds);
            this.playAudio("seedPlacement");
            this.notify();
          },
        },
        idx * staggerSec
      );
    });

    this.activeTimelines.add(masterTl);

    // Safety fallback if RAF is suspended in headless/background tab
    const expectedMs =
      Math.ceil((transfers.length * staggerSec + itemDurSec) * 1000) + 1200;
    this.settlementSafetyTimer = setTimeout(() => {
      if (this.activeSettlement) {
        this.activeTimelines.delete(masterTl);
        try {
          masterTl.kill();
        } catch {
          // ignore
        }
        finishSettlement();
      }
    }, Math.max(1500, Math.min(expectedMs, 5500)));

    this.notify();
  }

  private clearActiveAnimationsOnly(): void {
    if (this.settlementSafetyTimer) {
      clearTimeout(this.settlementSafetyTimer);
      this.settlementSafetyTimer = null;
    }

    for (const tween of Array.from(this.activeTweens)) {
      try {
        tween.kill();
      } catch {
        // ignore
      }
    }
    for (const tl of Array.from(this.activeTimelines)) {
      try {
        tl.kill();
      } catch {
        // ignore
      }
    }

    this.activeTweens.clear();
    this.activeTimelines.clear();
    this.flyingSeeds.clear();
    this.handCluster = { ...INITIAL_HAND_STATE };
    this.pitIncomingReserve = {};
    this.storageIncomingReserve = {};
    this.pitSeedOverrides = {};
    this.activeSettlement = false;
    this.pendingSettlementCallback = null;
  }

  /**
   * Reconciles visual state with authoritative engine state and clears all in-flight animations.
   */
  public cancelAndReconcile(authoritativeState?: GameState): void {
    this.clearActiveAnimationsOnly();
    if (authoritativeState?.playerCount) {
      this.playerCount = authoritativeState.playerCount;
    }
    this.notify();
  }

  public dispose(): void {
    if (typeof document !== "undefined") {
      document.removeEventListener("visibilitychange", this.handleVisibilityChange);
    }
    this.clearActiveAnimationsOnly();
    this.listeners.clear();
    this.snapshotListeners.clear();
  }
}
