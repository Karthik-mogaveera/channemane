import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { createInitialGame } from "../../src/engine/board";
import { GameBoard } from "../../src/ui/components/GameBoard";

describe("6-Player Board UI Visual Structure & Alignment Suite (Page 11 Reference)", () => {
  it("renders 6-player board with 3-row layout, 6 pit groups, and 6 storage bowls", () => {
    const gameState = createInitialGame("PLAYER_1", "local", null, "PLAYER_2", 6);

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

    // 1. Board has isolated 6-player class
    const board = screen.getByTestId("channemane-board");
    expect(board).toHaveClass("six-player-board");
    expect(board).not.toHaveClass("five-player-board");
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

    // 3. Pits Grid Container has 6 pit groups (total 24 pits)
    const p1Group = screen.getByTestId("p1-pit-group");
    const p2Group = screen.getByTestId("p2-pit-group");
    const p3Group = screen.getByTestId("p3-pit-group");
    const p4Group = screen.getByTestId("p4-pit-group");
    const p5Group = screen.getByTestId("p5-pit-group");
    const p6Group = screen.getByTestId("p6-pit-group");

    expect(p1Group).toHaveClass("six-player-pit-group", "p1-group");
    expect(p2Group).toHaveClass("six-player-pit-group", "p2-group");
    expect(p3Group).toHaveClass("six-player-pit-group", "p3-group");
    expect(p4Group).toHaveClass("six-player-pit-group", "p4-group");
    expect(p5Group).toHaveClass("six-player-pit-group", "p5-group");
    expect(p6Group).toHaveClass("six-player-pit-group", "p6-group");

    // Verify exactly 4 pits in each group (4 * 6 = 24 pits)
    expect(p1Group.querySelectorAll(".pit-cell")).toHaveLength(4);
    expect(p2Group.querySelectorAll(".pit-cell")).toHaveLength(4);
    expect(p3Group.querySelectorAll(".pit-cell")).toHaveLength(4);
    expect(p4Group.querySelectorAll(".pit-cell")).toHaveLength(4);
    expect(p5Group.querySelectorAll(".pit-cell")).toHaveLength(4);
    expect(p6Group.querySelectorAll(".pit-cell")).toHaveLength(4);

    // 4. Middle Section has P4 storage (vertical on left) and P3 storage (vertical on right)
    const p4StorageContainer = screen.getByTestId("p4-storage-container");
    const p3StorageContainer = screen.getByTestId("p3-storage-container");
    expect(p4StorageContainer).toBeInTheDocument();
    expect(p3StorageContainer).toBeInTheDocument();

    const p4Bowl = screen.getByTestId("storage-player4");
    const p3Bowl = screen.getByTestId("storage-player3");
    expect(p4Bowl).toHaveClass("vertical");
    expect(p3Bowl).toHaveClass("vertical");

    // 5. Center ornamental gap dividers (top, middle, bottom)
    expect(screen.getByTestId("board-center-gap-top")).toBeInTheDocument();
    expect(screen.getByTestId("board-center-gap-middle")).toBeInTheDocument();
    expect(screen.getByTestId("board-center-gap-bottom")).toBeInTheDocument();

    // 6. Bottom Storage Row has P5 (left) and P6 (right)
    const p5StorageContainer = screen.getByTestId("p5-storage-container");
    const p6StorageContainer = screen.getByTestId("p6-storage-container");
    expect(p5StorageContainer).toBeInTheDocument();
    expect(p6StorageContainer).toBeInTheDocument();

    const p5Bowl = screen.getByTestId("storage-player5");
    const p6Bowl = screen.getByTestId("storage-player6");
    expect(p5Bowl).toHaveClass("horizontal");
    expect(p6Bowl).toHaveClass("horizontal");
  });

  it("visually styles disqualified player pits and storage in 6-player mode", () => {
    const gameState = createInitialGame("PLAYER_1", "local", null, "PLAYER_2", 6);
    gameState.disqualifiedPlayers = ["PLAYER_6"];
    for (let i = 20; i <= 23; i++) {
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

    // Player 6 storage bowl should indicate disqualified status
    const p6Bowl = screen.getByTestId("storage-player6");
    expect(p6Bowl).toHaveClass("disqualified");
    expect(p6Bowl).toHaveTextContent("Disqualified");

    // Player 6 pits should have closed styling
    for (let i = 20; i <= 23; i++) {
      const pitEl = screen.getByTestId(`pit-${i}`);
      expect(pitEl).toHaveClass("closed");
    }
  });
});

