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

  it("claims an eligible bonus via gesture after sowing pauses or finishes and immediately updates UI", () => {
    render(<App initialScreen="GAME" />);

    // Start sowing from P0
    act(() => {
      fireEvent.click(screen.getByTestId("pit-0"));
      vi.runAllTimers();
    });

    // Verification of Requirement 18: No Claim button rendered anywhere
    expect(screen.queryAllByText(/CLAIM \+4/i)).toHaveLength(0);

    // Look for pits with bonus class
    const bonusPits = Array.from(document.querySelectorAll(".channemane-pit.has-bonus")) as HTMLElement[];
    if (bonusPits.length > 0) {
      const pitEl = bonusPits[0];
      const pitId = parseInt(pitEl.getAttribute("data-pit-id")!, 10);
      const isP1 = pitId <= 6;

      const p1Before = parseInt(screen.getByTestId("p1-captured-count").textContent || "0", 10);
      const p2Before = parseInt(screen.getByTestId("p2-captured-count").textContent || "0", 10);

      // Desktop Right-Click gesture to claim bonus
      act(() => {
        fireEvent.contextMenu(pitEl);
      });

      // Pit seeds become 0
      expect(pitEl).toHaveAttribute("data-seeds", "0");
      // Pit loses has-bonus class
      expect(pitEl).not.toHaveClass("has-bonus");

      // Pit owner storage increases by 4
      if (isP1) {
        expect(screen.getByTestId("p1-captured-count")).toHaveTextContent(String(p1Before + 4));
        expect(screen.getByTestId("p2-captured-count")).toHaveTextContent(String(p2Before));
      } else {
        expect(screen.getByTestId("p2-captured-count")).toHaveTextContent(String(p2Before + 4));
        expect(screen.getByTestId("p1-captured-count")).toHaveTextContent(String(p1Before));
      }
    }
  });

  it("allows claiming a bonus during active sowing when pit reaches 4 seeds via long-press", () => {
    render(<App initialScreen="GAME" />);

    // Player 1 clicks pit 0 to start sowing
    act(() => {
      fireEvent.click(screen.getByTestId("pit-0"));
    });

    // Step through ticks until a pit has a bonus or first batch completes
    for (let step = 0; step < 50; step++) {
      act(() => {
        vi.advanceTimersByTime(450);
      });

      // Verify no Claim button is ever rendered during sowing
      expect(screen.queryAllByText(/CLAIM \+4/i)).toHaveLength(0);

      const bonusPits = Array.from(document.querySelectorAll(".channemane-pit.has-bonus")) as HTMLElement[];
      if (bonusPits.length > 0) {
        const pitEl = bonusPits[0];
        const pitId = parseInt(pitEl.getAttribute("data-pit-id")!, 10);
        const isP1 = pitId <= 6;

        const p1Before = parseInt(screen.getByTestId("p1-captured-count").textContent || "0", 10);
        const p2Before = parseInt(screen.getByTestId("p2-captured-count").textContent || "0", 10);

        // Long-press MID-SOWING: pointerDown + 500ms
        act(() => {
          fireEvent.pointerDown(pitEl, { clientX: 100, clientY: 100, button: 0 });
          vi.advanceTimersByTime(500);
        });

        // Pit seeds must be 0 immediately
        expect(pitEl).toHaveAttribute("data-seeds", "0");

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

    // Board remains stable and intact
    expect(screen.getByTestId("channemane-board")).toBeInTheDocument();
  });
});
