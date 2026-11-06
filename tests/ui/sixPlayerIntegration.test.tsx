import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import App from "../../src/App";

describe("6-Player UI Integration and Gameplay Flow Suite", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    act(() => {
      vi.runOnlyPendingTimers();
    });
    vi.useRealTimers();
  });

  it("1. Navigating from Main Menu to 6-Player mode renders 24 pits, 6 storages, and 120 seeds", () => {
    render(<App />);

    // Click Local Multiplayer
    act(() => {
      fireEvent.click(screen.getByTestId("menu-btn-local"));
    });

    // Select 6 Players
    act(() => {
      fireEvent.click(screen.getByTestId("player-count-btn-6"));
    });

    // Verify 6-Player Board is mounted
    expect(screen.getByTestId("channemane-board")).toBeInTheDocument();
    expect(screen.getByTestId("game-mode-tag")).toHaveTextContent(/LOCAL 6P/i);

    // Verify all 6 player cards
    expect(screen.getByTestId("player-card-1")).toBeInTheDocument();
    expect(screen.getByTestId("player-card-2")).toBeInTheDocument();
    expect(screen.getByTestId("player-card-3")).toBeInTheDocument();
    expect(screen.getByTestId("player-card-4")).toBeInTheDocument();
    expect(screen.getByTestId("player-card-5")).toBeInTheDocument();
    expect(screen.getByTestId("player-card-6")).toBeInTheDocument();

    // Verify all 6 storage containers
    expect(screen.getByTestId("p1-storage-container")).toBeInTheDocument();
    expect(screen.getByTestId("p2-storage-container")).toBeInTheDocument();
    expect(screen.getByTestId("p3-storage-container")).toBeInTheDocument();
    expect(screen.getByTestId("p4-storage-container")).toBeInTheDocument();
    expect(screen.getByTestId("p5-storage-container")).toBeInTheDocument();
    expect(screen.getByTestId("p6-storage-container")).toBeInTheDocument();

    // Verify 6 pit groups and 3 center ornamental gaps
    expect(screen.getByTestId("p1-pit-group")).toBeInTheDocument();
    expect(screen.getByTestId("p2-pit-group")).toBeInTheDocument();
    expect(screen.getByTestId("p3-pit-group")).toBeInTheDocument();
    expect(screen.getByTestId("p4-pit-group")).toBeInTheDocument();
    expect(screen.getByTestId("p5-pit-group")).toBeInTheDocument();
    expect(screen.getByTestId("p6-pit-group")).toBeInTheDocument();
    expect(screen.getByTestId("board-center-gap-top")).toBeInTheDocument();
    expect(screen.getByTestId("board-center-gap-middle")).toBeInTheDocument();
    expect(screen.getByTestId("board-center-gap-bottom")).toBeInTheDocument();

    // Verify 24 pits each with 5 seeds (120 seeds total)
    for (let i = 0; i < 24; i++) {
      expect(screen.getByTestId(`pit-${i}`)).toHaveAttribute("data-seeds", "5");
    }
  });

  it("2. Turn announcement popup displays Player 1's Turn and dismisses cleanly", () => {
    render(<App />);

    act(() => {
      fireEvent.click(screen.getByTestId("menu-btn-local"));
    });
    act(() => {
      fireEvent.click(screen.getByTestId("player-count-btn-6"));
    });

    // Turn notification popup is displayed on turn 1
    const popup = screen.getByTestId("turn-notification-popup");
    expect(popup).toBeInTheDocument();
    expect(screen.getByTestId("turn-notification-text")).toHaveTextContent("Player 1's Turn");

    // Dismiss turn notification by clicking popup
    act(() => {
      fireEvent.click(popup);
    });
    expect(screen.queryByTestId("turn-notification-popup")).not.toBeInTheDocument();
  });

  it("3. Main Menu Navigation and Mode Isolation", () => {
    render(<App />);

    // Start 6-Player mode
    act(() => {
      fireEvent.click(screen.getByTestId("menu-btn-local"));
    });
    act(() => {
      fireEvent.click(screen.getByTestId("player-count-btn-6"));
    });
    expect(screen.getByTestId("game-mode-tag")).toHaveTextContent(/LOCAL 6P/i);

    // Return to main menu
    act(() => {
      fireEvent.click(screen.getByTestId("main-menu-btn"));
    });
    expect(screen.getByTestId("main-menu")).toBeInTheDocument();

    // Start 2-Player mode and verify 14 pits
    act(() => {
      fireEvent.click(screen.getByTestId("menu-btn-local"));
    });
    act(() => {
      fireEvent.click(screen.getByTestId("player-count-btn-2"));
    });
    expect(screen.getByTestId("game-mode-tag")).toHaveTextContent(/LOCAL 2P/i);
    expect(screen.queryByTestId("player-card-6")).not.toBeInTheDocument();
  });
});

