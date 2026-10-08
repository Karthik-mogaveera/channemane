import { describe, it, expect } from "vitest";
import {
  createInitialGame,
  getTotalBoardSeeds,
  getTotalSeeds,
  getPlayerSideSeeds,
  verifySeedConservation,
  cloneGameState,
} from "../src/engine/board";
import { TOTAL_PITS, TOTAL_SEEDS, INITIAL_SEEDS_PER_PIT } from "../src/engine/constants";

describe("TASK-04: Board Initialization and Seed Conservation", () => {
  describe("Initial Board Creation (Section 12 & 16)", () => {
    it("should initialize a game in Round 1, PLAYING phase, PLAYER_TURN", () => {
      const game = createInitialGame();

      expect(game.round).toBe(1);
      expect(game.phase).toBe("PLAYING");
      expect(game.turnPhase).toBe("PLAYER_TURN");
      expect(game.currentPlayer).toBe("PLAYER_1");
      expect(game.startingPlayer).toBe("PLAYER_1");
      expect(game.selectedPit).toBeNull();
      expect(game.lastPit).toBeNull();
      expect(game.winner).toBeNull();
      expect(game.roundWinner).toBeNull();
    });

    it("should support explicit starting player (Section 16)", () => {
      const gameP2 = createInitialGame("PLAYER_2");
      expect(gameP2.currentPlayer).toBe("PLAYER_2");
      expect(gameP2.startingPlayer).toBe("PLAYER_2");
    });

    it("should create exactly 14 pits with correct attributes", () => {
      const game = createInitialGame();

      expect(game.pits.length).toBe(TOTAL_PITS);
      for (let i = 0; i < TOTAL_PITS; i++) {
        const pit = game.pits[i];
        expect(pit.id).toBe(i);
        expect(pit.seeds).toBe(INITIAL_SEEDS_PER_PIT);
        expect(pit.status).toBe("OPEN");
        expect(pit.bonusAvailable).toBe(false);
        expect(pit.owner).toBe(i < 7 ? "PLAYER_1" : "PLAYER_2");
      }
    });

    it("should initialize both players with 0 storage and 0 round stats", () => {
      const game = createInitialGame();

      expect(game.players.player1.storage).toBe(0);
      expect(game.players.player1.roundCaptured).toBe(0);
      expect(game.players.player1.roundWins).toBe(0);

      expect(game.players.player2.storage).toBe(0);
      expect(game.players.player2.roundCaptured).toBe(0);
      expect(game.players.player2.roundWins).toBe(0);
    });
  });

  describe("Seed Conservation Invariant (Section 17)", () => {
    it("should calculate correct board seeds and side seeds initially", () => {
      const game = createInitialGame();

      expect(getTotalBoardSeeds(game)).toBe(70);
      expect(getPlayerSideSeeds(game, "PLAYER_1")).toBe(35);
      expect(getPlayerSideSeeds(game, "PLAYER_2")).toBe(35);
    });

    it("should satisfy the 70-seed invariant initially", () => {
      const game = createInitialGame();

      expect(getTotalSeeds(game)).toBe(TOTAL_SEEDS);
      expect(verifySeedConservation(game)).toBe(true);
    });

    it("should preserve the 70-seed invariant when seeds transfer to storage", () => {
      const game = createInitialGame();

      // Artificially remove 5 seeds without transferring to storage (sum = 65)
      game.pits[3].seeds = 0;
      expect(getTotalSeeds(game)).toBe(65);
      expect(verifySeedConservation(game)).toBe(false);

      // Complete transfer into Player 1 storage (sum = 70)
      game.players.player1.storage = 5;
      expect(getTotalSeeds(game)).toBe(70);
      expect(verifySeedConservation(game)).toBe(true);
    });
  });

  describe("Game State Immutability / Cloning", () => {
    it("should produce a deep independent copy via cloneGameState", () => {
      const game = createInitialGame();
      const cloned = cloneGameState(game);

      expect(cloned).toEqual(game);
      expect(cloned).not.toBe(game);
      expect(cloned.pits).not.toBe(game.pits);
      expect(cloned.players).not.toBe(game.players);
      expect(cloned.pits[0]).not.toBe(game.pits[0]);

      // Mutating clone does not mutate original
      cloned.pits[0].seeds = 99;
      expect(game.pits[0].seeds).toBe(5);
    });
  });
});
