import {
  OPPOSITE_PAIRS,
  INITIAL_SEEDS_PER_PIT,
  MAX_PAIRS,
  getThreePlayerGroups,
} from "./constants";
import { verifySeedConservation, getActivePlayers } from "./board";
import type { ActionResult, GameState, Player } from "./types";

export interface RoundSetupResult {
  round: number;
  openPairs?: number;
  openGroups?: number;
  player1RemainingStorage: number;
  player2RemainingStorage: number;
  player3RemainingStorage?: number;
  disqualifiedPlayers?: Player[];
  recovered?: boolean;
  matchEnded?: boolean;
  winner?: Player | null;
}

function getPlayerStorage(state: GameState, player: Player): number {
  if (player === "PLAYER_1") return state.players.player1.storage;
  if (player === "PLAYER_2") return state.players.player2.storage;
  return state.players.player3?.storage ?? 0;
}

function deductPlayerStorage(state: GameState, player: Player, amount: number): void {
  if (player === "PLAYER_1") state.players.player1.storage -= amount;
  else if (player === "PLAYER_2") state.players.player2.storage -= amount;
  else if (state.players.player3) state.players.player3.storage -= amount;
}

function setPlayerStorage(state: GameState, player: Player, amount: number): void {
  if (player === "PLAYER_1") state.players.player1.storage = amount;
  else if (player === "PLAYER_2") state.players.player2.storage = amount;
  else if (state.players.player3) state.players.player3.storage = amount;
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
 * 3-Player Round Setup implementation according to Sections 11, 12, 13, and 15.
 */
export function setupNextRoundThreePlayer(
  state: GameState
): ActionResult<RoundSetupResult> {
  const activePlayers = getActivePlayers(state);
  const groups = getThreePlayerGroups(state.disqualifiedPlayers ?? []);

  // Check whether all active players have at least 5 seeds in storage for G1
  const canFundG1 = activePlayers.every(
    (p) => getPlayerStorage(state, p) >= INITIAL_SEEDS_PER_PIT
  );

  if (!canFundG1) {
    const ineligiblePlayers = activePlayers.filter(
      (p) => getPlayerStorage(state, p) < INITIAL_SEEDS_PER_PIT
    );

    // Case A: Disqualification from a 3-player game
    if (activePlayers.length === 3) {
      const disqualified = ineligiblePlayers;
      state.disqualifiedPlayers = [
        ...(state.disqualifiedPlayers ?? []),
        ...disqualified,
      ];

      // Close disqualified player's pits permanently and eliminate their storage seeds
      for (const d of disqualified) {
        for (const pit of state.pits) {
          if (pit.owner === d) {
            pit.status = "CLOSED";
            pit.seeds = 0;
            pit.bonusAvailable = false;
          }
        }
        setPlayerStorage(state, d, 0);
      }

      // Remaining 2 active players
      const remainingPlayers = getActivePlayers(state);

      // Set both remaining players' storage to zero
      for (const remaining of remainingPlayers) {
        setPlayerStorage(state, remaining, 0);
      }

      // Initialize each remaining player's five active pits with 5 seeds each (50 seeds total)
      for (const pit of state.pits) {
        if (remainingPlayers.includes(pit.owner)) {
          pit.status = "OPEN";
          pit.seeds = INITIAL_SEEDS_PER_PIT;
          pit.bonusAvailable = false;
        }
      }

      if (!verifySeedConservation(state)) {
        return {
          success: false,
          error: "Seed conservation invariant violated during 3-player recovery setup",
        };
      }

      if (state.roundWinner && remainingPlayers.includes(state.roundWinner)) {
        state.currentPlayer = state.roundWinner;
        state.startingPlayer = state.roundWinner;
      } else {
        state.currentPlayer = remainingPlayers[0];
        state.startingPlayer = remainingPlayers[0];
      }

      state.roundWinner = null;
      state.players.player1.roundCaptured = 0;
      state.players.player2.roundCaptured = 0;
      if (state.players.player3) state.players.player3.roundCaptured = 0;
      state.selectedPit = null;
      state.lastPit = null;
      state.seedsInHand = 0;

      state.round += 1;
      state.phase = "PLAYING";
      state.turnPhase = "PLAYER_TURN";

      return {
        success: true,
        data: {
          round: state.round,
          openGroups: 5,
          player1RemainingStorage: state.players.player1.storage,
          player2RemainingStorage: state.players.player2.storage,
          player3RemainingStorage: state.players.player3?.storage,
          disqualifiedPlayers: state.disqualifiedPlayers,
          recovered: true,
        },
      };
    } else if (activePlayers.length === 2) {
      // Case B: Disqualification when only two players remain
      const disqualified = ineligiblePlayers[0];
      state.disqualifiedPlayers = [
        ...(state.disqualifiedPlayers ?? []),
        disqualified,
      ];
      const winner = activePlayers.find((p) => p !== disqualified) ?? null;
      state.phase = "MATCH_END";
      state.turnPhase = "TURN_END";
      state.winner = winner;

      return {
        success: true,
        data: {
          round: state.round,
          openGroups: 0,
          player1RemainingStorage: state.players.player1.storage,
          player2RemainingStorage: state.players.player2.storage,
          player3RemainingStorage: state.players.player3?.storage,
          disqualifiedPlayers: state.disqualifiedPlayers,
          matchEnded: true,
          winner,
        },
      };
    } else {
      return {
        success: false,
        error: "Cannot setup round: fewer than 2 active players remain",
      };
    }
  }

  // Normal group opening G1..G5 in order
  let openGroups = 0;
  for (let g = 0; g < groups.length; g++) {
    const groupPitIds = groups[g];
    const canOpen = activePlayers.every(
      (p) => getPlayerStorage(state, p) >= INITIAL_SEEDS_PER_PIT
    );

    if (canOpen) {
      openGroups++;
      for (const pitId of groupPitIds) {
        state.pits[pitId].status = "OPEN";
        state.pits[pitId].seeds = INITIAL_SEEDS_PER_PIT;
        state.pits[pitId].bonusAvailable = false;
      }
      for (const p of activePlayers) {
        deductPlayerStorage(state, p, INITIAL_SEEDS_PER_PIT);
      }
    } else {
      // Close every pit in this group and all subsequent groups
      for (let remG = g; remG < groups.length; remG++) {
        for (const pitId of groups[remG]) {
          state.pits[pitId].status = "CLOSED";
          state.pits[pitId].seeds = 0;
          state.pits[pitId].bonusAvailable = false;
        }
      }
      break;
    }
  }

  // Ensure permanently disqualified players' pits stay closed
  if (state.disqualifiedPlayers) {
    for (const d of state.disqualifiedPlayers) {
      for (const pit of state.pits) {
        if (pit.owner === d) {
          pit.status = "CLOSED";
          pit.seeds = 0;
          pit.bonusAvailable = false;
        }
      }
    }
  }

  if (!verifySeedConservation(state)) {
    return {
      success: false,
      error: "Seed conservation invariant violated during 3-player round setup",
    };
  }

  if (state.roundWinner && activePlayers.includes(state.roundWinner)) {
    state.currentPlayer = state.roundWinner;
    state.startingPlayer = state.roundWinner;
  } else {
    state.currentPlayer = activePlayers[0];
    state.startingPlayer = activePlayers[0];
  }

  state.roundWinner = null;
  state.players.player1.roundCaptured = 0;
  state.players.player2.roundCaptured = 0;
  if (state.players.player3) state.players.player3.roundCaptured = 0;
  state.selectedPit = null;
  state.lastPit = null;
  state.seedsInHand = 0;

  state.round += 1;
  state.phase = "PLAYING";
  state.turnPhase = "PLAYER_TURN";

  return {
    success: true,
    data: {
      round: state.round,
      openGroups,
      player1RemainingStorage: state.players.player1.storage,
      player2RemainingStorage: state.players.player2.storage,
      player3RemainingStorage: state.players.player3?.storage,
      disqualifiedPlayers: state.disqualifiedPlayers,
    },
  };
}

/**
 * Sets up a new round using players' storage seeds (Section 18 & 19).
 */
export function setupNextRound(state: GameState): ActionResult<RoundSetupResult> {
  if (state.playerCount === 3) {
    return setupNextRoundThreePlayer(state);
  }

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
  state.seedsInHand = 0;

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
