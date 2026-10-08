/**
 * Round Settlement Engine
 * Strictly follows Phase 1 Specification (Sections 40, 41, Clarification 6)
 */

import { getPlayerSideSeeds, verifySeedConservation } from "./board";
import type { ActionResult, GameState, Player } from "./types";

export interface RoundSettlementResult {
  player1RemainingTransferred: number;
  player2RemainingTransferred: number;
  player1FinalStorage: number;
  player2FinalStorage: number;
  roundWinner: Player | null;
}

/**
 * Executes round settlement:
 *
 * 1. Counts remaining seeds on each player's side.
 * 2. Transfers P0-P6 remaining seeds to Player 1 storage.
 * 3. Transfers P7-P13 remaining seeds to Player 2 storage.
 * 4. Sets all board pits to 0 seeds and bonusAvailable = false.
 * 5. Verifies 70-seed conservation invariant.
 * 6. Determines round winner (>35 seeds). In case of a 35-35 tie, roundWinner is null.
 * 7. Increments roundWins for the round winner.
 * 8. Sets phase to "ROUND_SETTLEMENT".
 */
export function executeRoundSettlement(
  state: GameState
): ActionResult<RoundSettlementResult> {
  const p1Remaining = getPlayerSideSeeds(state, "PLAYER_1");
  const p2Remaining = getPlayerSideSeeds(state, "PLAYER_2");

  // Transfer remaining seeds to owners
  state.players.player1.storage += p1Remaining;
  state.players.player2.storage += p2Remaining;

  // Clear all pits
  for (const pit of state.pits) {
    pit.seeds = 0;
    pit.bonusAvailable = false;
  }

  // Verify invariant
  if (!verifySeedConservation(state)) {
    return {
      success: false,
      error: "Seed conservation invariant violated during round settlement",
    };
  }

  // Determine round winner
  let roundWinner: Player | null = null;
  if (state.players.player1.storage > state.players.player2.storage) {
    roundWinner = "PLAYER_1";
    state.players.player1.roundWins += 1;
  } else if (state.players.player2.storage > state.players.player1.storage) {
    roundWinner = "PLAYER_2";
    state.players.player2.roundWins += 1;
  }

  state.roundWinner = roundWinner;
  state.phase = "ROUND_SETTLEMENT";
  state.turnPhase = "TURN_END";

  return {
    success: true,
    data: {
      player1RemainingTransferred: p1Remaining,
      player2RemainingTransferred: p2Remaining,
      player1FinalStorage: state.players.player1.storage,
      player2FinalStorage: state.players.player2.storage,
      roundWinner,
    },
  };
}
