import { describe, it, expect } from "vitest";
import {
  createInitialGame,
  verifySeedConservation,
} from "../src/engine/board";
import { playTurn } from "../src/engine/game";
import { setupNextRound } from "../src/engine/roundSetup";
import { checkAndHandleMatchEnd } from "../src/engine/matchEnd";
import { claimBonus } from "../src/engine/bonus";

describe("TASK-17: Edge-Case and Regression Testing Suite", () => {
  it("Edge Case: Unclaimed bonus persists across subsequent turns until 5th seed is sown", () => {
    const game = createInitialGame("PLAYER_1");
    for (const pit of game.pits) {
      pit.seeds = 0;
    }
    game.players.player1.storage = 62;
    // P1 pit (P2) has 4 seeds with bonusAvailable = true
    game.pits[2].seeds = 4;
    game.pits[2].bonusAvailable = true;

    // P0 has 2 seeds. Sows into P1, P2 (dest P2!).
    // Adding 1 seed to P2 makes it 5 -> bonus expires!
    game.pits[0].seeds = 2; // P0 sows into P1 (1 seed), P2 (becomes 5 seeds!)
    game.pits[1].seeds = 2;
    expect(verifySeedConservation(game)).toBe(true);

    const turnRes = playTurn(game, 0);
    expect(turnRes.success).toBe(true);
    // P2 now has 5 seeds and bonusAvailable is false
    expect(game.pits[2].bonusAvailable).toBe(false);
    expect(verifySeedConservation(game)).toBe(true);
  });

  it("Edge Case: Bonus can be claimed in middle of match between turns", () => {
    const game = createInitialGame("PLAYER_1");
    for (const pit of game.pits) {
      pit.seeds = 0;
    }
    game.players.player1.storage = 66;
    game.pits[4].seeds = 4;
    game.pits[4].bonusAvailable = true;
    expect(verifySeedConservation(game)).toBe(true);

    // Player 1 claims bonus
    const claimRes = claimBonus(game, 4, "PLAYER_1");
    expect(claimRes.success).toBe(true);
    expect(game.pits[4].seeds).toBe(0);
    expect(game.players.player1.storage).toBe(70);
    expect(verifySeedConservation(game)).toBe(true);
  });

  it("Edge Case: Continuous sowing loop across almost all pits", () => {
    const game = createInitialGame("PLAYER_1");
    // Normal initial board: play P0
    const result = playTurn(game, 0);
    expect(result.success).toBe(true);
    expect(verifySeedConservation(game)).toBe(true);
  });

  it("Regression: Paired closure algorithm verifies all 6 test cases from Section 54", () => {
    // Test 1: 32/38
    const g1 = createInitialGame();
    g1.players.player1.storage = 32;
    g1.players.player2.storage = 38;
    for (const p of g1.pits) p.seeds = 0;
    const res1 = setupNextRound(g1);
    expect(res1.success).toBe(true);
    if (res1.success) {
      expect(res1.data.openPairs).toBe(6);
    }

    // Test 2: 41/29
    const g2 = createInitialGame();
    g2.players.player1.storage = 41;
    g2.players.player2.storage = 29;
    for (const p of g2.pits) p.seeds = 0;
    const res2 = setupNextRound(g2);
    expect(res2.success).toBe(true);
    if (res2.success) {
      expect(res2.data.openPairs).toBe(5);
    }

    // Test 3: 58/12
    const g3 = createInitialGame();
    g3.players.player1.storage = 58;
    g3.players.player2.storage = 12;
    for (const p of g3.pits) p.seeds = 0;
    const res3 = setupNextRound(g3);
    expect(res3.success).toBe(true);
    if (res3.success) {
      expect(res3.data.openPairs).toBe(2);
    }

    // Test 4: 61/9
    const g4 = createInitialGame();
    g4.players.player1.storage = 61;
    g4.players.player2.storage = 9;
    for (const p of g4.pits) p.seeds = 0;
    const res4 = setupNextRound(g4);
    expect(res4.success).toBe(true);
    if (res4.success) {
      expect(res4.data.openPairs).toBe(1);
    }

    // Test 5: 66/4
    const g5 = createInitialGame();
    g5.players.player1.storage = 66;
    g5.players.player2.storage = 4;
    for (const p of g5.pits) p.seeds = 0;
    const match5 = checkAndHandleMatchEnd(g5);
    expect(match5.isMatchEnd).toBe(true);
    expect(match5.winner).toBe("PLAYER_1");

    // Test 6: 67/3
    const g6 = createInitialGame();
    g6.players.player1.storage = 67;
    g6.players.player2.storage = 3;
    for (const p of g6.pits) p.seeds = 0;
    const match6 = checkAndHandleMatchEnd(g6);
    expect(match6.isMatchEnd).toBe(true);
    expect(match6.winner).toBe("PLAYER_1");
  });
});
