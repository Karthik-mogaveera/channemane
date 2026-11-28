import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import App from "../../src/App";

vi.mock("../../src/three/Board3D", async () => {
  const { Board3DTestDouble } = await import("./helpers/board3dTestDouble");
  return { Board3D: Board3DTestDouble };
});

describe("5-Player UI Integration and Gameplay Flow Suite", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    act(() => {
      vi.runOnlyPendingTimers();
    });
    vi.useRealTimers();
  });

  it("1. Navigating from Main Menu to 5-Player mode renders 20 pits, 5 storages, and 100 seeds", () => {
    render(<App />);

    // Click Local Multiplayer
    act(() => {
      fireEvent.click(screen.getByTestId("menu-btn-local"));
    });

    // Select 5 Players
    act(() => {
      fireEvent.click(screen.getByTestId("player-count-btn-5"));
    });

    // Verify 5-Player Board is mounted
    expect(screen.getByTestId("channemane-board-3d")).toBeInTheDocument();
    expect(screen.getByTestId("game-mode-tag")).toHaveTextContent(/LOCAL 5P/i);

    // Verify all 5 player cards
    expect(screen.getByTestId("player-card-1")).toBeInTheDocument();
    expect(screen.getByTestId("player-card-2")).toBeInTheDocument();
    expect(screen.getByTestId("player-card-3")).toBeInTheDocument();
    expect(screen.getByTestId("player-card-4")).toBeInTheDocument();
    expect(screen.getByTestId("player-card-5")).toBeInTheDocument();

    // Verify all 5 storage bowls exist in 3D board state
    for (let p = 1; p <= 5; p++) {
      expect(screen.getByTestId(`storage-player${p}`)).toBeInTheDocument();
      expect(screen.getByTestId(`p${p}-captured-count`)).toHaveTextContent("0");
    }

    // Verify 3D camera selector is active
    expect(screen.getByTestId("camera-mode-selector")).toBeInTheDocument();

    // Verify 20 pits each with 5 seeds (100 seeds total)
    for (let i = 0; i < 20; i++) {
      expect(screen.getByTestId(`pit-${i}`)).toHaveAttribute("data-seeds", "5");
    }
  });

  it("2. Turn announcement popup displays Player 1's Turn and dismisses cleanly", () => {
    render(<App />);

    act(() => {
      fireEvent.click(screen.getByTestId("menu-btn-local"));
    });
    act(() => {
      fireEvent.click(screen.getByTestId("player-count-btn-5"));
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

    // Start 5-Player mode
    act(() => {
      fireEvent.click(screen.getByTestId("menu-btn-local"));
    });
    act(() => {
      fireEvent.click(screen.getByTestId("player-count-btn-5"));
    });
    expect(screen.getByTestId("game-mode-tag")).toHaveTextContent(/LOCAL 5P/i);

    // Return to main menu
    act(() => {
      fireEvent.click(screen.getByTestId("main-menu-btn"));
    });
    expect(screen.getByTestId("main-menu")).toBeInTheDocument();
    expect(screen.queryByTestId("channemane-board-3d")).not.toBeInTheDocument();

    // Start 2-Player mode and ensure 2P board loads (14 pits, not 20)
    act(() => {
      fireEvent.click(screen.getByTestId("menu-btn-local"));
    });
    act(() => {
      fireEvent.click(screen.getByTestId("player-count-btn-2"));
    });
    expect(screen.getByTestId("game-mode-tag")).toHaveTextContent(/LOCAL 2P/i);
    expect(screen.queryByTestId("player-card-5")).not.toBeInTheDocument();
    expect(screen.queryByTestId("pit-19")).not.toBeInTheDocument();
    expect(screen.getByTestId("pit-13")).toBeInTheDocument();
  });
});

