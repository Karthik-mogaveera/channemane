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

  it("allows independent bonus claims during active sowing for either player without cancelling sowing, serializes same-storage transfers, and handles mid-sowing round end", () => {
    // Part A: Player 1 sows 5 seeds from pit 0 while Pit 10 (owned by Player 2) and Pit 4 (owned by Player 1) have claimable 4-seed bonuses
    const state = createInitialGame("PLAYER_1", "local");
    // Preserve 70-seed total: pit 10 = 4 (bonus), pit 11 = 6; pit 4 = 4 (bonus) -> put extra in storage
    state.pits[4]!.seeds = 4;
    state.pits[4]!.bonusAvailable = true;
    state.pits[10]!.seeds = 4;
    state.pits[10]!.bonusAvailable = true;
    state.pits[11]!.seeds = 6;
    state.players.player2.storage = 1; // 70 - 69 = 1

    const { result } = renderHook(() =>
      useChannemaneGame(
        "PLAYER_1",
        { enabled: true, speed: "FAST", stepDelayMs: 140 },
        state,
        "local",
        null,
        "PLAYER_2",
        2,
        { waitForVisualSettlement: true, deferAudioToVisual: true }
      )
    );

    // Dismiss turn-start notification so pit 0 is selectable
    act(() => {
      vi.advanceTimersByTime(850);
    });

    // Start sowing from pit 0
    act(() => {
      const startRes = result.current.selectPit(0);
      expect(startRes?.success).toBe(true);
    });

    expect(result.current.isAnimating).toBe(true);
    expect(result.current.interactionState).toBe("SOWING_ANIMATION");

    // Step 1 drops into pit 1 (4 seeds remaining in hand)
    act(() => {
      vi.advanceTimersByTime(150);
    });

    // Player 1's sowing is ACTIVE -> claim Player 2's bonus on pit 10 AND verify duplicate claim is blocked safely
    act(() => {
      const claimRes = result.current.claimBonus(10);
      expect(claimRes.success).toBe(true);
      if (claimRes.success) {
        expect(claimRes.data.owner).toBe("PLAYER_2");
      }

      // Immediate second rapid claim on the same pit 10 must be rejected silently without setting error alert
      const dupRes = result.current.claimBonus(10);
      expect(dupRes.success).toBe(false);
    });

    // Active sowing must STILL be running cleanly!
    expect(result.current.isAnimating).toBe(true);
    expect(result.current.interactionState).toBe("SOWING_ANIMATION");
    expect(result.current.lastActionError).toBeNull();
    // Credits strictly to Player 2 storage (1 -> 5), Player 1 untouched (0)
    expect(result.current.authoritativeGameState.players.player2.storage).toBe(5);
    expect(result.current.authoritativeGameState.players.player1.storage).toBe(0);
    expect(result.current.authoritativeGameState.pits[10]!.seeds).toBe(0);
    expect(result.current.authoritativeGameState.pits[10]!.bonusAvailable).toBe(false);

    // Let remaining sowing steps advance until pit 5 drops (pause or complete); verify sowing didn't lose events
    for (let i = 0; i < 6; i++) {
      act(() => {
        vi.advanceTimersByTime(150);
      });
    }
    const bonusEvents = result.current.visualEvents.filter(
      (e) => e.type === "CLAIM_BONUS_TO_STORAGE"
    );
    expect(bonusEvents).toHaveLength(1);
    expect(bonusEvents[0]!.targetPlayerStorage).toBe("PLAYER_2");

    // Part B: Verify AnimationCoordinator serializes concurrent transfers to the SAME storage without losing reserves
    const coord = new AnimationCoordinator();
    coord.setAudioEnabled(false);
    coord.setSpeed("FAST");
    coord.enqueueEvents([
      {
        sequence: 101,
        type: "CLAIM_BONUS_TO_STORAGE",
        sourcePitId: 2,
        targetPlayerStorage: "PLAYER_1",
        seedsCount: 4,
        playerCount: 2,
      },
      {
        sequence: 102,
        type: "CLAIM_BONUS_TO_STORAGE",
        sourcePitId: 4,
        targetPlayerStorage: "PLAYER_1",
        seedsCount: 4,
        playerCount: 2,
      },
      {
        sequence: 103,
        type: "CLAIM_BONUS_TO_STORAGE",
        sourcePitId: 10,
        targetPlayerStorage: "PLAYER_2",
        seedsCount: 4,
        playerCount: 2,
      },
    ]);
    const coordSnap = coord.getSnapshot();
    expect(coordSnap.storageIncomingReserve.PLAYER_1).toBe(8);
    expect(coordSnap.storageIncomingReserve.PLAYER_2).toBe(4);
    expect(coordSnap.isBusy).toBe(true);
    coord.dispose();

    // Part C: Mid-hand bonus claim defers round end until hand finishes dropping, then transitions smoothly to ROUND_SETTLEMENT
    const roundEndState = createInitialGame("PLAYER_1", "local");
    for (const pit of roundEndState.pits) pit.seeds = 0;
    roundEndState.pits[0]!.seeds = 2;
    roundEndState.pits[9]!.seeds = 4;
    roundEndState.pits[9]!.bonusAvailable = true;
    roundEndState.players.player1.storage = 32;
    roundEndState.players.player2.storage = 32; // Total = 70

    const hook2 = renderHook(() =>
      useChannemaneGame(
        "PLAYER_1",
        { enabled: true, speed: "FAST", stepDelayMs: 140 },
        roundEndState,
        "local",
        null,
        "PLAYER_2",
        2,
        { waitForVisualSettlement: true, deferAudioToVisual: true }
      )
    );
    act(() => {
      vi.advanceTimersByTime(850);
    });
    act(() => {
      hook2.result.current.selectPit(0);
    });
    expect(hook2.result.current.isAnimating).toBe(true);

    // Mid-hand: seedsInHand === 2, so engine completes sowing before settling round (< 4 board seeds)
    act(() => {
      const res = hook2.result.current.claimBonus(9);
      expect(res.success).toBe(true);
      if (res.success) {
        expect(res.data.roundEnded).toBe(false);
      }
    });
    expect(
      hook2.result.current.visualEvents.some((e) => e.type === "CLAIM_BONUS_TO_STORAGE")
    ).toBe(true);
    expect(hook2.result.current.isAnimating).toBe(true);

    // Finish dropping remaining 2 seeds in hand -> turn completes -> enters ROUND_SETTLEMENT
    for (let i = 0; i < 4; i++) {
      act(() => {
        vi.advanceTimersByTime(150);
      });
    }

    expect(hook2.result.current.authoritativeGameState.phase).toBe("ROUND_SETTLEMENT");
    expect(
      hook2.result.current.visualEvents.some((e) => e.type === "ROUND_SETTLEMENT")
    ).toBe(true);

    act(() => {
      hook2.result.current.completeVisualSettlement();
    });
    expect(hook2.result.current.settlementSummary).not.toBeNull();
    expect(hook2.result.current.isAnimating).toBe(false);

    // Part D: Claiming a bonus on the awaited continuation pit cleanly resolves turn without soft-lock
    const contBonusState = createInitialGame("PLAYER_1", "local");
    for (const pit of contBonusState.pits) pit.seeds = 0;
    contBonusState.pits[0]!.seeds = 1; // Drop into pit 1 -> next pit 2 has 4 seeds + bonus (awaiting continuation)
    contBonusState.pits[2]!.seeds = 4;
    contBonusState.pits[2]!.bonusAvailable = true;
    contBonusState.pits[7]!.seeds = 6;
    contBonusState.players.player1.storage = 30;
    contBonusState.players.player2.storage = 29; // Total = 70

    const hook3 = renderHook(() =>
      useChannemaneGame(
        "PLAYER_1",
        { enabled: true, speed: "FAST", stepDelayMs: 140 },
        contBonusState,
        "local",
        null,
        "PLAYER_2",
        2,
        { waitForVisualSettlement: true, deferAudioToVisual: true }
      )
    );
    act(() => {
      vi.advanceTimersByTime(850);
    });
    act(() => {
      hook3.result.current.selectPit(0);
    });
    act(() => {
      vi.advanceTimersByTime(150);
    });
    act(() => {
      vi.advanceTimersByTime(150);
    });
    expect(hook3.result.current.interactionState).toBe("WAITING_FOR_CONTINUATION");
    expect(hook3.result.current.highlightedContinuationPit).toBe(2);

    // Claiming bonus directly on continuation pit 2 finalizes turn cleanly instead of trapping game
    act(() => {
      const claimContRes = hook3.result.current.claimBonus(2);
      expect(claimContRes.success).toBe(true);
    });
    expect(hook3.result.current.interactionState).toBe("WAITING_FOR_START");
    expect(hook3.result.current.highlightedContinuationPit).toBeNull();
  });
});
