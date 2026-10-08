import { describe, it, expect } from "vitest";
import { ChannemaneGame, runHeadlessRandomSimulation } from "../src/engine/simulation";
import { verifySeedConservation } from "../src/engine/board";

describe("TASK-15: Headless Simulation Engine (Section 56)", () => {
  it("should create and run a game headlessly through object API", () => {
    const game = new ChannemaneGame("PLAYER_1");

    expect(game.getCurrentPlayer()).toBe("PLAYER_1");
    expect(game.getRound()).toBe(1);
    expect(game.isGameOver()).toBe(false);
    expect(game.getSelectablePits().length).toBe(7);

    // Make a move
    const result = game.selectPit(0);
    expect(result.success).toBe(true);
    expect(game.getCurrentPlayer()).toBe("PLAYER_2");
    expect(verifySeedConservation(game.getState())).toBe(true);
  });

  it("should simulate a headless bot vs bot match to completion with 70-seed invariant preserved throughout", () => {
    const simulationResult = runHeadlessRandomSimulation(100);

    expect(simulationResult.totalTurns).toBeGreaterThan(0);
    expect(simulationResult.seedInvariantMaintained).toBe(true);
  });
});
