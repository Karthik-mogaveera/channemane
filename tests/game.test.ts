import { describe, it, expect } from "vitest";
import { playTurn } from "../src/engine/game";
import { createInitialGame, verifySeedConservation } from "../src/engine/board";

describe("TASK-14: Complete Turn Flow and Auto-Pass (Sections 22-26, 31, 38-39, Clarifications 1 & 5)", () => {
  it("should execute a normal turn from the initial state, preserving the 70-seed invariant", () => {
    const game = createInitialGame("PLAYER_1");

    const result = playTurn(game, 0);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.pitSelected).toBe(0);
      expect(verifySeedConservation(game)).toBe(true);
      // Turn switches to Player 2
      expect(game.currentPlayer).toBe("PLAYER_2");
      expect(game.turnPhase).toBe("PLAYER_TURN");
      expect(game.phase).toBe("PLAYING");
    }
  });

  it("should reject playTurn if an invalid pit is selected", () => {
    const game = createInitialGame("PLAYER_1");

    // Player 1 tries to select Player 2's pit P7
    const result = playTurn(game, 7);
    expect(result.success).toBe(false);
    // State should not mutate
    expect(game.currentPlayer).toBe("PLAYER_1");
    expect(game.turnPhase).toBe("PLAYER_TURN");
    expect(verifySeedConservation(game)).toBe(true);
  });

  it("should automatically pass turn if next player has 0 seeds but round does not end (Clarification 5)", () => {
    const game = createInitialGame("PLAYER_1");
    // Clear all pits
    for (const pit of game.pits) {
      pit.seeds = 0;
    }
    // Set up board where:
    // P1 side has 8 seeds total. P2 side has 0 seeds.
    // Round does not end (Condition 2 is false because other side >= 4 seeds).
    // Player 2 has 0 moves -> Player 2's turn automatically passes back to Player 1!
    game.players.player1.storage = 62;
    game.pits[0].seeds = 2; // P1 pit
    game.pits[1].seeds = 3; // P1 pit
    game.pits[2].seeds = 3; // P1 pit
    expect(verifySeedConservation(game)).toBe(true);

    const result = playTurn(game, 0);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.turnPassed).toBe(true);
      expect(result.data.roundEnded).toBe(false);
      // Turn automatically passed back to Player 1!
      expect(game.currentPlayer).toBe("PLAYER_1");
      expect(game.turnPhase).toBe("PLAYER_TURN");
    }
    expect(verifySeedConservation(game)).toBe(true);
  });

  it("should trigger round settlement automatically when a move leaves fewer than 4 board seeds", () => {
    const game = createInitialGame("PLAYER_1");
    for (const pit of game.pits) {
      pit.seeds = 0;
    }
    // Player 1 has 37 storage, Player 2 has 30 storage (both >= 5 so match continues to next round)
    // Board has 3 seeds total: P0=1, P3=2
    // 37 + 30 + 1 + 2 = 70 seeds!
    game.players.player1.storage = 37;
    game.players.player2.storage = 30;
    game.pits[0].seeds = 1;
    game.pits[3].seeds = 2;
    expect(verifySeedConservation(game)).toBe(true);

    const result = playTurn(game, 0);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.roundEnded).toBe(true);
      expect(result.data.matchEnded).toBe(false);
      expect(game.phase).toBe("ROUND_SETTLEMENT");
      // Remaining seed on P1 transferred to Player 1 during settlement
      expect(game.pits[1].seeds).toBe(0);
      expect(verifySeedConservation(game)).toBe(true);
    }
  });

  it("should transition to MATCH_END when settled round leaves a player with fewer than 5 seeds", () => {
    const game = createInitialGame("PLAYER_1");
    for (const pit of game.pits) {
      pit.seeds = 0;
    }
    // P1 storage = 67, P2 storage = 0 (P2 will have < 5, triggering match end)
    game.players.player1.storage = 67;
    game.players.player2.storage = 0;
    game.pits[0].seeds = 1;
    game.pits[3].seeds = 2;
    expect(verifySeedConservation(game)).toBe(true);

    const result = playTurn(game, 0);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.roundEnded).toBe(true);
      expect(result.data.matchEnded).toBe(true);
      expect(game.phase).toBe("MATCH_END");
      expect(game.winner).toBe("PLAYER_1");
    }
  });
});
