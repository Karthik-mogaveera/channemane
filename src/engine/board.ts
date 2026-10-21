/**
 * Board Initialization and Invariant Utilities
 * Strictly follows Phase 1 & Phase 2 Specification
 */

import {
  TOTAL_PITS,
  TOTAL_SEEDS,
  INITIAL_SEEDS_PER_PIT,
  getPitOwner,
  THREE_PLAYER_TOTAL_PITS,
  THREE_PLAYER_TOTAL_SEEDS,
  THREE_PLAYER_RECOVERY_SEEDS,
} from "./constants";
import type { GameState, Pit, Player, GameMode, AIDifficulty } from "./types";

/**
 * Creates the initial game state for Round 1.
 * For 2-player: all 14 pits are OPEN with 5 seeds each (70 total seeds).
 * For 3-player: all 15 pits are OPEN with 5 seeds each (75 total seeds).
 */
export function createInitialGame(
  startingPlayer: Player = "PLAYER_1",
  gameMode: GameMode = "local",
  aiDifficulty: AIDifficulty | null = null,
  aiPlayer: Player = "PLAYER_2",
  playerCount: 2 | 3 = 2
): GameState {
  const isThreePlayer = playerCount === 3;
  const pitCount = isThreePlayer ? THREE_PLAYER_TOTAL_PITS : TOTAL_PITS;
  const pits: Pit[] = [];

  for (let i = 0; i < pitCount; i++) {
    const owner = getPitOwner(i, pitCount);
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
      ...(isThreePlayer
        ? {
            player3: {
              storage: 0,
              roundCaptured: 0,
              roundWins: 0,
            },
          }
        : {}),
    },
    playerCount,
    disqualifiedPlayers: isThreePlayer ? [] : undefined,
    seedsInHand: 0,
    selectedPit: null,
    lastPit: null,
    winner: null,
    roundWinner: null,
    gameMode,
    aiDifficulty,
    aiPlayer: gameMode === "ai" ? aiPlayer : undefined,
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
 * sum(all pit seeds) + Player 1 storage + Player 2 storage + (Player 3 storage) + seedsInHand
 */
export function getTotalSeeds(state: GameState): number {
  const boardSeeds = getTotalBoardSeeds(state);
  return (
    boardSeeds +
    state.players.player1.storage +
    state.players.player2.storage +
    (state.players.player3?.storage ?? 0) +
    (state.seedsInHand ?? 0)
  );
}

/**
 * Verifies whether the mandatory seed conservation invariant is currently satisfied.
 * - 2-player: exactly 70 seeds.
 * - 3-player normal: exactly 75 seeds.
 * - 3-player recovery (after 1 disqualification): exactly 50 seeds.
 */
export function verifySeedConservation(state: GameState): boolean {
  if (state.playerCount === 3) {
    const expected =
      state.disqualifiedPlayers && state.disqualifiedPlayers.length > 0
        ? THREE_PLAYER_RECOVERY_SEEDS
        : THREE_PLAYER_TOTAL_SEEDS;
    return getTotalSeeds(state) === expected;
  }
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
      ...(state.players.player3
        ? { player3: { ...state.players.player3 } }
        : {}),
    },
    disqualifiedPlayers: state.disqualifiedPlayers
      ? [...state.disqualifiedPlayers]
      : undefined,
  };
}

/**
 * Returns list of active (non-disqualified) players in turn order.
 */
export function getActivePlayers(state: GameState): Player[] {
  const all: Player[] =
    state.playerCount === 3
      ? ["PLAYER_1", "PLAYER_2", "PLAYER_3"]
      : ["PLAYER_1", "PLAYER_2"];
  const disqualified = state.disqualifiedPlayers ?? [];
  return all.filter((p) => !disqualified.includes(p));
}

/**
 * Returns the next active player in circular turn order skipping disqualified players.
 */
export function getNextActivePlayer(
  state: GameState,
  fromPlayer: Player = state.currentPlayer
): Player {
  const active = getActivePlayers(state);
  if (active.length === 0) return fromPlayer;
  const idx = active.indexOf(fromPlayer);
  if (idx === -1) return active[0];
  return active[(idx + 1) % active.length];
}
