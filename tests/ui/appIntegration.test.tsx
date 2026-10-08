import { describe, it, expect } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { App } from "../../src/App";

describe("App Integration with Channemane Engine", () => {
  it("renders full game UI with 14 pits, player storage, and controls", () => {
    render(<App />);

    // Branding and header
    expect(screen.getByText(/CHANNEMANE/)).toBeInTheDocument();
    expect(screen.getByTestId("restart-btn")).toBeInTheDocument();
    expect(screen.getByTestId("rules-btn")).toBeInTheDocument();

    // Turn banner
    expect(screen.getByTestId("turn-indicator")).toHaveTextContent("PLAYER 1'S TURN");

    // Board and 14 pits with initial 5 seeds
    for (let i = 0; i < 14; i++) {
      const pit = screen.getByTestId(`pit-${i}`);
      expect(pit).toBeInTheDocument();
      expect(pit).toHaveAttribute("data-seeds", "5");
    }

    // Storage bowls show 0 captured
    expect(screen.getByTestId("p1-captured-count")).toHaveTextContent("0");
    expect(screen.getByTestId("p2-captured-count")).toHaveTextContent("0");
  });

  it("allows selecting a legal pit and advances the turn to Player 2", async () => {
    render(<App />);

    // Disable animation by clicking Fast Mode for immediate synchronous test resolution
    const toggleAnim = screen.getByTestId("toggle-animation-btn");
    fireEvent.click(toggleAnim);

    // Player 1 clicks their own pit P0
    const pit0 = screen.getByTestId("pit-0");
    expect(pit0).not.toBeDisabled();

    act(() => {
      fireEvent.click(pit0);
    });

    // P0 seeds mutated from 5 to final continuous sowing count (not 5)
    expect(pit0.getAttribute("data-seeds")).not.toBe("5");

    // Turn should have shifted to Player 2
    expect(screen.getByTestId("turn-indicator")).toHaveTextContent("PLAYER 2'S TURN");
  });

  it("opens and closes the Rules modal", () => {
    render(<App />);

    expect(screen.queryByTestId("rules-modal")).not.toBeInTheDocument();

    fireEvent.click(screen.getByTestId("rules-btn"));
    expect(screen.getByTestId("rules-modal")).toBeInTheDocument();

    fireEvent.click(screen.getByTestId("close-rules-btn"));
    expect(screen.queryByTestId("rules-modal")).not.toBeInTheDocument();
  });

  it("resets the board when New Game is clicked", () => {
    render(<App />);

    // Fast mode
    fireEvent.click(screen.getByTestId("toggle-animation-btn"));

    // Play a move
    fireEvent.click(screen.getByTestId("pit-0"));
    expect(screen.getByTestId("pit-0").getAttribute("data-seeds")).not.toBe("5");

    // Reset game
    fireEvent.click(screen.getByTestId("restart-btn"));

    // Verify P0 is restored back to 5 seeds and Player 1 turn restored
    expect(screen.getByTestId("pit-0")).toHaveAttribute("data-seeds", "5");
    expect(screen.getByTestId("turn-indicator")).toHaveTextContent("PLAYER 1'S TURN");
  });
});
