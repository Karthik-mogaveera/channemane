/**
 * AI Integration & Turn Orchestration Tests
 * Strictly follows Section 12.D (Execution tests) and Section 12.E (Regression tests).
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act, fireEvent } from "@testing-library/react";
import { App } from "../../src/App";
import { createInitialGame } from "../../src/engine/board";

describe("Beginner AI UI & Turn Orchestration Integration (Sections 12.D & 12.E)", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  it("Local Multiplayer remains 100% unchanged and never triggers automatic AI actions", async () => {
    render(
      <App
        initialScreen="GAME"
        initialGameMode="local"
        initialAnimationSettings={{ enabled: false }}
      />
    );

    // Initial state: Player 1's turn
    expect(screen.getByTestId("turn-banner")).toHaveTextContent("PLAYER 1'S TURN");

    // Advance timers: nothing should happen automatically
    act(() => {
      vi.advanceTimersByTime(2000);
    });

    // Still Player 1's turn waiting for player interaction
    expect(screen.getByTestId("turn-banner")).toHaveTextContent("PLAYER 1'S TURN");
  });

  it("Human turn requires manual continuation during AI game mode", async () => {
    // Board where Player 1 sows and lands in a non-empty pit to trigger continuous sowing
    const state = createInitialGame("PLAYER_1", "ai", "beginner", "PLAYER_2");
    // Pit 0 has 2 seeds, lands in pit 2 which has 5 seeds -> WAITING_FOR_CONTINUATION
    state.pits[0].seeds = 2;
    state.pits[1].seeds = 0;
    state.pits[2].seeds = 5;

    render(
      <App
        initialScreen="GAME"
        initialGameMode="ai"
        initialDifficulty="beginner"
        initialGameState={state}
        initialAnimationSettings={{ enabled: false }}
      />
    );

    // Advance past initial turn notification (800ms) so human input becomes active
    act(() => {
      vi.advanceTimersByTime(900);
    });

    // Select pit 0
    const pit0 = screen.getByTestId("pit-0");
    await act(async () => {
      fireEvent.click(pit0);
    });

    // Human must manually choose continuation pit (prompt is displayed)
    expect(screen.getByTestId("turn-banner")).toHaveTextContent(
      "Choose the highlighted pit to continue sowing."
    );

    // Advance timers: AI must NOT auto-continue for human!
    act(() => {
      vi.advanceTimersByTime(2000);
    });

    // Still waiting for human tap!
    expect(screen.getByTestId("turn-banner")).toHaveTextContent(
      "Choose the highlighted pit to continue sowing."
    );

    // Human clicks the highlighted pit 2
    const pit2 = screen.getByTestId("pit-2");
    await act(async () => {
      fireEvent.click(pit2);
    });

    // Sowing progresses
    expect(screen.queryByTestId("turn-banner")).not.toBeNull();
  });

  it("AI turn automatically executes, handles continuation, and returns control to Player 1", async () => {
    // Start with a board where Player 1 makes a move that passes turn to Player 2 (AI)
    const state = createInitialGame("PLAYER_2", "ai", "beginner", "PLAYER_2");
    // Pit 7 has 1 seed, pit 8 has 2 seeds.
    // When AI plays pit 7: drops into 8 (now 3 seeds).
    // Pit 8 had 2 seeds, so it triggers WAITING_FOR_CONTINUATION.
    // AI must automatically continue from pit 8, sow, finish turn, and pass to PLAYER_1!
    state.pits[7].seeds = 1;
    state.pits[8].seeds = 2;
    for (let i = 9; i <= 13; i++) {
      state.pits[i].seeds = 0;
    }

    render(
      <App
        initialScreen="GAME"
        initialGameMode="ai"
        initialDifficulty="beginner"
        initialGameState={state}
        initialAnimationSettings={{ enabled: false }}
      />
    );

    // Initial check: PLAYER_2 (AI) turn
    expect(screen.getByTestId("turn-banner")).toHaveTextContent("PLAYER 2'S TURN");

    // Advance past turn notification (800ms), AI thinking pause (500ms), and continuation (350ms)
    await act(async () => {
      vi.advanceTimersByTime(900); // Clear Turn Notification
    });

    await act(async () => {
      vi.advanceTimersByTime(600); // Trigger selectPit
    });

    await act(async () => {
      vi.advanceTimersByTime(400); // Trigger auto-confirmContinuation
    });

    // Turn should have completed and transitioned back to Player 1!
    expect(screen.getByTestId("turn-banner")).toHaveTextContent("PLAYER 1'S TURN");
  });

  it("AI turn automatically confirms capture without requiring human click", async () => {
    const state = createInitialGame("PLAYER_2", "ai", "beginner", "PLAYER_2");
    for (let i = 0; i < 14; i++) {
      state.pits[i].seeds = 0;
    }
    // Human has seeds in pit 1 (6 seeds, to be captured) and pit 2 (5 seeds, playable)
    state.pits[0].seeds = 0;
    state.pits[1].seeds = 6;
    state.pits[2].seeds = 5;

    // AI has single legal move: pit 12 with 1 seed.
    // Sowing pit 12 drops 1 seed into pit 13 (landing on empty pit).
    // Next open pit is 0 (empty).
    // Following open pit is 1 (6 seeds) -> WAITING_FOR_CAPTURE!
    state.pits[12].seeds = 1;
    state.pits[13].seeds = 0;

    render(
      <App
        initialScreen="GAME"
        initialGameMode="ai"
        initialDifficulty="beginner"
        initialGameState={state}
        initialAnimationSettings={{ enabled: false }}
      />
    );

    expect(screen.getByTestId("turn-banner")).toHaveTextContent("PLAYER 2'S TURN");

    // Advance past turn notification (800ms)
    await act(async () => {
      vi.advanceTimersByTime(900);
    });

    // Advance AI thinking time
    await act(async () => {
      vi.advanceTimersByTime(600);
    });

    // Advance capture confirmation time
    await act(async () => {
      vi.advanceTimersByTime(400);
    });

    // AI should have collected the capture and passed turn to Player 1!
    expect(screen.getByTestId("turn-banner")).toHaveTextContent("PLAYER 1'S TURN");
    // Verify storage bowl captured seeds
    expect(screen.getByTestId("p2-captured-count")).toHaveTextContent("6");
  });

  it("AI auto-claims its own bonus, but never claims a human bonus", async () => {
    const state = createInitialGame("PLAYER_2", "ai", "beginner", "PLAYER_2");
    for (let i = 0; i < 14; i++) {
      state.pits[i].seeds = 0;
    }
    state.pits[0].seeds = 5; // Human pit has seeds

    // AI pit 7 has 4 seeds with bonusAvailable === true
    state.pits[7].seeds = 4;
    state.pits[7].bonusAvailable = true;

    // Human pit 1 has 4 seeds with bonusAvailable === true
    state.pits[1].seeds = 4;
    state.pits[1].bonusAvailable = true;

    // Other AI pit has 1 seed to play after bonus claim
    state.pits[8].seeds = 1;

    render(
      <App
        initialScreen="GAME"
        initialGameMode="ai"
        initialDifficulty="beginner"
        initialGameState={state}
        initialAnimationSettings={{ enabled: false }}
      />
    );

    // Advance past turn notification (800ms) and bonus auto-claim timeout (250ms)
    await act(async () => {
      vi.advanceTimersByTime(900);
    });
    await act(async () => {
      vi.advanceTimersByTime(400);
    });

    // AI storage should now have 4 seeds from pit 7
    expect(screen.getByTestId("p2-captured-count")).toHaveTextContent("4");
    // Human pit 1 MUST STILL have 4 seeds with bonusAvailable intact (not auto-claimed!)
    expect(screen.getByTestId("pit-count-1")).toHaveTextContent("4");

    // Advance time for AI to play remaining move and complete turn
    await act(async () => {
      vi.advanceTimersByTime(600);
    });
  });

  it("Restarting match or returning to menu cancels pending AI timers", async () => {
    const state = createInitialGame("PLAYER_2", "ai", "beginner", "PLAYER_2");
    render(
      <App
        initialScreen="GAME"
        initialGameMode="ai"
        initialDifficulty="beginner"
        initialGameState={state}
        initialAnimationSettings={{ enabled: true }}
      />
    );

    expect(screen.getByTestId("turn-banner")).toHaveTextContent("PLAYER 2'S TURN");

    // Click Return to Menu
    const menuBtn = screen.getByTestId("main-menu-btn");
    await act(async () => {
      fireEvent.click(menuBtn);
    });

    // Should be on Main Menu
    expect(screen.getByTestId("main-menu")).toBeInTheDocument();

    // Advance time where AI would have acted: no crash, no errors
    await act(async () => {
      vi.advanceTimersByTime(2000);
    });

    // Still safely on Main Menu
    expect(screen.getByTestId("main-menu")).toBeInTheDocument();
  });
});
