/**
 * Bonus Lifecycle Engine
 * Strictly follows Phase 1 Specification (Sections 27, 28, 29, 30, Clarification 3)
 */

import { BONUS_CLAIM_SEEDS, isValidPitId } from "./constants";
import type { ActionResult, GameState, Player } from "./types";
import { shouldEndRound } from "./roundEnd";
import { executeRoundSettlement, type RoundSettlementResult } from "./settlement";
import { checkAndHandleMatchEnd, type MatchEndResult } from "./matchEnd";
import { hasAnyValidMove } from "./selection";

export interface ClaimBonusResult {
  pitId: number;
  owner: Player;
  seedsClaimed: number;
  roundEnded: boolean;
  roundSettlement?: RoundSettlementResult;
  matchEnded: boolean;
  matchResult?: MatchEndResult;
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
  if (state.phase === "ROUND_SETTLEMENT" || state.phase === "MATCH_END") {
    return false;
  }

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
 * - Evaluates round-ending conditions (Issue 1).
 * - Preserves 70-seed conservation invariant.
 */
export function claimBonus(
  state: GameState,
  pitId: number,
  claimingPlayer?: Player
): ActionResult<ClaimBonusResult> {
  if (state.phase === "ROUND_SETTLEMENT" || state.phase === "MATCH_END") {
    return {
      success: false,
      error: `Cannot claim bonus: game is already in phase ${state.phase}`,
    };
  }

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

  // Check round-ending conditions after bonus collection (Issue 1)
  let roundEnded = false;
  let roundSettlement: RoundSettlementResult | undefined;
  let matchEnded = false;
  let matchResult: MatchEndResult | undefined;

  if (shouldEndRound(state)) {
    roundEnded = true;
    const settlementOutcome = executeRoundSettlement(state);
    if (settlementOutcome.success) {
      roundSettlement = settlementOutcome.data;
    }
    matchResult = checkAndHandleMatchEnd(state);
    matchEnded = matchResult.isMatchEnd;
  } else {
    // If active player now has no valid moves because of bonus claim, check auto-pass
    if (!hasAnyValidMove(state, state.currentPlayer)) {
      const opponent: Player =
        state.currentPlayer === "PLAYER_1" ? "PLAYER_2" : "PLAYER_1";
      if (hasAnyValidMove(state, opponent)) {
        state.currentPlayer = opponent;
      }
    }
  }

  return {
    success: true,
    data: {
      pitId,
      owner,
      seedsClaimed: BONUS_CLAIM_SEEDS,
      roundEnded,
      roundSettlement,
      matchEnded,
      matchResult,
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
