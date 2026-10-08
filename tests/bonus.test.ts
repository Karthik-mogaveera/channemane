import { describe, it, expect } from "vitest";
import {
  canClaimBonus,
  claimBonus,
  getClaimableBonusPits,
} from "../src/engine/bonus";
import { createInitialGame, verifySeedConservation } from "../src/engine/board";

describe("TASK-09: Bonus Lifecycle (Sections 27-30, Clarification 3)", () => {
  it("should permit pit owner to claim an active bonus of 4 seeds", () => {
    const game = createInitialGame("PLAYER_1");
    // Setup P3 (Player 1 pit) with 4 seeds and bonusAvailable = true
    // Deduct 1 seed from storage or pits to keep 70 total
    game.pits[3].seeds = 4;
    game.pits[3].bonusAvailable = true;
    game.players.player1.storage = 1; // 13*5 + 4 + 1 = 70
    expect(verifySeedConservation(game)).toBe(true);

    expect(canClaimBonus(game, 3, "PLAYER_1")).toBe(true);
    expect(getClaimableBonusPits(game, "PLAYER_1")).toEqual([3]);

    const result = claimBonus(game, 3, "PLAYER_1");
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.seedsClaimed).toBe(4);
      expect(result.data.owner).toBe("PLAYER_1");
    }

    // Pit should now have 0 seeds, bonusAvailable = false
    expect(game.pits[3].seeds).toBe(0);
    expect(game.pits[3].bonusAvailable).toBe(false);
    // Player 1 storage receives 4 seeds: 1 + 4 = 5
    expect(game.players.player1.storage).toBe(5);
    expect(verifySeedConservation(game)).toBe(true);
  });

  it("should reject non-owner attempting to claim another player's bonus", () => {
    const game = createInitialGame("PLAYER_1");
    // P9 belongs to Player 2
    game.pits[9].seeds = 4;
    game.pits[9].bonusAvailable = true;
    game.players.player1.storage = 1;

    // Player 1 tries to claim Player 2's bonus
    expect(canClaimBonus(game, 9, "PLAYER_1")).toBe(false);
    const result = claimBonus(game, 9, "PLAYER_1");
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toMatch(/does not own/i);
    }
  });

  it("should reject bonus claim if seeds !== 4 or bonusAvailable === false", () => {
    const game = createInitialGame("PLAYER_1");
    // P2 has 5 seeds
    expect(canClaimBonus(game, 2, "PLAYER_1")).toBe(false);

    // P2 has 4 seeds but bonusAvailable is false
    game.pits[2].seeds = 4;
    game.pits[2].bonusAvailable = false;
    expect(canClaimBonus(game, 2, "PLAYER_1")).toBe(false);
    const result = claimBonus(game, 2, "PLAYER_1");
    expect(result.success).toBe(false);
  });

  it("should handle multiple independent bonus opportunities", () => {
    const game = createInitialGame("PLAYER_1");
    // P1 (P1's pit) and P8 (P2's pit) both have bonuses
    game.pits[1].seeds = 4;
    game.pits[1].bonusAvailable = true;
    game.pits[8].seeds = 4;
    game.pits[8].bonusAvailable = true;
    game.players.player1.storage = 2; // 12*5 + 4 + 4 + 2 = 70
    expect(verifySeedConservation(game)).toBe(true);

    expect(getClaimableBonusPits(game, "PLAYER_1")).toEqual([1]);
    expect(getClaimableBonusPits(game, "PLAYER_2")).toEqual([8]);

    // Claim P8 for Player 2
    const resP2 = claimBonus(game, 8, "PLAYER_2");
    expect(resP2.success).toBe(true);
    expect(game.pits[8].seeds).toBe(0);
    expect(game.players.player2.storage).toBe(4);

    // P1 bonus remains available for Player 1
    expect(game.pits[1].seeds).toBe(4);
    expect(game.pits[1].bonusAvailable).toBe(true);

    // Claim P1 for Player 1
    const resP1 = claimBonus(game, 1, "PLAYER_1");
    expect(resP1.success).toBe(true);
    expect(game.pits[1].seeds).toBe(0);
    expect(game.players.player1.storage).toBe(6);

    expect(verifySeedConservation(game)).toBe(true);
  });
});
