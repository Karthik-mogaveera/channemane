/**
 * Tests for Beginner AI Opponent
 * Strictly follows Section 12 requirements:
 * 12.A: Legal move tests
 * 12.B: Evaluation tests
 * 12.C: Randomness and reproducibility tests
 */

import { describe, it, expect } from "vitest";
import {
  evaluateCandidateMove,
  generateCandidateMoves,
  selectBeginnerMove,
  DEFAULT_BEGINNER_WEIGHTS,
} from "../../src/engine/ai/beginner";
import { createInitialGame, getTotalSeeds } from "../../src/engine/board";

describe("Beginner AI - Legal Move Generation & Filtering (Section 12.A)", () => {
  it("selects only legal starting pits belonging to the AI player", () => {
    const state = createInitialGame("PLAYER_2", "ai", "beginner", "PLAYER_2");
    const candidates = generateCandidateMoves(state, "PLAYER_2");

    expect(candidates.length).toBe(7);
    for (const c of candidates) {
      // P7 to P13 belong to PLAYER_2
      expect(c.pitId).toBeGreaterThanOrEqual(7);
      expect(c.pitId).toBeLessThanOrEqual(13);
      expect(state.pits[c.pitId].owner).toBe("PLAYER_2");
      expect(state.pits[c.pitId].seeds).toBeGreaterThan(0);
      expect(state.pits[c.pitId].status).toBe("OPEN");
    }
  });

  it("never selects empty pits", () => {
    const state = createInitialGame("PLAYER_2", "ai", "beginner", "PLAYER_2");
    // Empty pits 7, 8, 9, 10, 11, 12, leaving only pit 13 with seeds
    for (let i = 7; i <= 12; i++) {
      state.pits[i].seeds = 0;
    }

    const move = selectBeginnerMove(state, "PLAYER_2");
    expect(move).toBe(13);
  });

  it("never selects closed pits", () => {
    const state = createInitialGame("PLAYER_2", "ai", "beginner", "PLAYER_2");
    state.pits[7].status = "CLOSED";
    state.pits[7].seeds = 5;

    const candidates = generateCandidateMoves(state, "PLAYER_2");
    expect(candidates.some((c) => c.pitId === 7)).toBe(false);
  });

  it("never allows selecting a human-owned starting pit", () => {
    const state = createInitialGame("PLAYER_2", "ai", "beginner", "PLAYER_2");
    const candidates = generateCandidateMoves(state, "PLAYER_2");

    for (const c of candidates) {
      expect(c.pitId).not.toBeLessThan(7);
      expect(state.pits[c.pitId].owner).not.toBe("PLAYER_1");
    }
  });

  it("unconditionally selects the single legal move without random override", () => {
    const state = createInitialGame("PLAYER_2", "ai", "beginner", "PLAYER_2");
    // Only pit 10 has seeds
    for (let i = 7; i <= 13; i++) {
      if (i !== 10) state.pits[i].seeds = 0;
    }

    // Test with mock RNG returning 0.99 (which normally triggers alternative selection)
    const move = selectBeginnerMove(state, "PLAYER_2", { rng: () => 0.99 });
    expect(move).toBe(10);
  });

  it("returns null when no legal moves exist", () => {
    const state = createInitialGame("PLAYER_2", "ai", "beginner", "PLAYER_2");
    for (let i = 7; i <= 13; i++) {
      state.pits[i].seeds = 0;
    }

    const move = selectBeginnerMove(state, "PLAYER_2");
    expect(move).toBeNull();
  });

  it("returns null if game is in a terminal phase", () => {
    const state = createInitialGame("PLAYER_2", "ai", "beginner", "PLAYER_2");
    state.phase = "MATCH_END";

    const move = selectBeginnerMove(state, "PLAYER_2");
    expect(move).toBeNull();
  });
});

describe("Beginner AI - Candidate Move Evaluation (Section 12.B)", () => {
  it("evaluates candidate moves purely without mutating the original state", () => {
    const state = createInitialGame("PLAYER_2", "ai", "beginner", "PLAYER_2");
    const snapshotBefore = JSON.stringify(state);

    const candidates = generateCandidateMoves(state, "PLAYER_2");
    expect(candidates.length).toBeGreaterThan(0);

    const snapshotAfter = JSON.stringify(state);
    expect(snapshotAfter).toBe(snapshotBefore);
    expect(getTotalSeeds(state)).toBe(70);
  });

  it("awards higher score to moves that capture more seeds", () => {
    // Setup a board where pit 7 captures seeds, while pit 8 makes no capture
    const state = createInitialGame("PLAYER_2", "ai", "beginner", "PLAYER_2");
    // Clear board to create specific setup
    for (let i = 0; i < 14; i++) {
      state.pits[i].seeds = 0;
    }

    // Pit 7 has 2 seeds. Sowing from 7 drops in 8 and 9.
    // Destination 9 had 0, now 1. Hand empties in 9.
    // Next open pit after destination 9 is 10 (empty, 0 seeds).
    // Following open pit is 11 (6 seeds) -> CAPTURE 6 SEEDS!
    state.pits[7].seeds = 2;
    state.pits[8].seeds = 0;
    state.pits[9].seeds = 0;
    state.pits[10].seeds = 0;
    state.pits[11].seeds = 6;

    // Put 1 seed in pit 13 (which only drops into 0 with no capture)
    state.pits[13].seeds = 1;

    const cand7 = evaluateCandidateMove(state, 7, "PLAYER_2");
    const cand13 = evaluateCandidateMove(state, 13, "PLAYER_2");

    expect(cand7).not.toBeNull();
    expect(cand13).not.toBeNull();
    expect(cand7!.capturedSeeds).toBe(6);
    expect(cand7!.score).toBeGreaterThan(cand13!.score);
  });

  it("incorporates eligible bonus opportunities into candidate evaluation", () => {
    const state = createInitialGame("PLAYER_2", "ai", "beginner", "PLAYER_2");
    for (let i = 0; i < 14; i++) {
      state.pits[i].seeds = 0;
    }
    // Pit 7 has 1 seed. Pit 8 has 3 seeds.
    // Sowing pit 7 drops into pit 8, bringing pit 8 to exactly 4 seeds -> triggers bonus!
    state.pits[7].seeds = 1;
    state.pits[8].seeds = 3;
    state.pits[13].seeds = 1;

    const cand7 = evaluateCandidateMove(state, 7, "PLAYER_2");
    expect(cand7).not.toBeNull();
    expect(cand7!.bonusOpportunities).toBe(1);
    expect(cand7!.score).toBeGreaterThanOrEqual(DEFAULT_BEGINNER_WEIGHTS.bonusOpportunityWeight);
  });

  it("penalizes moves that create bonuses for the human opponent", () => {
    const state = createInitialGame("PLAYER_2", "ai", "beginner", "PLAYER_2");
    for (let i = 0; i < 14; i++) {
      state.pits[i].seeds = 0;
    }
    // Pit 13 (P2) has 1 seed. Pit 0 (P1 human) has 3 seeds.
    // Sowing pit 13 drops into pit 0, giving human a bonus!
    state.pits[13].seeds = 1;
    state.pits[0].seeds = 3;

    const cand13 = evaluateCandidateMove(state, 13, "PLAYER_2");
    expect(cand13).not.toBeNull();
    expect(cand13!.opponentBonusPenalty).toBe(1);
  });

  it("awards large bonus for immediate match winning move", () => {
    const state = createInitialGame("PLAYER_2", "ai", "beginner", "PLAYER_2");
    for (let i = 0; i < 14; i++) {
      state.pits[i].seeds = 0;
    }
    // Player 2 has 64 seeds in storage. Player 1 has 0.
    state.players.player2.storage = 64;
    state.players.player1.storage = 0;

    // Pit 7 has 2 seeds. Pit 9 has 0. Pit 10 has 0. Pit 11 has 4 seeds.
    // Move from 7 captures 4 seeds from pit 11, bringing P2 to 68 seeds and winning match!
    state.pits[7].seeds = 2;
    state.pits[8].seeds = 0;
    state.pits[9].seeds = 0;
    state.pits[10].seeds = 0;
    state.pits[11].seeds = 4;

    const cand7 = evaluateCandidateMove(state, 7, "PLAYER_2");
    expect(cand7).not.toBeNull();
    expect(cand7!.capturedSeeds).toBe(4);
    expect(cand7!.matchWon).toBe(true);
    expect(cand7!.score).toBeGreaterThanOrEqual(DEFAULT_BEGINNER_WEIGHTS.matchWinWeight);
  });
});

describe("Beginner AI - Balanced Selection and Controlled Randomness (Section 12.C)", () => {
  it("deterministically chooses the optimal capture when rng roll is below bestMoveProbability", () => {
    const state = createInitialGame("PLAYER_2", "ai", "beginner", "PLAYER_2");
    for (let i = 0; i < 14; i++) {
      state.pits[i].seeds = 0;
    }
    // Setup:
    // Move from 7 captures 6 seeds from pit 11 (best move)
    state.pits[7].seeds = 2;
    state.pits[8].seeds = 0;
    state.pits[9].seeds = 0;
    state.pits[10].seeds = 0;
    state.pits[11].seeds = 6;
    // Move from 12 has 1 seed (neutral move)
    state.pits[12].seeds = 1;
    // Move from 13 has 1 seed (neutral move)
    state.pits[13].seeds = 1;

    // Mock RNG: 0.1 (< 0.75 probability threshold)
    const chosen = selectBeginnerMove(state, "PLAYER_2", {
      rng: () => 0.1,
      bestMoveProbability: 0.75,
    });
    expect(chosen).toBe(7);
  });

  it("deterministically chooses an alternative legal move when rng roll is at or above bestMoveProbability", () => {
    const state = createInitialGame("PLAYER_2", "ai", "beginner", "PLAYER_2");
    for (let i = 0; i < 14; i++) {
      state.pits[i].seeds = 0;
    }
    // Move from 7 captures 6 seeds from pit 11
    state.pits[7].seeds = 2;
    state.pits[8].seeds = 0;
    state.pits[9].seeds = 0;
    state.pits[10].seeds = 0;
    state.pits[11].seeds = 6;
    // Legal alternative
    state.pits[12].seeds = 1;

    // Mock RNG: 0.85 (>= 0.75 threshold) -> selects alternative
    const chosen = selectBeginnerMove(state, "PLAYER_2", {
      rng: () => 0.85,
      bestMoveProbability: 0.75,
    });
    expect(chosen).toBe(12);
  });

  it("statistical distribution reflects expected ~75% best move vs ~25% alternative moves", () => {
    const state = createInitialGame("PLAYER_2", "ai", "beginner", "PLAYER_2");
    for (let i = 0; i < 14; i++) {
      state.pits[i].seeds = 0;
    }
    state.pits[7].seeds = 2;
    state.pits[8].seeds = 0;
    state.pits[9].seeds = 0;
    state.pits[10].seeds = 0;
    state.pits[11].seeds = 6; // Pit 7 captures 6 seeds from pit 11
    state.pits[12].seeds = 1;
    state.pits[13].seeds = 1;

    let bestMoveCount = 0;
    const TOTAL_SIMS = 1000;

    // Linear Congruential Generator for reproducible pseudo-random sequence
    let seed = 42;
    const lcgRng = () => {
      seed = (seed * 1664525 + 1013904223) % 4294967296;
      return seed / 4294967296;
    };

    for (let i = 0; i < TOTAL_SIMS; i++) {
      const move = selectBeginnerMove(state, "PLAYER_2", { rng: lcgRng });
      if (move === 7) {
        bestMoveCount++;
      }
    }

    const ratio = bestMoveCount / TOTAL_SIMS;
    // Expected ~0.75 ± 0.05
    expect(ratio).toBeGreaterThan(0.70);
    expect(ratio).toBeLessThan(0.80);
  });
});
