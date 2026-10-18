import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, act, fireEvent } from "@testing-library/react";
import { App } from "../../src/App";
import { createInitialGame, verifySeedConservation } from "../../src/engine/board";
import { executeRoundSettlement } from "../../src/engine/settlement";
import { ChannemaneGame } from "../../src/engine/simulation";
import { checkAndHandleMatchEnd } from "../../src/engine/matchEnd";

describe("Regression Suite: Next-Round Input and AI Turn Transitions", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  /**
   * Scenario A — Human starts the next round
   */
  it("Scenario A: Human starts next round -> playable phase, pit selectable, sowing begins", () => {
    const state = createInitialGame("PLAYER_1", "ai", "beginner", "PLAYER_2");
    for (const pit of state.pits) {
      pit.seeds = 0;
      pit.bonusAvailable = false;
    }
    state.players.player1.storage = 42;
    state.players.player2.storage = 28;
    executeRoundSettlement(state);
    expect(state.roundWinner).toBe("PLAYER_1");
    expect(state.phase).toBe("ROUND_SETTLEMENT");

    render(
      <App
        initialScreen="GAME"
        initialGameMode="ai"
        initialDifficulty="beginner"
        initialGameState={state}
        initialAnimationSettings={{ enabled: false }}
      />
    );

    // Review action bar is displayed with "Start Next Round →"
    const startNextBtn = screen.getByTestId("advance-next-round-btn");
    act(() => {
      fireEvent.click(startNextBtn);
    });

    // Advance past "Your turn" notification (800ms)
    act(() => {
      vi.advanceTimersByTime(900);
    });

    expect(screen.getByTestId("round-indicator")).toHaveTextContent("Round 2");
    expect(screen.getByTestId("turn-banner")).toHaveTextContent("PLAYER 1'S TURN");

    const pit0 = screen.getByTestId("pit-0");
    expect(pit0).not.toBeDisabled();
    expect(pit0).toHaveAttribute("data-selectable", "true");

    act(() => {
      fireEvent.click(pit0);
    });

    // Pit 0 was picked up and sown; seeds should no longer be the initial 5
    expect(pit0).toHaveAttribute("data-seeds", "0");
  });

  /**
   * Scenario B — AI starts the next round
   */
  it("Scenario B: AI starts next round -> AI turn scheduled, legally selects pit, executes without lockup", () => {
    const state = createInitialGame("PLAYER_1", "ai", "beginner", "PLAYER_2");
    for (const pit of state.pits) {
      pit.seeds = 0;
      pit.bonusAvailable = false;
    }
    state.players.player1.storage = 28;
    state.players.player2.storage = 42;
    executeRoundSettlement(state);
    expect(state.roundWinner).toBe("PLAYER_2");
    expect(state.phase).toBe("ROUND_SETTLEMENT");

    render(
      <App
        initialScreen="GAME"
        initialGameMode="ai"
        initialDifficulty="beginner"
        initialGameState={state}
        initialAnimationSettings={{ enabled: false }}
      />
    );

    const startNextBtn = screen.getByTestId("advance-next-round-btn");
    act(() => {
      fireEvent.click(startNextBtn);
    });

    expect(screen.getByTestId("round-indicator")).toHaveTextContent("Round 2");

    // Advance past "AI turn" notification (800ms)
    act(() => {
      vi.advanceTimersByTime(900);
    });

    // Advance past AI decision/thinking timeout (500ms)
    act(() => {
      vi.advanceTimersByTime(600);
    });

    // AI should have executed move on its side (pits 7..13)
    // Verify at least one AI pit was picked up
    const aiPits = [7, 8, 9, 10, 11, 12, 13].map((id) => screen.getByTestId(`pit-${id}`));
    const hasPickedUpPit = aiPits.some((pit) => pit.getAttribute("data-seeds") === "0");
    expect(hasPickedUpPit).toBe(true);
  });

  /**
   * Scenario C — Repeated round transitions
   */
  it("Scenario C: Repeated consecutive round transitions (Round 1 -> 2 -> 3) remain fully playable", () => {
    const game = new ChannemaneGame("PLAYER_1", undefined, "ai", "beginner", "PLAYER_2");
    expect(game.getRound()).toBe(1);

    // End Round 1 with P1 winning (P1: 40, P2: 30)
    const st1 = (game as any).state;
    for (let i = 0; i < 14; i++) {
      st1.pits[i].seeds = 0;
    }
    st1.players.player1.storage = 40;
    st1.players.player2.storage = 30;
    executeRoundSettlement(st1);

    // Advance to Round 2
    const res1 = game.startNextRound();
    expect(res1.success).toBe(true);
    expect(game.getRound()).toBe(2);
    expect(game.getCurrentPlayer()).toBe("PLAYER_1");
    expect(game.isTurnInProgress()).toBe(false);

    // P1 plays a move in Round 2
    const moveRes1 = game.selectPit(0);
    expect(moveRes1.success).toBe(true);
    expect(game.isTurnInProgress()).toBe(false);

    // End Round 2 with P2 winning (P1: 30, P2: 40)
    const st2 = (game as any).state;
    for (let i = 0; i < 14; i++) {
      st2.pits[i].seeds = 0;
    }
    st2.players.player1.storage = 30;
    st2.players.player2.storage = 40;
    executeRoundSettlement(st2);

    // Advance to Round 3
    const res2 = game.startNextRound();
    expect(res2.success).toBe(true);
    expect(game.getRound()).toBe(3);
    expect(game.getCurrentPlayer()).toBe("PLAYER_2");
    expect(game.isTurnInProgress()).toBe(false);

    // P2 (AI) plays a move on its open pit in Round 3 (Pair 6 [6, 7] is closed; pit 8 is open)
    const moveRes2 = game.selectPit(8);
    expect(moveRes2.success).toBe(true);
    expect(game.isTurnInProgress()).toBe(false);
  });

  /**
   * Scenario D — Animation and notification cleanup on round transition
   */
  it("Scenario D: Mid-turn bonus claim ending round cleanly cancels animation and clears turnContext", () => {
    const customState = createInitialGame("PLAYER_1", "ai", "beginner", "PLAYER_2");
    for (let i = 0; i < 14; i++) {
      customState.pits[i].seeds = 0;
      customState.pits[i].bonusAvailable = false;
    }
    customState.pits[0].seeds = 1;
    customState.pits[1].seeds = 0;
    customState.pits[2].seeds = 2; // continuation target after drop in pit 1
    customState.pits[8].seeds = 4;
    customState.pits[8].bonusAvailable = true; // 4 seeds on P2 side
    customState.players.player1.storage = 34;
    customState.players.player2.storage = 29;

    const game = new ChannemaneGame("PLAYER_1", customState, "ai", "beginner", "PLAYER_2");
    // Start sowing from Pit 0
    const startRes = game.startTurn(0);
    expect(startRes.success).toBe(true);
    expect(game.isTurnInProgress()).toBe(true);

    // Step 1: drop seed into Pit 1
    const step1 = game.stepTurn();
    expect(step1.success).toBe(true);
    if (!step1.success) throw new Error("Step 1 failed");
    expect(step1.data.type).toBe("DROP");

    // Step 2: hand is empty, pauses at continuation
    const step2 = game.stepTurn();
    expect(step2.success).toBe(true);
    if (!step2.success) throw new Error("Step 2 failed");
    expect(step2.data.type).toBe("WAITING_FOR_CONTINUATION");
    expect(game.isTurnInProgress()).toBe(true);

    // Claim bonus on Pit 8: empties Pit 8, leaving only 3 seeds on board (< 4), ending round!
    const claimRes = game.claimBonus(8);
    expect(claimRes.success).toBe(true);
    if (!claimRes.success) throw new Error("Bonus claim failed");
    expect(claimRes.data.roundEnded).toBe(true);
    expect(game.getState().phase).toBe("ROUND_SETTLEMENT");
    expect(game.isTurnInProgress()).toBe(false);

    // Start next round
    const nextRoundRes = game.startNextRound();
    expect(nextRoundRes.success).toBe(true);
    expect(game.getState().phase).toBe("PLAYING");
    expect(game.isTurnInProgress()).toBe(false);

    // Able to immediately start a new turn
    const newTurnRes = game.startTurn(0);
    expect(newTurnRes.success).toBe(true);
  });

  /**
   * Scenario E — Duplicate callbacks & idempotent next round setup
   */
  it("Scenario E: Double invocation of startNextRound is safely rejected and preserves game state", () => {
    const state = createInitialGame("PLAYER_1", "ai", "beginner", "PLAYER_2");
    for (const pit of state.pits) {
      pit.seeds = 0;
      pit.bonusAvailable = false;
    }
    state.players.player1.storage = 42;
    state.players.player2.storage = 28;
    executeRoundSettlement(state);

    const game = new ChannemaneGame("PLAYER_1", state, "ai", "beginner", "PLAYER_2");
    expect(game.getState().phase).toBe("ROUND_SETTLEMENT");

    // First call succeeds
    const firstCall = game.startNextRound();
    expect(firstCall.success).toBe(true);
    expect(game.getRound()).toBe(2);
    expect(game.getState().phase).toBe("PLAYING");

    // Immediate second call is rejected because game is already in PLAYING phase
    const secondCall = game.startNextRound();
    expect(secondCall.success).toBe(false);
    if (secondCall.success) throw new Error("Expected second call to fail");
    expect(secondCall.error).toContain("expected ROUND_SETTLEMENT");
    expect(game.getRound()).toBe(2);
    expect(game.getState().phase).toBe("PLAYING");
  });

  /**
   * Scenario F — Match termination prevents starting next round
   */
  it("Scenario F: 66/4 and 4/66 match end conditions take precedence and block next round", () => {
    // 66/4 case
    const p1WinState = createInitialGame("PLAYER_1", "ai", "beginner", "PLAYER_2");
    for (const pit of p1WinState.pits) {
      pit.seeds = 0;
    }
    p1WinState.players.player1.storage = 66;
    p1WinState.players.player2.storage = 4;
    executeRoundSettlement(p1WinState);
    const matchRes1 = checkAndHandleMatchEnd(p1WinState);
    expect(matchRes1.isMatchEnd).toBe(true);
    expect(matchRes1.winner).toBe("PLAYER_1");

    const game1 = new ChannemaneGame("PLAYER_1", p1WinState, "ai", "beginner", "PLAYER_2");
    expect(game1.isGameOver()).toBe(true);
    const attempt1 = game1.startNextRound();
    expect(attempt1.success).toBe(false);
    if (attempt1.success) throw new Error("Expected attempt 1 to fail");
    expect(attempt1.error).toContain("match is already over");

    // 4/66 case
    const p2WinState = createInitialGame("PLAYER_1", "ai", "beginner", "PLAYER_2");
    for (const pit of p2WinState.pits) {
      pit.seeds = 0;
    }
    p2WinState.players.player1.storage = 4;
    p2WinState.players.player2.storage = 66;
    executeRoundSettlement(p2WinState);
    const matchRes2 = checkAndHandleMatchEnd(p2WinState);
    expect(matchRes2.isMatchEnd).toBe(true);
    expect(matchRes2.winner).toBe("PLAYER_2");

    const game2 = new ChannemaneGame("PLAYER_1", p2WinState, "ai", "beginner", "PLAYER_2");
    expect(game2.isGameOver()).toBe(true);
    const attempt2 = game2.startNextRound();
    expect(attempt2.success).toBe(false);
    if (attempt2.success) throw new Error("Expected attempt 2 to fail");
    expect(attempt2.error).toContain("match is already over");
  });

  /**
   * Scenario G — Regression protection (seed conservation, ownership, round-win counts, Local MP)
   */
  it("Scenario G: Verifies 70-seed conservation, correct pit ownership, and round-win counts", () => {
    const game = new ChannemaneGame("PLAYER_1", undefined, "local");
    expect(verifySeedConservation(game.getState())).toBe(true);

    const internalState = (game as any).state;
    for (let i = 0; i < 14; i++) {
      internalState.pits[i].seeds = 0;
    }
    internalState.players.player1.storage = 38;
    internalState.players.player2.storage = 32;
    expect(verifySeedConservation(game.getState())).toBe(true);

    const settlementRes = executeRoundSettlement(internalState);
    expect(settlementRes.success).toBe(true);
    expect(game.getState().players.player1.roundWins).toBe(1);
    expect(game.getState().players.player2.roundWins).toBe(0);

    const nextRes = game.startNextRound();
    expect(nextRes.success).toBe(true);
    expect(verifySeedConservation(game.getState())).toBe(true);

    // 32 seeds = 6 open pairs (30 seeds used, 2 in storage for P2, 38 - 30 = 8 in storage for P1)
    // 30 on P1 pits + 30 on P2 pits + 8 (P1 storage) + 2 (P2 storage) = 70 seeds!
    const state = game.getState();
    const totalPitsSeeds = state.pits.reduce((acc, p) => acc + p.seeds, 0);
    const totalStorage = state.players.player1.storage + state.players.player2.storage;
    expect(totalPitsSeeds + totalStorage).toBe(70);

    // Pairs 0..5 open, pair 6 closed (Pits 6 and 7)
    expect(state.pits[6].status).toBe("CLOSED");
    expect(state.pits[7].status).toBe("CLOSED");
    expect(state.pits[0].status).toBe("OPEN");
    expect(state.pits[8].status).toBe("OPEN");
    expect(state.pits[13].status).toBe("OPEN");
  });
});
