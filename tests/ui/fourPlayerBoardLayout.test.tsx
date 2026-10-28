import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { createInitialGame } from "../../src/engine/board";
import { GameBoard } from "../../src/ui/components/GameBoard";

describe("4-Player Board UI Visual Structure & Alignment Suite", () => {
  it("renders 4-player board with dedicated layout container, 4 quadrant groups, and 4 horizontal storages", () => {
    const gameState = createInitialGame("PLAYER_1", "local", null, "PLAYER_2", 4);

    render(
      <GameBoard
        gameState={gameState}
        selectablePits={[0, 1, 2, 3]}
        activeDropPit={null}
        isAnimating={false}
        highlightedContinuationPit={null}
        highlightedCapturePit={null}
        onSelectPit={() => {}}
        onConfirmContinuation={() => {}}
        onConfirmCapture={() => {}}
        onClaimBonus={() => {}}
      />
    );

    // 1. Board has isolated 4-player class
    const board = screen.getByTestId("channemane-board");
    expect(board).toHaveClass("four-player-board");
    expect(board).not.toHaveClass("three-player-board");

    // 2. Top Storage Row has P1 (left) and P2 (right) with center spacer
    const p1StorageContainer = screen.getByTestId("p1-storage-container");
    const p2StorageContainer = screen.getByTestId("p2-storage-container");
    expect(p1StorageContainer).toBeInTheDocument();
    expect(p2StorageContainer).toBeInTheDocument();

    const p1Bowl = screen.getByTestId("storage-player1");
    const p2Bowl = screen.getByTestId("storage-player2");
    expect(p1Bowl).toHaveClass("horizontal");
    expect(p2Bowl).toHaveClass("horizontal");

    // 3. Pits Grid Container has 4 distinct quadrant groups
    const p1Group = screen.getByTestId("p1-pit-group");
    const p2Group = screen.getByTestId("p2-pit-group");
    const p3Group = screen.getByTestId("p3-pit-group");
    const p4Group = screen.getByTestId("p4-pit-group");

    expect(p1Group).toHaveClass("four-player-pit-group", "p1-group");
    expect(p2Group).toHaveClass("four-player-pit-group", "p2-group");
    expect(p3Group).toHaveClass("four-player-pit-group", "p3-group");
    expect(p4Group).toHaveClass("four-player-pit-group", "p4-group");

    // Verify exactly 4 pits in each quadrant
    expect(p1Group.querySelectorAll(".pit-cell")).toHaveLength(4);
    expect(p2Group.querySelectorAll(".pit-cell")).toHaveLength(4);
    expect(p3Group.querySelectorAll(".pit-cell")).toHaveLength(4);
    expect(p4Group.querySelectorAll(".pit-cell")).toHaveLength(4);

    // 4. Center ornamental gap dividers
    expect(screen.getByTestId("board-center-gap-top")).toBeInTheDocument();
    expect(screen.getByTestId("board-center-gap-bottom")).toBeInTheDocument();

    // 5. Bottom Storage Row has P4 (left) and P3 (right)
    const p4StorageContainer = screen.getByTestId("p4-storage-container");
    const p3StorageContainer = screen.getByTestId("p3-storage-container");
    expect(p4StorageContainer).toBeInTheDocument();
    expect(p3StorageContainer).toBeInTheDocument();

    const p4Bowl = screen.getByTestId("storage-player4");
    const p3Bowl = screen.getByTestId("storage-player3");
    expect(p4Bowl).toHaveClass("horizontal");
    expect(p3Bowl).toHaveClass("horizontal");
  });

  it("preserves 2-player board structure without four-player layout classes or horizontal storage", () => {
    const gameState = createInitialGame("PLAYER_1", "local", null, "PLAYER_2", 2);

    render(
      <GameBoard
        gameState={gameState}
        selectablePits={[0, 1, 2, 3, 4, 5, 6]}
        activeDropPit={null}
        isAnimating={false}
        highlightedContinuationPit={null}
        highlightedCapturePit={null}
        onSelectPit={() => {}}
        onConfirmContinuation={() => {}}
        onConfirmCapture={() => {}}
        onClaimBonus={() => {}}
      />
    );

    const board = screen.getByTestId("channemane-board");
    expect(board).not.toHaveClass("four-player-board");
    expect(board).not.toHaveClass("three-player-board");

    // Standard 2-player storage bowls are vertical, not horizontal
    const p1Bowl = screen.getByTestId("storage-player1");
    const p2Bowl = screen.getByTestId("storage-player2");
    expect(p1Bowl).not.toHaveClass("horizontal");
    expect(p2Bowl).not.toHaveClass("horizontal");

    // 4-player specific containers must NOT exist
    expect(screen.queryByTestId("p1-pit-group")).toBeNull();
    expect(screen.queryByTestId("board-center-gap-top")).toBeNull();
  });

  it("preserves 3-player board structure without four-player layout classes or horizontal storage", () => {
    const gameState = createInitialGame("PLAYER_1", "local", null, "PLAYER_2", 3);

    render(
      <GameBoard
        gameState={gameState}
        selectablePits={[0, 1, 2, 3, 4]}
        activeDropPit={null}
        isAnimating={false}
        highlightedContinuationPit={null}
        highlightedCapturePit={null}
        onSelectPit={() => {}}
        onConfirmContinuation={() => {}}
        onConfirmCapture={() => {}}
        onClaimBonus={() => {}}
      />
    );

    const board = screen.getByTestId("channemane-board");
    expect(board).toHaveClass("three-player-board");
    expect(board).not.toHaveClass("four-player-board");

    // 3-player storage bowls are vertical
    expect(screen.getByTestId("storage-player1")).not.toHaveClass("horizontal");
    expect(screen.getByTestId("storage-player2")).not.toHaveClass("horizontal");
    expect(screen.getByTestId("storage-player3")).not.toHaveClass("horizontal");

    // 4-player specific elements do not exist
    expect(screen.queryByTestId("board-center-gap-top")).toBeNull();
  });
});
