/**
 * Expert AI Performance Benchmark Suite & Tournament Validation
 * Strictly verifies Section 10.D:
 * - Benchmark suite for simple, full-branching, tactical, bonus-rich, near-round-ending, and near-match-ending positions.
 * - Measures thinking latency, node count, completed search depth, and decision quality.
 * - Seeded tournament simulation: Expert AI vs Beginner AI with alternating starting players.
 * - Records empirical win rates and average/worst-case latency.
 */

import { describe, it, expect } from "vitest";
import { createInitialGame } from "../../src/engine/board";
import { selectExpertMove } from "../../src/engine/ai/expert";
import { selectMasterMove } from "../../src/engine/ai/master";
import { selectBeginnerMove } from "../../src/engine/ai/beginner";
import { ChannemaneGame } from "../../src/engine/simulation";
import type { Player } from "../../src/engine/types";

describe("Expert AI Benchmark Suite & Strength Validation (Section 10.D)", () => {
  describe("Position Benchmark Suite", () => {
    it("Benchmark 1: Simple position (1-2 legal moves) solves instantly", () => {
      const state = createInitialGame("PLAYER_2", "ai", "expert", "PLAYER_2");
      for (let i = 7; i <= 13; i++) {
        state.pits[i].seeds = 0;
      }
      state.pits[7].seeds = 2;
      state.pits[11].seeds = 1;

      const result = selectExpertMove(state, "PLAYER_2", { maxTimeMs: 200 });

      expect(result.pitId).not.toBeNull();
      expect(result.diagnostics.timeSpentMs).toBeLessThan(150);
      expect(result.diagnostics.completedDepth).toBeGreaterThanOrEqual(2);
    });

    it("Benchmark 2: Full branching opening position (7 legal moves)", () => {
      const state = createInitialGame("PLAYER_2", "ai", "expert", "PLAYER_2");

      const result = selectExpertMove(state, "PLAYER_2", {
        maxDepth: 4,
        maxTimeMs: 300,
      });

      expect(result.pitId).toBeGreaterThanOrEqual(7);
      expect(result.pitId).toBeLessThanOrEqual(13);
      expect(result.diagnostics.completedDepth).toBeGreaterThanOrEqual(2);
      expect(result.diagnostics.nodesEvaluated).toBeGreaterThan(15);
      expect(result.diagnostics.timeSpentMs).toBeLessThan(350);
    });

    it("Benchmark 3: Tactical capture opportunity position", () => {
      const state = createInitialGame("PLAYER_2", "ai", "expert", "PLAYER_2");
      for (let i = 0; i < 14; i++) {
        state.pits[i].seeds = 0;
      }
      // P2 has pit 12 (1 seed), pit 13 (0 seeds). Next is 0 (0 seeds), pit 1 has 6 seeds.
      state.pits[12].seeds = 1;
      state.pits[1].seeds = 6;
      state.pits[7].seeds = 2;
      state.pits[8].seeds = 2;

      const result = selectExpertMove(state, "PLAYER_2", {
        maxDepth: 3,
        maxTimeMs: 250,
      });

      // Expert prioritizes capturing 6 seeds with pit 12
      expect(result.pitId).toBe(12);
      expect(result.diagnostics.timeSpentMs).toBeLessThan(250);
    });

    it("Benchmark 4: Bonus-rich position", () => {
      const state = createInitialGame("PLAYER_2", "ai", "expert", "PLAYER_2");
      // Set up 3-seed bonus potentials
      state.pits[8].seeds = 3;
      state.pits[10].seeds = 3;
      state.pits[7].seeds = 2;

      const result = selectExpertMove(state, "PLAYER_2", {
        maxDepth: 3,
        maxTimeMs: 250,
      });

      expect(result.pitId).not.toBeNull();
      expect(result.diagnostics.completedDepth).toBeGreaterThanOrEqual(2);
    });

    it("Benchmark 5: Near-round-ending position (< 15 seeds on board)", () => {
      const state = createInitialGame("PLAYER_2", "ai", "expert", "PLAYER_2");
      for (let i = 0; i < 14; i++) {
        state.pits[i].seeds = 0;
      }
      state.players.player1.storage = 28;
      state.players.player2.storage = 30;

      state.pits[7].seeds = 3;
      state.pits[11].seeds = 2;
      state.pits[2].seeds = 4;
      state.pits[5].seeds = 3;

      const result = selectExpertMove(state, "PLAYER_2", {
        maxDepth: 4,
        maxTimeMs: 300,
      });

      expect(result.pitId).not.toBeNull();
      expect(result.diagnostics.completedDepth).toBeGreaterThanOrEqual(2);
    });

    it("Benchmark 6: Near-match-ending position (one player near 4 seeds)", () => {
      const state = createInitialGame("PLAYER_2", "ai", "expert", "PLAYER_2");
      for (let i = 0; i < 14; i++) {
        state.pits[i].seeds = 0;
      }
      state.players.player1.storage = 6;
      state.players.player2.storage = 58;

      state.pits[7].seeds = 2;
      state.pits[12].seeds = 1;
      state.pits[0].seeds = 0;
      state.pits[1].seeds = 1;

      const result = selectExpertMove(state, "PLAYER_2", {
        maxDepth: 3,
        maxTimeMs: 250,
      });

      expect(result.pitId).toBe(12);
    });
  });

  describe("Seeded Tournament: Expert AI vs Beginner AI", () => {
    /**
     * Simulates a full game between Expert and Beginner AI.
     */
    function playMatch(
      expertPlayer: Player,
      beginnerPlayer: Player,
      openingPlayer: Player,
      seedOffset: number
    ): { winner: Player | null; expertWon: boolean; totalTurns: number; avgTimeMs: number } {
      let seed = seedOffset;
      const tournamentRNG = () => {
        seed = (seed * 9301 + 49297) % 233280;
        return seed / 233280;
      };

      const game = new ChannemaneGame(openingPlayer, undefined, "ai", "expert", expertPlayer);
      let turns = 0;
      let totalTimeMs = 0;
      let expertDecisions = 0;
      const maxTurns = 200;

      while (!game.isGameOver() && turns < maxTurns) {
        if (game.isRoundOver()) {
          if (game.isGameOver()) break;
          const nextRoundRes = game.startNextRound();
          if (!nextRoundRes.success) break;
          continue;
        }

        // Auto-claim bonuses for current player
        const bonuses = game.getClaimableBonuses();
        for (const b of bonuses) {
          game.claimBonus(b);
        }

        const legalPits = game.getSelectablePits();
        if (legalPits.length === 0) break;

        const current = game.getCurrentPlayer();
        let chosenPit: number | null = null;

        if (current === expertPlayer) {
          const t0 = Date.now();
          const decision = selectExpertMove(game.getState(), expertPlayer, {
            maxDepth: 3,
            maxTimeMs: 60,
            rng: tournamentRNG,
          });
          totalTimeMs += Date.now() - t0;
          expertDecisions++;
          chosenPit = decision.pitId;
        } else {
          chosenPit = selectBeginnerMove(game.getState(), beginnerPlayer, {
            rng: tournamentRNG,
          });
        }

        if (chosenPit === null || !legalPits.includes(chosenPit)) {
          chosenPit = legalPits[0];
        }

        const playRes = game.selectPit(chosenPit);
        if (!playRes.success) break;

        turns++;
      }

      const state = game.getState();
      const p1Storage = state.players.player1.storage;
      const p2Storage = state.players.player2.storage;
      const expertStorage = expertPlayer === "PLAYER_1" ? p1Storage : p2Storage;
      const beginnerStorage = beginnerPlayer === "PLAYER_1" ? p1Storage : p2Storage;

      const matchWinner = game.getWinner() ?? (expertStorage > beginnerStorage ? expertPlayer : (beginnerStorage > expertStorage ? beginnerPlayer : null));
      const expertWon = matchWinner === expertPlayer;
      const avgTimeMs = expertDecisions > 0 ? totalTimeMs / expertDecisions : 0;

      return {
        winner: matchWinner,
        expertWon,
        totalTurns: turns,
        avgTimeMs,
      };
    }

    it("Runs an 8-game tournament with alternating starting players and proves Expert dominance", () => {
      let expertWins = 0;
      let beginnerWins = 0;
      let draws = 0;
      let totalAvgTime = 0;

      const gamesToPlay = 8;

      for (let i = 0; i < gamesToPlay; i++) {
        // Alternate starting player & player assignments
        const expertRole: Player = i % 2 === 0 ? "PLAYER_1" : "PLAYER_2";
        const beginnerRole: Player = expertRole === "PLAYER_1" ? "PLAYER_2" : "PLAYER_1";
        const openingPlayer: Player = i % 4 < 2 ? "PLAYER_1" : "PLAYER_2";

        const match = playMatch(expertRole, beginnerRole, openingPlayer, 1000 + i * 77);

        if (match.expertWon) {
          expertWins++;
        } else if (match.winner === beginnerRole) {
          beginnerWins++;
        } else {
          draws++;
        }
        totalAvgTime += match.avgTimeMs;
      }

      const winRate = expertWins / gamesToPlay;
      const avgLatencyMs = totalAvgTime / gamesToPlay;

      console.log(`\n=== TOURNAMENT RESULTS: EXPERT vs BEGINNER ===`);
      console.log(`Games Played: ${gamesToPlay}`);
      console.log(`Expert Wins:  ${expertWins} (${(winRate * 100).toFixed(1)}%)`);
      console.log(`Beginner Wins:${beginnerWins}`);
      console.log(`Draws:        ${draws}`);
      console.log(`Avg Latency:  ${avgLatencyMs.toFixed(2)} ms/turn`);
      console.log(`==============================================\n`);

      // Expert AI must demonstrate strong superiority over Beginner (>70% win rate)
      expect(winRate).toBeGreaterThanOrEqual(0.70);
      expect(avgLatencyMs).toBeLessThan(100);
    });
  });

  describe("Seeded Tournament: Master AI vs Expert AI (Section 11.E)", () => {
    function playMasterVsExpertMatch(
      masterPlayer: Player,
      expertPlayer: Player,
      openingPlayer: Player,
      seedOffset: number
    ): {
      winner: Player | null;
      masterWon: boolean;
      totalTurns: number;
      avgTimeMs: number;
      endgameSolves: number;
    } {
      let seed = seedOffset;
      const tournamentRNG = () => {
        seed = (seed * 9301 + 49297) % 233280;
        return seed / 233280;
      };

      const game = new ChannemaneGame(openingPlayer, undefined, "ai", "master", masterPlayer);
      let turns = 0;
      let totalTimeMs = 0;
      let masterDecisions = 0;
      let endgameSolves = 0;
      const maxTurns = 200;

      while (!game.isGameOver() && turns < maxTurns) {
        if (game.isRoundOver()) {
          if (game.isGameOver()) break;
          const nextRoundRes = game.startNextRound();
          if (!nextRoundRes.success) break;
          continue;
        }

        const bonuses = game.getClaimableBonuses();
        for (const b of bonuses) {
          game.claimBonus(b);
        }

        const legalPits = game.getSelectablePits();
        if (legalPits.length === 0) break;

        const current = game.getCurrentPlayer();
        let chosenPit: number | null = null;

        if (current === masterPlayer) {
          const t0 = Date.now();
          const decision = selectMasterMove(game.getState(), masterPlayer, {
            maxDepth: 3,
            maxTimeMs: 40,
            rng: tournamentRNG,
          });
          totalTimeMs += Date.now() - t0;
          masterDecisions++;
          if (decision.diagnostics.endgameSolved) {
            endgameSolves++;
          }
          chosenPit = decision.pitId;
        } else {
          const decision = selectExpertMove(game.getState(), expertPlayer, {
            maxDepth: 3,
            maxTimeMs: 30,
            rng: tournamentRNG,
          });
          chosenPit = decision.pitId;
        }

        if (chosenPit === null || !legalPits.includes(chosenPit)) {
          chosenPit = legalPits[0];
        }

        const playRes = game.selectPit(chosenPit);
        if (!playRes.success) break;

        turns++;
      }

      const state = game.getState();
      const p1Storage = state.players.player1.storage;
      const p2Storage = state.players.player2.storage;
      const masterStorage = masterPlayer === "PLAYER_1" ? p1Storage : p2Storage;
      const expertStorage = expertPlayer === "PLAYER_1" ? p1Storage : p2Storage;

      const matchWinner =
        game.getWinner() ??
        (masterStorage > expertStorage
          ? masterPlayer
          : expertStorage > masterStorage
          ? expertPlayer
          : null);
      const masterWon = matchWinner === masterPlayer;
      const avgTimeMs = masterDecisions > 0 ? totalTimeMs / masterDecisions : 0;

      return {
        winner: matchWinner,
        masterWon,
        totalTurns: turns,
        avgTimeMs,
        endgameSolves,
      };
    }

    it("Runs an 8-game tournament between Master AI and Expert AI with alternating positions", () => {
      let masterWins = 0;
      let expertWins = 0;
      let draws = 0;
      let totalAvgTime = 0;
      let totalEndgameSolves = 0;

      const gamesToPlay = 8;

      for (let i = 0; i < gamesToPlay; i++) {
        const masterRole: Player = i % 2 === 0 ? "PLAYER_1" : "PLAYER_2";
        const expertRole: Player = masterRole === "PLAYER_1" ? "PLAYER_2" : "PLAYER_1";
        const openingPlayer: Player = i % 4 < 2 ? "PLAYER_1" : "PLAYER_2";

        const match = playMasterVsExpertMatch(masterRole, expertRole, openingPlayer, 5000 + i * 131);

        if (match.masterWon) {
          masterWins++;
        } else if (match.winner === expertRole) {
          expertWins++;
        } else {
          draws++;
        }
        totalAvgTime += match.avgTimeMs;
        totalEndgameSolves += match.endgameSolves;
      }

      const winRate = masterWins / gamesToPlay;
      const avgLatencyMs = totalAvgTime / gamesToPlay;

      console.log(`\n=== TOURNAMENT RESULTS: MASTER vs EXPERT ===`);
      console.log(`Games Played:    ${gamesToPlay}`);
      console.log(`Master Wins:     ${masterWins} (${(winRate * 100).toFixed(1)}%)`);
      console.log(`Expert Wins:     ${expertWins}`);
      console.log(`Draws:           ${draws}`);
      console.log(`Endgame Solves:  ${totalEndgameSolves}`);
      console.log(`Avg Latency:     ${avgLatencyMs.toFixed(2)} ms/turn`);
      console.log(`============================================\n`);

      // Master must win or draw at least 50% against Expert and maintain fast latency
      expect(masterWins + draws).toBeGreaterThanOrEqual(4);
      expect(avgLatencyMs).toBeLessThan(120);
    }, 30000);
  });
});

