import {
  getPlayerSideSeeds,
  verifySeedConservation,
  cloneGameState,
  getActivePlayers,
} from "./board";
import type { ActionResult, GameState, Player } from "./types";

export interface RoundSettlementResult {
  player1RemainingTransferred: number;
  player2RemainingTransferred: number;
  player3RemainingTransferred?: number;
  player1FinalStorage: number;
  player2FinalStorage: number;
  player3FinalStorage?: number;
  roundWinner: Player | null;
  preSettlementState?: GameState;
}

/**
 * Executes round settlement:
 *
 * 1. Counts remaining seeds on each player's side.
 * 2. Transfers remaining seeds to respective player's storage.
 * 3. Sets all board pits to 0 seeds and bonusAvailable = false.
 * 4. Verifies seed conservation invariant.
 * 5. Determines round winner among active players.
 * 6. Increments roundWins for the round winner.
 * 7. Sets phase to "ROUND_SETTLEMENT".
 */
export function executeRoundSettlement(
  state: GameState
): ActionResult<RoundSettlementResult> {
  // Capture a complete deep snapshot of the pre-settlement game state (Issue 1)
  const preSettlementState = cloneGameState(state);
  preSettlementState.phase = "ROUND_SETTLEMENT";

  const p1Remaining = getPlayerSideSeeds(state, "PLAYER_1");
  const p2Remaining = getPlayerSideSeeds(state, "PLAYER_2");
  const p3Remaining =
    state.playerCount === 3 ? getPlayerSideSeeds(state, "PLAYER_3") : 0;

  // Transfer remaining seeds to owners
  state.players.player1.storage += p1Remaining;
  state.players.player2.storage += p2Remaining;
  if (state.playerCount === 3 && state.players.player3) {
    state.players.player3.storage += p3Remaining;
  }

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

  // Determine round winner among active players
  const activePlayers = getActivePlayers(state);
  let roundWinner: Player | null = null;
  const storageMap: Record<Player, number> = {
    PLAYER_1: state.players.player1.storage,
    PLAYER_2: state.players.player2.storage,
    PLAYER_3: state.players.player3?.storage ?? 0,
  };

  let maxStorage = -1;
  let isTie = false;
  for (const player of activePlayers) {
    const s = storageMap[player];
    if (s > maxStorage) {
      maxStorage = s;
      roundWinner = player;
      isTie = false;
    } else if (s === maxStorage) {
      isTie = true;
    }
  }

  if (isTie) {
    roundWinner = null;
  } else if (roundWinner === "PLAYER_1") {
    state.players.player1.roundWins += 1;
  } else if (roundWinner === "PLAYER_2") {
    state.players.player2.roundWins += 1;
  } else if (roundWinner === "PLAYER_3" && state.players.player3) {
    state.players.player3.roundWins += 1;
  }

  state.roundWinner = roundWinner;
  state.seedsInHand = 0;
  state.phase = "ROUND_SETTLEMENT";
  state.turnPhase = "TURN_END";

  return {
    success: true,
    data: {
      player1RemainingTransferred: p1Remaining,
      player2RemainingTransferred: p2Remaining,
      player3RemainingTransferred:
        state.playerCount === 3 ? p3Remaining : undefined,
      player1FinalStorage: state.players.player1.storage,
      player2FinalStorage: state.players.player2.storage,
      player3FinalStorage: state.players.player3?.storage,
      roundWinner,
      preSettlementState,
    },
  };
}
