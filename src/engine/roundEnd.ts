/**
 * Centralized Round-Ending Detection
 * Strictly follows Phase 1 Specification (Sections 32–37, 46)
 */

import { MIN_SEEDS_FOR_ROUND_CONTINUATION } from "./constants";
import { getPlayerSideSeeds } from "./board";
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
 * Calculate:
 * - Player 1 side: sum of seeds in pits P0–P6.
 * - Player 2 side: sum of seeds in pits P7–P13.
 * - Total board seeds: Player 1 side total + Player 2 side total.
 *
 * Condition:
 * totalBoardSeeds < 4
 *
 * If this condition is true, the round must end. If the total is exactly 4 or greater,
 * this condition must not end the round.
 *
 * Invariants:
 * - Depends only on the total number of seeds remaining on the board.
 * - Does not require either player's side to be empty.
 * - Does not require seeds to be distributed in any particular way.
 * - Does not depend on currentPlayer or individual pit counts.
 * - Mid-sowing hands (seedsInHand > 0) are protected from mid-hand interruption.
 *
 * @param state The current GameState.
 * @returns boolean true if round should transition to settlement.
 */
export function shouldEndRound(state: GameState): boolean {
  // If seeds are actively held in hand mid-sowing, the round does not end mid-hand
  if (state.seedsInHand > 0) {
    return false;
  }

  const p1SideSeeds = getPlayerSideSeeds(state, "PLAYER_1");
  const p2SideSeeds = getPlayerSideSeeds(state, "PLAYER_2");
  const totalBoardSeeds = p1SideSeeds + p2SideSeeds;

  // Strict < 4 comparison
  return totalBoardSeeds < MIN_SEEDS_FOR_ROUND_CONTINUATION;
}

/**
 * Returns the specific reason why a round has ended, or null if the round should continue.
 */
export function getRoundEndReason(state: GameState): RoundEndReason {
  const p1SideSeeds = getPlayerSideSeeds(state, "PLAYER_1");
  const p2SideSeeds = getPlayerSideSeeds(state, "PLAYER_2");
  const totalBoardSeeds = p1SideSeeds + p2SideSeeds;

  if (totalBoardSeeds < MIN_SEEDS_FOR_ROUND_CONTINUATION) {
    return "FEWER_THAN_4_BOARD_SEEDS";
  }

  return null;
}
