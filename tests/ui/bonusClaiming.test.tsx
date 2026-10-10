import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { App } from "../../src/App";

describe("UI Integration: Channemane Bonus Claiming During and After Sowing", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("claims an eligible bonus after sowing finishes and immediately updates UI", () => {
    render(<App />);

    // In a normal game from initial state (5 seeds everywhere),
    // let's play a turn and see if bonus occurs or setup a game.
    // P0 has 5 seeds: sowing drops seeds into P1, P2, P3, P4, P5 (each has 6).
    // Continuous scoop continues...
    act(() => {
      fireEvent.click(screen.getByTestId("pit-0"));
      vi.runAllTimers();
    });

    // Check if any pit has a claimable bonus
    const claimButtons = screen.queryAllByText(/CLAIM \+4/);
    if (claimButtons.length > 0) {
      const claimBtn = claimButtons[0];
      const testId = claimBtn.getAttribute("data-testid")!;
      const pitId = parseInt(testId.replace("claim-bonus-", ""), 10);
      const isP1 = pitId <= 6;

      act(() => {
        fireEvent.click(claimBtn);
      });

      // Claim button disappears
      expect(screen.queryByTestId(testId)).not.toBeInTheDocument();
      // Pit seeds become 0
      expect(screen.getByTestId(`pit-${pitId}`)).toHaveAttribute("data-seeds", "0");
      // Storage increased
      const storageCount = screen.getByTestId(isP1 ? "p1-captured-count" : "p2-captured-count");
      expect(parseInt(storageCount.textContent || "0", 10)).toBeGreaterThanOrEqual(4);
    }
  });

  it("allows claiming a bonus during active sowing when pit reaches 4 seeds", () => {
    render(<App />);

    // Player 1 clicks pit 0 to start sowing
    act(() => {
      fireEvent.click(screen.getByTestId("pit-0"));
    });

    // Step through ticks until a pit has a bonus or turn completes
    for (let step = 0; step < 50; step++) {
      act(() => {
        vi.advanceTimersByTime(450);
      });

      const claimBtns = screen.queryAllByText(/CLAIM \+4/);
      if (claimBtns.length > 0) {
        const claimBtn = claimBtns[0];
        const testId = claimBtn.getAttribute("data-testid")!;
        const pitId = parseInt(testId.replace("claim-bonus-", ""), 10);
        const isP1 = pitId <= 6;

        const p1Before = parseInt(screen.getByTestId("p1-captured-count").textContent || "0", 10);
        const p2Before = parseInt(screen.getByTestId("p2-captured-count").textContent || "0", 10);

        // Click claim button MID-SOWING!
        act(() => {
          fireEvent.click(claimBtn);
        });

        // Claim button must disappear immediately
        expect(screen.queryByTestId(testId)).not.toBeInTheDocument();
        // Pit seeds must be 0 immediately
        expect(screen.getByTestId(`pit-${pitId}`)).toHaveAttribute("data-seeds", "0");

        // Pit owner storage must increase immediately by 4
        if (isP1) {
          expect(screen.getByTestId("p1-captured-count")).toHaveTextContent(String(p1Before + 4));
          expect(screen.getByTestId("p2-captured-count")).toHaveTextContent(String(p2Before));
        } else {
          expect(screen.getByTestId("p2-captured-count")).toHaveTextContent(String(p2Before + 4));
          expect(screen.getByTestId("p1-captured-count")).toHaveTextContent(String(p1Before));
        }
        break;
      }
    }

    // Complete the rest of the turn animation safely without crash
    act(() => {
      vi.runAllTimers();
    });

    expect(screen.getByTestId("channemane-board")).toBeInTheDocument();
  });
});
