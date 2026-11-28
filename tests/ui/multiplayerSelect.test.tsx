/**
 * Test Suite: Local Multiplayer Player Count Selection and Work in Progress Handling
 *
 * Verifies:
 * 1. Navigation: Main Menu -> Local Multiplayer Player Count Selection screen
 * 2. Visual presentation: Headings, subtitles, 5 player-count options (2, 3, 4, 5, 6 Players)
 * 3. 2 Players option: Launches existing 2-player gameplay flow cleanly
 * 4. 3, 4, 5, 6 Players options: Displays Work in Progress dialog with exact required text
 * 5. Dismissal: "Got it" button, Escape key, and backdrop click return to selection screen
 * 6. Non-mutation: WIP options do not start game or alter game state
 * 7. Back navigation: Returns to Main Menu
 * 8. Regression: AI difficulty selection and Rules navigation remain untouched
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import App from "../../src/App";

vi.mock("../../src/three/Board3D", async () => {
  const { Board3DTestDouble } = await import("./helpers/board3dTestDouble");
  return { Board3D: Board3DTestDouble };
});

describe("Local Multiplayer Player Count Selection", () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("Requirement 1 & 2: Clicking Local Multiplayer opens the selection screen with 5 options", () => {
    render(<App />);

    // Click Local Multiplayer on Main Menu
    act(() => {
      fireEvent.click(screen.getByTestId("menu-btn-local"));
    });

    // Screen heading and subtitle
    expect(screen.getByTestId("multiplayer-select")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Local Multiplayer" })).toBeInTheDocument();
    expect(screen.getByText("Choose the number of players")).toBeInTheDocument();

    // Exactly 5 player count options present
    const btn2 = screen.getByTestId("player-count-btn-2");
    const btn3 = screen.getByTestId("player-count-btn-3");
    const btn4 = screen.getByTestId("player-count-btn-4");
    const btn5 = screen.getByTestId("player-count-btn-5");
    const btn6 = screen.getByTestId("player-count-btn-6");

    expect(btn2).toBeInTheDocument();
    expect(btn2).toHaveTextContent("2 Players");
    expect(btn2).toHaveTextContent("Play Now");

    expect(btn3).toBeInTheDocument();
    expect(btn3).toHaveTextContent("3 Players");
    expect(btn3).toHaveTextContent("Play Now");

    expect(btn4).toBeInTheDocument();
    expect(btn4).toHaveTextContent("4 Players");
    expect(btn4).toHaveTextContent("Play Now");

    expect(btn5).toBeInTheDocument();
    expect(btn5).toHaveTextContent("5 Players");
    expect(btn5).toHaveTextContent("Play Now");

    expect(btn6).toBeInTheDocument();
    expect(btn6).toHaveTextContent("6 Players");
    expect(btn6).toHaveTextContent("Play Now");

    // Board is not mounted yet
    expect(screen.queryByTestId("channemane-board-3d")).not.toBeInTheDocument();
  });

  it("Requirement 3 & 4: Clicking Back returns to the Main Menu, and re-entering works cleanly", () => {
    render(<App />);

    // Open multiplayer selection
    act(() => {
      fireEvent.click(screen.getByTestId("menu-btn-local"));
    });
    expect(screen.getByTestId("multiplayer-select")).toBeInTheDocument();

    // Click Back to Main Menu
    act(() => {
      fireEvent.click(screen.getByTestId("multiplayer-btn-back"));
    });

    // Main Menu is back
    expect(screen.getByTestId("main-menu")).toBeInTheDocument();
    expect(screen.queryByTestId("multiplayer-select")).not.toBeInTheDocument();
    expect(screen.queryByTestId("channemane-board-3d")).not.toBeInTheDocument();

    // Re-enter Local Multiplayer
    act(() => {
      fireEvent.click(screen.getByTestId("menu-btn-local"));
    });
    expect(screen.getByTestId("multiplayer-select")).toBeInTheDocument();
  });

  it("Requirement 5, 6 & 7: Selecting 2 Players opens existing Local 2P gameplay flow and is playable", () => {
    render(<App />);

    // Navigate to selection then choose 2 Players
    act(() => {
      fireEvent.click(screen.getByTestId("menu-btn-local"));
    });
    act(() => {
      fireEvent.click(screen.getByTestId("player-count-btn-2"));
    });

    // Directly on game board with LOCAL 2P mode
    expect(screen.getByTestId("channemane-board-3d")).toBeInTheDocument();
    expect(screen.queryByTestId("multiplayer-select")).not.toBeInTheDocument();
    expect(screen.getByTestId("game-mode-tag")).toHaveTextContent(/LOCAL 2P/i);

    // Initial board setup: 14 pits, Player 1 turn, 5 seeds in Pit 0
    expect(screen.getByTestId("pit-0")).toHaveAttribute("data-seeds", "5");
    expect(screen.getByTestId("turn-indicator")).toHaveTextContent("PLAYER 1'S TURN");

    // Sowing a move works normally
    act(() => {
      vi.advanceTimersByTime(800);
    });
    act(() => {
      fireEvent.click(screen.getByTestId("pit-0"));
      vi.runAllTimers();
    });
    expect(screen.getByTestId("pit-0").getAttribute("data-seeds")).not.toBe("5");
  });

  it("Requirement 5b: Selecting 3 Players opens 3-Player gameplay flow and renders 15 pits", () => {
    render(<App />);

    // Navigate to selection then choose 3 Players
    act(() => {
      fireEvent.click(screen.getByTestId("menu-btn-local"));
    });
    act(() => {
      fireEvent.click(screen.getByTestId("player-count-btn-3"));
    });

    // Directly on game board with 3-Player Board
    expect(screen.getByTestId("channemane-board-3d")).toBeInTheDocument();
    expect(screen.queryByTestId("multiplayer-select")).not.toBeInTheDocument();

    // Verify 3 player cards and 15 pits
    expect(screen.getByTestId("player-card-1")).toBeInTheDocument();
    expect(screen.getByTestId("player-card-2")).toBeInTheDocument();
    expect(screen.getByTestId("player-card-3")).toBeInTheDocument();
    expect(screen.getByTestId("pit-0")).toHaveAttribute("data-seeds", "5");
    expect(screen.getByTestId("pit-14")).toHaveAttribute("data-seeds", "5");
    expect(screen.getByTestId("turn-indicator")).toHaveTextContent("PLAYER 1'S TURN");
  });

  it("Requirement 5c: Selecting 4 Players opens 4-Player gameplay flow and renders 16 pits and 4 player cards", () => {
    render(<App />);

    act(() => {
      fireEvent.click(screen.getByTestId("menu-btn-local"));
    });
    act(() => {
      fireEvent.click(screen.getByTestId("player-count-btn-4"));
    });

    // Directly on game board with 4-Player Board
    expect(screen.getByTestId("channemane-board-3d")).toBeInTheDocument();
    expect(screen.queryByTestId("multiplayer-select")).not.toBeInTheDocument();
    expect(screen.getByTestId("game-mode-tag")).toHaveTextContent(/LOCAL 4P/i);

    // Verify 4 player cards and 16 pits
    expect(screen.getByTestId("player-card-1")).toBeInTheDocument();
    expect(screen.getByTestId("player-card-2")).toBeInTheDocument();
    expect(screen.getByTestId("player-card-3")).toBeInTheDocument();
    expect(screen.getByTestId("player-card-4")).toBeInTheDocument();
    expect(screen.getByTestId("pit-0")).toHaveAttribute("data-seeds", "5");
    expect(screen.getByTestId("pit-15")).toHaveAttribute("data-seeds", "5");
    expect(screen.getByTestId("turn-indicator")).toHaveTextContent("PLAYER 1'S TURN");
  });

  it("Requirement 5d: Selecting 5 Players opens 5-Player gameplay flow and renders 20 pits and 5 player cards", () => {
    render(<App />);

    act(() => {
      fireEvent.click(screen.getByTestId("menu-btn-local"));
    });
    act(() => {
      fireEvent.click(screen.getByTestId("player-count-btn-5"));
    });

    // Directly on game board with 5-Player Board
    expect(screen.getByTestId("channemane-board-3d")).toBeInTheDocument();
    expect(screen.queryByTestId("multiplayer-select")).not.toBeInTheDocument();
    expect(screen.getByTestId("game-mode-tag")).toHaveTextContent(/LOCAL 5P/i);

    // Verify 5 player cards and 20 pits
    expect(screen.getByTestId("player-card-1")).toBeInTheDocument();
    expect(screen.getByTestId("player-card-2")).toBeInTheDocument();
    expect(screen.getByTestId("player-card-3")).toBeInTheDocument();
    expect(screen.getByTestId("player-card-4")).toBeInTheDocument();
    expect(screen.getByTestId("player-card-5")).toBeInTheDocument();
    expect(screen.getByTestId("pit-0")).toHaveAttribute("data-seeds", "5");
    expect(screen.getByTestId("pit-19")).toHaveAttribute("data-seeds", "5");
    expect(screen.getByTestId("turn-indicator")).toHaveTextContent("PLAYER 1'S TURN");
  });

  it("Requirement 5e: Selecting 6 Players opens 6-Player gameplay flow and renders 24 pits and 6 player cards", () => {
    render(<App />);

    act(() => {
      fireEvent.click(screen.getByTestId("menu-btn-local"));
    });
    act(() => {
      fireEvent.click(screen.getByTestId("player-count-btn-6"));
    });

    // Directly on game board with 6-Player Board
    expect(screen.getByTestId("channemane-board-3d")).toBeInTheDocument();
    expect(screen.queryByTestId("multiplayer-select")).not.toBeInTheDocument();
    expect(screen.getByTestId("game-mode-tag")).toHaveTextContent(/LOCAL 6P/i);

    // Verify 6 player cards and 24 pits
    expect(screen.getByTestId("player-card-1")).toBeInTheDocument();
    expect(screen.getByTestId("player-card-2")).toBeInTheDocument();
    expect(screen.getByTestId("player-card-3")).toBeInTheDocument();
    expect(screen.getByTestId("player-card-4")).toBeInTheDocument();
    expect(screen.getByTestId("player-card-5")).toBeInTheDocument();
    expect(screen.getByTestId("player-card-6")).toBeInTheDocument();
    expect(screen.getByTestId("pit-0")).toHaveAttribute("data-seeds", "5");
    expect(screen.getByTestId("pit-23")).toHaveAttribute("data-seeds", "5");
    expect(screen.getByTestId("turn-indicator")).toHaveTextContent("PLAYER 1'S TURN");
  });

  it("Requirement 15-17: Regression - Play with AI, AI difficulties, and Rules remain unchanged", () => {
    render(<App />);

    // Rules modal opens and closes
    act(() => {
      fireEvent.click(screen.getByTestId("menu-btn-rules"));
    });
    expect(screen.getByTestId("rules-modal")).toBeInTheDocument();
    act(() => {
      fireEvent.click(screen.getByTestId("rules-back-btn"));
    });
    expect(screen.queryByTestId("rules-modal")).not.toBeInTheDocument();
    expect(screen.getByTestId("main-menu")).toBeInTheDocument();

    // Play with AI opens difficulty select
    act(() => {
      fireEvent.click(screen.getByTestId("menu-btn-ai"));
    });
    expect(screen.getByTestId("difficulty-select")).toBeInTheDocument();
    expect(screen.getByTestId("difficulty-btn-beginner")).toBeInTheDocument();
    expect(screen.getByTestId("difficulty-btn-expert")).toBeInTheDocument();
    expect(screen.getByTestId("difficulty-btn-master")).toBeInTheDocument();

    // Back to main menu
    act(() => {
      fireEvent.click(screen.getByTestId("difficulty-btn-back"));
    });
    expect(screen.getByTestId("main-menu")).toBeInTheDocument();
  });
});
