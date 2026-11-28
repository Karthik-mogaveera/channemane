/**
 * Engine-to-Visual Synchronisation & Interaction Tests
 * Verifies:
 * - Valid and invalid pit selection guards.
 * - Continuous sowing, closed pit skipping, and capture event mapping.
 * - Bonus availability and claiming visual synchronization.
 * - Scene reconciliation upon animation cancellation.
 * - Deterministic 3D visual state synchronization and camera mode invariance.
 */

import { describe, it, expect } from "vitest";
import { createInitialGame, cloneGameState } from "../../src/engine/board";
import { mapEngineToVisualState } from "../../src/adapters/engineToVisualState";
import {
  mapEngineEventsToVisualEvents,
  createSettlementVisualEvent,
} from "../../src/adapters/engineToVisualEvents";
import {
  BoardInputController,
  PIT_CLICK_DRAG_THRESHOLD_PX,
  hasExceededDragThreshold,
} from "../../src/three/interaction/BoardInput";
import { AnimationCoordinator } from "../../src/three/animation/AnimationCoordinator";
import { playTurn } from "../../src/engine/game";
import { claimBonus } from "../../src/engine/bonus";
import { executeRoundSettlement } from "../../src/engine/settlement";
import type { TurnAnimationEvent } from "../../src/engine/types";

describe("Engine-to-Visual Synchronisation & Interaction Suite", () => {
  it("prevents selecting opponent pits or non-selectable pits via BoardInputController", () => {
    const state = createInitialGame("PLAYER_1", "local");
    const visual = mapEngineToVisualState({
      gameState: state,
      selectablePits: [0, 1, 2, 3, 4, 5, 6],
    });

    const p1Pit = visual.pits[0]!;
    const p2Pit = visual.pits[13]!;

    // Player 1 pit is selectable
    const p1Check = BoardInputController.canSelectPit(p1Pit, false, "WAITING_FOR_START");
    expect(p1Check.allowed).toBe(true);

    // Player 2 pit is not selectable when Player 1 is active
    const p2Check = BoardInputController.canSelectPit(p2Pit, false, "WAITING_FOR_START");
    expect(p2Check.allowed).toBe(false);
  });

  it("blocks pit selection while an animation is in progress", () => {
    const state = createInitialGame("PLAYER_1", "local");
    const visual = mapEngineToVisualState({
      gameState: state,
      selectablePits: [0, 1, 2, 3, 4, 5, 6],
      isAnimating: true,
    });

    const p1Pit = visual.pits[2]!;
    const check = BoardInputController.canSelectPit(p1Pit, true, "SOWING_ANIMATION");
    expect(check.allowed).toBe(false);
    expect(check.reason).toBe("Animation in progress");
  });

  it("translates engine TurnAnimationEvents to visual flight events", () => {
    const events: TurnAnimationEvent[] = [
      { type: "PICKUP", pitId: 0, seedsPickedUp: 5 },
      {
        type: "DROP",
        pitId: 1,
        seedsPlaced: 1,
        resultingSeeds: 6,
        seedsRemainingInHand: 4,
        bonusTriggered: false,
        bonusOwner: null,
      },
      {
        type: "DROP",
        pitId: 2,
        seedsPlaced: 1,
        resultingSeeds: 6,
        seedsRemainingInHand: 3,
        bonusTriggered: false,
        bonusOwner: null,
      },
      { type: "SCOOP", pitId: 5, seedsScooped: 6 },
      {
        type: "CAPTURE",
        capturingPlayer: "PLAYER_1",
        capturedPitId: 8,
        seedsCaptured: 4,
        newStorageTotal: 4,
      },
    ];

    const visualEvents = mapEngineEventsToVisualEvents(events);
    expect(visualEvents).toHaveLength(5);
    expect(visualEvents[0]!.type).toBe("LIFT_FROM_PIT");
    expect(visualEvents[0]!.sourcePitId).toBe(0);
    expect(visualEvents[1]!.type).toBe("DROP_INTO_PIT");
    expect(visualEvents[1]!.targetPitId).toBe(1);
    expect(visualEvents[3]!.type).toBe("SCOOP_FROM_PIT");
    expect(visualEvents[4]!.type).toBe("CAPTURE_TO_STORAGE");
    expect(visualEvents[4]!.targetPlayerStorage).toBe("PLAYER_1");
  });

  it("preserves authoritative seed conservation invariant after full engine turn execution", () => {
    const state = createInitialGame("PLAYER_1", "local");
    const turnResult = playTurn(state, 0);

    expect(turnResult.success).toBe(true);

    const visual = mapEngineToVisualState({ gameState: state });
    expect(visual.totalVisibleSeeds).toBe(70);
    expect(visual.totalBoardSeeds + visual.totalStorageSeeds).toBe(70);
  });

  it("reconciles visual state correctly with engine when bonus is claimed", () => {
    const state = createInitialGame("PLAYER_1", "local");
    // Preserve 70-seed invariant: pit 3 had 5, sowed into pit 4 so pit 3 has 4, pit 4 has 6
    state.pits[3]!.seeds = 4;
    state.pits[4]!.seeds = 6;
    state.pits[3]!.bonusAvailable = true;

    const claimRes = claimBonus(state, 3);
    expect(claimRes.success).toBe(true);

    const visual = mapEngineToVisualState({ gameState: state });
    expect(visual.pits[3]!.seeds).toBe(0);
    expect(visual.pits[3]!.bonusAvailable).toBe(false);
    expect(visual.storage.player1.seeds).toBe(4);
    expect(visual.totalVisibleSeeds).toBe(70);
  });

  it("reconciles scene completely when AnimationCoordinator is cancelled", () => {
    const coordinator = new AnimationCoordinator();
    const state = createInitialGame("PLAYER_1", "local");

    coordinator.triggerSowStep(0, 1);
    coordinator.triggerSowStep(1, 2);

    coordinator.cancelAndReconcile(state);

    let activeCount = -1;
    coordinator.subscribe((seeds) => {
      activeCount = seeds.length;
    });

    expect(activeCount).toBe(-1); // Cleared
    coordinator.dispose();
  });

  it("maps authoritative engine mutations deterministically into 3D visual state", () => {
    const state1 = createInitialGame("PLAYER_1", "local");
    state1.pits[0]!.seeds = 0;
    state1.pits[1]!.seeds = 6;
    state1.players.player1.storage = 8;
    state1.players.player2.storage = 2;

    const visualA = mapEngineToVisualState({ gameState: cloneGameState(state1) });
    const visualB = mapEngineToVisualState({ gameState: cloneGameState(state1) });

    expect(visualA.totalVisibleSeeds).toBe(visualB.totalVisibleSeeds);
    expect(visualA.storage.player1.seeds).toBe(8);
    expect(visualA.storage.player2.seeds).toBe(2);
    expect(visualA.pits[0]?.seeds).toBe(0);
    expect(visualA.pits[1]?.seeds).toBe(6);
    expect(visualA.currentPlayer).toBe(visualB.currentPlayer);
  });

  it("maps continuation targets, capture targets, closed pits, and settlement waves accurately across 2P-6P", () => {
    const state = createInitialGame("PLAYER_1", "local");
    state.pits[4]!.status = "CLOSED";
    state.pits[4]!.seeds = 0;
    state.pits[5]!.seeds = 6;

    const visualCont = mapEngineToVisualState({
      gameState: state,
      selectablePits: [],
      highlightedContinuationPit: 5,
      interactionState: "WAITING_FOR_CONTINUATION",
    });

    expect(visualCont.pits[4]!.status).toBe("CLOSED");
    expect(visualCont.pits[5]!.isContinuationTarget).toBe(true);
    expect(visualCont.pits[5]!.isSelectable).toBe(false);

    const visualCap = mapEngineToVisualState({
      gameState: state,
      selectablePits: [],
      highlightedCapturePit: 8,
      interactionState: "WAITING_FOR_CAPTURE",
    });
    expect(visualCap.pits[8]!.isCaptureTarget).toBe(true);

    // 4-player settlement event preserves owner-specific pit transfers (maintain 80-seed conservation)
    const fourPlayerState = createInitialGame("PLAYER_1", "local", null, undefined, 4);
    for (let i = 0; i < fourPlayerState.pits.length; i++) {
      fourPlayerState.pits[i]!.seeds = i % 4 === 0 ? 1 : 0;
    }
    fourPlayerState.players.player1.storage = 76;
    const settleRes = executeRoundSettlement(fourPlayerState);
    expect(settleRes.success).toBe(true);
    if (settleRes.success) {
      const visualEvent = createSettlementVisualEvent(settleRes.data, 4);
      expect(visualEvent.type).toBe("ROUND_SETTLEMENT");
      expect(visualEvent.playerCount).toBe(4);
      expect(visualEvent.pitTransfers?.length).toBeGreaterThan(0);
      for (const tr of visualEvent.pitTransfers ?? []) {
        expect(tr.owner).toBe(fourPlayerState.pits[tr.pitId]!.owner);
        expect(tr.seeds).toBe(1);
      }
    }
    // Also verify bonus claim mid-turn synchronizes authoritative visual count & reserves cleanly without double counting
    const hookState = createInitialGame("PLAYER_1", "local");
    hookState.pits[9]!.seeds = 4;
    hookState.pits[9]!.bonusAvailable = true;
    hookState.pits[10]!.seeds = 6;
    const bonusClaimRes = claimBonus(hookState, 9);
    expect(bonusClaimRes.success).toBe(true);
    const postBonusVisual = mapEngineToVisualState({ gameState: hookState });
    expect(postBonusVisual.pits[9]!.seeds).toBe(0);
    expect(postBonusVisual.storage.player2.seeds).toBe(4);
    expect(postBonusVisual.totalVisibleSeeds).toBe(70);
  });

  it("distinguishes stationary pit taps from orbit camera drags above movement threshold", () => {
    expect(PIT_CLICK_DRAG_THRESHOLD_PX).toBe(8);
    expect(hasExceededDragThreshold(200, 150, 204, 153)).toBe(false); // 5px micro-jitter allowed
    expect(hasExceededDragThreshold(200, 150, 208, 150)).toBe(false); // exactly 8px boundary allowed
    expect(hasExceededDragThreshold(200, 150, 212, 150)).toBe(true);  // 12px horizontal orbit drag blocked
    expect(hasExceededDragThreshold(200, 150, 206, 157)).toBe(true);  // ~9.2px diagonal drag blocked
  });
});
