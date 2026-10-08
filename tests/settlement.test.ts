import { describe, it, expect } from "vitest";
import { executeRoundSettlement } from "../src/engine/settlement";
import { createInitialGame, verifySeedConservation } from "../src/engine/board";

describe("TASK-11: Round Settlement (Sections 40, 41, Clarification 6)", () => {
  it("should transfer remaining seeds to owners and determine round winner correctly (Section 41 Example)", () => {
    const game = createInitialGame();
    // Clear board
    for (const pit of game.pits) {
      pit.seeds = 0;
    }
    // Section 41 example:
    // Player 1 storage = 38, Player 1 side = 2 (e.g. on P1)
    // Player 2 storage = 29, Player 2 side = 1 (e.g. on P8)
    // Total seeds = 38 + 2 + 29 + 1 = 70!
    game.players.player1.storage = 38;
    game.players.player2.storage = 29;
    game.pits[1].seeds = 2;
    game.pits[8].seeds = 1;

    expect(verifySeedConservation(game)).toBe(true);

    const result = executeRoundSettlement(game);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.player1RemainingTransferred).toBe(2);
      expect(result.data.player2RemainingTransferred).toBe(1);
      expect(result.data.roundWinner).toBe("PLAYER_1");
    }

    // P1 final storage = 38 + 2 = 40
    // P2 final storage = 29 + 1 = 30
    expect(game.players.player1.storage).toBe(40);
    expect(game.players.player2.storage).toBe(30);
    expect(game.players.player1.roundWins).toBe(1);
    expect(game.players.player2.roundWins).toBe(0);
    expect(game.roundWinner).toBe("PLAYER_1");
    expect(game.phase).toBe("ROUND_SETTLEMENT");

    // All pits must now have 0 seeds
    for (const pit of game.pits) {
      expect(pit.seeds).toBe(0);
      expect(pit.bonusAvailable).toBe(false);
    }

    // Invariant check
    expect(verifySeedConservation(game)).toBe(true);
  });

  it("should record a tie when both players finish with 35 seeds", () => {
    const game = createInitialGame();
    for (const pit of game.pits) {
      pit.seeds = 0;
    }
    game.players.player1.storage = 34;
    game.players.player2.storage = 34;
    game.pits[0].seeds = 1;
    game.pits[7].seeds = 1;

    expect(verifySeedConservation(game)).toBe(true);

    const result = executeRoundSettlement(game);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.roundWinner).toBeNull();
    }

    expect(game.players.player1.storage).toBe(35);
    expect(game.players.player2.storage).toBe(35);
    expect(game.players.player1.roundWins).toBe(0);
    expect(game.players.player2.roundWins).toBe(0);
    expect(game.roundWinner).toBeNull();
    expect(verifySeedConservation(game)).toBe(true);
  });
});
