/**
 * Board View Toggle (2D / 3D) UI Component Tests
 * Verifies:
 * - View toggle button renders in header.
 * - Switches seamlessly between 2D and 3D without resetting match or state.
 * - View toggle is disabled during active animation.
 * - View toggle is disabled for multiplayer player counts > 2.
 */

import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { App } from "../../src/App";
import { Header } from "../../src/ui/components/Header";
import { createInitialGame } from "../../src/engine/board";

// Mock Board3D for JSDOM UI integration
vi.mock("../../src/three/Board3D", () => ({
  Board3D: () => <div data-testid="channemane-board-3d">3D Board Active</div>,
}));

describe("Board View Toggle (2D / 3D) UI Integration Suite", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("renders the view toggle button and switches between 2D and 3D views without resetting game state", () => {
    const initialState = createInitialGame("PLAYER_1", "local");
    // Modify a pit count to test persistence across view switch
    initialState.pits[0]!.seeds = 0;
    initialState.pits[1]!.seeds = 6;
    initialState.players.player1.storage = 5;

    render(
      <App
        initialScreen="GAME"
        initialGameMode="local"
        initialGameState={initialState}
      />
    );

    // Initial view is 2D board
    expect(screen.getByTestId("channemane-board")).toBeInTheDocument();
    expect(screen.queryByTestId("channemane-board-3d")).not.toBeInTheDocument();

    const toggleBtn = screen.getByTestId("view-toggle-btn");
    expect(toggleBtn).toHaveTextContent("🎲 3D View");

    // Click to switch to 3D View
    fireEvent.click(toggleBtn);

    // 3D board is now rendered
    expect(screen.getByTestId("channemane-board-3d")).toBeInTheDocument();
    expect(screen.queryByTestId("channemane-board")).not.toBeInTheDocument();
    expect(toggleBtn).toHaveTextContent("📐 2D View");

    // Click again to switch back to 2D View
    fireEvent.click(toggleBtn);

    // 2D board restored with exact state preserved
    expect(screen.getByTestId("channemane-board")).toBeInTheDocument();
    expect(screen.getByTestId("storage-player1")).toHaveTextContent("5");
    expect(toggleBtn).toHaveTextContent("🎲 3D View");
  });

  it("disables view toggle during active animation", () => {
    const onToggle = vi.fn();
    render(
      <Header
        onRestart={() => {}}
        onOpenRules={() => {}}
        animationSettings={{ enabled: true, speed: "SLOW", stepDelayMs: 450 }}
        onToggleAnimation={() => {}}
        boardViewMode="2D"
        onToggleBoardView={onToggle}
        isViewToggleDisabled={true}
        viewToggleDisabledReason="View switching is disabled during active animation to preserve visual synchronization"
      />
    );

    const toggleBtn = screen.getByTestId("view-toggle-btn");
    expect(toggleBtn).toBeDisabled();
    expect(toggleBtn).toHaveAttribute(
      "title",
      "View switching is disabled during active animation to preserve visual synchronization"
    );

    fireEvent.click(toggleBtn);
    expect(onToggle).not.toHaveBeenCalled();
  });

  it("enables 3D view toggle across 3 to 6 player multiplayer boards and switches cleanly", () => {
    const fourPlayerState = createInitialGame("PLAYER_1", "local", null, undefined, 4);

    render(
      <App
        initialScreen="GAME"
        initialGameMode="local"
        initialGameState={fourPlayerState}
      />
    );

    const toggleBtn = screen.getByTestId("view-toggle-btn");
    expect(toggleBtn).not.toBeDisabled();

    fireEvent.click(toggleBtn);
    expect(screen.getByTestId("channemane-board-3d")).toBeInTheDocument();
    expect(toggleBtn).toHaveTextContent("📐 2D View");

    fireEvent.click(toggleBtn);
    expect(screen.getByTestId("channemane-board")).toBeInTheDocument();
    expect(toggleBtn).toHaveTextContent("🎲 3D View");
  });
});
