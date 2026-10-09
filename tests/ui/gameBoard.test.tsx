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
});
