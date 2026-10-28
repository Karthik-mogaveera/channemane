/**
 * Authoritative Channemane Game Constants
 * Strictly follows Phase 1 Specification (Sections 12, 13, 16, 27-29, 33-34, 45)
 */

import type { Player } from "./types";

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
 * 3-Player Board Constants (15 pits, 5 per player, 75 seeds total)
 */
export const THREE_PLAYER_TOTAL_PITS = 15;
export const THREE_PLAYER_PITS_PER_PLAYER = 5;
export const THREE_PLAYER_TOTAL_SEEDS = 75;
export const THREE_PLAYER_RECOVERY_SEEDS = 50;

export const THREE_PLAYER_P1_PITS = [0, 1, 2, 3, 4] as const;
export const THREE_PLAYER_P2_PITS = [5, 6, 7, 8, 9] as const;
export const THREE_PLAYER_P3_PITS = [10, 11, 12, 13, 14] as const;

/**
 * Section 11 Authoritative Pair-wise Pit Groups
 */
export const THREE_PLAYER_GROUPS_ALL = [
  [0, 9, 10],
  [1, 8, 11],
  [2, 7, 12],
  [3, 6, 13],
  [4, 5, 14],
] as const;

export const THREE_PLAYER_GROUPS_P1_DISQUALIFIED = [
  [9, 10],
  [8, 11],
  [7, 12],
  [6, 13],
  [5, 14],
] as const;

export const THREE_PLAYER_GROUPS_P2_DISQUALIFIED = [
  [0, 10],
  [1, 11],
  [2, 12],
  [3, 13],
  [4, 14],
] as const;

export const THREE_PLAYER_GROUPS_P3_DISQUALIFIED = [
  [0, 9],
  [1, 8],
  [2, 7],
  [3, 6],
  [4, 5],
] as const;

/**
 * 4-Player Board Constants (16 pits, 4 per player, 80 seeds total)
 */
export const FOUR_PLAYER_TOTAL_PITS = 16;
export const FOUR_PLAYER_PITS_PER_PLAYER = 4;
export const FOUR_PLAYER_TOTAL_SEEDS = 80;
export const FOUR_PLAYER_FIRST_ELIMINATION_SEEDS = 60;
export const FOUR_PLAYER_SECOND_ELIMINATION_SEEDS = 40;

export const FOUR_PLAYER_P1_PITS = [0, 1, 2, 3] as const;
export const FOUR_PLAYER_P2_PITS = [4, 5, 6, 7] as const;
export const FOUR_PLAYER_P3_PITS = [8, 9, 10, 11] as const;
export const FOUR_PLAYER_P4_PITS = [12, 13, 14, 15] as const;

/**
 * Section 6 Authoritative Pit-Group Mappings (Images 1 & 2)
 */

// A. All four players active
export const FOUR_PLAYER_GROUPS_ALL = [
  [0, 4, 11, 15],
  [1, 5, 10, 14],
  [2, 6, 9, 13],
  [3, 7, 8, 12],
] as const;

// B. Player 1 disqualified
export const FOUR_PLAYER_GROUPS_P1_DISQUALIFIED = [
  [4, 11, 15],
  [5, 10, 14],
  [6, 9, 13],
  [7, 8, 12],
] as const;

// C. Player 2 disqualified
export const FOUR_PLAYER_GROUPS_P2_DISQUALIFIED = [
  [0, 11, 15],
  [1, 10, 14],
  [2, 9, 13],
  [3, 8, 12],
] as const;

// D. Player 3 disqualified
export const FOUR_PLAYER_GROUPS_P3_DISQUALIFIED = [
  [0, 4, 15],
  [1, 5, 14],
  [2, 6, 13],
  [3, 7, 12],
] as const;

// E. Player 4 disqualified
export const FOUR_PLAYER_GROUPS_P4_DISQUALIFIED = [
  [0, 4, 11],
  [1, 5, 10],
  [2, 6, 9],
  [3, 7, 8],
] as const;

// F. Players 3 and 4 disqualified
export const FOUR_PLAYER_GROUPS_P3_P4_DISQUALIFIED = [
  [0, 4],
  [1, 5],
  [2, 6],
  [3, 7],
] as const;

// G. Players 1 and 2 disqualified
export const FOUR_PLAYER_GROUPS_P1_P2_DISQUALIFIED = [
  [15, 11],
  [14, 10],
  [13, 9],
  [12, 8],
] as const;

// H. Players 1 and 3 disqualified
export const FOUR_PLAYER_GROUPS_P1_P3_DISQUALIFIED = [
  [4, 15],
  [5, 14],
  [6, 13],
  [7, 12],
] as const;

// I. Players 1 and 4 disqualified
export const FOUR_PLAYER_GROUPS_P1_P4_DISQUALIFIED = [
  [4, 11],
  [5, 10],
  [6, 9],
  [7, 8],
] as const;

// J. Players 2 and 3 disqualified
export const FOUR_PLAYER_GROUPS_P2_P3_DISQUALIFIED = [
  [0, 15],
  [1, 14],
  [2, 13],
  [3, 12],
] as const;

// K. Players 2 and 4 disqualified
export const FOUR_PLAYER_GROUPS_P2_P4_DISQUALIFIED = [
  [0, 11],
  [1, 10],
  [2, 9],
  [3, 8],
] as const;

/**
 * Check if a pit ID is valid (0 to maxPits - 1 integer)
 */
export function isValidPitId(pitId: number, maxPits: number = TOTAL_PITS): boolean {
  return Number.isInteger(pitId) && pitId >= 0 && pitId < maxPits;
}

/**
 * Determine the owner of a given pit ID ("PLAYER_1" | "PLAYER_2" | "PLAYER_3" | "PLAYER_4" | null)
 */
export function getPitOwner(pitId: number, maxPits: number = TOTAL_PITS): Player | null {
  if (!isValidPitId(pitId, maxPits)) {
    return null;
  }
  if (maxPits === FOUR_PLAYER_TOTAL_PITS) {
    if (pitId >= 0 && pitId <= 3) return "PLAYER_1";
    if (pitId >= 4 && pitId <= 7) return "PLAYER_2";
    if (pitId >= 8 && pitId <= 11) return "PLAYER_3";
    if (pitId >= 12 && pitId <= 15) return "PLAYER_4";
    return null;
  }
  if (maxPits === THREE_PLAYER_TOTAL_PITS) {
    if (pitId >= 0 && pitId <= 4) return "PLAYER_1";
    if (pitId >= 5 && pitId <= 9) return "PLAYER_2";
    if (pitId >= 10 && pitId <= 14) return "PLAYER_3";
    return null;
  }
  return pitId < PITS_PER_PLAYER ? "PLAYER_1" : "PLAYER_2";
}

/**
 * Convenience helper for 3-player pit ownership
 */
export function getThreePlayerPitOwner(pitId: number): Player | null {
  return getPitOwner(pitId, THREE_PLAYER_TOTAL_PITS);
}

/**
 * Convenience helper for 4-player pit ownership
 */
export function getFourPlayerPitOwner(pitId: number): Player | null {
  return getPitOwner(pitId, FOUR_PLAYER_TOTAL_PITS);
}

/**
 * Returns the pair-wise pit group mapping based on currently disqualified players (3-player mode)
 */
export function getThreePlayerGroups(disqualified: readonly Player[] = []): readonly (readonly number[])[] {
  const isP1Dis = disqualified.includes("PLAYER_1");
  const isP2Dis = disqualified.includes("PLAYER_2");
  const isP3Dis = disqualified.includes("PLAYER_3");

  if (isP1Dis && !isP2Dis && !isP3Dis) return THREE_PLAYER_GROUPS_P1_DISQUALIFIED;
  if (isP2Dis && !isP1Dis && !isP3Dis) return THREE_PLAYER_GROUPS_P2_DISQUALIFIED;
  if (isP3Dis && !isP1Dis && !isP2Dis) return THREE_PLAYER_GROUPS_P3_DISQUALIFIED;
  return THREE_PLAYER_GROUPS_ALL;
}

/**
 * Returns the authoritative pit group mapping based on currently disqualified players (4-player mode)
 * Follows exact mappings A through K from Images 1 & 2.
 */
export function getFourPlayerGroups(disqualified: readonly Player[] = []): readonly (readonly number[])[] {
  const isP1Dis = disqualified.includes("PLAYER_1");
  const isP2Dis = disqualified.includes("PLAYER_2");
  const isP3Dis = disqualified.includes("PLAYER_3");
  const isP4Dis = disqualified.includes("PLAYER_4");

  const disCount = (isP1Dis ? 1 : 0) + (isP2Dis ? 1 : 0) + (isP3Dis ? 1 : 0) + (isP4Dis ? 1 : 0);

  // Two players disqualified
  if (disCount >= 2) {
    if (isP3Dis && isP4Dis) return FOUR_PLAYER_GROUPS_P3_P4_DISQUALIFIED;
    if (isP1Dis && isP2Dis) return FOUR_PLAYER_GROUPS_P1_P2_DISQUALIFIED;
    if (isP1Dis && isP3Dis) return FOUR_PLAYER_GROUPS_P1_P3_DISQUALIFIED;
    if (isP1Dis && isP4Dis) return FOUR_PLAYER_GROUPS_P1_P4_DISQUALIFIED;
    if (isP2Dis && isP3Dis) return FOUR_PLAYER_GROUPS_P2_P3_DISQUALIFIED;
    if (isP2Dis && isP4Dis) return FOUR_PLAYER_GROUPS_P2_P4_DISQUALIFIED;
  }

  // Single player disqualified
  if (disCount === 1) {
    if (isP1Dis) return FOUR_PLAYER_GROUPS_P1_DISQUALIFIED;
    if (isP2Dis) return FOUR_PLAYER_GROUPS_P2_DISQUALIFIED;
    if (isP3Dis) return FOUR_PLAYER_GROUPS_P3_DISQUALIFIED;
    if (isP4Dis) return FOUR_PLAYER_GROUPS_P4_DISQUALIFIED;
  }

  // All four players active
  return FOUR_PLAYER_GROUPS_ALL;
}

/**
 * Lookup the opposite pit for a given pit ID (2-player mode).
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
