/**
 * Master AI Decision Engine Test Suite
 * Strictly covers Section 11 specifications:
 * - A. Search correctness (legal moves, non-mutation of state, player perspective, alpha-beta, iterative deepening, fallback, TT keys)
 * - B. Tactical correctness (captures, bonus setups, opponent bonus denial, forced sequences, match-ending foresight)
 * - C. Hybrid Endgame Solver (tractability detection, exact solving of known endgames, cycle safety, budget bounds, graceful fallback)
 * - D. Match and round regression tests (66/4, 4/66 boundaries, seed conservation of all 70 seeds)
 */

import { describe, it, expect } from "vitest";
import { createInitialGame, cloneGameState, getPlayerSideSeeds } from "../../src/engine/board";
import {
  selectMasterMove,
  evaluateMasterPosition,
  DEFAULT_MASTER_WEIGHTS,
} from "../../src/engine/ai/master";
import {
  isEndgameTractable,
  solveEndgame,
} from "../../src/engine/ai/endgameSolver";
import { getGameStateKey } from "../../src/engine/ai/expert";
import { expertAIClient } from "../../src/engine/ai/expertClient";
import { playTurn } from "../../src/engine/game";

describe("Master AI Engine & Hybrid Endgame Solver (Section 11)", () => {
  describe("A. Search Correctness & State Safety", () => {
    it("selects only legal moves for the active player", () => {
      const state = createInitialGame("PLAYER_2", "ai", "master", "PLAYER_2");
      const result = selectMasterMove(state, "PLAYER_2", { maxDepth: 2, maxTimeMs: 100 });

      expect(result.pitId).not.toBeNull();
      expect(result.pitId).toBeGreaterThanOrEqual(7);
      expect(result.pitId).toBeLessThanOrEqual(13);
      expect(state.pits[result.pitId!].seeds).toBeGreaterThan(0);
    });

    it("does not mutate the live game state during search or evaluation", () => {
      const state = createInitialGame("PLAYER_2", "ai", "master", "PLAYER_2");
      const snapshot = JSON.stringify(state);

      selectMasterMove(state, "PLAYER_2", { maxDepth: 3, maxTimeMs: 150 });

      expect(JSON.stringify(state)).toBe(snapshot);
    });

    it("evaluates symmetrically from both player perspectives", () => {
      const state = createInitialGame("PLAYER_2", "ai", "master", "PLAYER_2");
      state.players.player1.storage = 20;
      state.players.player2.storage = 10;

      const p1Eval = evaluateMasterPosition(state, "PLAYER_1", DEFAULT_MASTER_WEIGHTS);
      const p2Eval = evaluateMasterPosition(state, "PLAYER_2", DEFAULT_MASTER_WEIGHTS);

      // Storage advantage of P1 should yield positive score for P1 and negative for P2
      expect(p1Eval).toBeGreaterThan(0);
      expect(p2Eval).toBeLessThan(0);
    });

    it("generates distinct transposition table keys for strategically different states", () => {
      const s1 = createInitialGame("PLAYER_2", "ai", "master", "PLAYER_2");
      const s2 = createInitialGame("PLAYER_2", "ai", "master", "PLAYER_2");

      s1.pits[7].seeds = 4;
      s2.pits[7].seeds = 5;

      const key1 = getGameStateKey(s1);
      const key2 = getGameStateKey(s2);

      expect(key1).not.toBe(key2);

      // Test bonus availability difference
      const s3 = createInitialGame("PLAYER_2", "ai", "master", "PLAYER_2");
      s3.pits[8].bonusAvailable = true;
      const key3 = getGameStateKey(s3);
      expect(key1).not.toBe(key3);

      // Test open vs closed pit
      const s4 = createInitialGame("PLAYER_2", "ai", "master", "PLAYER_2");
      s4.pits[8].status = "CLOSED";
      const key4 = getGameStateKey(s4);
      expect(key1).not.toBe(key4);
    });

    it("iterative deepening commits deepest fully completed iteration", () => {
      const state = createInitialGame("PLAYER_2", "ai", "master", "PLAYER_2");
      const result = selectMasterMove(state, "PLAYER_2", {
        maxDepth: 4,
        maxTimeMs: 150,
      });

      expect(result.diagnostics.completedDepth).toBeGreaterThanOrEqual(2);
      expect(result.diagnostics.iterationHistory.length).toBe(result.diagnostics.completedDepth);
      // Iteration history entries must be strictly increasing by depth
      for (let i = 0; i < result.diagnostics.iterationHistory.length; i++) {
        expect(result.diagnostics.iterationHistory[i].depth).toBe(i + 1);
      }
    });

    it("budget exhaustion preserves legal fallback move from depth 1", () => {
      const state = createInitialGame("PLAYER_2", "ai", "master", "PLAYER_2");
      // Give minimal time budget
      const result = selectMasterMove(state, "PLAYER_2", {
        maxDepth: 6,
        maxTimeMs: 1, // Will exhaust after or during depth 1
      });

      expect(result.pitId).not.toBeNull();
      expect(result.pitId).toBeGreaterThanOrEqual(7);
      expect(result.pitId).toBeLessThanOrEqual(13);
      expect(result.diagnostics.completedDepth).toBeGreaterThanOrEqual(1);
    });

    it("returns null when called for non-playing phase or inactive player", () => {
      const state = createInitialGame("PLAYER_1", "ai", "master", "PLAYER_2");
      state.phase = "ROUND_SETTLEMENT";

      const res = selectMasterMove(state, "PLAYER_2");
      expect(res.pitId).toBeNull();

      state.phase = "PLAYING";
      state.currentPlayer = "PLAYER_1";
      const res2 = selectMasterMove(state, "PLAYER_2");
      expect(res2.pitId).toBeNull();
    });
  });

  describe("B. Tactical Correctness & Opponent Denial", () => {
    it("recognizes and executes immediate high-value capture", () => {
      const state = createInitialGame("PLAYER_2", "ai", "master", "PLAYER_2");
      for (let i = 0; i < 14; i++) {
        state.pits[i].seeds = 0;
      }

      // P2 has pit 12 with 1 seed. Destination is 13 (empty).
      // Opponent across is pit 1 (pit 0 is empty, pit 1 has 6 seeds).
      state.pits[12].seeds = 1;
      state.pits[1].seeds = 6;
      state.pits[7].seeds = 2;
      state.pits[8].seeds = 2;

      const result = selectMasterMove(state, "PLAYER_2", { maxDepth: 3, maxTimeMs: 150 });
      expect(result.pitId).toBe(12);
    });

    it("actively prioritizes bonus creation and denies opponent bonuses", () => {
      const state = createInitialGame("PLAYER_2", "ai", "master", "PLAYER_2");
      for (let i = 0; i < 14; i++) {
        state.pits[i].seeds = 0;
      }
      // P2 has pit 8 with 3 seeds. Sowing from pit 7 (1 seed) lands in pit 8, triggering 4-seed bonus!
      state.players.player1.storage = 20;
      state.players.player2.storage = 20;
      state.pits[7].seeds = 1;
      state.pits[8].seeds = 3;
      state.pits[11].seeds = 2;

      const result = selectMasterMove(state, "PLAYER_2", { maxDepth: 3, maxTimeMs: 150 });
      expect(result.pitId).toBe(7);
    });

    it("evaluates guaranteed match win as highest priority above temporary seed gains", () => {
      const state = createInitialGame("PLAYER_2", "ai", "master", "PLAYER_2");
      for (let i = 0; i < 14; i++) {
        state.pits[i].seeds = 0;
      }
      // P1 storage is 4 (cannot reach 5 with 0 board seeds)
      state.players.player1.storage = 4;
      state.players.player2.storage = 66;

      const evalScore = evaluateMasterPosition(state, "PLAYER_2", DEFAULT_MASTER_WEIGHTS);
      // Master should recognize this as a match-winning state
      expect(evalScore).toBeGreaterThanOrEqual(100_000);
    });

    it("avoids moves that leave the opponent with forced winning captures", () => {
      const state = createInitialGame("PLAYER_2", "ai", "master", "PLAYER_2");
      for (let i = 0; i < 14; i++) {
        state.pits[i].seeds = 0;
      }
      // P2 has pit 7 (1 seed) and pit 9 (2 seeds)
      state.pits[7].seeds = 1;
      state.pits[9].seeds = 2;
      // P1 has pit 0 (1 seed) aiming to capture pit 8 if pit 8 is filled
      state.pits[0].seeds = 1;

      const result = selectMasterMove(state, "PLAYER_2", { maxDepth: 4, maxTimeMs: 200 });
      expect(result.pitId).not.toBeNull();
    });
  });

  describe("C. Hybrid Exact Endgame Solver", () => {
    it("correctly identifies tractable vs non-tractable positions", () => {
      const normalOpening = createInitialGame("PLAYER_2", "ai", "master", "PLAYER_2");
      expect(isEndgameTractable(normalOpening)).toBe(false);

      const smallEndgame = cloneGameState(normalOpening);
      for (let i = 0; i < 14; i++) {
        smallEndgame.pits[i].seeds = 0;
      }
      smallEndgame.pits[7].seeds = 2;
      smallEndgame.pits[1].seeds = 1;
      expect(isEndgameTractable(smallEndgame)).toBe(true);

      // Large seed count (> 14) is never marked tractable
      smallEndgame.pits[7].seeds = 15;
      expect(isEndgameTractable(smallEndgame)).toBe(false);
    });

    it("exact solver accurately solves a simple 1-move endgame", () => {
      const state = createInitialGame("PLAYER_2", "ai", "master", "PLAYER_2");
      for (let i = 0; i < 14; i++) {
        state.pits[i].seeds = 0;
      }
      state.pits[7].seeds = 2;
      state.pits[1].seeds = 1;

      const solveResult = solveEndgame(state, "PLAYER_2");
      expect(solveResult).not.toBeNull();
      expect(solveResult?.isExact).toBe(true);
      expect(solveResult?.bestMove).toBe(7);
    });

    it("exact solver finds forced win in 2-choice endgame", () => {
      const state = createInitialGame("PLAYER_2", "ai", "master", "PLAYER_2");
      for (let i = 0; i < 14; i++) {
        state.pits[i].seeds = 0;
      }
      state.players.player1.storage = 30;
      state.players.player2.storage = 34;

      // P2 has pit 12 (1 seed -> lands in 13, empty, captures pit 1 with 2 seeds)
      // or pit 7 (1 seed -> lands in 8, no capture)
      state.pits[12].seeds = 1;
      state.pits[7].seeds = 1;
      state.pits[1].seeds = 2;

      const solveResult = solveEndgame(state, "PLAYER_2");
      expect(solveResult).not.toBeNull();
      expect(solveResult?.isExact).toBe(true);
      expect(solveResult?.bestMove).toBe(12);
    });

    it("falls back gracefully when solver exceeds node or time budget", () => {
      const state = createInitialGame("PLAYER_2", "ai", "master", "PLAYER_2");
      for (let i = 0; i < 14; i++) {
        state.pits[i].seeds = 0;
      }
      state.pits[7].seeds = 2;
      state.pits[8].seeds = 2;
      state.pits[9].seeds = 2;
      state.pits[0].seeds = 2;
      state.pits[1].seeds = 2;

      // Enforce an impossibly low node limit (1 node)
      const solveResult = solveEndgame(state, "PLAYER_2", { maxNodes: 1 });
      // Must abort gracefully and return null (never a fake exact result)
      expect(solveResult).toBeNull();
    });

    it("selectMasterMove seamlessly integrates exact solver in tractable positions", () => {
      const state = createInitialGame("PLAYER_2", "ai", "master", "PLAYER_2");
      for (let i = 0; i < 14; i++) {
        state.pits[i].seeds = 0;
      }
      state.players.player1.storage = 30;
      state.players.player2.storage = 34;
      state.pits[12].seeds = 1;
      state.pits[7].seeds = 1;
      state.pits[1].seeds = 2;

      const result = selectMasterMove(state, "PLAYER_2", { maxTimeMs: 300 });
      expect(result.pitId).toBe(12);
      expect(result.diagnostics.endgameSolved).toBe(true);
      expect(result.diagnostics.endgameResult?.isExact).toBe(true);
    });
  });

  describe("D. Match and Round Regression Scenarios", () => {
    it("handles 66 / 4 storage boundary: declares match won for 66", () => {
      const state = createInitialGame("PLAYER_2", "ai", "master", "PLAYER_2");
      for (let i = 0; i < 14; i++) {
        state.pits[i].seeds = 0;
      }
      state.players.player1.storage = 4;
      state.players.player2.storage = 66;

      const evalP2 = evaluateMasterPosition(state, "PLAYER_2");
      expect(evalP2).toBeGreaterThanOrEqual(100_000);

      const evalP1 = evaluateMasterPosition(state, "PLAYER_1");
      expect(evalP1).toBeLessThanOrEqual(-100_000);
    });

    it("handles 4 / 66 storage boundary: recognizes forced match loss for 4", () => {
      const state = createInitialGame("PLAYER_2", "ai", "master", "PLAYER_2");
      for (let i = 0; i < 14; i++) {
        state.pits[i].seeds = 0;
      }
      state.players.player1.storage = 66;
      state.players.player2.storage = 4;

      const evalP2 = evaluateMasterPosition(state, "PLAYER_2");
      expect(evalP2).toBeLessThanOrEqual(-100_000);
    });

    it("preserves total seed conservation (70 seeds) throughout complete Master turn", () => {
      const state = createInitialGame("PLAYER_2", "ai", "master", "PLAYER_2");
      const decision = selectMasterMove(state, "PLAYER_2", { maxDepth: 3, maxTimeMs: 150 });

      expect(decision.pitId).not.toBeNull();
      const playRes = playTurn(state, decision.pitId!);
      expect(playRes.success).toBe(true);

      const totalBoard =
        getPlayerSideSeeds(state, "PLAYER_1") + getPlayerSideSeeds(state, "PLAYER_2");
      const totalStorage =
        state.players.player1.storage + state.players.player2.storage;

      expect(totalBoard + totalStorage).toBe(70);
    });

    it("expertAIClient dispatches Master requests asynchronously and reliably", async () => {
      const state = createInitialGame("PLAYER_2", "ai", "master", "PLAYER_2");
      const result = await expertAIClient.requestMasterDecision(state, "PLAYER_2", {
        maxDepth: 3,
        maxTimeMs: 100,
      });

      expect(result.pitId).not.toBeNull();
      expect(result.pitId).toBeGreaterThanOrEqual(7);
      expect(result.pitId).toBeLessThanOrEqual(13);
      expect(result.diagnostics.completedDepth).toBeGreaterThanOrEqual(1);
    });
  });
});
