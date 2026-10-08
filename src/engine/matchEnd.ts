/**
 * Match-End Detection Engine
 * Strictly follows Phase 1 Specification (Sections 45, 54)
 */

import { MIN_STORAGE_FOR_MATCH_ELIGIBILITY } from "./constants";
import type { GameState, Player } from "./types";

export interface MatchEndResult {
  isMatchEnd: boolean;
  winner: Player | null;
  loser: Player | null;
  reason: string | null;
}

/**
 * Checks if the match has reached terminal state after round settlement.
 * A player cannot participate in the next round if they have fewer than 5 seeds in storage.
 */
export function isMatchOver(state: GameState): boolean {
  return (
    state.players.player1.storage < MIN_STORAGE_FOR_MATCH_ELIGIBILITY ||
    state.players.player2.storage < MIN_STORAGE_FOR_MATCH_ELIGIBILITY
  );
}

/**
 * Evaluates and transitions the game state if match-end condition is met.
 *
 * Rules (Section 45 & 54):
 * - If storage < 5, openPairs === 0.
 * - That player loses the match.
 * - Opponent is declared winner.
 * - State phase transitions to "MATCH_END".
 */
export function checkAndHandleMatchEnd(state: GameState): MatchEndResult {
  const p1Storage = state.players.player1.storage;
  const p2Storage = state.players.player2.storage;

  const p1CanPlay = p1Storage >= MIN_STORAGE_FOR_MATCH_ELIGIBILITY;
  const p2CanPlay = p2Storage >= MIN_STORAGE_FOR_MATCH_ELIGIBILITY;

  if (!p1CanPlay && !p2CanPlay) {
    // Both under 5 (theoretically rare, e.g. tie if thresholds violated)
    state.phase = "MATCH_END";
    state.winner = null;
    return {
      isMatchEnd: true,
      winner: null,
      loser: null,
      reason: "Both players have fewer than 5 seeds in storage",
    };
  }

  if (!p2CanPlay) {
    state.phase = "MATCH_END";
    state.winner = "PLAYER_1";
    return {
      isMatchEnd: true,
      winner: "PLAYER_1",
      loser: "PLAYER_2",
      reason: `PLAYER_2 has only ${p2Storage} seeds (fewer than 5) and cannot open any pits`,
    };
  }

  if (!p1CanPlay) {
    state.phase = "MATCH_END";
    state.winner = "PLAYER_2";
    return {
      isMatchEnd: true,
      winner: "PLAYER_2",
      loser: "PLAYER_1",
      reason: `PLAYER_1 has only ${p1Storage} seeds (fewer than 5) and cannot open any pits`,
    };
  }

  return {
    isMatchEnd: false,
    winner: null,
    loser: null,
    reason: null,
  };
}
