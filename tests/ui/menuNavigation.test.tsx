/**
 * Automated Unit & Navigation Test Suite
 * Main Menu, AI Difficulty Selection, and Game Mode Navigation
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { App } from "../../src/App";

describe("Main Menu & Game Mode Navigation Flow", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("Scenario 1 & 2: Opening the application displays the 3 main menu buttons and does not open board", () => {
    render(<App />);

    // Main menu container exists
    expect(screen.getByTestId("main-menu")).toBeInTheDocument();

    // 3 Main menu buttons are clearly visible and easy to tap
    const aiBtn = screen.getByTestId("menu-btn-ai");
    const localBtn = screen.getByTestId("menu-btn-local");
    const rulesBtn = screen.getByTestId("menu-btn-rules");

    expect(aiBtn).toBeInTheDocument();
    expect(aiBtn).toHaveTextContent(/Play with AI/i);

    expect(localBtn).toBeInTheDocument();
    expect(localBtn).toHaveTextContent(/Local Multiplayer/i);

    expect(rulesBtn).toBeInTheDocument();
    expect(rulesBtn).toHaveTextContent(/Rules/i);

    // Game board is NOT opened on initial load
    expect(screen.queryByTestId("channemane-board")).not.toBeInTheDocument();
    expect(screen.queryByTestId("difficulty-select")).not.toBeInTheDocument();
  });

  it("Scenario 3 & 4: Clicking 'Play with AI' displays Beginner, Expert, Master and Back button returns to menu", () => {
    render(<App />);

    // Click Play with AI
    act(() => {
      fireEvent.click(screen.getByTestId("menu-btn-ai"));
    });

    // Difficulty selection screen is displayed
    expect(screen.getByTestId("difficulty-select")).toBeInTheDocument();
    expect(screen.queryByTestId("main-menu")).not.toBeInTheDocument();
    expect(screen.queryByTestId("channemane-board")).not.toBeInTheDocument();

    // Exactly 3 difficulty options present
    const beginnerBtn = screen.getByTestId("difficulty-btn-beginner");
    const expertBtn = screen.getByTestId("difficulty-btn-expert");
    const masterBtn = screen.getByTestId("difficulty-btn-master");
    const backBtn = screen.getByTestId("difficulty-btn-back");

    expect(beginnerBtn).toBeInTheDocument();
    expect(beginnerBtn).toHaveTextContent(/Beginner/i);

    expect(expertBtn).toBeInTheDocument();
    expect(expertBtn).toHaveTextContent(/Expert/i);

    expect(masterBtn).toBeInTheDocument();
    expect(masterBtn).toHaveTextContent(/Master/i);

    expect(backBtn).toBeInTheDocument();

    // Clicking Back returns to Main Menu
    act(() => {
      fireEvent.click(backBtn);
    });

    expect(screen.getByTestId("main-menu")).toBeInTheDocument();
    expect(screen.queryByTestId("difficulty-select")).not.toBeInTheDocument();
    expect(screen.queryByTestId("channemane-board")).not.toBeInTheDocument();
  });

  it("Scenario 5: Selecting Beginner difficulty opens existing board and records mode='ai', diff='beginner'", () => {
    render(<App />);

    // Navigate to Difficulty Selection
    act(() => {
      fireEvent.click(screen.getByTestId("menu-btn-ai"));
    });

    // Select Beginner
    act(() => {
      fireEvent.click(screen.getByTestId("difficulty-btn-beginner"));
    });

    // "Who will Play first" dialog is shown
    expect(screen.getByTestId("first-player-modal")).toBeInTheDocument();
    expect(screen.getByText(/Who will Play first/i)).toBeInTheDocument();

    // Select Player
    act(() => {
      fireEvent.click(screen.getByTestId("first-player-player-btn"));
    });

    // Game board is now visible
    expect(screen.getByTestId("channemane-board")).toBeInTheDocument();
    expect(screen.queryByTestId("main-menu")).not.toBeInTheDocument();
    expect(screen.queryByTestId("difficulty-select")).not.toBeInTheDocument();

    // Tag displays AI (BEGINNER)
    expect(screen.getByTestId("game-mode-tag")).toHaveTextContent(/AI \(BEGINNER\)/i);

    // Initial board state is valid
    for (let i = 0; i < 14; i++) {
      expect(screen.getByTestId(`pit-${i}`)).toHaveAttribute("data-seeds", "5");
    }
  });

  it("Scenario 6: Selecting Expert difficulty displays First Player modal and launches Expert AI game", () => {
    render(<App />);

    act(() => {
      fireEvent.click(screen.getByTestId("menu-btn-ai"));
    });

    act(() => {
      fireEvent.click(screen.getByTestId("difficulty-btn-expert"));
    });

    // "Who will Play first" dialog is shown
    expect(screen.getByTestId("first-player-modal")).toBeInTheDocument();

    // Select Player
    act(() => {
      fireEvent.click(screen.getByTestId("first-player-player-btn"));
    });

    // Expert AI game is launched
    expect(screen.getByTestId("channemane-board")).toBeInTheDocument();
    expect(screen.getByTestId("game-mode-tag")).toHaveTextContent(/AI \(EXPERT\)/i);
  });

  it("Scenario 7: Selecting Master difficulty displays First Player modal and launches Master AI game", () => {
    render(<App />);

    act(() => {
      fireEvent.click(screen.getByTestId("menu-btn-ai"));
    });

    act(() => {
      fireEvent.click(screen.getByTestId("difficulty-btn-master"));
    });

    // "Who will Play first" dialog is shown
    expect(screen.getByTestId("first-player-modal")).toBeInTheDocument();

    // Select AI
    act(() => {
      fireEvent.click(screen.getByTestId("first-player-ai-btn"));
    });

    // Master launches cleanly
    expect(screen.getByTestId("channemane-board")).toBeInTheDocument();
    expect(screen.getByTestId("game-mode-tag")).toHaveTextContent(/AI \(MASTER\)/i);
  });

  it("Scenario 8: Clicking 'Local Multiplayer' opens player selection, and choosing '2 Players' opens board", () => {
    render(<App />);

    // Click Local Multiplayer
    act(() => {
      fireEvent.click(screen.getByTestId("menu-btn-local"));
    });

    // Multiplayer selection screen is displayed
    expect(screen.getByTestId("multiplayer-select")).toBeInTheDocument();
    expect(screen.queryByTestId("difficulty-select")).not.toBeInTheDocument();
    expect(screen.queryByTestId("channemane-board")).not.toBeInTheDocument();

    // Click 2 Players
    act(() => {
      fireEvent.click(screen.getByTestId("player-count-btn-2"));
    });

    // Directly on game board, no difficulty screen ever shown
    expect(screen.getByTestId("channemane-board")).toBeInTheDocument();
    expect(screen.queryByTestId("multiplayer-select")).not.toBeInTheDocument();
    expect(screen.queryByTestId("main-menu")).not.toBeInTheDocument();

    // Tag shows LOCAL 2P
    expect(screen.getByTestId("game-mode-tag")).toHaveTextContent(/LOCAL 2P/i);
  });

  it("Scenario 9: Clicking 'Rules' on main menu displays rules modal and Back returns to main menu", () => {
    render(<App />);

    // Click Rules
    act(() => {
      fireEvent.click(screen.getByTestId("menu-btn-rules"));
    });

    // Rules modal is visible
    expect(screen.getByTestId("rules-modal")).toBeInTheDocument();
    expect(screen.getByText("Channemane — Rules of Play")).toBeInTheDocument();

    // Click Back to Menu button in Rules modal
    act(() => {
      fireEvent.click(screen.getByTestId("rules-back-btn"));
    });

    // Rules modal is closed, user remains on main menu
    expect(screen.queryByTestId("rules-modal")).not.toBeInTheDocument();
    expect(screen.getByTestId("main-menu")).toBeInTheDocument();
  });

  it("Scenario 10: In-game 'Menu' button returns to Main Menu cleanly and resets state", () => {
    render(<App />);

    // Start a Local Multiplayer game (Menu -> Local -> 2 Players)
    act(() => {
      fireEvent.click(screen.getByTestId("menu-btn-local"));
    });
    act(() => {
      fireEvent.click(screen.getByTestId("player-count-btn-2"));
    });

    expect(screen.getByTestId("channemane-board")).toBeInTheDocument();

    // Play a move on Pit 0 to alter state
    act(() => {
      fireEvent.click(screen.getByTestId("pit-0"));
      vi.runAllTimers();
    });
    expect(screen.getByTestId("pit-0").getAttribute("data-seeds")).not.toBe("5");

    // Click Menu button in Header
    act(() => {
      fireEvent.click(screen.getByTestId("main-menu-btn"));
    });

    // User is back on Main Menu
    expect(screen.getByTestId("main-menu")).toBeInTheDocument();
    expect(screen.queryByTestId("channemane-board")).not.toBeInTheDocument();

    // Now start another game to verify state is clean (P0 is fresh with 5 seeds)
    act(() => {
      fireEvent.click(screen.getByTestId("menu-btn-local"));
    });
    act(() => {
      fireEvent.click(screen.getByTestId("player-count-btn-2"));
    });

    expect(screen.getByTestId("channemane-board")).toBeInTheDocument();
    expect(screen.getByTestId("pit-0")).toHaveAttribute("data-seeds", "5");
    expect(screen.getByTestId("turn-indicator")).toHaveTextContent("PLAYER 1'S TURN");
  });
});
