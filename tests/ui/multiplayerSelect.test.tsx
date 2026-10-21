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
    expect(btn4).toHaveTextContent("Coming Soon");

    expect(btn5).toBeInTheDocument();
    expect(btn5).toHaveTextContent("5 Players");
    expect(btn5).toHaveTextContent("Coming Soon");

    expect(btn6).toBeInTheDocument();
    expect(btn6).toHaveTextContent("6 Players");
    expect(btn6).toHaveTextContent("Coming Soon");

    // Board is not mounted yet
    expect(screen.queryByTestId("channemane-board")).not.toBeInTheDocument();
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
    expect(screen.queryByTestId("channemane-board")).not.toBeInTheDocument();

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
    expect(screen.getByTestId("channemane-board")).toBeInTheDocument();
    expect(screen.queryByTestId("multiplayer-select")).not.toBeInTheDocument();
    expect(screen.getByTestId("game-mode-tag")).toHaveTextContent(/LOCAL 2P/i);

    // Initial board setup: 14 pits, Player 1 turn, 5 seeds in Pit 0
    expect(screen.getByTestId("pit-0")).toHaveAttribute("data-seeds", "5");
    expect(screen.getByTestId("turn-indicator")).toHaveTextContent("PLAYER 1'S TURN");

    // Sowing a move works normally
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
    expect(screen.getByTestId("channemane-board")).toBeInTheDocument();
    expect(screen.queryByTestId("multiplayer-select")).not.toBeInTheDocument();

    // Verify 3 player cards and 15 pits
    expect(screen.getByTestId("player-card-1")).toBeInTheDocument();
    expect(screen.getByTestId("player-card-2")).toBeInTheDocument();
    expect(screen.getByTestId("player-card-3")).toBeInTheDocument();
    expect(screen.getByTestId("pit-0")).toHaveAttribute("data-seeds", "5");
    expect(screen.getByTestId("pit-14")).toHaveAttribute("data-seeds", "5");
    expect(screen.getByTestId("turn-indicator")).toHaveTextContent("PLAYER 1'S TURN");
  });

  it("Requirement 8-11: Selecting 4, 5, or 6 Players displays Work in Progress dialog with exact text", () => {
    render(<App />);

    act(() => {
      fireEvent.click(screen.getByTestId("menu-btn-local"));
    });

    // Test 4 Players
    act(() => {
      fireEvent.click(screen.getByTestId("player-count-btn-4"));
    });
    expect(screen.getByTestId("wip-modal")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Work in Progress" })).toBeInTheDocument();
    expect(screen.getByTestId("wip-message")).toHaveTextContent(
      "Multiplayer for this player count is currently under development. Stay tuned for future updates!"
    );
    expect(screen.getByTestId("wip-player-count")).toHaveTextContent("4-Player Multiplayer");
    act(() => {
      fireEvent.click(screen.getByTestId("wip-modal-ok-btn"));
    });
    expect(screen.queryByTestId("wip-modal")).not.toBeInTheDocument();
    expect(screen.getByTestId("multiplayer-select")).toBeInTheDocument();

    // Test 5 Players
    act(() => {
      fireEvent.click(screen.getByTestId("player-count-btn-5"));
    });
    expect(screen.getByTestId("wip-modal")).toBeInTheDocument();
    expect(screen.getByTestId("wip-player-count")).toHaveTextContent("5-Player Multiplayer");
    act(() => {
      fireEvent.click(screen.getByTestId("wip-modal-ok-btn"));
    });

    // Test 6 Players
    act(() => {
      fireEvent.click(screen.getByTestId("player-count-btn-6"));
    });
    expect(screen.getByTestId("wip-modal")).toBeInTheDocument();
    expect(screen.getByTestId("wip-player-count")).toHaveTextContent("6-Player Multiplayer");
    act(() => {
      fireEvent.click(screen.getByTestId("wip-modal-ok-btn"));
    });
    expect(screen.queryByTestId("wip-modal")).not.toBeInTheDocument();
  });

  it("Requirement 12-14: WIP dialog dismissals via Escape key and backdrop click without duplicate dialogs", () => {
    render(<App />);

    act(() => {
      fireEvent.click(screen.getByTestId("menu-btn-local"));
    });

    // Open WIP modal with 4 Players
    act(() => {
      fireEvent.click(screen.getByTestId("player-count-btn-4"));
    });
    expect(screen.getByTestId("wip-modal")).toBeInTheDocument();

    // Press Escape
    act(() => {
      fireEvent.keyDown(window, { key: "Escape" });
    });
    expect(screen.queryByTestId("wip-modal")).not.toBeInTheDocument();
    expect(screen.getByTestId("multiplayer-select")).toBeInTheDocument();

    // Open again with 4 Players and click backdrop overlay
    act(() => {
      fireEvent.click(screen.getByTestId("player-count-btn-4"));
    });
    const overlay = screen.getByTestId("wip-modal");
    act(() => {
      fireEvent.click(overlay);
    });
    expect(screen.queryByTestId("wip-modal")).not.toBeInTheDocument();

    // Clicking card content does not dismiss (event propagation stopped)
    act(() => {
      fireEvent.click(screen.getByTestId("player-count-btn-5"));
    });
    const card = screen.getByTestId("wip-card");
    act(() => {
      fireEvent.click(card);
    });
    expect(screen.getByTestId("wip-modal")).toBeInTheDocument();

    // Ensure only one dialog instance exists
    expect(screen.getAllByTestId("wip-modal")).toHaveLength(1);

    act(() => {
      fireEvent.click(screen.getByTestId("wip-modal-ok-btn"));
    });
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
