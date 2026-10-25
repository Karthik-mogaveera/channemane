import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { GameBoard } from "../../src/ui/components/GameBoard";
import { createInitialGame } from "../../src/engine/board";

describe("GameBoard Component", () => {
  it("renders all 14 pits in authoritative 2x7 layout with 2 storage bowls", () => {
    const gameState = createInitialGame("PLAYER_1");
    const handleSelect = vi.fn();
    const handleClaim = vi.fn();

    render(
      <GameBoard
        gameState={gameState}
        selectablePits={[0, 1, 2, 3, 4, 5, 6]}
        activeDropPit={null}
        isAnimating={false}
        onSelectPit={handleSelect}
        onClaimBonus={handleClaim}
      />
    );

    // Verify board container
    expect(screen.getByTestId("channemane-board")).toBeInTheDocument();

    // Verify all 14 pits exist
    for (let i = 0; i < 14; i++) {
      expect(screen.getByTestId(`pit-${i}`)).toBeInTheDocument();
    }

    // Verify exactly one storage bowl exists per player (Issue 7)
    expect(screen.getAllByTestId("storage-player1").length).toBe(1);
    expect(screen.getAllByTestId("storage-player2").length).toBe(1);
  });

  it("renders 3-player board layout with 15 pits, 3 storage bowls, and separate left/right containers", () => {
    const gameState = createInitialGame("PLAYER_1", "local", null, "PLAYER_2", 3);
    const handleSelect = vi.fn();
    const handleClaim = vi.fn();

    render(
      <GameBoard
        gameState={gameState}
        selectablePits={[0, 1, 2, 3, 4]}
        activeDropPit={null}
        isAnimating={false}
        onSelectPit={handleSelect}
        onClaimBonus={handleClaim}
      />
    );

    // Verify 3-player board region
    const board = screen.getByTestId("channemane-board");
    expect(board).toBeInTheDocument();
    expect(board).toHaveClass("three-player-board");

    // Verify all 15 pits exist (P0 to P14)
    for (let i = 0; i < 15; i++) {
      expect(screen.getByTestId(`pit-${i}`)).toBeInTheDocument();
    }

    // Verify left and right storage containers
    const p1Container = screen.getByTestId("p1-storage-container");
    expect(p1Container).toBeInTheDocument();
    expect(p1Container).toHaveClass("three-player-storage-left");

    const p2p3Container = screen.getByTestId("p2-p3-storage-container");
    expect(p2p3Container).toBeInTheDocument();
    expect(p2p3Container).toHaveClass("three-player-storage-right");

    // Verify all three player storage bowls exist
    expect(screen.getByTestId("storage-player1")).toBeInTheDocument();
    expect(screen.getByTestId("storage-player2")).toBeInTheDocument();
    expect(screen.getByTestId("storage-player3")).toBeInTheDocument();

    // Verify seed counts are displayed
    expect(screen.getByTestId("p1-captured-count")).toHaveTextContent("0");
    expect(screen.getByTestId("p2-captured-count")).toHaveTextContent("0");
    expect(screen.getByTestId("p3-captured-count")).toHaveTextContent("0");
  });

  it("renders disqualified indicator properly on 3-player storage bowls", () => {
    const baseState = createInitialGame("PLAYER_1", "local", null, "PLAYER_2", 3);
    const gameState = {
      ...baseState,
      disqualifiedPlayers: ["PLAYER_3" as const],
    };

    render(
      <GameBoard
        gameState={gameState}
        selectablePits={[0, 1, 2, 3, 4]}
        activeDropPit={null}
        isAnimating={false}
        onSelectPit={vi.fn()}
        onClaimBonus={vi.fn()}
      />
    );

    const p3Bowl = screen.getByTestId("storage-player3");
    expect(p3Bowl).toHaveClass("disqualified");
    expect(screen.getByTestId("p3-captured-count")).toHaveTextContent("Disqualified");
  });
});
