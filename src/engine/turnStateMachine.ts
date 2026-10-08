/**
 * Explicit Turn State Machine Engine
 * Strictly follows Phase 2 Specification (PH2-T11)
 */

import type { ActionResult, GameState, TurnPhase } from "./types";

/**
 * Authoritative mapping of legal state transitions for TurnPhase:
 * PLAYER_TURN -> PIT_SELECTED -> SOWING -> CONTINUOUS_SOWING -> CAPTURE_CHECK -> TURN_END -> PLAYER_TURN
 */
export const ALLOWED_TURN_TRANSITIONS: Record<TurnPhase, readonly TurnPhase[]> = {
  PLAYER_TURN: ["PIT_SELECTED", "TURN_END"],
  PIT_SELECTED: ["SOWING", "TURN_END"],
  SOWING: ["CONTINUOUS_SOWING", "CAPTURE_CHECK", "TURN_END"],
  CONTINUOUS_SOWING: ["SOWING", "CONTINUOUS_SOWING", "CAPTURE_CHECK", "TURN_END"],
  CAPTURE_CHECK: ["TURN_END"],
  TURN_END: ["PLAYER_TURN"],
} as const;

/**
 * Evaluates whether a proposed TurnPhase transition is legal.
 */
export function canTransitionTurnPhase(
  from: TurnPhase,
  to: TurnPhase
): boolean {
  const allowed = ALLOWED_TURN_TRANSITIONS[from];
  return allowed ? allowed.includes(to) : false;
}

/**
 * Safely transitions state.turnPhase if the transition is legal.
 * Rejects illegal transitions and prevents corrupted state.
 */
export function transitionTurnPhase(
  state: GameState,
  targetPhase: TurnPhase
): ActionResult<TurnPhase> {
  const current = state.turnPhase;
  if (!canTransitionTurnPhase(current, targetPhase)) {
    return {
      success: false,
      error: `Illegal turn phase transition: cannot move from ${current} to ${targetPhase}`,
    };
  }

  state.turnPhase = targetPhase;
  return {
    success: true,
    data: targetPhase,
  };
}
