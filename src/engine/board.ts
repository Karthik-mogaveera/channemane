/**
 * Board Initialization and Invariant Utilities
 * Strictly follows Phase 1 & Phase 2 Specification
 */

import {
  TOTAL_PITS,
  TOTAL_SEEDS,
  INITIAL_SEEDS_PER_PIT,
  getPitOwner,
} from "./constants";
import type { GameState, Pit, Player } from "./types";

/**
 * Creates the initial game state for Round 1.
 * All 14 pits are OPEN with 5 seeds each, both storages at 0, seedsInHand at 0.
 */
export function createInitialGame(startingPlayer: Player = "PLAYER_1"): GameState {
  const pits: Pit[] = [];

  for (let i = 0; i < TOTAL_PITS; i++) {
    const owner = getPitOwner(i);
    if (!owner) {
      throw new Error(`Invalid pit index ${i}`);
    }
    pits.push({
      id: i,
      owner,
      seeds: INITIAL_SEEDS_PER_PIT,
      status: "OPEN",
      bonusAvailable: false,
    });
  }

  return {
    round: 1,
    phase: "PLAYING",
    turnPhase: "PLAYER_TURN",
    currentPlayer: startingPlayer,
    startingPlayer,
    pits,
    players: {
      player1: {
        storage: 0,
        roundCaptured: 0,
        roundWins: 0,
      },
      player2: {
        storage: 0,
        roundCaptured: 0,
        roundWins: 0,
      },
    },
    seedsInHand: 0,
    selectedPit: null,
    lastPit: null,
    winner: null,
    roundWinner: null,
  };
}

/**
 * Calculates total seeds across all pits on the board.
 */
export function getTotalBoardSeeds(state: GameState): number {
  return state.pits.reduce((sum, pit) => sum + pit.seeds, 0);
}

/**
 * Calculates total seeds on a specific player's side of the board.
 */
export function getPlayerSideSeeds(state: GameState, player: Player): number {
  return state.pits
    .filter((pit) => pit.owner === player)
    .reduce((sum, pit) => sum + pit.seeds, 0);
}

/**
 * Calculates the grand total of all seeds in the game:
 * sum(all pit seeds) + Player 1 storage + Player 2 storage + seedsInHand
 * Mandatory invariant: must always equal 70 (Section 17).
 */
export function getTotalSeeds(state: GameState): number {
  const boardSeeds = getTotalBoardSeeds(state);
  return (
    boardSeeds +
    state.players.player1.storage +
    state.players.player2.storage +
    (state.seedsInHand ?? 0)
  );
}

/**
 * Verifies whether the mandatory 70-seed conservation invariant is currently satisfied.
 */
export function verifySeedConservation(state: GameState): boolean {
  return getTotalSeeds(state) === TOTAL_SEEDS;
}

/**
 * Creates a deep copy of the game state to ensure pure, immutable state transitions.
 */
export function cloneGameState(state: GameState): GameState {
  return {
    ...state,
    pits: state.pits.map((pit) => ({ ...pit })),
    players: {
      player1: { ...state.players.player1 },
      player2: { ...state.players.player2 },
    },
  };
}
