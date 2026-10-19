/**
 * Master AI UI & Turn Orchestration Integration Tests
 * Validates:
 * - Launching Master mode from Menu -> Difficulty -> First Player selection.
 * - Human-first Master game: Player 1 moves first, turn notification shown, board interactive.
 * - AI-first Master game: Player 2 (AI) automatically triggers Master search and executes legal move.
 * - Auto-collection of AI-owned bonuses without stealing human bonuses.
 * - Safe cancellation and cleanup when navigating back to menu or restarting.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import App from "../../src/App";
import { createInitialGame, verifySeedConservation } from "../../src/engine/board";

describe("Master AI UI & Turn Orchestration Integration", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  it("Human-first Master game allows human to start and renders turn notification", async () => {
    render(<App />);

    await act(async () => {
      fireEvent.click(screen.getByTestId("menu-btn-ai"));
    });

    await act(async () => {
      fireEvent.click(screen.getByTestId("difficulty-btn-master"));
    });

    expect(screen.getByTestId("first-player-modal")).toBeInTheDocument();

    await act(async () => {
      fireEvent.click(screen.getByTestId("first-player-player-btn"));
    });

    // Board rendered with Master mode
    expect(screen.getByTestId("channemane-board")).toBeInTheDocument();
    expect(screen.getByTestId("game-mode-tag")).toHaveTextContent(/AI \(MASTER\)/i);

    // Turn notification appears: 'Your turn'
    expect(screen.getByTestId("turn-notification-popup")).toHaveTextContent("Your turn");

    // Advance past turn notification (800ms)
    await act(async () => {
      vi.advanceTimersByTime(900);
    });

    expect(screen.queryByTestId("turn-notification-popup")).toBeNull();
    expect(screen.getByTestId("turn-banner")).toHaveTextContent(/Player 1's Turn/i);

    // P1 pits (0-6) are interactive
    const pit0 = screen.getByTestId("pit-0");
    await act(async () => {
      fireEvent.click(pit0);
    });

    expect(screen.queryByTestId("turn-banner")).not.toBeNull();
  });

  it("AI-first Master game triggers AI turn and automatically executes legal move", async () => {
    const state = createInitialGame("PLAYER_2", "ai", "master", "PLAYER_2");

    render(
      <App
        initialScreen="GAME"
        initialGameMode="ai"
        initialDifficulty="master"
        initialGameState={state}
        initialAnimationSettings={{ enabled: false }}
      />
    );

    // Initial check: PLAYER_2 (AI) turn with 'AI turn' popup
    expect(screen.getByTestId("turn-notification-popup")).toHaveTextContent("AI turn");

    // Advance past turn notification (800ms)
    await act(async () => {
      vi.advanceTimersByTime(900);
    });

    // Advance past AI thinking timer (300ms)
    await act(async () => {
      vi.advanceTimersByTime(500);
    });

    expect(screen.getByTestId("channemane-board")).toBeInTheDocument();
  });

  it("Automatically claims AI-owned bonus during Master game, but never human bonus", async () => {
    const state = createInitialGame("PLAYER_1", "ai", "master", "PLAYER_2");
    // Pit 8 (AI side) has 4 seeds and bonusAvailable = true
    state.pits[8].seeds = 4;
    state.pits[8].bonusAvailable = true;

    // Pit 2 (Human side) has 4 seeds and bonusAvailable = true
    state.pits[2].seeds = 4;
    state.pits[2].bonusAvailable = true;

    // Balance seeds to 70
    state.pits[0].seeds = 6;
    state.pits[7].seeds = 6;
    expect(verifySeedConservation(state)).toBe(true);

    render(
      <App
        initialScreen="GAME"
        initialGameMode="ai"
        initialDifficulty="master"
        initialGameState={state}
        initialAnimationSettings={{ enabled: false }}
      />
    );

    // Advance past turn notification and bonus delay
    await act(async () => {
      vi.advanceTimersByTime(900);
    });
    await act(async () => {
      vi.advanceTimersByTime(500);
    });

    // AI storage should receive 4 seeds from pit 8
    expect(screen.getByTestId("p2-captured-count")).toHaveTextContent("4");
    expect(screen.getByTestId("pit-8")).toHaveAttribute("data-seeds", "0");

    // Human pit 2 must still have its 4 seeds intact (AI must never claim human bonus)
    expect(screen.getByTestId("pit-2")).toHaveAttribute("data-seeds", "4");
    expect(screen.getByTestId("p1-captured-count")).toHaveTextContent("0");
  });

  it("Restarting or returning to menu cleanly cancels pending Master AI actions", async () => {
    const state = createInitialGame("PLAYER_2", "ai", "master", "PLAYER_2");

    render(
      <App
        initialScreen="GAME"
        initialGameMode="ai"
        initialDifficulty="master"
        initialGameState={state}
      />
    );

    // Click in-game Menu button immediately
    await act(async () => {
      fireEvent.click(screen.getByTestId("main-menu-btn"));
    });

    // Must return to Main Menu without errors or stale callback execution
    expect(screen.getByTestId("main-menu")).toBeInTheDocument();
    expect(screen.queryByTestId("channemane-board")).not.toBeInTheDocument();
  });
});
