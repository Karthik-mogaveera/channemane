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

  it("displays theme-compatible warm amber indicator during WAITING_FOR_CONTINUATION", () => {
    const { container } = render(
      <TurnBanner
        currentPlayer="PLAYER_1"
        gamePhase="PLAYING"
        turnPhase="PLAYER_TURN"
        round={1}
        isAnimating={false}
        visualHandSeeds={0}
        interactionState="WAITING_FOR_CONTINUATION"
      />
    );

    expect(screen.getByTestId("turn-status-text")).toHaveTextContent(
      "Choose the highlighted pit to continue sowing."
    );
    const dot = container.querySelector(".turn-indicator-dot");
    expect(dot).toBeInTheDocument();
    // Must NOT be neon green (#22c55e)
    expect(dot?.getAttribute("style")).not.toContain("#22c55e");
    expect(dot?.getAttribute("style")).toContain("var(--indicator-continuation");
  });

  it("displays theme-compatible terracotta bronze indicator during WAITING_FOR_CAPTURE", () => {
    const { container } = render(
      <TurnBanner
        currentPlayer="PLAYER_1"
        gamePhase="PLAYING"
        turnPhase="PLAYER_TURN"
        round={1}
        isAnimating={false}
        visualHandSeeds={0}
        interactionState="WAITING_FOR_CAPTURE"
      />
    );

    expect(screen.getByTestId("turn-status-text")).toHaveTextContent(
      "Tap the highlighted pit to collect its seeds."
    );
    const dot = container.querySelector(".turn-indicator-dot");
    expect(dot).toBeInTheDocument();
    expect(dot?.getAttribute("style")).toContain("var(--indicator-capture-light");
  });
});
