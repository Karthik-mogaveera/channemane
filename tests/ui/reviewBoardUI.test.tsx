import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useChannemaneGame } from "../../src/ui/hooks/useChannemaneGame";
import { createInitialGame, verifySeedConservation } from "../../src/engine/board";

describe("ISSUE 1: Review Board UI Lifecycle and Interactions", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("completes full Review Board lifecycle: captures snapshot on round end, renders pre-settlement pits and storage, blocks gameplay, and cleanly exits", () => {
    // Construct pre-round-end state:
    // P0 has 2 seeds. P7 has 1 seed. All other pits 0.
    // P1 storage = 30, P2 storage = 37. Total = 70.
    const customState = createInitialGame("PLAYER_1");
    for (const pit of customState.pits) pit.seeds = 0;
    customState.pits[0].seeds = 2;
    customState.pits[7].seeds = 1;
    customState.players.player1.storage = 30;
    customState.players.player2.storage = 37;
    expect(verifySeedConservation(customState)).toBe(true);

    const { result } = renderHook(() =>
      useChannemaneGame("PLAYER_1", { enabled: false, stepDelayMs: 0 }, customState)
    );

    // Initial state check
    expect(result.current.gameState.pits[0].seeds).toBe(2);
    expect(result.current.gameState.pits[7].seeds).toBe(1);
    expect(result.current.isReviewingBoard).toBe(false);
    expect(result.current.reviewBoardState).toBeNull();

    // Player 1 plays P0 (sows 1 seed to P1, 1 seed to P2; total board seeds = 3 < 4 -> round ends!)
    act(() => {
      const turnRes = result.current.selectPit(0);
      expect(turnRes?.success).toBe(true);
    });

    // 1. Verify round ended and settlement summary is populated
    expect(result.current.settlementSummary).not.toBeNull();
    expect(result.current.settlementSummary?.roundWinner).toBe("PLAYER_2"); // P2 has 37+1=38, P1 has 30+2=32

    // 2. Authoritative engine state has settled: all pits 0, storage updated
    expect(result.current.authoritativeGameState.phase).toBe("ROUND_SETTLEMENT");
    expect(result.current.authoritativeGameState.pits.every((p) => p.seeds === 0)).toBe(true);
    expect(result.current.authoritativeGameState.players.player1.storage).toBe(32);
    expect(result.current.authoritativeGameState.players.player2.storage).toBe(38);

    // 3. User clicks "Review Board" -> dismissSettlementModal()
    act(() => {
      result.current.dismissSettlementModal();
    });

    expect(result.current.isReviewingBoard).toBe(true);
    expect(result.current.settlementSummary).toBeNull(); // Modal closed

    // 4. In review mode, effective gameState MUST show pre-settlement pits and pre-settlement storage!
    // P0 had 0 (picked up), P1 had 1, P2 had 1, P7 had 1
    expect(result.current.gameState.pits[1].seeds).toBe(1);
    expect(result.current.gameState.pits[2].seeds).toBe(1);
    expect(result.current.gameState.pits[7].seeds).toBe(1);
    expect(result.current.gameState.pits[0].seeds).toBe(0);

    // Pre-settlement storage counts must be displayed, NOT post-settlement
    expect(result.current.gameState.players.player1.storage).toBe(30);
    expect(result.current.gameState.players.player2.storage).toBe(37);

    // 5. Board interaction blocked: selectablePits and claimableBonuses empty
    expect(result.current.selectablePits).toEqual([]);
    expect(result.current.claimableBonuses).toEqual([]);

    // Attempting to select pit fails (returns null during review mode)
    act(() => {
      const illegalMove = result.current.selectPit(1);
      expect(illegalMove).toBeNull();
    });

    // Attempting to claim bonus fails
    act(() => {
      const illegalBonus = result.current.claimBonus(1);
      expect(illegalBonus.success).toBe(false);
      if (!illegalBonus.success) {
        expect(illegalBonus.error).toMatch(/Cannot claim bonuses while reviewing the board/);
      }
    });

    // 6. User reopens settlement modal -> snapshot preserved
    act(() => {
      result.current.reopenSettlementModal();
    });
    expect(result.current.settlementSummary).not.toBeNull();
    expect(result.current.reviewBoardState).not.toBeNull();

    // Close again -> back to review mode
    act(() => {
      result.current.dismissSettlementModal();
    });
    expect(result.current.isReviewingBoard).toBe(true);
    expect(result.current.gameState.pits[1].seeds).toBe(1);

    // 7. Advance to next round -> exits review mode and resets reviewBoardState
    act(() => {
      const nextRoundRes = result.current.startNextRound();
      expect(nextRoundRes.success).toBe(true);
    });

    expect(result.current.isReviewingBoard).toBe(false);
    expect(result.current.reviewBoardState).toBeNull();
    expect(result.current.gameState.phase).toBe("PLAYING");
    expect(result.current.gameState.round).toBe(2);

    // Pits in round 2 are freshly set up (either 5 seeds or closed)
    const openPits = result.current.gameState.pits.filter((p) => p.status === "OPEN");
    for (const pit of openPits) {
      expect(pit.seeds).toBe(5);
    }
  });

  it("clears review state when match is restarted", () => {
    const customState = createInitialGame("PLAYER_1");
    for (const pit of customState.pits) pit.seeds = 0;
    customState.pits[0].seeds = 2;
    customState.pits[7].seeds = 1;
    customState.players.player1.storage = 30;
    customState.players.player2.storage = 37;

    const { result } = renderHook(() =>
      useChannemaneGame("PLAYER_1", { enabled: false, stepDelayMs: 0 }, customState)
    );

    act(() => {
      result.current.selectPit(0);
    });

    act(() => {
      result.current.dismissSettlementModal();
    });
    expect(result.current.isReviewingBoard).toBe(true);

    // Restart match
    act(() => {
      result.current.restartMatch();
    });

    expect(result.current.isReviewingBoard).toBe(false);
    expect(result.current.reviewBoardState).toBeNull();
    expect(result.current.gameState.round).toBe(1);
    expect(result.current.gameState.phase).toBe("PLAYING");
    // All 14 pits reset to initial 5 seeds
    for (const pit of result.current.gameState.pits) {
      expect(pit.seeds).toBe(5);
    }
  });
});
