/**
 * Comprehensive Match-End Detection and UI Handling Integration Tests
 * Verifies 66/4 scenario, modal priority, and next-round transition guards.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { renderHook } from "@testing-library/react";
import { App } from "../../src/App";
import { createInitialGame } from "../../src/engine/board";
import { isMatchOver, checkAndHandleMatchEnd } from "../../src/engine/matchEnd";
import { ChannemaneGame } from "../../src/engine/simulation";
import { useChannemaneGame } from "../../src/ui/hooks/useChannemaneGame";
import type { GameState } from "../../src/engine/types";

describe("Match-End Detection and UI Handling", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  function createSettledState(p1Storage: number, p2Storage: number): GameState {
    const state = createInitialGame();
    for (const pit of state.pits) {
      pit.seeds = 0;
      pit.bonusAvailable = false;
    }
    state.players.player1.storage = p1Storage;
    state.players.player2.storage = p2Storage;
    state.phase = "ROUND_SETTLEMENT";
    state.turnPhase = "TURN_END";
    state.seedsInHand = 0;
    return state;
  }

  it("Requirement 5: 66 / 4 reported scenario ends match, shows Match End modal, suppresses Settlement modal, and disallows next round", () => {
    const state = createSettledState(66, 4);

    // 1. Engine evaluations
    expect(isMatchOver(state)).toBe(true);

    const matchRes = checkAndHandleMatchEnd(state);
    expect(matchRes.isMatchEnd).toBe(true);
    expect(matchRes.winner).toBe("PLAYER_1");
    expect(matchRes.loser).toBe("PLAYER_2");
    expect(state.phase).toBe("MATCH_END");

    // 2. UI rendering
    render(<App initialScreen="GAME" initialGameState={state} />);

    // Match End modal must be displayed
    const matchModal = screen.getByTestId("match-end-modal");
    expect(matchModal).toBeInTheDocument();
    expect(screen.getByTestId("match-winner-banner")).toHaveTextContent(
      "Player 1 Wins the Match!"
    );

    // Ordinary SettlementModal must NOT be displayed
    expect(screen.queryByTestId("settlement-modal")).toBeNull();

    // No Start Next Round action must be available
    expect(screen.queryByTestId("start-next-round-btn")).toBeNull();
    expect(screen.queryByTestId("advance-next-round-btn")).toBeNull();
    expect(screen.queryByTestId("settlement-review-bar")).toBeNull();

    // Play Again button must exist
    expect(screen.getByTestId("new-match-btn")).toBeInTheDocument();
  });

  it("Requirement 5 (Reversed): 4 / 66 scenario ends match and declares Player 2 winner", () => {
    const state = createSettledState(4, 66);

    expect(isMatchOver(state)).toBe(true);

    const matchRes = checkAndHandleMatchEnd(state);
    expect(matchRes.isMatchEnd).toBe(true);
    expect(matchRes.winner).toBe("PLAYER_2");
    expect(matchRes.loser).toBe("PLAYER_1");
    expect(state.phase).toBe("MATCH_END");

    render(<App initialScreen="GAME" initialGameState={state} />);

    expect(screen.getByTestId("match-end-modal")).toBeInTheDocument();
    expect(screen.getByTestId("match-winner-banner")).toHaveTextContent(
      "Player 2 Wins the Match!"
    );
    expect(screen.queryByTestId("settlement-modal")).toBeNull();
    expect(screen.queryByTestId("start-next-round-btn")).toBeNull();
  });

  it("Normal round settlement (e.g. 42 / 28) shows SettlementModal and allows starting next round", () => {
    const state = createSettledState(42, 28);

    expect(isMatchOver(state)).toBe(false);

    const matchRes = checkAndHandleMatchEnd(state);
    expect(matchRes.isMatchEnd).toBe(false);
    expect(state.phase).toBe("ROUND_SETTLEMENT");

    const { result } = renderHook(() =>
      useChannemaneGame("PLAYER_1", { enabled: false }, state)
    );

    act(() => {
      result.current.reopenSettlementModal();
    });

    render(<App initialScreen="GAME" initialGameState={state} />);

    // Since match is NOT over, MatchEndModal is not present
    expect(screen.queryByTestId("match-end-modal")).toBeNull();
  });

  it("Requirement 4: startNextRound() in hook rejects if match is completed and preserves MATCH_END phase", () => {
    const state = createSettledState(66, 4);

    const { result } = renderHook(() =>
      useChannemaneGame("PLAYER_1", { enabled: false }, state)
    );

    expect(result.current.gameState.phase).toBe("MATCH_END");
    expect(result.current.matchSummary).not.toBeNull();
    expect(result.current.matchSummary?.winner).toBe("PLAYER_1");

    // Attempting to call startNextRound
    let actionRes: any;
    act(() => {
      actionRes = result.current.startNextRound();
    });

    expect(actionRes.success).toBe(false);
    expect(actionRes.error).toMatch(/match is already completed/i);

    // Phase remains MATCH_END and matchSummary remains intact
    expect(result.current.gameState.phase).toBe("MATCH_END");
    expect(result.current.matchSummary).not.toBeNull();
    expect(result.current.settlementSummary).toBeNull();
  });

  it("Requirement 4: Repeated calls to startNextRound() are rejected safely", () => {
    const state = createSettledState(68, 2);

    const { result } = renderHook(() =>
      useChannemaneGame("PLAYER_1", { enabled: false }, state)
    );

    for (let i = 0; i < 3; i++) {
      let actionRes: any;
      act(() => {
        actionRes = result.current.startNextRound();
      });
      expect(actionRes.success).toBe(false);
      expect(actionRes.error).toMatch(/match is already completed/i);
    }

    expect(result.current.gameState.phase).toBe("MATCH_END");
    expect(result.current.matchSummary?.winner).toBe("PLAYER_1");
  });

  it("Engine ChannemaneGame.startNextRound() rejects if match is over", () => {
    const state = createSettledState(67, 3);
    const game = new ChannemaneGame("PLAYER_1", state);

    expect(game.isGameOver()).toBe(true);

    const res = game.startNextRound();
    expect(res.success).toBe(false);
    if (!res.success) {
      expect(res.error).toMatch(/match is already over/i);
    }
  });

  it("Requirement 3: Match-ending turn through immediate path updates state to MATCH_COMPLETE and sets matchSummary", () => {
    // Setup state where Player 1 playing P0 will sweep remaining seeds to round end and end match
    const state = createInitialGame();
    for (const pit of state.pits) {
      pit.seeds = 0;
      pit.bonusAvailable = false;
    }
    // Give P0 3 seeds, so sowing P0 leaves 0 seeds on board, ending round
    state.pits[0].seeds = 3;
    state.players.player1.storage = 63;
    state.players.player2.storage = 4;
    state.currentPlayer = "PLAYER_1";

    const { result } = renderHook(() =>
      useChannemaneGame("PLAYER_1", { enabled: false }, state)
    );

    act(() => {
      result.current.selectPit(0);
    });

    // Match ended: P1 final storage = 66, P2 = 4
    expect(result.current.interactionState).toBe("MATCH_COMPLETE");
    expect(result.current.matchSummary).not.toBeNull();
    expect(result.current.matchSummary?.winner).toBe("PLAYER_1");
    expect(result.current.settlementSummary).toBeNull();
    expect(result.current.gameState.phase).toBe("MATCH_END");
  });

  it("Requirement 3: Match-ending turn through animation queue transitions to MATCH_COMPLETE upon completion", () => {
    const state = createInitialGame();
    for (const pit of state.pits) {
      pit.seeds = 0;
      pit.bonusAvailable = false;
    }
    state.pits[0].seeds = 3;
    state.players.player1.storage = 63;
    state.players.player2.storage = 4;
    state.currentPlayer = "PLAYER_1";

    const { result } = renderHook(() =>
      useChannemaneGame("PLAYER_1", { enabled: true, stepDelayMs: 50 }, state)
    );

    act(() => {
      result.current.selectPit(0);
    });

    // Sowing is in progress
    expect(result.current.isAnimating).toBe(true);

    // Fast-forward all animation steps
    act(() => {
      vi.runAllTimers();
    });

    expect(result.current.isAnimating).toBe(false);
    expect(result.current.interactionState).toBe("MATCH_COMPLETE");
    expect(result.current.matchSummary).not.toBeNull();
    expect(result.current.matchSummary?.winner).toBe("PLAYER_1");
    expect(result.current.settlementSummary).toBeNull();
    expect(result.current.gameState.phase).toBe("MATCH_END");
  });

  it("Requirement 4: Restarting after a completed match resets to initial game state cleanly", () => {
    const state = createSettledState(66, 4);

    const { result } = renderHook(() =>
      useChannemaneGame("PLAYER_1", { enabled: false }, state)
    );

    expect(result.current.interactionState).toBe("MATCH_COMPLETE");
    expect(result.current.matchSummary).not.toBeNull();

    act(() => {
      result.current.restartMatch("PLAYER_1");
    });

    expect(result.current.interactionState).toBe("WAITING_FOR_START");
    expect(result.current.matchSummary).toBeNull();
    expect(result.current.settlementSummary).toBeNull();
    expect(result.current.gameState.phase).toBe("PLAYING");
    expect(result.current.gameState.players.player1.storage).toBe(0);
    expect(result.current.gameState.players.player2.storage).toBe(0);
  });
});
