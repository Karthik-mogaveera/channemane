/**
 * Tests for "Who will Play first" Dialog (Feature 2)
 *
 * Verifies:
 * 1. Selecting Beginner opens the dialog with "Player" and "AI" options.
 * 2. Selecting Expert opens the dialog.
 * 3. Selecting Master opens the dialog.
 * 4. Selecting "Player" starts game with human taking the opening turn.
 * 5. Selecting "AI" starts game with AI taking the opening turn.
 * 6. Expert & Master display Coming Soon safeguard and do not execute incomplete AI or substitute Beginner.
 * 7. Local Multiplayer does NOT display the dialog.
 * 8. Back button in dialog returns to difficulty selection.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { App } from "../../src/App";

describe("Who will Play first Dialog (Feature 2)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("Test 1: Selecting Beginner opens 'Who will Play first' dialog with Player and AI buttons", () => {
    render(<App />);

    // Click Play with AI
    fireEvent.click(screen.getByTestId("menu-btn-ai"));
    expect(screen.getByTestId("difficulty-select")).toBeInTheDocument();

    // Click Beginner
    fireEvent.click(screen.getByTestId("difficulty-btn-beginner"));

    // Dialog appears with title "Who will Play first"
    expect(screen.getByTestId("first-player-modal")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /Who will Play first/i })).toBeInTheDocument();
    expect(screen.getByTestId("first-player-player-btn")).toBeInTheDocument();
    expect(screen.getByTestId("first-player-ai-btn")).toBeInTheDocument();
  });

  it("Test 2: Selecting Expert opens 'Who will Play first' dialog", () => {
    render(<App />);

    fireEvent.click(screen.getByTestId("menu-btn-ai"));
    fireEvent.click(screen.getByTestId("difficulty-btn-expert"));

    expect(screen.getByTestId("first-player-modal")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /Who will Play first/i })).toBeInTheDocument();
    expect(screen.getByText(/Expert AI/i)).toBeInTheDocument();
  });

  it("Test 3: Selecting Master opens 'Who will Play first' dialog", () => {
    render(<App />);

    fireEvent.click(screen.getByTestId("menu-btn-ai"));
    fireEvent.click(screen.getByTestId("difficulty-btn-master"));

    expect(screen.getByTestId("first-player-modal")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /Who will Play first/i })).toBeInTheDocument();
    expect(screen.getByText(/Master AI/i)).toBeInTheDocument();
  });

  it("Test 4: Selecting 'Player' starts Beginner game with Player 1 taking opening turn", () => {
    render(<App />);

    fireEvent.click(screen.getByTestId("menu-btn-ai"));
    fireEvent.click(screen.getByTestId("difficulty-btn-beginner"));
    fireEvent.click(screen.getByTestId("first-player-player-btn"));

    // Board opens
    expect(screen.getByTestId("channemane-board")).toBeInTheDocument();
    expect(screen.getByTestId("game-mode-tag")).toHaveTextContent(/AI \(BEGINNER\)/i);
    // Player 1 turn is active
    expect(screen.getByTestId("turn-banner")).toHaveTextContent(/Player 1's Turn/i);
  });

  it("Test 5: Selecting 'AI' starts Beginner game with AI taking opening turn", () => {
    render(<App />);

    fireEvent.click(screen.getByTestId("menu-btn-ai"));
    fireEvent.click(screen.getByTestId("difficulty-btn-beginner"));
    fireEvent.click(screen.getByTestId("first-player-ai-btn"));

    // Board opens
    expect(screen.getByTestId("channemane-board")).toBeInTheDocument();
    expect(screen.getByTestId("game-mode-tag")).toHaveTextContent(/AI \(BEGINNER\)/i);
    // Player 2 (AI) turn is active
    expect(screen.getByTestId("turn-banner")).toHaveTextContent(/Player 2's Turn/i);
  });

  it("Test 6: Expert difficulty launches Expert AI game with chosen opening player", () => {
    render(<App />);

    fireEvent.click(screen.getByTestId("menu-btn-ai"));
    fireEvent.click(screen.getByTestId("difficulty-btn-expert"));
    fireEvent.click(screen.getByTestId("first-player-player-btn"));

    // Board is mounted with Expert AI
    expect(screen.getByTestId("channemane-board")).toBeInTheDocument();
    expect(screen.getByTestId("game-mode-tag")).toHaveTextContent(/AI \(EXPERT\)/i);
    expect(screen.getByTestId("turn-banner")).toHaveTextContent(/Player 1's Turn/i);
  });

  it("Test 7: Master difficulty launches Master AI game with chosen opening player", () => {
    render(<App />);

    fireEvent.click(screen.getByTestId("menu-btn-ai"));
    fireEvent.click(screen.getByTestId("difficulty-btn-master"));
    fireEvent.click(screen.getByTestId("first-player-ai-btn"));

    // Board is mounted with Master AI and AI as opening player
    expect(screen.getByTestId("channemane-board")).toBeInTheDocument();
    expect(screen.getByTestId("game-mode-tag")).toHaveTextContent(/AI \(MASTER\)/i);
    expect(screen.getByTestId("turn-banner")).toHaveTextContent(/Player 2's Turn/i);
  });

  it("Test 8: Local Multiplayer does NOT display 'Who will Play first' dialog", () => {
    render(<App />);

    fireEvent.click(screen.getByTestId("menu-btn-local"));
    fireEvent.click(screen.getByTestId("player-count-btn-2"));

    // Directly opens board, never opens first-player dialog
    expect(screen.queryByTestId("first-player-modal")).not.toBeInTheDocument();
    expect(screen.getByTestId("channemane-board")).toBeInTheDocument();
    expect(screen.getByTestId("game-mode-tag")).toHaveTextContent(/LOCAL 2P/i);
  });

  it("Test 9: Back button in 'Who will Play first' dialog returns to difficulty select", () => {
    render(<App />);

    fireEvent.click(screen.getByTestId("menu-btn-ai"));
    fireEvent.click(screen.getByTestId("difficulty-btn-beginner"));
    expect(screen.getByTestId("first-player-modal")).toBeInTheDocument();

    // Click Back
    fireEvent.click(screen.getByTestId("first-player-back-btn"));

    // Dialog closed, back on difficulty selection
    expect(screen.queryByTestId("first-player-modal")).not.toBeInTheDocument();
    expect(screen.getByTestId("difficulty-select")).toBeInTheDocument();
  });
});
