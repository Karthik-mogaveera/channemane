import { describe, it, expect } from "vitest";
import {
  TOTAL_PITS,
  PITS_PER_PLAYER,
  TOTAL_SEEDS,
  INITIAL_SEEDS_PER_PIT,
  BONUS_THRESHOLD,
  BONUS_EXPIRATION_THRESHOLD,
  BONUS_CLAIM_SEEDS,
  MIN_SEEDS_FOR_ROUND_CONTINUATION,
  MIN_STORAGE_FOR_MATCH_ELIGIBILITY,
  MAX_PAIRS,
  OPPOSITE_PAIRS,
  PLAYER_1_PITS,
  PLAYER_2_PITS,
  getOppositePit,
  getPitOwner,
  isValidPitId,
} from "../src/engine/constants";

describe("TASK-02: Game Constants and Opposite Pairs", () => {
  describe("Authoritative Board Constants", () => {
    it("should have exactly 14 total pits and 7 pits per player", () => {
      expect(TOTAL_PITS).toBe(14);
      expect(PITS_PER_PLAYER).toBe(7);
      expect(MAX_PAIRS).toBe(7);
    });

    it("should have exactly 70 total seeds and 5 seeds per pit initially", () => {
      expect(TOTAL_SEEDS).toBe(70);
      expect(INITIAL_SEEDS_PER_PIT).toBe(5);
      expect(TOTAL_PITS * INITIAL_SEEDS_PER_PIT).toBe(TOTAL_SEEDS);
    });

    it("should have correct bonus and round thresholds", () => {
      expect(BONUS_THRESHOLD).toBe(4);
      expect(BONUS_EXPIRATION_THRESHOLD).toBe(5);
      expect(BONUS_CLAIM_SEEDS).toBe(4);
      expect(MIN_SEEDS_FOR_ROUND_CONTINUATION).toBe(4);
      expect(MIN_STORAGE_FOR_MATCH_ELIGIBILITY).toBe(5);
    });
  });

  describe("Player Pit Ownership Ranges", () => {
    it("should assign P0-P6 to Player 1", () => {
      expect(PLAYER_1_PITS).toEqual([0, 1, 2, 3, 4, 5, 6]);
      for (const pitId of PLAYER_1_PITS) {
        expect(getPitOwner(pitId)).toBe("PLAYER_1");
      }
    });

    it("should assign P7-P13 to Player 2", () => {
      expect(PLAYER_2_PITS).toEqual([7, 8, 9, 10, 11, 12, 13]);
      for (const pitId of PLAYER_2_PITS) {
        expect(getPitOwner(pitId)).toBe("PLAYER_2");
      }
    });

    it("should reject invalid pit IDs when determining owner", () => {
      expect(getPitOwner(-1)).toBeNull();
      expect(getPitOwner(14)).toBeNull();
      expect(getPitOwner(99)).toBeNull();
    });
  });

  describe("Opposite Pairs Specification (Section 13)", () => {
    it("should contain exactly 7 pairs matching the specification", () => {
      expect(OPPOSITE_PAIRS.length).toBe(7);
      expect(OPPOSITE_PAIRS).toEqual([
        [0, 13],
        [1, 12],
        [2, 11],
        [3, 10],
        [4, 9],
        [5, 8],
        [6, 7],
      ]);
    });

    it("should verify getOppositePit works symmetrically for all 14 pits", () => {
      const expectedPairs: [number, number][] = [
        [0, 13],
        [1, 12],
        [2, 11],
        [3, 10],
        [4, 9],
        [5, 8],
        [6, 7],
      ];

      for (const [p1, p2] of expectedPairs) {
        expect(getOppositePit(p1)).toBe(p2);
        expect(getOppositePit(p2)).toBe(p1);
      }
    });

    it("should return null for out-of-range pit IDs", () => {
      expect(getOppositePit(-1)).toBeNull();
      expect(getOppositePit(14)).toBeNull();
      expect(getOppositePit(100)).toBeNull();
    });
  });

  describe("Pit Validity Checker", () => {
    it("should validate legal pit IDs (0 to 13)", () => {
      for (let i = 0; i < 14; i++) {
        expect(isValidPitId(i)).toBe(true);
      }
    });

    it("should invalidate non-integer or out-of-range IDs", () => {
      expect(isValidPitId(-1)).toBe(false);
      expect(isValidPitId(14)).toBe(false);
      expect(isValidPitId(3.5)).toBe(false);
      expect(isValidPitId(NaN)).toBe(false);
    });
  });
});
