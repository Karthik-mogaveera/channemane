import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { TurnBanner } from "../../src/ui/components/TurnBanner";

describe("TurnBanner Component", () => {
  it("displays Player 1 turn and round number", () => {
    render(
      <TurnBanner
        currentPlayer="PLAYER_1"
        gamePhase="PLAYING"
        turnPhase="PLAYER_TURN"
        round={1}
        isAnimating={false}
        visualHandSeeds={0}
      />
    );

    expect(screen.getByTestId("turn-indicator")).toHaveTextContent("PLAYER 1'S TURN");
    expect(screen.getByTestId("round-indicator")).toHaveTextContent("Round 1");
  });

  it("displays sowing status and seeds in hand when animating", () => {
    render(
      <TurnBanner
        currentPlayer="PLAYER_2"
        gamePhase="PLAYING"
        turnPhase="SOWING"
        round={2}
        isAnimating={true}
        visualHandSeeds={3}
      />
    );

    expect(screen.getByTestId("turn-indicator")).toHaveTextContent("PLAYER 2 IS SOWING...");
    expect(screen.getByTestId("hand-seeds-indicator")).toHaveTextContent("Seeds in Hand:3");
  });
});
