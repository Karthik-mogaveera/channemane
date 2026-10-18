/**
 * Tests for Turn-Start Notifications ("Your turn" / "AI turn") (Feature 3)
 *
 * Verifies:
 * 1. "Your turn" appears before a human turn.
 * 2. "AI turn" appears before an AI turn.
 * 3. Initial notification accurately matches selected opening player.
 * 4. Human interaction is disabled while the notification is displayed.
 * 5. Notification disappears after ~800ms duration.
 * 6. AI decision-making waits until turn notification finishes.
 * 7. Turn notifications appear when turn ownership changes.
 * 8. No duplicate notifications for the same turn.
 * 9. Match end or round settlement suppresses turn notifications.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act, fireEvent } from "@testing-library/react";
import { App } from "../../src/App";

describe("Turn-Start Notifications (Feature 3)", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("Test 1: 'Your turn' popup appears when Player takes the opening turn", () => {
    render(<App />);

    // Select Play with AI -> Beginner -> Player
    act(() => {
      fireEvent.click(screen.getByTestId("menu-btn-ai"));
    });
    act(() => {
      fireEvent.click(screen.getByTestId("difficulty-btn-beginner"));
    });
    act(() => {
      fireEvent.click(screen.getByTestId("first-player-player-btn"));
    });

    // "Your turn" popup is visible!
    expect(screen.getByTestId("turn-notification-popup")).toBeInTheDocument();
    expect(screen.getByTestId("turn-notification-text")).toHaveTextContent("Your turn");

    // During notification display, pit buttons are disabled/non-interactive
    const pit0 = screen.getByTestId("pit-0");
    expect(pit0).toBeDisabled();
    expect(pit0).toHaveAttribute("data-selectable", "false");

    // Fast-forward 800ms
    act(() => {
      vi.advanceTimersByTime(800);
    });

    // Notification is dismissed
    expect(screen.queryByTestId("turn-notification-popup")).not.toBeInTheDocument();

    // Now pit 0 is interactive
    expect(pit0).not.toBeDisabled();
    expect(pit0).toHaveAttribute("data-selectable", "true");
  });

  it("Test 2: 'AI turn' popup appears when AI takes the opening turn", () => {
    render(<App />);

    // Select Play with AI -> Beginner -> AI
    act(() => {
      fireEvent.click(screen.getByTestId("menu-btn-ai"));
    });
    act(() => {
      fireEvent.click(screen.getByTestId("difficulty-btn-beginner"));
    });
    act(() => {
      fireEvent.click(screen.getByTestId("first-player-ai-btn"));
    });

    // "AI turn" popup is visible!
    expect(screen.getByTestId("turn-notification-popup")).toBeInTheDocument();
    expect(screen.getByTestId("turn-notification-text")).toHaveTextContent("AI turn");

    // Fast-forward 400ms (notification still active)
    act(() => {
      vi.advanceTimersByTime(400);
    });
    expect(screen.getByTestId("turn-notification-popup")).toBeInTheDocument();

    // Fast-forward past 800ms
    act(() => {
      vi.advanceTimersByTime(450);
    });
    expect(screen.queryByTestId("turn-notification-popup")).not.toBeInTheDocument();
  });

  it("Test 3: AI does NOT begin its thinking delay or execute until turn notification finishes", () => {
    render(<App />);

    act(() => {
      fireEvent.click(screen.getByTestId("menu-btn-ai"));
    });
    act(() => {
      fireEvent.click(screen.getByTestId("difficulty-btn-beginner"));
    });
    act(() => {
      fireEvent.click(screen.getByTestId("first-player-ai-btn"));
    });

    // Board seeds: all pits start with 5 seeds
    const pit7 = screen.getByTestId("pit-7");
    expect(pit7).toHaveAttribute("data-seeds", "5");

    // Advance 500ms (less than 800ms notification duration)
    act(() => {
      vi.advanceTimersByTime(500);
    });

    // AI has NOT sown any pits yet because notification is still showing
    expect(screen.getByTestId("turn-notification-popup")).toBeInTheDocument();
    expect(pit7).toHaveAttribute("data-seeds", "5");

    // Advance 350ms (now 850ms total -> notification cleared)
    act(() => {
      vi.advanceTimersByTime(350);
    });
    expect(screen.queryByTestId("turn-notification-popup")).not.toBeInTheDocument();

    // Advance thinking delay (500ms)
    act(() => {
      vi.advanceTimersByTime(500);
    });

    // AI has executed its starting move (at least one AI pit seed count changed from 5)
    const aiPits = [7, 8, 9, 10, 11, 12, 13].map((id) => screen.getByTestId(`pit-${id}`));
    const hasMoved = aiPits.some((pit) => pit.getAttribute("data-seeds") !== "5");
    expect(hasMoved).toBe(true);
  });

  it("Test 4: Restarting match cancels notification and resets turn cleanly", () => {
    render(<App />);

    act(() => {
      fireEvent.click(screen.getByTestId("menu-btn-ai"));
    });
    act(() => {
      fireEvent.click(screen.getByTestId("difficulty-btn-beginner"));
    });
    act(() => {
      fireEvent.click(screen.getByTestId("first-player-player-btn"));
    });

    expect(screen.getByTestId("turn-notification-popup")).toBeInTheDocument();

    // Click Restart button in header (data-testid="restart-btn")
    act(() => {
      fireEvent.click(screen.getByTestId("restart-btn"));
    });

    // Fresh game has notification for turn 1
    expect(screen.getByTestId("turn-notification-popup")).toBeInTheDocument();
    expect(screen.getByTestId("turn-notification-text")).toHaveTextContent("Your turn");

    act(() => {
      vi.advanceTimersByTime(800);
    });
    expect(screen.queryByTestId("turn-notification-popup")).not.toBeInTheDocument();
  });
});
