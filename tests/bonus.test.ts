import { describe, it, expect } from "vitest";
import {
  canClaimBonus,
  claimBonus,
  getClaimableBonusPits,
} from "../src/engine/bonus";
import { createInitialGame, verifySeedConservation } from "../src/engine/board";

describe("Authoritative Bonus Ownership & Lifecycle", () => {
  it("Example 1: Player 1 pit bonus clicked during Player 2 turn (even by Player 2) credits Player 1", () => {
    const game = createInitialGame("PLAYER_2");
    expect(game.currentPlayer).toBe("PLAYER_2");

    // Setup P3 (Player 1 pit) with 4 seeds and bonusAvailable = true
    game.pits[3].seeds = 4;
    game.pits[3].bonusAvailable = true;
    game.players.player1.storage = 1;
    expect(verifySeedConservation(game)).toBe(true);

    const initialP1Storage = game.players.player1.storage; // 1
    const initialP2Storage = game.players.player2.storage; // 0

    // Can claim bonus on P3
    expect(canClaimBonus(game, 3)).toBe(true);

    // Player 2 physically triggers the claim on P3
    const result = claimBonus(game, 3, "PLAYER_2");
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.owner).toBe("PLAYER_1");
      expect(result.data.seedsClaimed).toBe(4);
    }

    // P3 seeds reset to 0 and bonusAvailable resets to false
    expect(game.pits[3].seeds).toBe(0);
    expect(game.pits[3].bonusAvailable).toBe(false);

    // PLAYER_1 storage increases by exactly 4
    expect(game.players.player1.storage).toBe(initialP1Storage + 4);
    // PLAYER_2 storage remains completely unchanged
    expect(game.players.player2.storage).toBe(initialP2Storage);

    // Invariant maintained
    expect(verifySeedConservation(game)).toBe(true);
  });

  it("Example 2: Player 2 pit bonus clicked during Player 1 turn (even by Player 1) credits Player 2", () => {
    const game = createInitialGame("PLAYER_1");
    expect(game.currentPlayer).toBe("PLAYER_1");

    // Setup P10 (Player 2 pit) with 4 seeds and bonusAvailable = true
    game.pits[10].seeds = 4;
    game.pits[10].bonusAvailable = true;
    game.players.player2.storage = 2;
    game.players.player1.storage = 1; // 12*5 + 4 + 2 + 1 = 67? wait: 13*5 + 4 + 1 = 70
    // let's adjust:
    game.players.player1.storage = 0;
    game.players.player2.storage = 1; // 13*5 + 4 + 1 = 70
    expect(verifySeedConservation(game)).toBe(true);

    const initialP1Storage = game.players.player1.storage; // 0
    const initialP2Storage = game.players.player2.storage; // 1

    expect(canClaimBonus(game, 10)).toBe(true);

    // Player 1 physically triggers the claim on P10
    const result = claimBonus(game, 10, "PLAYER_1");
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.owner).toBe("PLAYER_2");
      expect(result.data.seedsClaimed).toBe(4);
    }

    // P10 seeds reset to 0 and bonusAvailable resets to false
    expect(game.pits[10].seeds).toBe(0);
    expect(game.pits[10].bonusAvailable).toBe(false);

    // PLAYER_2 storage increases by exactly 4
    expect(game.players.player2.storage).toBe(initialP2Storage + 4);
    // PLAYER_1 storage remains completely unchanged
    expect(game.players.player1.storage).toBe(initialP1Storage);

    // Invariant maintained
    expect(verifySeedConservation(game)).toBe(true);
  });

  it("ensures pit owner determines the recipient, not the active turn player", () => {
    const gameP1Turn = createInitialGame("PLAYER_1");
    gameP1Turn.pits[4].seeds = 4;
    gameP1Turn.pits[4].bonusAvailable = true;
    gameP1Turn.players.player1.storage = 1;

    const resP1 = claimBonus(gameP1Turn, 4);
    expect(resP1.success).toBe(true);
    expect(gameP1Turn.players.player1.storage).toBe(5);
    expect(gameP1Turn.players.player2.storage).toBe(0);

    const gameP2Turn = createInitialGame("PLAYER_2");
    gameP2Turn.pits[11].seeds = 4;
    gameP2Turn.pits[11].bonusAvailable = true;
    gameP2Turn.players.player2.storage = 1;

    const resP2 = claimBonus(gameP2Turn, 11);
    expect(resP2.success).toBe(true);
    expect(gameP2Turn.players.player2.storage).toBe(5);
    expect(gameP2Turn.players.player1.storage).toBe(0);
  });

  it("collects a claimable bonus exactly once and rejects duplicate claims", () => {
    const game = createInitialGame("PLAYER_1");
    game.pits[5].seeds = 4;
    game.pits[5].bonusAvailable = true;
    game.players.player1.storage = 1;

    // First claim succeeds
    const firstClaim = claimBonus(game, 5);
    expect(firstClaim.success).toBe(true);
    expect(game.pits[5].seeds).toBe(0);
    expect(game.pits[5].bonusAvailable).toBe(false);
    expect(game.players.player1.storage).toBe(5);

    // Second claim immediately fails
    const secondClaim = claimBonus(game, 5);
    expect(secondClaim.success).toBe(false);
    expect(game.players.player1.storage).toBe(5); // Not modified
    expect(verifySeedConservation(game)).toBe(true);
  });

  it("rejects claiming an ineligible pit and does not mutate game state", () => {
    const game = createInitialGame("PLAYER_1");
    const initialP1Storage = game.players.player1.storage;
    const initialP2Storage = game.players.player2.storage;

    // Pit 2 has 5 seeds
    expect(canClaimBonus(game, 2)).toBe(false);
    const res1 = claimBonus(game, 2);
    expect(res1.success).toBe(false);
    expect(game.players.player1.storage).toBe(initialP1Storage);
    expect(game.players.player2.storage).toBe(initialP2Storage);

    // Pit 2 has 4 seeds but bonusAvailable is false
    game.pits[2].seeds = 4;
    game.pits[2].bonusAvailable = false;
    game.players.player1.storage = 1;
    expect(canClaimBonus(game, 2)).toBe(false);
    const res2 = claimBonus(game, 2);
    expect(res2.success).toBe(false);

    // Invalid pit ID
    expect(canClaimBonus(game, 99)).toBe(false);
    const res3 = claimBonus(game, 99);
    expect(res3.success).toBe(false);

    // State not mutated by failed claims
    expect(game.players.player1.storage).toBe(1);
    expect(game.players.player2.storage).toBe(initialP2Storage);
    expect(verifySeedConservation(game)).toBe(true);
  });

  it("handles multiple independent bonus opportunities correctly", () => {
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
    expect(getClaimableBonusPits(game)).toEqual([1, 8]);

    // Claim P8 (Player 2 pit)
    const resP2 = claimBonus(game, 8);
    expect(resP2.success).toBe(true);
    expect(game.pits[8].seeds).toBe(0);
    expect(game.players.player2.storage).toBe(4);

    // P1 bonus remains available for Player 1
    expect(game.pits[1].seeds).toBe(4);
    expect(game.pits[1].bonusAvailable).toBe(true);

    // Claim P1 (Player 1 pit)
    const resP1 = claimBonus(game, 1);
    expect(resP1.success).toBe(true);
    expect(game.pits[1].seeds).toBe(0);
    expect(game.players.player1.storage).toBe(6);

    expect(verifySeedConservation(game)).toBe(true);
  });

  it("ISSUE-1: triggers round settlement when bonus collection reduces board seeds to 0", () => {
    const game = createInitialGame("PLAYER_1");
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

    // 1. Claim P8 bonus
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

    // 2. Claim P1 bonus -> board now has 0 seeds!
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

  it("ISSUE-1: triggers round settlement when bonus claim leaves < 4 seeds on board", () => {
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
});
