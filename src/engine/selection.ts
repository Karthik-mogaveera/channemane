/**
 * Pit Selection Validation
 * Strictly follows Phase 1 Specification (Section 22)
 */

import { isValidPitId } from "./constants";
import type { ActionResult, GameState, Player } from "./types";

/**
 * Validates whether a pit selection by the current player is legal.
 *
 * Rules (Section 22):
 * 1. Game must be playable (phase === "PLAYING").
 * 2. It must be the player's turn to select a pit (turnPhase === "PLAYER_TURN").
 * 3. Pit ID must be valid (0 to 13).
 * 4. Pit must belong to the currentPlayer.
 * 5. Pit must be OPEN (cannot select a CLOSED pit).
 * 6. Pit must contain at least one seed (cannot select an empty pit).
 *
 * Invalid selections must not mutate state.
 */
export function validatePitSelection(
  state: GameState,
  pitId: number
): ActionResult<number> {
  if (state.phase !== "PLAYING") {
    return {
      success: false,
      error: `Game is not playable (current phase: ${state.phase})`,
    };
  }

  if (state.turnPhase !== "PLAYER_TURN") {
    return {
      success: false,
      error: `Engine is not waiting for pit selection (current turn phase: ${state.turnPhase})`,
    };
  }

  if (!isValidPitId(pitId)) {
    return {
      success: false,
      error: `Invalid pit ID: ${pitId}. Must be an integer between 0 and 13.`,
    };
  }

  const pit = state.pits[pitId];
  if (!pit) {
    return {
      success: false,
      error: `Pit with ID ${pitId} not found`,
    };
  }

  if (pit.owner !== state.currentPlayer) {
    return {
      success: false,
      error: `Pit ${pitId} belongs to ${pit.owner} and does not belong to current player ${state.currentPlayer}`,
    };
  }

  if (pit.status === "CLOSED") {
    return {
      success: false,
      error: `Pit ${pitId} is CLOSED and cannot be selected`,
    };
  }

  if (pit.seeds <= 0) {
    return {
      success: false,
      error: `Pit ${pitId} is empty (0 seeds) and cannot be selected`,
    };
  }

  return {
    success: true,
    data: pitId,
  };
}

/**
 * Convenience helper returning boolean if a pit can be legally selected.
 */
export function canSelectPit(state: GameState, pitId: number): boolean {
  return validatePitSelection(state, pitId).success;
}

/**
 * Returns all pit IDs on the board that can currently be legally selected by currentPlayer.
 */
export function getSelectablePits(state: GameState): number[] {
  if (state.phase !== "PLAYING" || state.turnPhase !== "PLAYER_TURN") {
    return [];
  }

  return state.pits
    .filter(
      (pit) =>
        pit.owner === state.currentPlayer &&
        pit.status === "OPEN" &&
        pit.seeds > 0
    )
    .map((pit) => pit.id);
}

/**
 * Determines whether a player has at least one legal move available on their side.
 */
export function hasAnyValidMove(
  state: GameState,
  player: Player = state.currentPlayer
): boolean {
  return state.pits.some(
    (pit) => pit.owner === player && pit.status === "OPEN" && pit.seeds > 0
  );
}
