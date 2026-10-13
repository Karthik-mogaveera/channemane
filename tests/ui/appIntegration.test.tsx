import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { App } from "../../src/App";

describe("App Integration with Channemane Engine", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders full game UI with 14 pits, single storage bowls, and controls", () => {
    render(<App />);

    // Branding and header
    expect(screen.getByText(/CHANNEMANE/)).toBeInTheDocument();
    expect(screen.getByTestId("restart-btn")).toBeInTheDocument();
    expect(screen.getByTestId("rules-btn")).toBeInTheDocument();
    expect(screen.getByTestId("toggle-animation-btn")).toBeInTheDocument();

    // Turn banner
    expect(screen.getByTestId("turn-indicator")).toHaveTextContent("PLAYER 1'S TURN");

    // Board and 14 pits with initial 5 seeds and external counts
    for (let i = 0; i < 14; i++) {
      const pit = screen.getByTestId(`pit-${i}`);
      expect(pit).toBeInTheDocument();
      expect(pit).toHaveAttribute("data-seeds", "5");

      // Verify pit IDs P0-P13 are hidden from pit face (Issue 9)
      expect(pit.textContent).not.toMatch(new RegExp(`^P${i}$`));

      // Verify external count element exists outside pit button (Issue 5)
      const countEl = screen.getByTestId(`pit-count-${i}`);
      expect(countEl).toBeInTheDocument();
      expect(countEl).toHaveTextContent("5");
    }

    // Single storage display per player (Issue 7)
    expect(screen.getByTestId("storage-player1")).toBeInTheDocument();
    expect(screen.getByTestId("storage-player2")).toBeInTheDocument();
    expect(screen.getByTestId("p1-captured-count")).toHaveTextContent("0");
    expect(screen.getByTestId("p2-captured-count")).toHaveTextContent("0");
  });

  it("allows selecting a legal pit, prompts continuation, and advances the turn", () => {
    render(<App />);

    // Player 1 clicks their own pit P0
    const pit0 = screen.getByTestId("pit-0");
    expect(pit0).not.toBeDisabled();

    act(() => {
      fireEvent.click(pit0);
      vi.runAllTimers();
    });

    // P0 seeds dropped from 5 to 0
    expect(pit0.getAttribute("data-seeds")).toBe("0");

    // Pauses for continuation on pit 6
    expect(screen.getByTestId("turn-indicator")).toHaveTextContent(
      "Choose the highlighted pit to continue sowing."
    );
    const pit6 = screen.getByTestId("pit-6");
    expect(pit6).toHaveAttribute("data-continuation-target", "true");

    // Confirm continuation by clicking highlighted pit
    act(() => {
      fireEvent.click(pit6);
      vi.runAllTimers();
    });

    // Next decision reached
    expect(pit6.getAttribute("data-seeds")).not.toBe("6");
  });

  it("shows real-time seed-by-seed animation increments", () => {
    render(<App />);

    const pit0 = screen.getByTestId("pit-0");

    act(() => {
      fireEvent.click(pit0);
    });

    // Step 0: Pickup event immediately runs at tick 0
    // Selected pit becomes empty (seeds: 0)
    expect(pit0.getAttribute("data-seeds")).toBe("0");

    // Advance 1 step delay (1st drop into pit 1)
    act(() => {
      vi.advanceTimersByTime(450);
    });

    // Pit 1 seeds incremented in real-time from 5 to 6
    const pit1 = screen.getByTestId("pit-1");
    expect(pit1.getAttribute("data-seeds")).toBe("6");
    expect(screen.getByTestId("pit-count-1")).toHaveTextContent("6");

    // Complete all animation steps for this batch
    act(() => {
      vi.runAllTimers();
    });

    // Enters continuation pause
    expect(screen.getByTestId("turn-indicator")).toHaveTextContent(
      "Choose the highlighted pit to continue sowing."
    );
  });

  it("toggles between Slow Mode and Fast Mode (Issue 3)", () => {
    render(<App />);

    const toggleBtn = screen.getByTestId("toggle-animation-btn");
    // Default is Slow Mode (450ms)
    expect(toggleBtn).toHaveTextContent("🎬 Slow Mode");

    // Click to toggle to Fast Mode (140ms)
    act(() => {
      fireEvent.click(toggleBtn);
    });
    expect(toggleBtn).toHaveTextContent("⚡ Fast Mode");

    // Click to toggle back to Slow Mode
    act(() => {
      fireEvent.click(toggleBtn);
    });
    expect(toggleBtn).toHaveTextContent("🎬 Slow Mode");
  });

  it("opens and closes the Rules modal", () => {
    render(<App />);

    expect(screen.queryByTestId("rules-modal")).not.toBeInTheDocument();

    act(() => {
      fireEvent.click(screen.getByTestId("rules-btn"));
    });
    expect(screen.getByTestId("rules-modal")).toBeInTheDocument();

    act(() => {
      fireEvent.click(screen.getByTestId("close-rules-btn"));
    });
    expect(screen.queryByTestId("rules-modal")).not.toBeInTheDocument();
  });

  it("resets the board when New Game is clicked", () => {
    render(<App />);

    // Play a move
    act(() => {
      fireEvent.click(screen.getByTestId("pit-0"));
      vi.runAllTimers();
    });
    expect(screen.getByTestId("pit-0").getAttribute("data-seeds")).not.toBe("5");

    // Reset game
    act(() => {
      fireEvent.click(screen.getByTestId("restart-btn"));
    });

    // Verify P0 is restored back to 5 seeds and Player 1 turn restored
    expect(screen.getByTestId("pit-0")).toHaveAttribute("data-seeds", "5");
    expect(screen.getByTestId("turn-indicator")).toHaveTextContent("PLAYER 1'S TURN");
  });
});
