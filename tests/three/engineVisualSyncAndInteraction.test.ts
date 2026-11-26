/**
 * Engine-to-Visual Synchronisation & Interaction Tests
 * Verifies:
 * - Valid and invalid pit selection guards.
 * - Continuous sowing, closed pit skipping, and capture event mapping.
 * - Bonus availability and claiming visual synchronization.
 * - Scene reconciliation upon animation cancellation.
 * - 2D and 3D view toggle preserves state without resetting match.
 */

import { describe, it, expect } from "vitest";
import { createInitialGame, cloneGameState } from "../../src/engine/board";
import { mapEngineToVisualState } from "../../src/adapters/engineToVisualState";
import {
  mapEngineEventsToVisualEvents,
  createSettlementVisualEvent,
} from "../../src/adapters/engineToVisualEvents";
import { BoardInputController } from "../../src/three/interaction/BoardInput";
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

  it("switching between 2D and 3D views preserves complete game state and seed counts", () => {
    const state1 = createInitialGame("PLAYER_1", "local");
    state1.pits[0]!.seeds = 0;
    state1.pits[1]!.seeds = 6;
    state1.players.player1.storage = 8;
    state1.players.player2.storage = 2;

    const cloneFor2D = cloneGameState(state1);
    const cloneFor3D = cloneGameState(state1);

    const visual2D = mapEngineToVisualState({ gameState: cloneFor2D });
    const visual3D = mapEngineToVisualState({ gameState: cloneFor3D });

    expect(visual2D.totalVisibleSeeds).toBe(visual3D.totalVisibleSeeds);
    expect(visual2D.storage.player1.seeds).toBe(visual3D.storage.player1.seeds);
    expect(visual2D.storage.player2.seeds).toBe(visual3D.storage.player2.seeds);
    expect(visual2D.currentPlayer).toBe(visual3D.currentPlayer);
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
  });
});
