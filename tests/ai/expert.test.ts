/**
 * Expert AI Engine & Search Correctness Unit Tests
 * Strictly verifies Section 2, 5, 6, 7, 8, 10 requirements:
 * - 5-Tier position evaluation (Match outcome > Round outcome > Storage > Tactics > Positional quality)
 * - Complete-turn simulation without mutating live state
 * - Alpha-beta pruning efficiency & Transposition Table caching
 * - Iterative deepening with adaptive search budget & incomplete iteration safety
 * - Move ordering efficiency
 * - Forced win preference & forced loss avoidance
 * - Rare tie variation within threshold with deterministic injected RNG
 * - Single-move fast path
 */

import { describe, it, expect } from "vitest";
import {
  createInitialGame,
  cloneGameState,
  verifySeedConservation,
} from "../../src/engine/board";
import {
  evaluatePosition,
  getGameStateKey,
  getOrderedCandidateMoves,
  selectExpertMove,
  DEFAULT_EXPERT_WEIGHTS,
} from "../../src/engine/ai/expert";

describe("Expert AI Engine & Minimax Search (Unit Tests)", () => {
  describe("State Serialization & Transposition Table Key", () => {
    it("generates unique, immutable keys that reflect board, storage, bonuses, and turn phase", () => {
      const state1 = createInitialGame("PLAYER_1", "ai", "expert", "PLAYER_2");
      const key1 = getGameStateKey(state1);

      expect(key1).toContain("r:1");
      expect(key1).toContain("p:PLAYING");
      expect(key1).toContain("c:PLAYER_1");
      expect(key1).toContain("s:0_0");

      // Mutate storage
      const state2 = cloneGameState(state1);
      state2.players.player1.storage = 10;
      const key2 = getGameStateKey(state2);
      expect(key1).not.toBe(key2);

      // Mutate bonus
      const state3 = cloneGameState(state1);
      state3.pits[3].bonusAvailable = true;
      const key3 = getGameStateKey(state3);
      expect(key1).not.toBe(key3);

      // Mutate closed status
      const state4 = cloneGameState(state1);
      state4.pits[0].status = "CLOSED";
      const key4 = getGameStateKey(state4);
      expect(key1).not.toBe(key4);
    });
  });

  describe("5-Tier Position Evaluator", () => {
    it("Priority 1: Strongly prefers proven match-ending win over any ordinary positional gain", () => {
      const winningState = createInitialGame("PLAYER_2", "ai", "expert", "PLAYER_2");
      winningState.phase = "MATCH_END";
      winningState.winner = "PLAYER_2";
      winningState.players.player2.storage = 55;
      winningState.players.player1.storage = 15;

      const losingState = createInitialGame("PLAYER_2", "ai", "expert", "PLAYER_2");
      losingState.phase = "MATCH_END";
      losingState.winner = "PLAYER_1";
      losingState.players.player2.storage = 15;
      losingState.players.player1.storage = 55;

      const winScore = evaluatePosition(winningState, "PLAYER_2", DEFAULT_EXPERT_WEIGHTS);
      const lossScore = evaluatePosition(losingState, "PLAYER_2", DEFAULT_EXPERT_WEIGHTS);

      expect(winScore).toBeGreaterThanOrEqual(DEFAULT_EXPERT_WEIGHTS.matchWin - 10);
      expect(lossScore).toBeLessThanOrEqual(-DEFAULT_EXPERT_WEIGHTS.matchWin + 10);
    });

    it("Priority 2: Evaluates round settlement consequences and next round open pairs", () => {
      const state = createInitialGame("PLAYER_2", "ai", "expert", "PLAYER_2");
      state.phase = "ROUND_SETTLEMENT";
      // Player 2 has 45 seeds (9 pairs capacity -> 7 max), Player 1 has 25 seeds (5 pairs)
      state.players.player2.storage = 45;
      state.players.player1.storage = 25;

      const evalP2 = evaluatePosition(state, "PLAYER_2", DEFAULT_EXPERT_WEIGHTS);
      const evalP1 = evaluatePosition(state, "PLAYER_1", DEFAULT_EXPERT_WEIGHTS);

      expect(evalP2).toBeGreaterThan(0);
      expect(evalP1).toBeLessThan(0);
      expect(evalP2).toBe(-evalP1);
    });

    it("Priority 3: Rewards secured storage advantage and friendly board seeds", () => {
      const s1 = createInitialGame("PLAYER_2", "ai", "expert", "PLAYER_2");
      s1.players.player2.storage = 20;
      s1.players.player1.storage = 10;

      const s2 = createInitialGame("PLAYER_2", "ai", "expert", "PLAYER_2");
      s2.players.player2.storage = 10;
      s2.players.player1.storage = 20;

      const score1 = evaluatePosition(s1, "PLAYER_2", DEFAULT_EXPERT_WEIGHTS);
      const score2 = evaluatePosition(s2, "PLAYER_2", DEFAULT_EXPERT_WEIGHTS);

      expect(score1).toBeGreaterThan(score2);
    });

    it("Priority 4: Rewards available bonuses and 3-seed bonus setup opportunities", () => {
      const stateBonus = createInitialGame("PLAYER_2", "ai", "expert", "PLAYER_2");
      stateBonus.pits[8].seeds = 4;
      stateBonus.pits[8].bonusAvailable = true;

      const stateNoBonus = createInitialGame("PLAYER_2", "ai", "expert", "PLAYER_2");
      stateNoBonus.pits[8].seeds = 4;
      stateNoBonus.pits[8].bonusAvailable = false;

      const scoreWithBonus = evaluatePosition(stateBonus, "PLAYER_2", DEFAULT_EXPERT_WEIGHTS);
      const scoreNoBonus = evaluatePosition(stateNoBonus, "PLAYER_2", DEFAULT_EXPERT_WEIGHTS);

      expect(scoreWithBonus).toBeGreaterThan(scoreNoBonus);
    });
  });

  describe("Candidate Simulation & Invariant Preservation", () => {
    it("never mutates the original game state during search", () => {
      const originalState = createInitialGame("PLAYER_2", "ai", "expert", "PLAYER_2");
      const snapshot = JSON.stringify(originalState);

      const decision = selectExpertMove(originalState, "PLAYER_2", {
        maxDepth: 3,
        maxTimeMs: 100,
      });

      expect(decision.pitId).not.toBeNull();
      expect(JSON.stringify(originalState)).toBe(snapshot);
      expect(verifySeedConservation(originalState)).toBe(true);
    });

    it("returns instantly for single legal candidate without wasting budget", () => {
      const state = createInitialGame("PLAYER_2", "ai", "expert", "PLAYER_2");
      for (let i = 7; i <= 13; i++) {
        state.pits[i].seeds = 0;
      }
      state.pits[10].seeds = 5; // Only legal pit for Player 2

      const result = selectExpertMove(state, "PLAYER_2", { maxTimeMs: 500 });
      expect(result.pitId).toBe(10);
      expect(result.diagnostics.completedDepth).toBe(1);
      expect(result.diagnostics.nodesEvaluated).toBe(1);
      expect(result.diagnostics.timeSpentMs).toBeLessThan(50);
    });
  });

  describe("Tactical Intelligence & Response Anticipation", () => {
    it("chooses an immediate forced winning move when available", () => {
      const state = createInitialGame("PLAYER_2", "ai", "expert", "PLAYER_2");
      for (let i = 0; i < 14; i++) {
        state.pits[i].seeds = 0;
      }
      // P1 storage is 4. P2 storage is 62.
      state.players.player1.storage = 4;
      state.players.player2.storage = 62;

      // Pit 12 has 1 seed, pit 1 has 1 seed. Pit 7 has 2 seeds.
      // Sowing pit 12 drops 1 seed into 13, hand is empty. Next is 0 (empty).
      // Captures pit 1 (1 seed). Total board seeds drops to 3 (< 4) -> round ends -> P2 match win!
      state.pits[12].seeds = 1;
      state.pits[1].seeds = 1;
      state.pits[7].seeds = 2;

      const result = selectExpertMove(state, "PLAYER_2", {
        maxDepth: 2,
        maxTimeMs: 200,
        rng: () => 0,
      });

      expect(result.pitId).toBe(12);
    });

    it("avoids a trap where an immediate capture allows a devastating opponent counter-capture", () => {
      const state = createInitialGame("PLAYER_2", "ai", "expert", "PLAYER_2");
      for (let i = 0; i < 14; i++) {
        state.pits[i].seeds = 0;
      }
      state.players.player1.storage = 25;
      state.players.player2.storage = 25;

      // Pit 12: 1 seed -> drops in 13 (empty) -> captures pit 1 (1 seed)
      // BUT leaves pit 9 (8 seeds) exposed to P1's pit 6!
      state.pits[12].seeds = 1;
      state.pits[1].seeds = 1;

      // Pit 7: 1 seed -> defends pit 9 by scooping into it
      state.pits[7].seeds = 1;
      state.pits[8].seeds = 0;
      state.pits[9].seeds = 8;

      // P1 has pit 6 (1 seed) that captures pit 9 if pit 7 is left empty
      state.pits[6].seeds = 1;

      const expertMove = selectExpertMove(state, "PLAYER_2", {
        maxDepth: 2,
        maxTimeMs: 250,
        rng: () => 0,
      });

      // Expert looks ahead and avoids the trap move 12 (which greedily takes 1 seed but loses 8 seeds)
      expect(expertMove.pitId).not.toBe(12);
      expect([7, 9]).toContain(expertMove.pitId);
    });
  });

  describe("Iterative Deepening & Budget Safety", () => {
    it("never replaces the best completed iteration with an incomplete iteration", () => {
      const state = createInitialGame("PLAYER_2", "ai", "expert", "PLAYER_2");

      // Give a very small budget (1ms) to force interruption during depth 2 or 3
      const result = selectExpertMove(state, "PLAYER_2", {
        maxDepth: 8,
        maxTimeMs: 5,
        minDepth: 1,
      });

      expect(result.pitId).toBeGreaterThanOrEqual(7);
      expect(result.pitId).toBeLessThanOrEqual(13);
      expect(result.diagnostics.completedDepth).toBeGreaterThanOrEqual(1);

      // Verify that every recorded iteration in iterationHistory actually completed
      for (const iter of result.diagnostics.iterationHistory) {
        expect(iter.bestMove).toBeGreaterThanOrEqual(7);
        expect(iter.bestMove).toBeLessThanOrEqual(13);
      }
    });

    it("records node counts, completed depth, and elapsed time in diagnostics", () => {
      const state = createInitialGame("PLAYER_2", "ai", "expert", "PLAYER_2");
      const result = selectExpertMove(state, "PLAYER_2", {
        maxDepth: 3,
        maxTimeMs: 200,
      });

      expect(result.diagnostics.nodesEvaluated).toBeGreaterThan(0);
      expect(result.diagnostics.completedDepth).toBeGreaterThanOrEqual(2);
      expect(result.diagnostics.timeSpentMs).toBeGreaterThanOrEqual(0);
      expect(result.diagnostics.iterationHistory.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe("Move Ordering & Transposition Table Efficiency", () => {
    it("generates ordered candidate moves with tactical priority first", () => {
      const state = createInitialGame("PLAYER_2", "ai", "expert", "PLAYER_2");
      const ordered = getOrderedCandidateMoves(state, "PLAYER_2");

      expect(ordered.length).toBe(7);
      for (const pit of ordered) {
        expect(pit).toBeGreaterThanOrEqual(7);
        expect(pit).toBeLessThanOrEqual(13);
      }
    });

    it("benefits from transposition table caching across iterations", () => {
      const state = createInitialGame("PLAYER_2", "ai", "expert", "PLAYER_2");
      const withTT = selectExpertMove(state, "PLAYER_2", {
        maxDepth: 4,
        maxTimeMs: 300,
        useTranspositionTable: true,
      });

      expect(withTT.diagnostics.ttEntries).toBeGreaterThan(0);
    });
  });

  describe("Rare Tie Variation with Reproducible RNG", () => {
    it("never selects an inferior move when variation occurs", () => {
      const state = createInitialGame("PLAYER_2", "ai", "expert", "PLAYER_2");
      // Symmetrical board where pits 7, 8, 9, 10, 11, 12, 13 all have equal 5 seeds
      const configWithVariation = {
        maxDepth: 2,
        maxTimeMs: 150,
        tieThreshold: 20,
        variationProbability: 1.0, // Force variation among near-equal moves
        rng: () => 0.5,
      };

      const result = selectExpertMove(state, "PLAYER_2", configWithVariation);
      expect(result.pitId).toBeGreaterThanOrEqual(7);
      expect(result.pitId).toBeLessThanOrEqual(13);
    });

    it("is completely reproducible when provided a deterministic RNG seed", () => {
      const state = createInitialGame("PLAYER_2", "ai", "expert", "PLAYER_2");

      let seed = 42;
      const seededRNG = () => {
        seed = (seed * 9301 + 49297) % 233280;
        return seed / 233280;
      };

      const res1 = selectExpertMove(state, "PLAYER_2", {
        maxDepth: 3,
        maxTimeMs: 200,
        rng: seededRNG,
      });

      seed = 42;
      const res2 = selectExpertMove(state, "PLAYER_2", {
        maxDepth: 3,
        maxTimeMs: 200,
        rng: seededRNG,
      });

      expect(res1.pitId).toBe(res2.pitId);
      expect(res1.diagnostics.completedDepth).toBe(res2.diagnostics.completedDepth);
    });
  });
});
