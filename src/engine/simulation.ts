/**
 * Headless Simulation & High-Level Game Controller
 * Strictly follows Phase 1 Specification (Section 56)
 */

import { createInitialGame, cloneGameState, verifySeedConservation } from "./board";
import { getSelectablePits } from "./selection";
import { playTurn, type TurnResult } from "./game";
import { claimBonus, getClaimableBonusPits, type ClaimBonusResult } from "./bonus";
import { setupNextRound, type RoundSetupResult } from "./roundSetup";
import type { ActionResult, GameState, Player } from "./types";

/**
 * Headless, framework-agnostic Channemane Game controller.
 * Provides a clean interface for tests, headless simulations, and future AI agents.
 */
export class ChannemaneGame {
  private state: GameState;

  constructor(startingPlayer: Player = "PLAYER_1", initialState?: GameState) {
    this.state = initialState
      ? cloneGameState(initialState)
      : createInitialGame(startingPlayer);
  }

  /**
   * Returns an immutable snapshot of current game state.
   */
  public getState(): GameState {
    return cloneGameState(this.state);
  }

  public getCurrentPlayer(): Player {
    return this.state.currentPlayer;
  }

  public getRound(): number {
    return this.state.round;
  }

  public isGameOver(): boolean {
    return this.state.phase === "MATCH_END";
  }

  public isRoundOver(): boolean {
    return (
      this.state.phase === "ROUND_SETTLEMENT" || this.state.phase === "MATCH_END"
    );
  }

  public getWinner(): Player | null {
    return this.state.winner;
  }

  public getSelectablePits(): number[] {
    return getSelectablePits(this.state);
  }

  public getClaimableBonuses(player?: Player): number[] {
    return getClaimableBonusPits(this.state, player);
  }

  /**
   * Selects a pit to play a turn.
   */
  public selectPit(pitId: number): ActionResult<TurnResult> {
    return playTurn(this.state, pitId);
  }

  /**
   * Claims an available bonus on a pit.
   */
  public claimBonus(
    pitId: number,
    player?: Player
  ): ActionResult<ClaimBonusResult> {
    return claimBonus(this.state, pitId, player);
  }

  /**
   * Advances to the next round if the current round has settled and match is not over.
   */
  public startNextRound(): ActionResult<RoundSetupResult> {
    if (this.state.phase !== "ROUND_SETTLEMENT") {
      return {
        success: false,
        error: `Cannot start next round: current phase is ${this.state.phase}, expected ROUND_SETTLEMENT`,
      };
    }
    return setupNextRound(this.state);
  }
}

export interface HeadlessSimulationResult {
  totalTurns: number;
  roundsPlayed: number;
  winner: Player | null;
  seedInvariantMaintained: boolean;
}

/**
 * Runs a headless simulation using random or heuristic legal pit selections.
 */
export function runHeadlessRandomSimulation(
  maxTurns: number = 200
): HeadlessSimulationResult {
  const game = new ChannemaneGame("PLAYER_1");
  let turns = 0;
  let invariantMaintained = true;

  while (!game.isGameOver() && turns < maxTurns) {
    if (!verifySeedConservation(game.getState())) {
      invariantMaintained = false;
      break;
    }

    if (game.isRoundOver()) {
      if (game.isGameOver()) {
        break;
      }
      const setupResult = game.startNextRound();
      if (!setupResult.success) {
        break;
      }
      continue;
    }

    // Auto-claim any bonuses available for current player
    const availableBonuses = game.getClaimableBonuses();
    for (const bonusPit of availableBonuses) {
      game.claimBonus(bonusPit);
    }

    const legalPits = game.getSelectablePits();
    if (legalPits.length === 0) {
      break;
    }

    // Pick first legal pit
    const pit = legalPits[0];
    const moveResult = game.selectPit(pit);
    if (!moveResult.success) {
      break;
    }

    turns++;
  }

  return {
    totalTurns: turns,
    roundsPlayed: game.getRound(),
    winner: game.getWinner(),
    seedInvariantMaintained: invariantMaintained && verifySeedConservation(game.getState()),
  };
}
