/**
 * Milestone 4: 3D Animation Coordinator & Full Gameplay Loop Tests
 * Verifies:
 * - Event-driven queue deduplication and GSAP trajectory lifecycle
 * - Hand seed cluster pickup, scoop, and seed drop landing/incoming reserves
 * - Capture and pit-owner 4-seed bonus flight to correct storage bowls
 * - Round settlement wave transfers + modal gating in waitForVisualSettlement mode
 * - Cancellation and full reconciliation to authoritative engine state
 * - Double-tap locking and 2P-6P multi-player hook execution
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import gsap from "gsap";
import { createInitialGame } from "../../src/engine/board";
import { executeRoundSettlement } from "../../src/engine/settlement";
import { createSettlementVisualEvent } from "../../src/adapters/engineToVisualEvents";
import { AnimationCoordinator } from "../../src/three/animation/AnimationCoordinator";
import { useChannemaneGame } from "../../src/ui/hooks/useChannemaneGame";

describe("3D AnimationCoordinator & Full Gameplay Loop Suite", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    gsap.globalTimeline.clear();
  });

  it("tracks hand cluster, incoming reserves, and reconciles cleanly across lift -> drop -> scoop -> capture -> bonus", () => {
    const coordinator = new AnimationCoordinator();
    coordinator.setAudioEnabled(false);
    coordinator.setSpeed("FAST");

    // 1. Lift 5 seeds from pit 0
    coordinator.enqueueEvents([
      {
        sequence: 1,
        type: "LIFT_FROM_PIT",
        sourcePitId: 0,
        seedsCount: 5,
        remainingInHand: 5,
        playerCount: 2,
      },
    ]);

    let snap = coordinator.getSnapshot();
    expect(snap.handCluster.visible).toBe(true);
    expect(snap.handCluster.seedCount).toBe(5);

    // 2. Drop 1 seed into pit 1 while reserving it so pit does not duplicate seed in air
    coordinator.enqueueEvents([
      {
        sequence: 2,
        type: "DROP_INTO_PIT",
        fromPitId: 0,
        targetPitId: 1,
        seedsCount: 1,
        resultingSeedsInTarget: 6,
        remainingInHand: 4,
        playerCount: 2,
      },
    ]);

    snap = coordinator.getSnapshot();
    expect(snap.pitIncomingReserve[1]).toBe(1);
    expect(snap.handCluster.seedCount).toBe(4);

    // Deduplicate duplicate sequence number
    coordinator.enqueueEvents([
      {
        sequence: 2,
        type: "DROP_INTO_PIT",
        fromPitId: 0,
        targetPitId: 1,
        seedsCount: 1,
        resultingSeedsInTarget: 6,
        remainingInHand: 4,
        playerCount: 2,
      },
    ]);
    expect(coordinator.getSnapshot().pitIncomingReserve[1]).toBe(1);

    // 3. Scoop for continuous sowing at pit 5
    coordinator.enqueueEvents([
      {
        sequence: 3,
        type: "SCOOP_FROM_PIT",
        sourcePitId: 5,
        seedsCount: 6,
        remainingInHand: 6,
        playerCount: 2,
      },
    ]);
    snap = coordinator.getSnapshot();
    expect(snap.handCluster.visible).toBe(true);
    expect(snap.handCluster.seedCount).toBe(6);

    // 4. Capture 4 seeds to PLAYER_1 storage and Claim Bonus to PLAYER_2 (pit owner!)
    coordinator.enqueueEvents([
      {
        sequence: 4,
        type: "CAPTURE_TO_STORAGE",
        sourcePitId: 8,
        targetPlayerStorage: "PLAYER_1",
        seedsCount: 4,
        playerCount: 2,
      },
      {
        sequence: 5,
        type: "CLAIM_BONUS_TO_STORAGE",
        sourcePitId: 10,
        targetPlayerStorage: "PLAYER_2",
        seedsCount: 4,
        playerCount: 2,
      },
    ]);

    snap = coordinator.getSnapshot();
    expect(snap.storageIncomingReserve.PLAYER_1).toBe(4);
    expect(snap.storageIncomingReserve.PLAYER_2).toBe(4);

    // Complete / cancel reconciles cleanly with zero leftovers
    coordinator.cancelAndReconcile(createInitialGame("PLAYER_1", "local"));
    snap = coordinator.getSnapshot();
    expect(snap.flyingSeeds).toHaveLength(0);
    expect(snap.handCluster.visible).toBe(false);
    expect(snap.pitIncomingReserve).toEqual({});
    expect(snap.storageIncomingReserve).toEqual({});
    expect(snap.activeSettlement).toBe(false);
    expect(snap.isBusy).toBe(false);

    coordinator.dispose();
  });

  it("animates round settlement waves using preSettlementState and triggers completion callback cleanly", () => {
    const coordinator = new AnimationCoordinator();
    coordinator.setAudioEnabled(false);
    coordinator.setSpeed("FAST");

    const endRoundState = createInitialGame("PLAYER_1", "local");
    for (const pit of endRoundState.pits) {
      pit.seeds = pit.id === 1 ? 2 : pit.id === 12 ? 1 : 0;
    }
    endRoundState.players.player1.storage = 34;
    endRoundState.players.player2.storage = 33;

    const res = executeRoundSettlement(endRoundState);
    expect(res.success).toBe(true);
    if (!res.success) return;

    const settleEvent = createSettlementVisualEvent(res.data, 2);
    settleEvent.sequence = 10;

    let completed = false;
    coordinator.enqueueEvents([settleEvent], {
      playerCount: 2,
      onSettlementComplete: () => {
        completed = true;
      },
    });

    const snapDuring = coordinator.getSnapshot();
    expect(snapDuring.activeSettlement).toBe(true);
    expect(snapDuring.pitSeedOverrides[1]).toBe(2);
    expect(snapDuring.pitSeedOverrides[12]).toBe(1);
    expect(snapDuring.storageIncomingReserve.PLAYER_1).toBe(2);
    expect(snapDuring.storageIncomingReserve.PLAYER_2).toBe(1);

    // Advance safety/timeline fallback so settlement completes cleanly even under headless timers
    act(() => {
      vi.advanceTimersByTime(6000);
    });

    expect(completed).toBe(true);
    const snapAfter = coordinator.getSnapshot();
    expect(snapAfter.activeSettlement).toBe(false);
    expect(snapAfter.pitSeedOverrides).toEqual({});
    expect(snapAfter.storageIncomingReserve).toEqual({});

    coordinator.dispose();
  });

  it("wires useChannemaneGame visual events, continuation, capture, rapid-tap lock, and 3D settlement gating", () => {
    // Construct deterministic capture -> round settlement scenario
    const customState = createInitialGame("PLAYER_1", "local");
    for (const pit of customState.pits) {
      pit.seeds = 0;
    }
    // P1 selects pit 0 (1 seed) -> lands in pit 1 (0 seeds) -> captures pit 2 (1 seed? wait next pit must be empty!)
    // Actually pit 0 has 1 seed -> drops in pit 1 -> pauses if pit 1 has >0 or checks pit 2 empty -> captures pit 3!
    // Put 2 seeds in pit 3 so capturing pit 3 clears board (remaining board seeds = 0 < 4 -> triggers ROUND_SETTLEMENT)
    customState.pits[0]!.seeds = 1;
    customState.pits[1]!.seeds = 0;
    customState.pits[2]!.seeds = 0;
    customState.pits[3]!.seeds = 3;
    customState.players.player1.storage = 33;
    customState.players.player2.storage = 33;

    const { result } = renderHook(() =>
      useChannemaneGame(
        "PLAYER_1",
        { enabled: true, speed: "FAST", stepDelayMs: 140 },
        customState,
        "local",
        null,
        "PLAYER_2",
        2,
        { waitForVisualSettlement: true, deferAudioToVisual: true }
      )
    );

    // Select pit 0 and try rapid double-click lock
    act(() => {
      const first = result.current.selectPit(0);
      const second = result.current.selectPit(0);
      expect(first?.success).toBe(true);
      expect(second).toBeNull();
    });

    expect(result.current.visualEvents.some((e) => e.type === "LIFT_FROM_PIT")).toBe(true);

    // Advance through drop step (140ms) and capture evaluation tick (+140ms)
    act(() => {
      vi.advanceTimersByTime(150);
    });
    act(() => {
      vi.advanceTimersByTime(150);
    });

    expect(result.current.interactionState).toBe("WAITING_FOR_CAPTURE");
    expect(result.current.highlightedCapturePit).toBe(3);

    // Confirm capture -> round ends -> settlement gating holds modal until 3D callback fires
    act(() => {
      const capRes = result.current.confirmCapture(3);
      expect(capRes.success).toBe(true);
    });

    expect(result.current.visualEvents.some((e) => e.type === "CAPTURE_TO_STORAGE")).toBe(true);
    expect(result.current.visualEvents.some((e) => e.type === "ROUND_SETTLEMENT")).toBe(true);
    expect(result.current.isAnimating).toBe(true);
    expect(result.current.settlementSummary).toBeNull();

    // Scene signals settlement wave complete -> modal opens & interaction reconciles
    act(() => {
      result.current.completeVisualSettlement();
    });

    expect(result.current.isAnimating).toBe(false);
    expect(result.current.settlementSummary).not.toBeNull();

    // Advance to next round and verify NEXT_ROUND event
    act(() => {
      const nextRes = result.current.startNextRound();
      expect(nextRes.success).toBe(true);
    });
    expect(result.current.visualEvents.some((e) => e.type === "NEXT_ROUND")).toBe(true);
    expect(result.current.interactionState).toBe("WAITING_FOR_START");
  });

  it("supports complete turn lifecycle and visual event generation across 3-to-6 player modes", () => {
    for (const count of [3, 4, 5, 6] as const) {
      const state = createInitialGame("PLAYER_1", "local", null, undefined, count);
      const { result } = renderHook(() =>
        useChannemaneGame(
          "PLAYER_1",
          { enabled: false, speed: "FAST", stepDelayMs: 0 },
          state,
          "local",
          null,
          "PLAYER_2",
          count,
          { waitForVisualSettlement: true, deferAudioToVisual: true }
        )
      );

      // Allow initial 800ms turn-start notification to clear before selecting a pit
      act(() => {
        vi.advanceTimersByTime(850);
      });

      expect(result.current.gameState.playerCount).toBe(count);
      const legalPits = result.current.selectablePits;
      expect(legalPits.length).toBeGreaterThan(0);

      act(() => {
        const res = result.current.selectPit(legalPits[0]!);
        expect(res?.success).toBe(true);
      });

      // Handle any interactive pauses cleanly until turn ends
      let safety = 0;
      while (
        (result.current.interactionState === "WAITING_FOR_CONTINUATION" ||
          result.current.interactionState === "WAITING_FOR_CAPTURE") &&
        safety < 10
      ) {
        safety += 1;
        if (result.current.highlightedContinuationPit !== null) {
          const cp = result.current.highlightedContinuationPit;
          act(() => {
            result.current.confirmContinuation(cp);
          });
        } else if (result.current.highlightedCapturePit !== null) {
          const cap = result.current.highlightedCapturePit;
          act(() => {
            result.current.confirmCapture(cap);
          });
        }
      }

      expect(result.current.interactionState).toBe("WAITING_FOR_START");
    }
  });
});
