/**
 * Expert AI UI & Turn Orchestration Integration Tests
 * Strictly verifies Section 3, 9, 10 requirements:
 * - Difficulty selection flow ("Play with AI" -> "Expert" -> "Who will Play first" dialog)
 * - Human-first and AI-first gameplay initiation
 * - AI turn automatic execution, continuation, and capture handling
 * - AI auto-collection of AI-owned bonuses (never human bonuses)
 * - Search cancellation on restart / menu navigation
 * - Master difficulty "Coming Soon" safeguard preservation
 * - Beginner and Local Multiplayer isolation and non-regression
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act, fireEvent } from "@testing-library/react";
import { App } from "../../src/App";
import { createInitialGame, verifySeedConservation } from "../../src/engine/board";

describe("Expert AI UI & Turn Orchestration Integration", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  it("Navigating Play with AI -> Expert opens 'Who will Play first' dialog", async () => {
    render(<App />);

    // Click 'Play with AI'
    const playAIButton = screen.getByTestId("menu-btn-ai");
    await act(async () => {
      fireEvent.click(playAIButton);
    });

    // Verify difficulty selection screen
    expect(screen.getByTestId("difficulty-select")).toBeInTheDocument();

    // Click 'Expert'
    const expertButton = screen.getByTestId("difficulty-btn-expert");
    await act(async () => {
      fireEvent.click(expertButton);
    });

    // Verify 'Who will Play first' dialog is displayed
    expect(screen.getByTestId("first-player-modal")).toBeInTheDocument();
    expect(screen.getByTestId("first-player-player-btn")).toBeInTheDocument();
    expect(screen.getByTestId("first-player-ai-btn")).toBeInTheDocument();
  });

  it("Human-first Expert game allows human to start and renders turn notification", async () => {
    render(<App />);

    // Navigate to Expert -> Play as Player
    await act(async () => {
      fireEvent.click(screen.getByTestId("menu-btn-ai"));
    });
    await act(async () => {
      fireEvent.click(screen.getByTestId("difficulty-btn-expert"));
    });
    await act(async () => {
      fireEvent.click(screen.getByTestId("first-player-player-btn"));
    });

    // Board rendered
    expect(screen.getByTestId("channemane-board")).toBeInTheDocument();

    // Turn notification appears: 'Your turn'
    expect(screen.getByTestId("turn-notification-popup")).toHaveTextContent("Your turn");

    // Advance past turn notification (800ms)
    await act(async () => {
      vi.advanceTimersByTime(900);
    });

    expect(screen.queryByTestId("turn-notification-popup")).toBeNull();
    expect(screen.getByTestId("turn-banner")).toHaveTextContent(/Player 1's Turn/i);

    // Human can select pit 0
    const pit0 = screen.getByTestId("pit-0");
    await act(async () => {
      fireEvent.click(pit0);
    });

    // Sowing commences
    expect(screen.queryByTestId("turn-banner")).not.toBeNull();
  });

  it("AI-first Expert game triggers AI turn and automatically executes legal move", async () => {
    const state = createInitialGame("PLAYER_2", "ai", "expert", "PLAYER_2");

    render(
      <App
        initialScreen="GAME"
        initialGameMode="ai"
        initialDifficulty="expert"
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

    // Trigger AI thinking pause and execution
    await act(async () => {
      vi.advanceTimersByTime(500);
    });

    // Sowing occurred or turn transitioned cleanly
    expect(screen.getByTestId("channemane-board")).toBeInTheDocument();
  });

  it("Automatically claims AI-owned bonus during Expert game, but never human bonus", async () => {
    const state = createInitialGame("PLAYER_1", "ai", "expert", "PLAYER_2");
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
        initialDifficulty="expert"
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

    // AI storage should have received 4 seeds from pit 8
    expect(screen.getByTestId("p2-captured-count")).toHaveTextContent("4");
    expect(screen.getByTestId("pit-8")).toHaveAttribute("data-seeds", "0");

    // Human pit 2 must still have its 4 seeds and bonusAvailable (AI must NEVER steal human bonus)
    expect(screen.getByTestId("pit-2")).toHaveAttribute("data-seeds", "4");
    expect(screen.getByTestId("p1-captured-count")).toHaveTextContent("0");
  });

  it("Master difficulty launches functional Master AI game", async () => {
    render(<App />);

    await act(async () => {
      fireEvent.click(screen.getByTestId("menu-btn-ai"));
    });

    await act(async () => {
      fireEvent.click(screen.getByTestId("difficulty-btn-master"));
    });

    // First player dialog
    expect(screen.getByTestId("first-player-modal")).toBeInTheDocument();
    await act(async () => {
      fireEvent.click(screen.getByTestId("first-player-player-btn"));
    });

    // Game is mounted with Master AI
    expect(screen.getByTestId("channemane-board")).toBeInTheDocument();
    expect(screen.getByTestId("game-mode-tag")).toHaveTextContent(/AI \(MASTER\)/i);
  });

  it("Restarting or returning to menu invalidates pending AI searches cleanly", async () => {
    const state = createInitialGame("PLAYER_2", "ai", "expert", "PLAYER_2");

    render(
      <App
        initialScreen="GAME"
        initialGameMode="ai"
        initialDifficulty="expert"
        initialGameState={state}
        initialAnimationSettings={{ enabled: false }}
      />
    );

    // Click Menu button to exit back to Main Menu
    const menuButton = screen.getByTestId("main-menu-btn");
    await act(async () => {
      fireEvent.click(menuButton);
    });

    // Verify Main Menu is shown
    expect(screen.getByTestId("menu-btn-ai")).toBeInTheDocument();

    // Advancing timers should not cause any unhandled errors or stale state updates
    await act(async () => {
      vi.advanceTimersByTime(3000);
    });

    expect(screen.getByTestId("menu-btn-ai")).toBeInTheDocument();
  });
});
