import { describe, it, expect } from "vitest";
import { sowFromPit } from "../src/engine/sowing";
import { createInitialGame, verifySeedConservation } from "../src/engine/board";

describe("TASK-07: Sowing and Continuous Sowing (Sections 23, 24, 25)", () => {
  it("should sow 5 seeds counter-clockwise from P3 on an initial board", () => {
    // Initial board: all pits have 5 seeds.
    // If P3 is sown:
    // P3 -> scoops 5 seeds. Destinations: P4, P5, P6, P7, P8 each get 1 (becoming 6 seeds).
    // Final destination is P8.
    // Next open pit is P9, which has 5 seeds (> 0).
    // Continuous sowing should scoop P9 (5 seeds) and continue to P10, P11, P12, P13, P0!
    // And so on until continuous sowing naturally reaches an empty pit!
    const game = createInitialGame("PLAYER_1");
    const result = sowFromPit(game, 3);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.steps.length).toBeGreaterThan(5);
      // Invariant must be preserved throughout
      expect(verifySeedConservation(game)).toBe(true);
    }
  });

  it("should stop continuous sowing and flag capture when next pit after destination is empty", () => {
    const game = createInitialGame("PLAYER_1");
    // Clear all pits
    for (const pit of game.pits) {
      pit.seeds = 0;
    }
    // Put 2 seeds in P0, 0 seeds in P3, 4 seeds in P4
    // Player 1 storage has 64 seeds to maintain 70 total
    game.players.player1.storage = 64;
    game.pits[0].seeds = 2; // Sows into P1, P2 (dest = P2)
    game.pits[1].seeds = 0; // receives 1
    game.pits[2].seeds = 0; // receives 1
    game.pits[3].seeds = 0; // next after P2 is empty! Should stop continuous sowing!
    game.pits[4].seeds = 4; // following is populated (candidate for capture)

    expect(verifySeedConservation(game)).toBe(true);

    const result = sowFromPit(game, 0);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.finalDestinationPit).toBe(2);
      expect(result.data.nextOpenPitAfterDestination).toBe(3);
      expect(result.data.shouldEvaluateCapture).toBe(true);
      expect(game.pits[0].seeds).toBe(0);
      expect(game.pits[1].seeds).toBe(1);
      expect(game.pits[2].seeds).toBe(1);
      expect(game.pits[3].seeds).toBe(0);
    }
    expect(verifySeedConservation(game)).toBe(true);
  });

  it("should skip closed pits during sowing and continuous sowing", () => {
    const game = createInitialGame("PLAYER_1");
    for (const pit of game.pits) {
      pit.seeds = 0;
    }
    game.players.player1.storage = 67;
    game.pits[0].seeds = 3;
    game.pits[1].status = "CLOSED"; // P1 is closed, should be skipped
    game.pits[2].seeds = 0;
    game.pits[3].seeds = 0;
    game.pits[4].seeds = 0;

    const result = sowFromPit(game, 0);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(game.pits[0].seeds).toBe(0);
      expect(game.pits[1].seeds).toBe(0); // closed pit received nothing
      expect(game.pits[2].seeds).toBe(1);
      expect(game.pits[3].seeds).toBe(1);
      expect(game.pits[4].seeds).toBe(1);
      expect(result.data.finalDestinationPit).toBe(4);
    }
    expect(verifySeedConservation(game)).toBe(true);
  });

  it("should trigger bonusAvailable when a pit transitions 3 -> 4", () => {
    const game = createInitialGame("PLAYER_1");
    for (const pit of game.pits) {
      pit.seeds = 0;
    }
    game.players.player1.storage = 66;
    game.pits[0].seeds = 1; // Sows 1 into P1
    game.pits[1].seeds = 3; // Transitions 3 -> 4!
    game.pits[2].seeds = 0; // Next open pit is empty, stops

    const result = sowFromPit(game, 0);
    expect(result.success).toBe(true);
    expect(game.pits[1].seeds).toBe(4);
    expect(game.pits[1].bonusAvailable).toBe(true);
    expect(verifySeedConservation(game)).toBe(true);
  });

  it("should expire bonusAvailable if pit transitions 4 -> 5 during sowing", () => {
    const game = createInitialGame("PLAYER_1");
    for (const pit of game.pits) {
      pit.seeds = 0;
    }
    game.players.player1.storage = 65;
    game.pits[0].seeds = 1;
    game.pits[1].seeds = 4;
    game.pits[1].bonusAvailable = true; // Was already a bonus
    game.pits[2].seeds = 0;

    // Sowing 1 into P1 makes it 5 -> bonus expires
    const result = sowFromPit(game, 0);
    expect(result.success).toBe(true);
    expect(game.pits[1].seeds).toBe(5);
    expect(game.pits[1].bonusAvailable).toBe(false);
  });
});
