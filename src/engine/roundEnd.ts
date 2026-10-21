/**
 * Centralized Round-Ending Detection
 * Strictly follows Phase 1 Specification (Sections 32–37, 46)
 */

import { MIN_SEEDS_FOR_ROUND_CONTINUATION } from "./constants";
import { getTotalBoardSeeds } from "./board";
import type { GameState } from "./types";

export type RoundEndReason =
  | "FEWER_THAN_4_BOARD_SEEDS"
  | "ONE_SIDE_EMPTY_AND_OPPONENT_UNDER_4"
  | null;

/**
 * Authoritative Round-Ending Evaluator
 *
 * Mandatory rule:
 * The round must end whenever the total number of seeds remaining on the board is strictly less than 4.
 *
 * Condition:
 * totalBoardSeeds < 4
 */
export function shouldEndRound(state: GameState): boolean {
  // If seeds are actively held in hand mid-sowing, the round does not end mid-hand
  if (state.seedsInHand > 0) {
    return false;
  }

  const totalBoardSeeds = getTotalBoardSeeds(state);

  // Strict < 4 comparison
  return totalBoardSeeds < MIN_SEEDS_FOR_ROUND_CONTINUATION;
}

/**
 * Returns the specific reason why a round has ended, or null if the round should continue.
 */
export function getRoundEndReason(state: GameState): RoundEndReason {
  const totalBoardSeeds = getTotalBoardSeeds(state);

  if (totalBoardSeeds < MIN_SEEDS_FOR_ROUND_CONTINUATION) {
    return "FEWER_THAN_4_BOARD_SEEDS";
  }

  return null;
}
