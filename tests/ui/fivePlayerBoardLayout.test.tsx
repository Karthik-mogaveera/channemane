import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { createInitialGame } from "../../src/engine/board";
import { GameBoard } from "../../src/ui/components/GameBoard";

describe("5-Player Board UI Visual Structure & Alignment Suite", () => {
  it("renders 5-player board with 3-row layout, 5 pit groups, and 5 horizontal storages (Image 2)", () => {
    const gameState = createInitialGame("PLAYER_1", "local", null, "PLAYER_2", 5);

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

    // 1. Board has isolated 5-player class
    const board = screen.getByTestId("channemane-board");
    expect(board).toHaveClass("five-player-board");
    expect(board).not.toHaveClass("four-player-board");
    expect(board).not.toHaveClass("three-player-board");

    // 2. Top Storage Row has P1 (left) and P2 (right)
    const p1StorageContainer = screen.getByTestId("p1-storage-container");
    const p2StorageContainer = screen.getByTestId("p2-storage-container");
    expect(p1StorageContainer).toBeInTheDocument();
    expect(p2StorageContainer).toBeInTheDocument();

    const p1Bowl = screen.getByTestId("storage-player1");
    const p2Bowl = screen.getByTestId("storage-player2");
    expect(p1Bowl).toHaveClass("horizontal");
    expect(p2Bowl).toHaveClass("horizontal");

    // 3. Pits Grid Container has 5 pit groups
    const p1Group = screen.getByTestId("p1-pit-group");
    const p2Group = screen.getByTestId("p2-pit-group");
    const p3Group = screen.getByTestId("p3-pit-group");
    const p4Group = screen.getByTestId("p4-pit-group");
    const p5Group = screen.getByTestId("p5-pit-group");

    expect(p1Group).toHaveClass("five-player-pit-group", "p1-group");
    expect(p2Group).toHaveClass("five-player-pit-group", "p2-group");
    expect(p3Group).toHaveClass("five-player-pit-group", "p3-group");
    expect(p4Group).toHaveClass("five-player-pit-group", "p4-group");
    expect(p5Group).toHaveClass("five-player-pit-group", "p5-group");

    // Verify exactly 4 pits in each group (total 20 pits)
    expect(p1Group.querySelectorAll(".pit-cell")).toHaveLength(4);
    expect(p2Group.querySelectorAll(".pit-cell")).toHaveLength(4);
    expect(p3Group.querySelectorAll(".pit-cell")).toHaveLength(4);
    expect(p4Group.querySelectorAll(".pit-cell")).toHaveLength(4);
    expect(p5Group.querySelectorAll(".pit-cell")).toHaveLength(4);

    // 4. Middle Row: P3 pits on left and P3 storage on right
    const p3StorageContainer = screen.getByTestId("p3-storage-container");
    expect(p3StorageContainer).toBeInTheDocument();
    const p3Bowl = screen.getByTestId("storage-player3");
    expect(p3Bowl).toHaveClass("horizontal");

    // 5. Center ornamental gap dividers (top, middle, bottom)
    expect(screen.getByTestId("board-center-gap-top")).toBeInTheDocument();
    expect(screen.getByTestId("board-center-gap-middle")).toBeInTheDocument();
    expect(screen.getByTestId("board-center-gap-bottom")).toBeInTheDocument();

    // 6. Bottom Storage Row has P4 (left) and P5 (right)
    const p4StorageContainer = screen.getByTestId("p4-storage-container");
    const p5StorageContainer = screen.getByTestId("p5-storage-container");
    expect(p4StorageContainer).toBeInTheDocument();
    expect(p5StorageContainer).toBeInTheDocument();

    const p4Bowl = screen.getByTestId("storage-player4");
    const p5Bowl = screen.getByTestId("storage-player5");
    expect(p4Bowl).toHaveClass("horizontal");
    expect(p5Bowl).toHaveClass("horizontal");
  });

  it("visually styles disqualified player pits and storage in 5-player mode", () => {
    const gameState = createInitialGame("PLAYER_1", "local", null, "PLAYER_2", 5);
    gameState.disqualifiedPlayers = ["PLAYER_5"];
    for (let i = 16; i <= 19; i++) {
      gameState.pits[i].status = "CLOSED";
      gameState.pits[i].seeds = 0;
    }

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

    const p5Bowl = screen.getByTestId("storage-player5");
    expect(p5Bowl).toHaveClass("disqualified");
    expect(screen.getByTestId("p5-captured-count")).toHaveTextContent("Disqualified");

    // Player 5 pits have closed-pit styling
    const p16Pit = screen.getByTestId("pit-16");
    expect(p16Pit).toHaveClass("closed");
  });

  it("preserves 4-player board structure without five-player layout classes", () => {
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

    const board = screen.getByTestId("channemane-board");
    expect(board).toHaveClass("four-player-board");
    expect(board).not.toHaveClass("five-player-board");
  });
});
