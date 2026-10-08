import { describe, it, expect } from "vitest";
import { ChannemaneGame } from "../src/engine/simulation";
import { verifySeedConservation, getTotalSeeds } from "../src/engine/board";

/**
 * Deterministic PRNG (Mulberry32) as required by Phase 2 Section 18
 * Guarantees 100% reproducible property tests across platforms.
 */
function createDeterministicRng(seed: number) {
  let s = seed >>> 0;
  return function next(): number {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

describe("PH2-T16: Property & Seed Conservation Invariant Tests (Deterministic PRNG)", () => {
  it("should maintain totalSeeds === 70 continuously across 500 consecutive deterministic turns", () => {
    const SEED = 0xca11ab1e;
    const rng = createDeterministicRng(SEED);
    const game = new ChannemaneGame("PLAYER_1");

    for (let step = 0; step < 500; step++) {
      const state = game.getState();
      expect(getTotalSeeds(state), `Invariant failed at step ${step} with seed ${SEED}`).toBe(70);
      expect(verifySeedConservation(state)).toBe(true);

      if (game.isGameOver()) {
        break;
      }

      if (game.isRoundOver()) {
        const roundRes = game.startNextRound();
        if (!roundRes.success) {
          break;
        }
        expect(verifySeedConservation(game.getState())).toBe(true);
        continue;
      }

      // Claim any available bonuses
      const bonuses = game.getClaimableBonuses();
      for (const b of bonuses) {
        game.claimBonus(b);
        expect(verifySeedConservation(game.getState())).toBe(true);
      }

      const legalPits = game.getSelectablePits();
      if (legalPits.length === 0) {
        break;
      }

      // Pick pit deterministically using PRNG
      const chosenIndex = Math.floor(rng() * legalPits.length);
      const chosenPit = legalPits[chosenIndex];

      const moveRes = game.selectPit(chosenPit);
      expect(moveRes.success).toBe(true);
      expect(verifySeedConservation(game.getState()), `Failed conservation after move at step ${step}`).toBe(true);
    }
  });
});
