/**
 * Regression Test Suite: Game Mode State Isolation & Cleanup
 * Verifies that switching between 3-Player Local Multiplayer and 2-Player AI mode
 * leaves zero state leakage, stale callbacks, or incorrect pit/storage configurations.
 * Covers Test A, Test B, Test C, and Test D.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { App } from "../../src/App";

describe("Regression Suite: Mode Switching State Isolation (Tests A, B, C, D)", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  /**
   * Helper: Starts a 3-Player Local Multiplayer game from Main Menu
   */
  function startThreePlayerGame() {
    act(() => {
      fireEvent.click(screen.getByTestId("menu-btn-local"));
    });
    act(() => {
      fireEvent.click(screen.getByTestId("player-count-btn-3"));
    });
  }

  /**
   * Helper: Starts a 2-Player AI game (Beginner, Human opening) from Main Menu
   */
  function startAIGame(difficulty: "beginner" | "expert" | "master" = "beginner") {
    act(() => {
      fireEvent.click(screen.getByTestId("menu-btn-ai"));
    });
    act(() => {
      fireEvent.click(screen.getByTestId(`difficulty-btn-${difficulty}`));
    });
    act(() => {
      fireEvent.click(screen.getByTestId("first-player-player-btn"));
    });
  }

  /**
   * Helper: Returns to Main Menu from active game
   */
  function returnToMainMenu() {
    act(() => {
      fireEvent.click(screen.getByTestId("main-menu-btn"));
    });
  }

  /**
   * Test A
   * - Start 3-player Local Multiplayer.
   * - Verify 15 pits and three player storage areas.
   * - End the game / return to menu.
   * - Start AI mode.
   * - Verify the standard 2-player board and exactly two participants.
   */
  it("Test A: Start 3-player mode -> return to menu -> start AI mode -> renders 2-player board and 2 participants", () => {
    render(<App />);

    // Step 1: Start 3-player Local Multiplayer
    startThreePlayerGame();

    // Verify 15 pits exist (pit-0 through pit-14)
    expect(screen.getByTestId("channemane-board")).toBeInTheDocument();
    for (let i = 0; i < 15; i++) {
      expect(screen.getByTestId(`pit-${i}`)).toBeInTheDocument();
    }
    expect(screen.queryByTestId("pit-15")).not.toBeInTheDocument();

    // Verify three storage areas exist
    expect(screen.getByTestId("storage-player1")).toBeInTheDocument();
    expect(screen.getByTestId("storage-player2")).toBeInTheDocument();
    expect(screen.getByTestId("storage-player3")).toBeInTheDocument();

    // Verify mode tag reflects 3 players
    expect(screen.getByTestId("game-mode-tag")).toHaveTextContent("LOCAL 3P");

    // Step 2: Return to Main Menu
    returnToMainMenu();

    expect(screen.getByTestId("main-menu")).toBeInTheDocument();
    expect(screen.queryByTestId("channemane-board")).not.toBeInTheDocument();

    // Step 3: Start AI mode
    startAIGame("beginner");

    // Step 4: Verify the standard 2-player board and exactly two participants
    expect(screen.getByTestId("channemane-board")).toBeInTheDocument();

    // Exactly 14 pits (pit-0 through pit-13)
    for (let i = 0; i < 14; i++) {
      expect(screen.getByTestId(`pit-${i}`)).toBeInTheDocument();
    }
    expect(screen.queryByTestId("pit-14")).not.toBeInTheDocument();

    // Exactly 2 player storages: Player 1 and Player 2. Player 3 MUST NOT exist!
    expect(screen.getByTestId("storage-player1")).toBeInTheDocument();
    expect(screen.getByTestId("storage-player2")).toBeInTheDocument();
    expect(screen.queryByTestId("storage-player3")).not.toBeInTheDocument();

    // Mode tag reflects AI
    expect(screen.getByTestId("game-mode-tag")).toHaveTextContent(/AI/);
  });

  /**
   * Test B
   * - Start AI mode first.
   * - Verify the standard 2-player board.
   * - Exit and start 3-player Local Multiplayer.
   * - Verify the 15-pit board and three storage areas.
   */
  it("Test B: Start AI mode first -> exit to menu -> start 3-player mode -> renders 15-pit board and 3 storages", () => {
    render(<App />);

    // Step 1: Start AI mode first
    startAIGame("expert");

    // Verify standard 2-player board
    expect(screen.getByTestId("channemane-board")).toBeInTheDocument();
    for (let i = 0; i < 14; i++) {
      expect(screen.getByTestId(`pit-${i}`)).toBeInTheDocument();
    }
    expect(screen.queryByTestId("pit-14")).not.toBeInTheDocument();
    expect(screen.getByTestId("storage-player1")).toBeInTheDocument();
    expect(screen.getByTestId("storage-player2")).toBeInTheDocument();
    expect(screen.queryByTestId("storage-player3")).not.toBeInTheDocument();
    expect(screen.getByTestId("game-mode-tag")).toHaveTextContent(/AI/);

    // Step 2: Return to Main Menu
    returnToMainMenu();

    expect(screen.getByTestId("main-menu")).toBeInTheDocument();

    // Step 3: Start 3-player Local Multiplayer
    startThreePlayerGame();

    // Step 4: Verify 15-pit board and three storage areas
    expect(screen.getByTestId("channemane-board")).toBeInTheDocument();
    for (let i = 0; i < 15; i++) {
      expect(screen.getByTestId(`pit-${i}`)).toBeInTheDocument();
    }
    expect(screen.queryByTestId("pit-15")).not.toBeInTheDocument();
    expect(screen.getByTestId("storage-player1")).toBeInTheDocument();
    expect(screen.getByTestId("storage-player2")).toBeInTheDocument();
    expect(screen.getByTestId("storage-player3")).toBeInTheDocument();
    expect(screen.getByTestId("game-mode-tag")).toHaveTextContent("LOCAL 3P");
  });

  /**
   * Test C
   * - Start 3-player mode → return to menu → start AI mode → return to menu → start 3-player mode.
   * - Verify each game has the correct board, state, rules, and player count.
   */
  it("Test C: Cycle 3P -> Menu -> AI -> Menu -> 3P cleanly preserves respective board architectures", () => {
    render(<App />);

    // Pass 1: 3-Player mode
    startThreePlayerGame();
    expect(screen.getByTestId("storage-player3")).toBeInTheDocument();
    expect(screen.getByTestId("pit-14")).toBeInTheDocument();
    expect(screen.getByTestId("game-mode-tag")).toHaveTextContent("LOCAL 3P");

    // Return to Menu
    returnToMainMenu();

    // Pass 2: AI mode
    startAIGame("master");
    expect(screen.queryByTestId("storage-player3")).not.toBeInTheDocument();
    expect(screen.queryByTestId("pit-14")).not.toBeInTheDocument();
    expect(screen.getByTestId("pit-13")).toBeInTheDocument();
    expect(screen.getByTestId("game-mode-tag")).toHaveTextContent(/AI/);

    // Return to Menu
    returnToMainMenu();

    // Pass 3: 3-Player mode again
    startThreePlayerGame();
    expect(screen.getByTestId("storage-player3")).toBeInTheDocument();
    expect(screen.getByTestId("pit-14")).toBeInTheDocument();
    expect(screen.getByTestId("game-mode-tag")).toHaveTextContent("LOCAL 3P");
  });

  /**
   * Test D
   * - Play a move, verify turn progress, return to menu, and start another mode.
   * - Verify no stale timers, AI actions, or old state mutate the newly started game.
   */
  it("Test D: In-flight turn or active play cleaned up on mode switch; no stale callbacks alter new game", () => {
    render(<App />);

    // Start 3-player mode and play a turn
    startThreePlayerGame();

    const pit0 = screen.getByTestId("pit-0");
    act(() => {
      fireEvent.click(pit0);
    });

    // Fast-forward animation timers partially
    act(() => {
      vi.advanceTimersByTime(200);
    });

    // Return to menu during active game
    returnToMainMenu();

    // Start AI mode
    startAIGame("beginner");

    // Advance any previous timers that might have been queued
    act(() => {
      vi.advanceTimersByTime(5000);
    });

    // Verify AI mode board is completely clean: 14 pits, 5 seeds in unopened pits, 2 players
    expect(screen.getByTestId("storage-player1")).toHaveTextContent("0");
    expect(screen.getByTestId("storage-player2")).toHaveTextContent("0");
    expect(screen.queryByTestId("storage-player3")).not.toBeInTheDocument();
    expect(screen.queryByTestId("pit-14")).not.toBeInTheDocument();

    // Pit 0 in the fresh AI game must have its initial 5 seeds (NOT 0 from the previous 3P game!)
    expect(screen.getByTestId("pit-0")).toHaveAttribute("data-seeds", "5");
  });
});
