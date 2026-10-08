/**
 * Capture Engine
 * Strictly follows Phase 1 Specification (Section 26, Clarifications 2 & 4)
 */

import { getNextOpenPit, getFollowingOpenPit } from "./traversal";
import type { GameState } from "./types";

export interface CaptureResult {
  nextOpenPitId: number | null;
  capturedPitId: number | null;
  capturedSeeds: number;
}

/**
 * Evaluates and executes capture after continuous sowing halts.
 *
 * Rules:
 * 1. Find the next OPEN pit after finalDestinationPit.
 * 2. If it is empty (seeds === 0):
 *    - Inspect the following OPEN pit (2 open steps ahead of destination).
 *    - If that pit contains seeds (> 0):
 *      - Capture all seeds.
 *      - Add them to currentPlayer's storage.
 *      - Add them to currentPlayer's roundCaptured stat.
 *      - Set captured pit seeds to 0 and bonusAvailable to false.
 *    - If following pit is empty or doesn't exist: capture = 0.
 * 3. Pure positional traversal (Clarification 2): Seeds can be captured from either player's side.
 * 4. Strictly single capture (Clarification 4): Exactly one capture evaluation is performed.
 * 5. CLOSED pits are completely ignored and never captured.
 *
 * @param state The current GameState (mutated in place).
 * @param finalDestinationPit The pit ID where the last seed was placed.
 * @returns CaptureResult
 */
export function evaluateAndExecuteCapture(
  state: GameState,
  finalDestinationPit: number
): CaptureResult {
  const nextOpenId = getNextOpenPit(finalDestinationPit, state.pits);

  // If there is no next open pit or it is NOT empty, no capture occurs
  if (nextOpenId === null || state.pits[nextOpenId].seeds > 0) {
    return {
      nextOpenPitId: nextOpenId,
      capturedPitId: null,
      capturedSeeds: 0,
    };
  }

  // Next open pit is empty! Inspect the following open pit (Section 26)
  const followingOpenId = getFollowingOpenPit(finalDestinationPit, state.pits);

  if (followingOpenId === null) {
    return {
      nextOpenPitId: nextOpenId,
      capturedPitId: null,
      capturedSeeds: 0,
    };
  }

  const followingPit = state.pits[followingOpenId];
  const seedsToCapture = followingPit.seeds;

  if (seedsToCapture > 0) {
    // Perform capture transfer
    followingPit.seeds = 0;
    followingPit.bonusAvailable = false;

    if (state.currentPlayer === "PLAYER_1") {
      state.players.player1.storage += seedsToCapture;
      state.players.player1.roundCaptured += seedsToCapture;
    } else {
      state.players.player2.storage += seedsToCapture;
      state.players.player2.roundCaptured += seedsToCapture;
    }

    return {
      nextOpenPitId: nextOpenId,
      capturedPitId: followingOpenId,
      capturedSeeds: seedsToCapture,
    };
  }

  return {
    nextOpenPitId: nextOpenId,
    capturedPitId: null,
    capturedSeeds: 0,
  };
}
