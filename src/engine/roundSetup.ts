/**
 * Round Setup & Paired Closure Engine
 * Strictly follows Phase 1 Specification (Sections 18, 19, 20, 44, 54, Clarification 6)
 */

import {
  OPPOSITE_PAIRS,
  INITIAL_SEEDS_PER_PIT,
  MAX_PAIRS,
} from "./constants";
import { verifySeedConservation } from "./board";
import type { ActionResult, GameState } from "./types";

export interface RoundSetupResult {
  round: number;
  openPairs: number;
  player1RemainingStorage: number;
  player2RemainingStorage: number;
}

/**
 * Calculates the number of open pairs based on player storage (Section 18).
 * openPairs = min(floor(P1 / 5), floor(P2 / 5), 7)
 */
export function calculateOpenPairs(
  player1Storage: number,
  player2Storage: number
): number {
  return Math.min(
    Math.floor(player1Storage / INITIAL_SEEDS_PER_PIT),
    Math.floor(player2Storage / INITIAL_SEEDS_PER_PIT),
    MAX_PAIRS
  );
}

/**
 * Sets up a new round using players' storage seeds (Section 18 & 19).
 *
 * Rules:
 * 1. openPairs = min(floor(P1 / 5), floor(P2 / 5), 7).
 * 2. If pairIndex < openPairs: both pits are OPEN with 5 seeds.
 * 3. Otherwise: both pits are CLOSED with 0 seeds.
 * 4. Deducts 5 * openPairs from each player's storage.
 * 5. Increments round counter.
 * 6. Sets phase to "PLAYING" and turnPhase to "PLAYER_TURN".
 * 7. Starting player is set to previous round winner, or previous starter if tied (Clarification 6).
 * 8. Preserves the 70-seed conservation invariant.
 */
export function setupNextRound(state: GameState): ActionResult<RoundSetupResult> {
  const p1Storage = state.players.player1.storage;
  const p2Storage = state.players.player2.storage;

  const openPairs = calculateOpenPairs(p1Storage, p2Storage);

  if (openPairs === 0) {
    return {
      success: false,
      error: `Cannot setup round: openPairs is 0 (P1: ${p1Storage}, P2: ${p2Storage}). Match should terminate.`,
    };
  }

  // Iterate over all 7 authoritative pairs
  for (let pairIndex = 0; pairIndex < OPPOSITE_PAIRS.length; pairIndex++) {
    const [p1PitId, p2PitId] = OPPOSITE_PAIRS[pairIndex];

    if (pairIndex < openPairs) {
      // Open pair
      state.pits[p1PitId].status = "OPEN";
      state.pits[p1PitId].seeds = INITIAL_SEEDS_PER_PIT;
      state.pits[p1PitId].bonusAvailable = false;

      state.pits[p2PitId].status = "OPEN";
      state.pits[p2PitId].seeds = INITIAL_SEEDS_PER_PIT;
      state.pits[p2PitId].bonusAvailable = false;
    } else {
      // Closed pair
      state.pits[p1PitId].status = "CLOSED";
      state.pits[p1PitId].seeds = 0;
      state.pits[p1PitId].bonusAvailable = false;

      state.pits[p2PitId].status = "CLOSED";
      state.pits[p2PitId].seeds = 0;
      state.pits[p2PitId].bonusAvailable = false;
    }
  }

  // Deduct seeds from storage
  const seedsDeductedPerPlayer = openPairs * INITIAL_SEEDS_PER_PIT;
  state.players.player1.storage -= seedsDeductedPerPlayer;
  state.players.player2.storage -= seedsDeductedPerPlayer;

  // Invariant validation
  if (!verifySeedConservation(state)) {
    return {
      success: false,
      error: "Seed conservation invariant violated during round setup",
    };
  }

  // Determine starting player for the new round (Clarification 6)
  if (state.roundWinner) {
    state.currentPlayer = state.roundWinner;
    state.startingPlayer = state.roundWinner;
  }
  // Reset round-specific flags
  state.roundWinner = null;
  state.players.player1.roundCaptured = 0;
  state.players.player2.roundCaptured = 0;
  state.selectedPit = null;
  state.lastPit = null;

  state.round += 1;
  state.phase = "PLAYING";
  state.turnPhase = "PLAYER_TURN";

  return {
    success: true,
    data: {
      round: state.round,
      openPairs,
      player1RemainingStorage: state.players.player1.storage,
      player2RemainingStorage: state.players.player2.storage,
    },
  };
}
