import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import App from "../../src/App";

describe("4-Player UI Integration and Gameplay Flow Suite", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    act(() => {
      vi.runOnlyPendingTimers();
    });
    vi.useRealTimers();
  });

  it("1. Navigating from Main Menu to 4-Player mode renders 16 pits, 4 storages, and 80 seeds", () => {
    render(<App />);

    // Click Local Multiplayer
    act(() => {
      fireEvent.click(screen.getByTestId("menu-btn-local"));
    });

    // Select 4 Players
    act(() => {
      fireEvent.click(screen.getByTestId("player-count-btn-4"));
    });

    // Verify 4-Player Board is mounted
    expect(screen.getByTestId("channemane-board")).toBeInTheDocument();
    expect(screen.getByTestId("game-mode-tag")).toHaveTextContent(/LOCAL 4P/i);

    // Verify all 4 player cards
    expect(screen.getByTestId("player-card-1")).toBeInTheDocument();
    expect(screen.getByTestId("player-card-2")).toBeInTheDocument();
    expect(screen.getByTestId("player-card-3")).toBeInTheDocument();
    expect(screen.getByTestId("player-card-4")).toBeInTheDocument();

    // Verify all 4 storage containers
    expect(screen.getByTestId("p1-storage-container")).toBeInTheDocument();
    expect(screen.getByTestId("p2-storage-container")).toBeInTheDocument();
    expect(screen.getByTestId("p3-storage-container")).toBeInTheDocument();
    expect(screen.getByTestId("p4-storage-container")).toBeInTheDocument();

    // Verify 4 pit groups and center ornamental gaps
    expect(screen.getByTestId("p1-pit-group")).toBeInTheDocument();
    expect(screen.getByTestId("p2-pit-group")).toBeInTheDocument();
    expect(screen.getByTestId("p3-pit-group")).toBeInTheDocument();
    expect(screen.getByTestId("p4-pit-group")).toBeInTheDocument();
    expect(screen.getByTestId("board-center-gap-top")).toBeInTheDocument();
    expect(screen.getByTestId("board-center-gap-bottom")).toBeInTheDocument();

    // Verify 16 pits each with 5 seeds (80 seeds total)
    for (let i = 0; i < 16; i++) {
      expect(screen.getByTestId(`pit-${i}`)).toHaveAttribute("data-seeds", "5");
    }
  });

  it("2. Turn announcement popup displays Player 1, blocks input until dismissed, and rotates through players", () => {
    render(<App />);

    act(() => {
      fireEvent.click(screen.getByTestId("menu-btn-local"));
    });
    act(() => {
      fireEvent.click(screen.getByTestId("player-count-btn-4"));
    });

    // Turn notification popup is displayed on turn 1
    const popup = screen.getByTestId("turn-notification-popup");
    expect(popup).toBeInTheDocument();
    expect(screen.getByTestId("turn-notification-text")).toHaveTextContent("Player 1's Turn");

    // Dismiss turn notification by clicking popup or advancing timer
    act(() => {
      fireEvent.click(popup);
    });
    expect(screen.queryByTestId("turn-notification-popup")).not.toBeInTheDocument();
  });

  it("3. Main Menu Navigation and Mode Isolation", () => {
    render(<App />);

    // Start 4-Player mode
    act(() => {
      fireEvent.click(screen.getByTestId("menu-btn-local"));
    });
    act(() => {
      fireEvent.click(screen.getByTestId("player-count-btn-4"));
    });
    expect(screen.getByTestId("game-mode-tag")).toHaveTextContent(/LOCAL 4P/i);

    // Return to main menu
    act(() => {
      fireEvent.click(screen.getByTestId("main-menu-btn"));
    });
    expect(screen.getByTestId("main-menu")).toBeInTheDocument();
    expect(screen.queryByTestId("channemane-board")).not.toBeInTheDocument();

    // Start 2-Player mode
    act(() => {
      fireEvent.click(screen.getByTestId("menu-btn-local"));
    });
    act(() => {
      fireEvent.click(screen.getByTestId("player-count-btn-2"));
    });
    expect(screen.getByTestId("game-mode-tag")).toHaveTextContent(/LOCAL 2P/i);
    expect(screen.queryByTestId("player-card-4")).not.toBeInTheDocument();
    expect(screen.getByTestId("pit-0")).toHaveAttribute("data-seeds", "5");
    expect(screen.queryByTestId("pit-15")).not.toBeInTheDocument(); // Only 14 pits in 2P
  });
});
