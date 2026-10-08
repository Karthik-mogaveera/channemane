import { describe, it, expect } from "vitest";
import { setupNextRound, calculateOpenPairs } from "../src/engine/roundSetup";
import { createInitialGame, verifySeedConservation, getTotalBoardSeeds } from "../src/engine/board";

describe("TASK-12: Round Setup and Paired Closure (Sections 18, 19, 54)", () => {
  describe("calculateOpenPairs", () => {
    it("should calculate correct open pairs for different storage balances", () => {
      expect(calculateOpenPairs(32, 38)).toBe(6);
      expect(calculateOpenPairs(41, 29)).toBe(5);
      expect(calculateOpenPairs(58, 12)).toBe(2);
      expect(calculateOpenPairs(61, 9)).toBe(1);
      expect(calculateOpenPairs(66, 4)).toBe(0);
      expect(calculateOpenPairs(67, 3)).toBe(0);
      expect(calculateOpenPairs(35, 35)).toBe(7);
      expect(calculateOpenPairs(70, 0)).toBe(0);
    });
  });

  describe("Section 54 Required Tests", () => {
    // Test 1: 32 / 38
    it("Test 1: should set up round for 32 / 38 storage (6 open pairs, P6/P7 closed)", () => {
      const game = createInitialGame();
      game.players.player1.storage = 32;
      game.players.player2.storage = 38;
      // All board pits zeroed after settlement
      for (const pit of game.pits) {
        pit.seeds = 0;
      }
      expect(verifySeedConservation(game)).toBe(true);

      const result = setupNextRound(game);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.openPairs).toBe(6);
      }

      // P0/P13 through P5/P8 OPEN with 5 seeds
      for (let i = 0; i <= 5; i++) {
        expect(game.pits[i].status).toBe("OPEN");
        expect(game.pits[i].seeds).toBe(5);
      }
      for (let i = 8; i <= 13; i++) {
        expect(game.pits[i].status).toBe("OPEN");
        expect(game.pits[i].seeds).toBe(5);
      }

      // P6/P7 CLOSED with 0 seeds
      expect(game.pits[6].status).toBe("CLOSED");
      expect(game.pits[6].seeds).toBe(0);
      expect(game.pits[7].status).toBe("CLOSED");
      expect(game.pits[7].seeds).toBe(0);

      // Storage remaining
      expect(game.players.player1.storage).toBe(2);
      expect(game.players.player2.storage).toBe(8);

      expect(getTotalBoardSeeds(game)).toBe(60);
      expect(verifySeedConservation(game)).toBe(true);
    });

    // Test 2: 41 / 29
    it("Test 2: should set up round for 41 / 29 storage (5 open pairs)", () => {
      const game = createInitialGame();
      game.players.player1.storage = 41;
      game.players.player2.storage = 29;
      for (const pit of game.pits) {
        pit.seeds = 0;
      }

      const result = setupNextRound(game);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.openPairs).toBe(5);
      }

      // P0..P4 & P9..P13 OPEN
      for (let i = 0; i <= 4; i++) {
        expect(game.pits[i].status).toBe("OPEN");
        expect(game.pits[i].seeds).toBe(5);
      }
      for (let i = 9; i <= 13; i++) {
        expect(game.pits[i].status).toBe("OPEN");
        expect(game.pits[i].seeds).toBe(5);
      }

      // P5/P8 and P6/P7 CLOSED
      expect(game.pits[5].status).toBe("CLOSED");
      expect(game.pits[8].status).toBe("CLOSED");
      expect(game.pits[6].status).toBe("CLOSED");
      expect(game.pits[7].status).toBe("CLOSED");

      expect(game.players.player1.storage).toBe(16);
      expect(game.players.player2.storage).toBe(4);
      expect(getTotalBoardSeeds(game)).toBe(50);
      expect(verifySeedConservation(game)).toBe(true);
    });

    // Test 3: 58 / 12
    it("Test 3: should set up round for 58 / 12 storage (2 open pairs)", () => {
      const game = createInitialGame();
      game.players.player1.storage = 58;
      game.players.player2.storage = 12;
      for (const pit of game.pits) {
        pit.seeds = 0;
      }

      const result = setupNextRound(game);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.openPairs).toBe(2);
      }

      // Pair 0 (0,13) and Pair 1 (1,12) OPEN
      expect(game.pits[0].status).toBe("OPEN");
      expect(game.pits[13].status).toBe("OPEN");
      expect(game.pits[1].status).toBe("OPEN");
      expect(game.pits[12].status).toBe("OPEN");

      // Pairs 2 through 6 CLOSED
      for (let i = 2; i <= 6; i++) {
        expect(game.pits[i].status).toBe("CLOSED");
        expect(game.pits[i].seeds).toBe(0);
      }
      for (let i = 7; i <= 11; i++) {
        expect(game.pits[i].status).toBe("CLOSED");
        expect(game.pits[i].seeds).toBe(0);
      }

      expect(game.players.player1.storage).toBe(48);
      expect(game.players.player2.storage).toBe(2);
      expect(getTotalBoardSeeds(game)).toBe(20);
      expect(verifySeedConservation(game)).toBe(true);
    });

    // Test 4: 61 / 9
    it("Test 4: should set up round for 61 / 9 storage (1 open pair)", () => {
      const game = createInitialGame();
      game.players.player1.storage = 61;
      game.players.player2.storage = 9;
      for (const pit of game.pits) {
        pit.seeds = 0;
      }

      const result = setupNextRound(game);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.openPairs).toBe(1);
      }

      // Pair 0 (0, 13) OPEN
      expect(game.pits[0].status).toBe("OPEN");
      expect(game.pits[13].status).toBe("OPEN");

      // All other pairs CLOSED
      for (let i = 1; i <= 12; i++) {
        expect(game.pits[i].status).toBe("CLOSED");
        expect(game.pits[i].seeds).toBe(0);
      }

      expect(game.players.player1.storage).toBe(56);
      expect(game.players.player2.storage).toBe(4);
      expect(getTotalBoardSeeds(game)).toBe(10);
      expect(verifySeedConservation(game)).toBe(true);
    });
  });
});
