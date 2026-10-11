import { describe, it, expect } from "vitest";
import { shouldEndRound, getRoundEndReason } from "../src/engine/roundEnd";
import {
  createInitialGame,
  getTotalBoardSeeds,
  getPlayerSideSeeds,
  verifySeedConservation,
} from "../src/engine/board";
import { executeRoundSettlement } from "../src/engine/settlement";
import { playTurn } from "../src/engine/game";
import { ChannemaneGame } from "../src/engine/simulation";
import type { GameState } from "../src/engine/types";

/**
 * Helper to construct a valid GameState with precise seed distributions
 * and storages adjusted to satisfy the mandatory 70-seed conservation invariant.
 */
function createGameStateWithSeeds(
  p1SideSeeds: number,
  p2SideSeeds: number,
  options?: {
    currentPlayer?: "PLAYER_1" | "PLAYER_2";
    p1PitsDistribution?: number[];
    p2PitsDistribution?: number[];
    p1Storage?: number;
    p2Storage?: number;
  }
): GameState {
  const game = createInitialGame(options?.currentPlayer ?? "PLAYER_1");
  game.currentPlayer = options?.currentPlayer ?? "PLAYER_1";

  // Distribute P1 seeds across pits 0..6
  if (options?.p1PitsDistribution && options.p1PitsDistribution.length === 7) {
    for (let i = 0; i < 7; i++) {
      game.pits[i].seeds = options.p1PitsDistribution[i];
    }
  } else {
    // Default distribution: place seeds in starting pits
    for (let i = 0; i < 7; i++) {
      game.pits[i].seeds = 0;
    }
    if (p1SideSeeds > 0) {
      // spread across first few pits
      let remaining = p1SideSeeds;
      let pitIdx = 0;
      while (remaining > 0) {
        game.pits[pitIdx].seeds += 1;
        remaining--;
        pitIdx = (pitIdx + 1) % 7;
      }
    }
  }

  // Distribute P2 seeds across pits 7..13
  if (options?.p2PitsDistribution && options.p2PitsDistribution.length === 7) {
    for (let i = 0; i < 7; i++) {
      game.pits[7 + i].seeds = options.p2PitsDistribution[i];
    }
  } else {
    for (let i = 7; i < 14; i++) {
      game.pits[i].seeds = 0;
    }
    if (p2SideSeeds > 0) {
      let remaining = p2SideSeeds;
      let pitIdx = 7;
      while (remaining > 0) {
        game.pits[pitIdx].seeds += 1;
        remaining--;
        pitIdx = 7 + ((pitIdx - 7 + 1) % 7);
      }
    }
  }

  // Adjust storage to ensure sum(pits) + storage1 + storage2 = 70
  const boardSeeds = p1SideSeeds + p2SideSeeds;
  const storageTotalNeeded = 70 - boardSeeds;

  if (options?.p1Storage !== undefined && options?.p2Storage !== undefined) {
    game.players.player1.storage = options.p1Storage;
    game.players.player2.storage = options.p2Storage;
  } else if (options?.p1Storage !== undefined) {
    game.players.player1.storage = options.p1Storage;
    game.players.player2.storage = storageTotalNeeded - options.p1Storage;
  } else {
    const half = Math.floor(storageTotalNeeded / 2);
    game.players.player1.storage = half;
    game.players.player2.storage = storageTotalNeeded - half;
  }

  return game;
}

describe("Authoritative Round-Ending Rule: totalBoardSeeds < 4", () => {
  describe("Mandatory 10-Scenario Test Matrix", () => {
    // Test 1: P1 side = 0, P2 side = 3, Total = 3 -> Round ends
    it("Test 1: Player 1 = 0, Player 2 = 3, Total = 3 -> Round ends", () => {
      const state = createGameStateWithSeeds(0, 3);
      expect(getPlayerSideSeeds(state, "PLAYER_1")).toBe(0);
      expect(getPlayerSideSeeds(state, "PLAYER_2")).toBe(3);
      expect(getTotalBoardSeeds(state)).toBe(3);
      expect(verifySeedConservation(state)).toBe(true);

      expect(shouldEndRound(state)).toBe(true);
      expect(getRoundEndReason(state)).toBe("FEWER_THAN_4_BOARD_SEEDS");
    });

    // Test 2: P1 side = 1, P2 side = 2, Total = 3 -> Round ends
    it("Test 2: Player 1 = 1, Player 2 = 2, Total = 3 -> Round ends", () => {
      const state = createGameStateWithSeeds(1, 2);
      expect(getPlayerSideSeeds(state, "PLAYER_1")).toBe(1);
      expect(getPlayerSideSeeds(state, "PLAYER_2")).toBe(2);
      expect(getTotalBoardSeeds(state)).toBe(3);
      expect(verifySeedConservation(state)).toBe(true);

      expect(shouldEndRound(state)).toBe(true);
      expect(getRoundEndReason(state)).toBe("FEWER_THAN_4_BOARD_SEEDS");
    });

    // Test 3: P1 side = 2, P2 side = 1, Total = 3 -> Round ends
    it("Test 3: Player 1 = 2, Player 2 = 1, Total = 3 -> Round ends", () => {
      const state = createGameStateWithSeeds(2, 1);
      expect(getPlayerSideSeeds(state, "PLAYER_1")).toBe(2);
      expect(getPlayerSideSeeds(state, "PLAYER_2")).toBe(1);
      expect(getTotalBoardSeeds(state)).toBe(3);
      expect(verifySeedConservation(state)).toBe(true);

      expect(shouldEndRound(state)).toBe(true);
      expect(getRoundEndReason(state)).toBe("FEWER_THAN_4_BOARD_SEEDS");
    });

    // Test 4: P1 side = 3, P2 side = 0, Total = 3 -> Round ends
    it("Test 4: Player 1 = 3, Player 2 = 0, Total = 3 -> Round ends", () => {
      const state = createGameStateWithSeeds(3, 0);
      expect(getPlayerSideSeeds(state, "PLAYER_1")).toBe(3);
      expect(getPlayerSideSeeds(state, "PLAYER_2")).toBe(0);
      expect(getTotalBoardSeeds(state)).toBe(3);
      expect(verifySeedConservation(state)).toBe(true);

      expect(shouldEndRound(state)).toBe(true);
      expect(getRoundEndReason(state)).toBe("FEWER_THAN_4_BOARD_SEEDS");
    });

    // Test 5: P1 side = 0, P2 side = 2, Total = 2 -> Round ends
    it("Test 5: Player 1 = 0, Player 2 = 2, Total = 2 -> Round ends", () => {
      const state = createGameStateWithSeeds(0, 2);
      expect(getPlayerSideSeeds(state, "PLAYER_1")).toBe(0);
      expect(getPlayerSideSeeds(state, "PLAYER_2")).toBe(2);
      expect(getTotalBoardSeeds(state)).toBe(2);
      expect(verifySeedConservation(state)).toBe(true);

      expect(shouldEndRound(state)).toBe(true);
      expect(getRoundEndReason(state)).toBe("FEWER_THAN_4_BOARD_SEEDS");
    });

    // Test 6: P1 side = 1, P2 side = 1, Total = 2 -> Round ends
    it("Test 6: Player 1 = 1, Player 2 = 1, Total = 2 -> Round ends", () => {
      const state = createGameStateWithSeeds(1, 1);
      expect(getPlayerSideSeeds(state, "PLAYER_1")).toBe(1);
      expect(getPlayerSideSeeds(state, "PLAYER_2")).toBe(1);
      expect(getTotalBoardSeeds(state)).toBe(2);
      expect(verifySeedConservation(state)).toBe(true);

      expect(shouldEndRound(state)).toBe(true);
      expect(getRoundEndReason(state)).toBe("FEWER_THAN_4_BOARD_SEEDS");
    });

    // Test 7: P1 side = 2, P2 side = 0, Total = 2 -> Round ends
    it("Test 7: Player 1 = 2, Player 2 = 0, Total = 2 -> Round ends", () => {
      const state = createGameStateWithSeeds(2, 0);
      expect(getPlayerSideSeeds(state, "PLAYER_1")).toBe(2);
      expect(getPlayerSideSeeds(state, "PLAYER_2")).toBe(0);
      expect(getTotalBoardSeeds(state)).toBe(2);
      expect(verifySeedConservation(state)).toBe(true);

      expect(shouldEndRound(state)).toBe(true);
      expect(getRoundEndReason(state)).toBe("FEWER_THAN_4_BOARD_SEEDS");
    });

    // Test 8: P1 side = 1, P2 side = 0, Total = 1 -> Round ends
    it("Test 8: Player 1 = 1, Player 2 = 0, Total = 1 -> Round ends", () => {
      const state = createGameStateWithSeeds(1, 0);
      expect(getPlayerSideSeeds(state, "PLAYER_1")).toBe(1);
      expect(getPlayerSideSeeds(state, "PLAYER_2")).toBe(0);
      expect(getTotalBoardSeeds(state)).toBe(1);
      expect(verifySeedConservation(state)).toBe(true);

      expect(shouldEndRound(state)).toBe(true);
      expect(getRoundEndReason(state)).toBe("FEWER_THAN_4_BOARD_SEEDS");
    });

    // Test 9: P1 side = 0, P2 side = 1, Total = 1 -> Round ends
    it("Test 9: Player 1 = 0, Player 2 = 1, Total = 1 -> Round ends", () => {
      const state = createGameStateWithSeeds(0, 1);
      expect(getPlayerSideSeeds(state, "PLAYER_1")).toBe(0);
      expect(getPlayerSideSeeds(state, "PLAYER_2")).toBe(1);
      expect(getTotalBoardSeeds(state)).toBe(1);
      expect(verifySeedConservation(state)).toBe(true);

      expect(shouldEndRound(state)).toBe(true);
      expect(getRoundEndReason(state)).toBe("FEWER_THAN_4_BOARD_SEEDS");
    });

    // Test 10: P1 side = 0, P2 side = 0, Total = 0 -> Round ends
    it("Test 10: Player 1 = 0, Player 2 = 0, Total = 0 -> Round ends", () => {
      const state = createGameStateWithSeeds(0, 0);
      expect(getPlayerSideSeeds(state, "PLAYER_1")).toBe(0);
      expect(getPlayerSideSeeds(state, "PLAYER_2")).toBe(0);
      expect(getTotalBoardSeeds(state)).toBe(0);
      expect(verifySeedConservation(state)).toBe(true);

      expect(shouldEndRound(state)).toBe(true);
      expect(getRoundEndReason(state)).toBe("FEWER_THAN_4_BOARD_SEEDS");
    });
  });

  describe("Boundary Tests (totalBoardSeeds >= 4)", () => {
    // Total board seeds = 4: condition alone must NOT end the round
    it("Boundary Test: totalBoardSeeds = 4 (2 on P1, 2 on P2) must NOT end round", () => {
      const state = createGameStateWithSeeds(2, 2);
      expect(getTotalBoardSeeds(state)).toBe(4);
      expect(shouldEndRound(state)).toBe(false);
      expect(getRoundEndReason(state)).toBeNull();
    });

    it("Boundary Test: totalBoardSeeds = 4 (4 on P1, 0 on P2) must NOT end round", () => {
      const state = createGameStateWithSeeds(4, 0);
      expect(getTotalBoardSeeds(state)).toBe(4);
      expect(shouldEndRound(state)).toBe(false);
      expect(getRoundEndReason(state)).toBeNull();
    });

    it("Boundary Test: totalBoardSeeds = 4 (0 on P1, 4 on P2) must NOT end round", () => {
      const state = createGameStateWithSeeds(0, 4);
      expect(getTotalBoardSeeds(state)).toBe(4);
      expect(shouldEndRound(state)).toBe(false);
      expect(getRoundEndReason(state)).toBeNull();
    });

    it("Boundary Test: totalBoardSeeds = 4 (1 on P1, 3 on P2) must NOT end round", () => {
      const state = createGameStateWithSeeds(1, 3);
      expect(getTotalBoardSeeds(state)).toBe(4);
      expect(shouldEndRound(state)).toBe(false);
      expect(getRoundEndReason(state)).toBeNull();
    });

    it("Boundary Test: totalBoardSeeds = 4 (3 on P1, 1 on P2) must NOT end round", () => {
      const state = createGameStateWithSeeds(3, 1);
      expect(getTotalBoardSeeds(state)).toBe(4);
      expect(shouldEndRound(state)).toBe(false);
      expect(getRoundEndReason(state)).toBeNull();
    });

    // Total board seeds = 5: condition alone must NOT end the round
    it("Boundary Test: totalBoardSeeds = 5 (3 on P1, 2 on P2) must NOT end round", () => {
      const state = createGameStateWithSeeds(3, 2);
      expect(getTotalBoardSeeds(state)).toBe(5);
      expect(shouldEndRound(state)).toBe(false);
      expect(getRoundEndReason(state)).toBeNull();
    });

    it("Boundary Test: totalBoardSeeds = 5 (5 on P1, 0 on P2) must NOT end round", () => {
      const state = createGameStateWithSeeds(5, 0);
      expect(getTotalBoardSeeds(state)).toBe(5);
      expect(shouldEndRound(state)).toBe(false);
      expect(getRoundEndReason(state)).toBeNull();
    });

    it("Boundary Test: totalBoardSeeds = 5 (0 on P1, 5 on P2) must NOT end round", () => {
      const state = createGameStateWithSeeds(0, 5);
      expect(getTotalBoardSeeds(state)).toBe(5);
      expect(shouldEndRound(state)).toBe(false);
      expect(getRoundEndReason(state)).toBeNull();
    });
  });

  describe("Rule Invariants Verification", () => {
    it("does not depend on currentPlayer", () => {
      const stateP1Turn = createGameStateWithSeeds(1, 2, { currentPlayer: "PLAYER_1" });
      const stateP2Turn = createGameStateWithSeeds(1, 2, { currentPlayer: "PLAYER_2" });

      expect(shouldEndRound(stateP1Turn)).toBe(true);
      expect(shouldEndRound(stateP2Turn)).toBe(true);

      const stateP1Turn4 = createGameStateWithSeeds(2, 2, { currentPlayer: "PLAYER_1" });
      const stateP2Turn4 = createGameStateWithSeeds(2, 2, { currentPlayer: "PLAYER_2" });

      expect(shouldEndRound(stateP1Turn4)).toBe(false);
      expect(shouldEndRound(stateP2Turn4)).toBe(false);
    });

    it("does not depend on specific pit distribution (single pit vs distributed)", () => {
      // 3 seeds all in pit P0
      const singlePit = createGameStateWithSeeds(3, 0, {
        p1PitsDistribution: [3, 0, 0, 0, 0, 0, 0],
      });
      // 3 seeds distributed across P0, P2, P5
      const distributed = createGameStateWithSeeds(3, 0, {
        p1PitsDistribution: [1, 0, 1, 0, 0, 1, 0],
      });

      expect(shouldEndRound(singlePit)).toBe(true);
      expect(shouldEndRound(distributed)).toBe(true);
    });

    it("does not prematurely end round while seeds are in hand mid-sowing", () => {
      const state = createGameStateWithSeeds(1, 1);
      state.seedsInHand = 5; // player is actively holding and dropping seeds

      expect(shouldEndRound(state)).toBe(false);
    });
  });

  describe("Round Settlement and Seed Conservation (70 seeds)", () => {
    it("settles remaining seeds correctly, clears board, and preserves 70-seed invariant", () => {
      // Setup state with 1 seed on P1 side (P2 has 1), 2 seeds on P2 side (P9 has 2)
      // Storage: P1 has 33, P2 has 34 -> total = 1 + 2 + 33 + 34 = 70
      const state = createGameStateWithSeeds(1, 2, {
        p1PitsDistribution: [0, 0, 1, 0, 0, 0, 0],
        p2PitsDistribution: [0, 0, 2, 0, 0, 0, 0],
        p1Storage: 33,
        p2Storage: 34,
      });

      expect(shouldEndRound(state)).toBe(true);

      const settlementRes = executeRoundSettlement(state);
      expect(settlementRes.success).toBe(true);

      // Remaining seeds transferred to owners:
      // P1 gets 1 seed -> 33 + 1 = 34
      // P2 gets 2 seeds -> 34 + 2 = 36
      expect(state.players.player1.storage).toBe(34);
      expect(state.players.player2.storage).toBe(36);
      expect(state.roundWinner).toBe("PLAYER_2");

      // Board is completely cleared
      expect(getTotalBoardSeeds(state)).toBe(0);
      for (const pit of state.pits) {
        expect(pit.seeds).toBe(0);
        expect(pit.bonusAvailable).toBe(false);
      }

      // Seed conservation preserved: 34 + 36 = 70
      expect(verifySeedConservation(state)).toBe(true);
      expect(state.phase).toBe("ROUND_SETTLEMENT");
    });
  });

  describe("Integration with Turn and Simulation Engine", () => {
    it("triggers round ending and settlement during playTurn when totalBoardSeeds drops below 4", () => {
      // Construct a state where P0 has 1 seed, next pit P1 is empty,
      // opposite pit P12 has 2 seeds.
      // Sowing from P0 drops 1 seed into P1 (which had 0, now has 1).
      // Hand is empty. Next pit is P2 (which has 0).
      // Capture occurs! P12 has 2 seeds captured by Player 1.
      // Board seeds initially: P0=1, P12=2 -> total 3.
      // P1 captures P1 (1 seed) and P12 (2 seeds) -> 3 seeds captured.
      // Board seeds becomes 0 < 4 -> round ends automatically.
      const state = createInitialGame("PLAYER_1");
      for (let i = 0; i < 14; i++) {
        state.pits[i].seeds = 0;
      }
      state.pits[0].seeds = 1;
      state.pits[12].seeds = 2; // opposite of P1
      state.players.player1.storage = 32;
      state.players.player2.storage = 35; // 1 + 2 + 32 + 35 = 70

      const result = playTurn(state, 0);
      expect(result.success).toBe(true);
      if (!result.success) throw new Error("Turn failed");
      expect(result.data.roundEnded).toBe(true);
      expect(result.data.roundSettlement).toBeDefined();
      expect(state.phase).toBe("ROUND_SETTLEMENT");
      expect(verifySeedConservation(state)).toBe(true);
    });

    it("triggers round ending and settlement via ChannemaneGame", () => {
      const state = createInitialGame("PLAYER_1");
      for (let i = 0; i < 14; i++) {
        state.pits[i].seeds = 0;
      }
      state.pits[0].seeds = 1;
      state.pits[12].seeds = 2;
      state.players.player1.storage = 32;
      state.players.player2.storage = 35;

      const game = new ChannemaneGame("PLAYER_1", state);

      const turnResult = game.selectPit(0);
      expect(turnResult.success).toBe(true);
      if (!turnResult.success) throw new Error("Turn failed");
      expect(turnResult.data.roundEnded).toBe(true);
      expect(game.isRoundOver()).toBe(true);
      expect(verifySeedConservation(game.getState())).toBe(true);
    });
  });
});
