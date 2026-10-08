/**
 * Bonus Lifecycle Engine
 * Strictly follows Phase 1 Specification (Sections 27, 28, 29, 30, Clarification 3)
 */

import { BONUS_CLAIM_SEEDS, isValidPitId } from "./constants";
import type { ActionResult, GameState, Player } from "./types";

export interface ClaimBonusResult {
  pitId: number;
  owner: Player;
  seedsClaimed: number;
}

/**
 * Checks whether a bonus is currently claimable on a specific pit.
 *
 * Requirements (Section 28 & Clarification 3):
 * 1. Pit ID must be valid.
 * 2. Pit must currently have exactly 4 seeds.
 * 3. Pit must have bonusAvailable === true.
 * 4. If claimingPlayer is specified, the pit owner must match claimingPlayer.
 */
export function canClaimBonus(
  state: GameState,
  pitId: number,
  claimingPlayer?: Player
): boolean {
  if (!isValidPitId(pitId)) {
    return false;
  }

  const pit = state.pits[pitId];
  if (!pit) {
    return false;
  }

  if (pit.seeds !== BONUS_CLAIM_SEEDS || !pit.bonusAvailable) {
    return false;
  }

  if (claimingPlayer && pit.owner !== claimingPlayer) {
    return false;
  }

  return true;
}

/**
 * Claims a bonus on a pit.
 *
 * Rules:
 * - Transfers 4 seeds to pit owner's storage.
 * - Sets pit seeds to 0.
 * - Sets pit bonusAvailable to false.
 * - Preserves 70-seed conservation invariant.
 */
export function claimBonus(
  state: GameState,
  pitId: number,
  claimingPlayer?: Player
): ActionResult<ClaimBonusResult> {
  if (!isValidPitId(pitId)) {
    return {
      success: false,
      error: `Invalid pit ID: ${pitId}`,
    };
  }

  const pit = state.pits[pitId];
  if (!pit) {
    return {
      success: false,
      error: `Pit with ID ${pitId} not found`,
    };
  }

  if (claimingPlayer && pit.owner !== claimingPlayer) {
    return {
      success: false,
      error: `Player ${claimingPlayer} does not own pit ${pitId} (owner is ${pit.owner})`,
    };
  }

  if (pit.seeds !== BONUS_CLAIM_SEEDS || !pit.bonusAvailable) {
    return {
      success: false,
      error: `Pit ${pitId} is not eligible for bonus claim (seeds: ${pit.seeds}, bonusAvailable: ${pit.bonusAvailable})`,
    };
  }

  const owner = pit.owner;
  pit.seeds = 0;
  pit.bonusAvailable = false;

  if (owner === "PLAYER_1") {
    state.players.player1.storage += BONUS_CLAIM_SEEDS;
  } else {
    state.players.player2.storage += BONUS_CLAIM_SEEDS;
  }

  return {
    success: true,
    data: {
      pitId,
      owner,
      seedsClaimed: BONUS_CLAIM_SEEDS,
    },
  };
}

/**
 * Returns all pit IDs currently eligible for a bonus claim, optionally filtered by owner.
 */
export function getClaimableBonusPits(
  state: GameState,
  player?: Player
): number[] {
  return state.pits
    .filter((pit) => canClaimBonus(state, pit.id, player))
    .map((pit) => pit.id);
}
