/**
 * Authoritative Channemane Game Constants
 * Strictly follows Phase 1 Specification (Sections 12, 13, 16, 27-29, 33-34, 45)
 */

export const TOTAL_PITS = 14;
export const PITS_PER_PLAYER = 7;
export const TOTAL_SEEDS = 70;
export const INITIAL_SEEDS_PER_PIT = 5;

export const MAX_PAIRS = 7;

/**
 * Threshold at which a pit becomes eligible for bonus (3 -> 4)
 */
export const BONUS_THRESHOLD = 4;

/**
 * Threshold at which an unclaimed bonus expires (4 -> 5)
 */
export const BONUS_EXPIRATION_THRESHOLD = 5;

/**
 * Number of seeds awarded when a bonus is claimed
 */
export const BONUS_CLAIM_SEEDS = 4;

/**
 * Minimum board seeds required for a round to continue.
 * If total seeds on board < 4, the round ends.
 */
export const MIN_SEEDS_FOR_ROUND_CONTINUATION = 4;

/**
 * Minimum storage seeds required to be eligible to play the next round.
 * If a player has < 5 seeds, they cannot fill a single pit, losing the match.
 */
export const MIN_STORAGE_FOR_MATCH_ELIGIBILITY = 5;

/**
 * Authoritative Opposite Pairs (Section 13)
 * Do not alter this mapping.
 */
export const OPPOSITE_PAIRS = [
  [0, 13],
  [1, 12],
  [2, 11],
  [3, 10],
  [4, 9],
  [5, 8],
  [6, 7],
] as const;

/**
 * Player 1 owned pit indices: P0 to P6
 */
export const PLAYER_1_PITS = [0, 1, 2, 3, 4, 5, 6] as const;

/**
 * Player 2 owned pit indices: P7 to P13
 */
export const PLAYER_2_PITS = [7, 8, 9, 10, 11, 12, 13] as const;

/**
 * Check if a pit ID is valid (0 to 13 inclusive integer)
 */
export function isValidPitId(pitId: number): boolean {
  return Number.isInteger(pitId) && pitId >= 0 && pitId < TOTAL_PITS;
}

/**
 * Determine the owner of a given pit ID ("PLAYER_1" | "PLAYER_2" | null)
 */
export function getPitOwner(pitId: number): "PLAYER_1" | "PLAYER_2" | null {
  if (!isValidPitId(pitId)) {
    return null;
  }
  return pitId < PITS_PER_PLAYER ? "PLAYER_1" : "PLAYER_2";
}

/**
 * Lookup the opposite pit for a given pit ID.
 * Returns null if the pit ID is out of range.
 */
export function getOppositePit(pitId: number): number | null {
  if (!isValidPitId(pitId)) {
    return null;
  }
  for (const [p1, p2] of OPPOSITE_PAIRS) {
    if (p1 === pitId) return p2;
    if (p2 === pitId) return p1;
  }
  return null;
}
