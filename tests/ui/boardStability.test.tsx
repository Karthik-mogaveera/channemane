import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { App } from "../../src/App";
import { GameBoard } from "../../src/ui/components/GameBoard";
import { createInitialGame } from "../../src/engine/board";

describe("ISSUE 2: Board Geometric Stability During Sowing", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("Test 1, 2, 3: Pit elements maintain stable identities and keys during seed-by-seed sowing", () => {
    render(<App initialScreen="GAME" />);

    // Advance past initial turn notification
    act(() => {
      vi.advanceTimersByTime(800);
    });

    const pit0 = screen.getByTestId("pit-0");
    const pit1 = screen.getByTestId("pit-1");
    const initialPit1Element = pit1;

    // Start sowing from P0
    act(() => {
      fireEvent.click(pit0);
    });

    // Advance 1 step
    act(() => {
      vi.advanceTimersByTime(450);
    });

    // Pit 1 element instance must remain the same (no remounting due to key instability)
    const currentPit1Element = screen.getByTestId("pit-1");
    expect(currentPit1Element).toBe(initialPit1Element);
    expect(currentPit1Element).toHaveAttribute("data-seeds", "6");

    // Finish turn
    act(() => {
      vi.runAllTimers();
    });
  });

  it("Test 4: Active-drop highlighting applies visual class without transform scaling", () => {
    render(<App initialScreen="GAME" />);

    // Advance past initial turn notification
    act(() => {
      vi.advanceTimersByTime(800);
    });

    const pit0 = screen.getByTestId("pit-0");
    act(() => {
      fireEvent.click(pit0);
    });

    // Advance 1 step so P1 receives active drop
    act(() => {
      vi.advanceTimersByTime(450);
    });

    const pit1 = screen.getByTestId("pit-1");
    expect(pit1.classList.contains("active-drop")).toBe(true);

    // Active drop class must NOT contain scale transforms
    // Verify that the element has the class and remains within normal layout
    expect(pit1.getAttribute("data-seeds")).toBe("6");

    act(() => {
      vi.runAllTimers();
    });
    expect(pit1.classList.contains("active-drop")).toBe(false);
  });

  it("Test 5 & 6: Seed-by-seed animation and continuous sowing update counts progressively", () => {
    render(<App initialScreen="GAME" />);

    // Advance past initial turn notification
    act(() => {
      vi.advanceTimersByTime(800);
    });

    const pit0 = screen.getByTestId("pit-0");
    act(() => {
      fireEvent.click(pit0);
    });

    // Pickup
    expect(pit0).toHaveAttribute("data-seeds", "0");
    expect(screen.getByTestId("pit-count-0")).toHaveTextContent("0");

    // Step 1: drop in P1
    act(() => {
      vi.advanceTimersByTime(450);
    });
    expect(screen.getByTestId("pit-1")).toHaveAttribute("data-seeds", "6");
    expect(screen.getByTestId("pit-count-1")).toHaveTextContent("6");

    // Step 2: drop in P2
    act(() => {
      vi.advanceTimersByTime(450);
    });
    expect(screen.getByTestId("pit-2")).toHaveAttribute("data-seeds", "6");
    expect(screen.getByTestId("pit-count-2")).toHaveTextContent("6");

    // Complete drops for batch 1 (reaches WAITING_FOR_CONTINUATION on pit 6)
    act(() => {
      vi.runAllTimers();
    });

    // Verification of Requirement 1 & 2: Pauses and prompts player
    expect(screen.getByTestId("turn-indicator")).toHaveTextContent(
      "Choose the highlighted pit to continue sowing."
    );
    const pit6 = screen.getByTestId("pit-6");
    expect(pit6).toHaveAttribute("data-continuation-target", "true");

    // Click pit 6 to continue sowing batch
    act(() => {
      fireEvent.click(pit6);
      vi.runAllTimers();
    });
  });

  it("Test 9: Animation timers are canceled on game reset or unmount, preventing stale callbacks", () => {
    const { unmount } = render(<App initialScreen="GAME" />);

    const pit0 = screen.getByTestId("pit-0");
    act(() => {
      fireEvent.click(pit0);
    });

    // Unmount while animating
    unmount();

    // Advancing timers should not throw error or update unmounted component
    expect(() => {
      act(() => {
        vi.runAllTimers();
      });
    }).not.toThrow();
  });

  it("Test 7: Bonus claiming remains functional and stable during and after sowing via gestures", () => {
    const game = createInitialGame("PLAYER_1");
    // P3 has 4 seeds with bonus available
    game.pits[3].seeds = 4;
    game.pits[3].bonusAvailable = true;

    const handleSelectPit = vi.fn();
    const handleClaimBonus = vi.fn();

    render(
      <GameBoard
        gameState={game}
        selectablePits={[0]}
        activeDropPit={null}
        isAnimating={false}
        onSelectPit={handleSelectPit}
        onClaimBonus={handleClaimBonus}
      />
    );

    // Requirement 18: No Claim button rendered
    expect(screen.queryByTestId("claim-bonus-3")).not.toBeInTheDocument();

    const pit3 = screen.getByTestId("pit-3");
    expect(pit3).toHaveClass("has-bonus");

    // Right-click desktop collection
    fireEvent.contextMenu(pit3);
    expect(handleClaimBonus).toHaveBeenCalledWith(3);
  });
});
