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

  it("ISSUE-1: should trigger round settlement when bonus collection reduces board seeds to 0", () => {
    const game = createInitialGame("PLAYER_1");
    // Clear all pits
    for (const pit of game.pits) {
      pit.seeds = 0;
      pit.bonusAvailable = false;
    }
    // Set 8 seeds total on the board: P1 (P1's pit) has 4 seeds, P8 (P2's pit) has 4 seeds
    game.pits[1].seeds = 4;
    game.pits[1].bonusAvailable = true;
    game.pits[8].seeds = 4;
    game.pits[8].bonusAvailable = true;

    // 62 seeds in storage: P1 has 31, P2 has 31. Total = 70 seeds.
    game.players.player1.storage = 31;
    game.players.player2.storage = 31;
    expect(verifySeedConservation(game)).toBe(true);

    // 1. Player 2 claims P8 bonus
    const claim1 = claimBonus(game, 8);
    expect(claim1.success).toBe(true);
    if (claim1.success) {
      expect(claim1.data.roundEnded).toBe(false);
      expect(game.players.player2.storage).toBe(35);
      expect(game.pits[8].seeds).toBe(0);
      expect(game.phase).toBe("PLAYING");
    }

    // 4 seeds remain on board (P1 has 4)
    expect(verifySeedConservation(game)).toBe(true);

    // 2. Player 1 claims P1 bonus -> board now has 0 seeds!
    const claim2 = claimBonus(game, 1);
    expect(claim2.success).toBe(true);
    if (claim2.success) {
      expect(claim2.data.roundEnded).toBe(true);
      expect(claim2.data.roundSettlement).toBeDefined();
      expect(game.phase).toBe("ROUND_SETTLEMENT");
      // P1 storage should be 31 + 4 = 35
      expect(game.players.player1.storage).toBe(35);
      // Both have 35 seeds -> tied round
      expect(claim2.data.roundSettlement?.roundWinner).toBe(null);
    }

    // Seed conservation must hold: 35 + 35 = 70 seeds!
    expect(verifySeedConservation(game)).toBe(true);
  });

  it("ISSUE-1: should trigger round settlement when bonus claim leaves < 4 seeds on board", () => {
    const game = createInitialGame("PLAYER_1");
    for (const pit of game.pits) {
      pit.seeds = 0;
      pit.bonusAvailable = false;
    }
    // 6 seeds on board: P2 has 4 (bonus), P10 has 2
    game.pits[2].seeds = 4;
    game.pits[2].bonusAvailable = true;
    game.pits[10].seeds = 2;
    game.players.player1.storage = 32;
    game.players.player2.storage = 32;
    expect(verifySeedConservation(game)).toBe(true);

    // Claim P2 bonus -> board seeds drop from 6 to 2 (< 4)
    const result = claimBonus(game, 2);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.roundEnded).toBe(true);
      expect(game.phase).toBe("ROUND_SETTLEMENT");
      // Remaining 2 seeds in P10 (Player 2 side) swept to Player 2 storage
      expect(game.players.player1.storage).toBe(36); // 32 + 4 claimed
      expect(game.players.player2.storage).toBe(34); // 32 + 2 swept
      expect(result.data.roundSettlement?.roundWinner).toBe("PLAYER_1");
    }
    expect(verifySeedConservation(game)).toBe(true);
  });

  it("ISSUE-2: pit owner can claim bonus even when it is the other player's turn", () => {
    const game = createInitialGame("PLAYER_1");
    // It is currently PLAYER_1's turn
    expect(game.currentPlayer).toBe("PLAYER_1");

    // Setup P9 (Player 2 pit) with bonus available
    game.pits[9].seeds = 4;
    game.pits[9].bonusAvailable = true;
    game.players.player2.storage = 1;

    // getClaimableBonusPits without player should list P9
    expect(getClaimableBonusPits(game)).toContain(9);

    // Player 2 can claim their bonus on P9 even though currentPlayer is PLAYER_1
    const result = claimBonus(game, 9);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.owner).toBe("PLAYER_2");
      expect(result.data.seedsClaimed).toBe(4);
      expect(game.players.player2.storage).toBe(5);
      expect(game.pits[9].seeds).toBe(0);
    }

    // But Player 1 cannot claim Player 2's bonus
    game.pits[8].seeds = 4;
    game.pits[8].bonusAvailable = true;
    const invalidClaim = claimBonus(game, 8, "PLAYER_1");
    expect(invalidClaim.success).toBe(false);
    if (!invalidClaim.success) {
      expect(invalidClaim.error).toMatch(/does not own/i);
    }
  });
});
