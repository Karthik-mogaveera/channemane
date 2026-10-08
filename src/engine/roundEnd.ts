/**
 * Centralized Round-Ending Detection
 * Strictly follows Phase 1 Specification (Sections 32–37, 46)
 */

import { MIN_SEEDS_FOR_ROUND_CONTINUATION } from "./constants";
import { getTotalBoardSeeds, getPlayerSideSeeds } from "./board";
import type { GameState } from "./types";

export type RoundEndReason =
  | "FEWER_THAN_4_BOARD_SEEDS"
  | "ONE_SIDE_EMPTY_AND_OPPONENT_UNDER_4"
  | null;

/**
 * Authoritative Round-Ending Evaluator (Section 37)
 *
 * The round ends ONLY if one of the following two conditions becomes true:
 *
 * Condition 1 (Section 33):
 * Total board seeds < 4 (strictly less than 4).
 *
 * Condition 2 (Section 34):
 * (Player 1 side === 0 AND Player 2 side < 4)
 * OR
 * (Player 2 side === 0 AND Player 1 side < 4)
 *
 * Crucial Invariants (Section 35 & 36):
 * - One side empty alone does NOT end the round if opponent has >= 4 seeds.
 * - Empty individual pits do NOT mean the side is empty.
 *
 * @param state The current GameState.
 * @returns boolean true if round should transition to settlement.
 */
export function shouldEndRound(state: GameState): boolean {
  const boardSeeds = getTotalBoardSeeds(state);

  // Condition 1: board seeds strictly less than 4
  if (boardSeeds < MIN_SEEDS_FOR_ROUND_CONTINUATION) {
    return true;
  }

  const p1SideSeeds = getPlayerSideSeeds(state, "PLAYER_1");
  const p2SideSeeds = getPlayerSideSeeds(state, "PLAYER_2");

  // Condition 2: One side empty AND opponent side < 4
  if (p1SideSeeds === 0 && p2SideSeeds < MIN_SEEDS_FOR_ROUND_CONTINUATION) {
    return true;
  }

  if (p2SideSeeds === 0 && p1SideSeeds < MIN_SEEDS_FOR_ROUND_CONTINUATION) {
    return true;
  }

  return false;
}

/**
 * Returns the specific reason why a round has ended, or null if the round should continue.
 */
export function getRoundEndReason(state: GameState): RoundEndReason {
  const boardSeeds = getTotalBoardSeeds(state);

  if (boardSeeds < MIN_SEEDS_FOR_ROUND_CONTINUATION) {
    return "FEWER_THAN_4_BOARD_SEEDS";
  }

  const p1SideSeeds = getPlayerSideSeeds(state, "PLAYER_1");
  const p2SideSeeds = getPlayerSideSeeds(state, "PLAYER_2");

  if (
    (p1SideSeeds === 0 && p2SideSeeds < MIN_SEEDS_FOR_ROUND_CONTINUATION) ||
    (p2SideSeeds === 0 && p1SideSeeds < MIN_SEEDS_FOR_ROUND_CONTINUATION)
  ) {
    return "ONE_SIDE_EMPTY_AND_OPPONENT_UNDER_4";
  }

  return null;
}
