/**
 * Headless Simulation & High-Level Game Controller
 * Strictly follows Phase 1 Specification (Section 56)
 */

import { createInitialGame, cloneGameState, verifySeedConservation } from "./board";
import { getSelectablePits } from "./selection";
import { validatePitSelection } from "./selection";
import { pickupSeeds } from "./pickup";
import { getNextOpenPit } from "./traversal";
import { BONUS_THRESHOLD, BONUS_EXPIRATION_THRESHOLD } from "./constants";
import { evaluateAndExecuteCapture, getCapturablePit, type CaptureResult } from "./capture";
import { transitionTurnPhase } from "./turnStateMachine";
import { shouldEndRound } from "./roundEnd";
import { executeRoundSettlement, type RoundSettlementResult } from "./settlement";
import { checkAndHandleMatchEnd, type MatchEndResult } from "./matchEnd";
import { hasAnyValidMove } from "./selection";
import { playTurn, type TurnResult } from "./game";
import { claimBonus, getClaimableBonusPits, type ClaimBonusResult } from "./bonus";
import { setupNextRound, type RoundSetupResult } from "./roundSetup";
import { type SowResult } from "./sowing";
import type {
  ActionResult,
  GameState,
  Player,
  SowStep,
  TurnAnimationEvent,
  GameMode,
  AIDifficulty,
} from "./types";

export type TurnStepType =
  | "PICKUP"
  | "DROP"
  | "SCOOP"
  | "WAITING_FOR_CONTINUATION"
  | "WAITING_FOR_CAPTURE"
  | "CAPTURE"
  | "TURN_COMPLETED";

export interface TurnStepResult {
  type: TurnStepType;
  pitId?: number;
  seedsPlaced?: number;
  resultingSeeds?: number;
  seedsRemainingInHand?: number;
  seedsScooped?: number;
  bonusTriggered?: boolean;
  bonusOwner?: Player | null;
  captureResult?: CaptureResult;
  capturablePitId?: number;
  capturableSeeds?: number;
  nextContinuationPitId?: number;
  roundEnded?: boolean;
  roundSettlement?: RoundSettlementResult;
  matchEnded?: boolean;
  matchResult?: MatchEndResult;
  turnPassed?: boolean;
  nextPlayer?: Player;
  isComplete: boolean;
}

interface InProgressTurnContext {
  startPitId: number;
  currentDropPointer: number;
  lastDestinationPit: number;
  scoopsCount: number;
  sowSteps: SowStep[];
  animationEvents: TurnAnimationEvent[];
  isComplete: boolean;
  turnResult?: TurnResult;
  awaitingContinuationPitId?: number | null;
  awaitingCapturePitId?: number | null;
}

/**
 * Headless, framework-agnostic Channemane Game controller.
 * Provides a clean interface for tests, headless simulations, and future AI agents.
 */
export class ChannemaneGame {
  private state: GameState;
  private turnContext: InProgressTurnContext | null = null;
  private preSettlementState: GameState | null = null;

  constructor(
    startingPlayer: Player = "PLAYER_1",
    initialState?: GameState,
    gameMode: GameMode = "local",
    aiDifficulty: AIDifficulty | null = null
  ) {
    this.state = initialState
      ? cloneGameState(initialState)
      : createInitialGame(startingPlayer, gameMode, aiDifficulty);
  }

  /**
   * Returns an immutable snapshot of current game state.
   */
  public getState(): GameState {
    return cloneGameState(this.state);
  }

  public getGameMode(): GameMode {
    return this.state.gameMode ?? "local";
  }

  public getAIDifficulty(): AIDifficulty | null {
    return this.state.aiDifficulty ?? null;
  }

  public setGameMode(mode: GameMode, difficulty: AIDifficulty | null = null): void {
    this.state.gameMode = mode;
    this.state.aiDifficulty = difficulty;
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
   * Checks whether an interactive turn is currently actively stepping.
   */
  public isTurnInProgress(): boolean {
    return this.turnContext !== null && !this.turnContext.isComplete;
  }

  /**
   * Returns the final TurnResult of the most recently completed turn.
   */
  public getLastTurnResult(): TurnResult | null {
    return this.turnContext?.turnResult ?? null;
  }

  /**
   * Starts an interactive step-by-step turn (Pick up seeds).
   * Exposes intermediate states to the UI and tests so bonus claims can happen in real time.
   */
  public startTurn(pitId: number): ActionResult<TurnStepResult> {
    if (this.turnContext && !this.turnContext.isComplete) {
      return { success: false, error: "A turn is already in progress" };
    }

    const validation = validatePitSelection(this.state, pitId);
    if (!validation.success) {
      return { success: false, error: validation.error };
    }

    this.state.selectedPit = pitId;
    const pickupRes = pickupSeeds(this.state, pitId);
    if (!pickupRes.success) {
      return { success: false, error: pickupRes.error };
    }

    this.state.turnPhase = "SOWING";
    const pickupEvent: TurnAnimationEvent = {
      type: "PICKUP",
      pitId,
      seedsPickedUp: pickupRes.data.seedsPickedUp,
    };

    this.turnContext = {
      startPitId: pitId,
      currentDropPointer: pitId,
      lastDestinationPit: pitId,
      scoopsCount: 1,
      sowSteps: [],
      animationEvents: [pickupEvent],
      isComplete: false,
    };

    return {
      success: true,
      data: {
        type: "PICKUP",
        pitId,
        seedsRemainingInHand: this.state.seedsInHand,
        isComplete: false,
      },
    };
  }

  /**
   * Steps the in-progress turn forward by one discrete atomic action:
   * - Drop 1 seed if hand > 0
   * - Scoop next pit if hand === 0 and next pit has seeds
   * - Evaluate capture, check round ending, and complete turn if stopping condition reached
   */
  public stepTurn(): ActionResult<TurnStepResult> {
    if (!this.turnContext || this.turnContext.isComplete) {
      return { success: false, error: "No turn in progress to step" };
    }

    // If the round or match has already ended (e.g. bonus claim emptied board mid-turn)
    if (
      this.state.phase === "ROUND_SETTLEMENT" ||
      this.state.phase === "MATCH_END"
    ) {
      this.turnContext.isComplete = true;
      return {
        success: true,
        data: {
          type: "TURN_COMPLETED",
          roundEnded: true,
          matchEnded: this.state.phase === "MATCH_END",
          isComplete: true,
        },
      };
    }

    // Step A: Seeds in hand > 0 -> DROP one seed into next open pit
    if (this.state.seedsInHand > 0) {
      const nextPitId = getNextOpenPit(
        this.turnContext.currentDropPointer,
        this.state.pits
      );
      if (nextPitId === null) {
        return {
          success: false,
          error: "No open pits available to receive seeds during sowing",
        };
      }

      const targetPit = this.state.pits[nextPitId];
      const previousSeeds = targetPit.seeds;
      targetPit.seeds += 1;
      this.state.seedsInHand -= 1;
      this.turnContext.currentDropPointer = nextPitId;
      this.turnContext.lastDestinationPit = nextPitId;

      let bonusTriggered = false;
      if (
        previousSeeds === BONUS_THRESHOLD - 1 &&
        targetPit.seeds === BONUS_THRESHOLD
      ) {
        targetPit.bonusAvailable = true;
        bonusTriggered = true;
      } else if (
        previousSeeds === BONUS_THRESHOLD &&
        targetPit.seeds === BONUS_EXPIRATION_THRESHOLD
      ) {
        targetPit.bonusAvailable = false;
      }

      const dropEvent: TurnAnimationEvent = {
        type: "DROP",
        pitId: nextPitId,
        seedsPlaced: 1,
        resultingSeeds: targetPit.seeds,
        seedsRemainingInHand: this.state.seedsInHand,
        bonusTriggered,
        bonusOwner: bonusTriggered ? targetPit.owner : null,
      };

      this.turnContext.animationEvents.push(dropEvent);
      this.turnContext.sowSteps.push({
        pitId: nextPitId,
        seedsPlaced: 1,
        resultingSeeds: targetPit.seeds,
        bonusTriggered,
        bonusOwner: bonusTriggered ? targetPit.owner : null,
        seedsRemainingInHand: this.state.seedsInHand,
      });

      return {
        success: true,
        data: {
          type: "DROP",
          pitId: nextPitId,
          seedsPlaced: 1,
          resultingSeeds: targetPit.seeds,
          seedsRemainingInHand: this.state.seedsInHand,
          bonusTriggered,
          bonusOwner: bonusTriggered ? targetPit.owner : null,
          isComplete: false,
        },
      };
    }

    // Step B: Hand is empty (seedsInHand === 0). Inspect next open pit after destination.
    const nextOpenAfterEnd = getNextOpenPit(
      this.turnContext.lastDestinationPit,
      this.state.pits
    );

    // If next open pit has seeds -> Continuous Sowing Pause
    if (
      nextOpenAfterEnd !== null &&
      this.state.pits[nextOpenAfterEnd].seeds > 0
    ) {
      this.turnContext.awaitingContinuationPitId = nextOpenAfterEnd;
      return {
        success: true,
        data: {
          type: "WAITING_FOR_CONTINUATION",
          nextContinuationPitId: nextOpenAfterEnd,
          pitId: nextOpenAfterEnd,
          isComplete: false,
        },
      };
    }

    // Step C: Stopping condition met! Inspect capture
    this.state.turnPhase = "CAPTURE_CHECK";
    let capturableInfo = { capturablePitId: null as number | null, seeds: 0 };
    if (nextOpenAfterEnd !== null) {
      capturableInfo = getCapturablePit(this.state, this.turnContext.lastDestinationPit);
    }

    if (capturableInfo.capturablePitId !== null && capturableInfo.seeds > 0) {
      this.turnContext.awaitingCapturePitId = capturableInfo.capturablePitId;
      return {
        success: true,
        data: {
          type: "WAITING_FOR_CAPTURE",
          capturablePitId: capturableInfo.capturablePitId,
          capturableSeeds: capturableInfo.seeds,
          pitId: capturableInfo.capturablePitId,
          isComplete: false,
        },
      };
    }

    // No capture to confirm: complete turn directly
    return this.finalizeTurn(null);
  }

  /**
   * Confirms manual continuation on the required pit.
   */
  public continueSowing(pitId: number): ActionResult<TurnStepResult> {
    if (!this.turnContext || this.turnContext.isComplete) {
      return { success: false, error: "No turn in progress to continue" };
    }
    if (this.turnContext.awaitingContinuationPitId !== pitId) {
      return {
        success: false,
        error: `Invalid continuation pit ${pitId}; expected ${this.turnContext.awaitingContinuationPitId}`,
      };
    }

    const nextOpenAfterEnd = pitId;
    this.turnContext.awaitingContinuationPitId = null;
    this.turnContext.scoopsCount++;
    this.state.turnPhase = "CONTINUOUS_SOWING";
    const nextPit = this.state.pits[nextOpenAfterEnd];
    const scoopedSeeds = nextPit.seeds;
    this.state.seedsInHand = scoopedSeeds;
    nextPit.seeds = 0;
    nextPit.bonusAvailable = false;
    this.turnContext.currentDropPointer = nextOpenAfterEnd;

    const scoopEvent: TurnAnimationEvent = {
      type: "SCOOP",
      pitId: nextOpenAfterEnd,
      seedsScooped: scoopedSeeds,
    };
    this.turnContext.animationEvents.push(scoopEvent);

    return {
      success: true,
      data: {
        type: "SCOOP",
        pitId: nextOpenAfterEnd,
        seedsScooped: scoopedSeeds,
        seedsRemainingInHand: scoopedSeeds,
        isComplete: false,
      },
    };
  }

  /**
   * Confirms manual capture on the highlighted capturable pit.
   */
  public confirmCapture(pitId: number): ActionResult<TurnStepResult> {
    if (!this.turnContext || this.turnContext.isComplete) {
      return { success: false, error: "No turn in progress to capture" };
    }
    if (this.turnContext.awaitingCapturePitId !== pitId) {
      return {
        success: false,
        error: `Invalid capture pit ${pitId}; expected ${this.turnContext.awaitingCapturePitId}`,
      };
    }

    this.turnContext.awaitingCapturePitId = null;
    const captureResult = evaluateAndExecuteCapture(
      this.state,
      this.turnContext.lastDestinationPit
    );

    if (captureResult.capturedPitId !== null) {
      this.turnContext.animationEvents.push({
        type: "CAPTURE",
        capturedPitId: captureResult.capturedPitId,
        seedsCaptured: captureResult.capturedSeeds,
        capturingPlayer: this.state.currentPlayer,
        newStorageTotal:
          this.state.currentPlayer === "PLAYER_1"
            ? this.state.players.player1.storage
            : this.state.players.player2.storage,
      });
    }

    return this.finalizeTurn(captureResult);
  }

  /**
   * Finalizes the current turn and handles round/match endings.
   */
  private finalizeTurn(captureResult: CaptureResult | null): ActionResult<TurnStepResult> {
    if (!this.turnContext) {
      return { success: false, error: "No active turn context to finalize" };
    }

    const nextOpenAfterEnd = getNextOpenPit(
      this.turnContext.lastDestinationPit,
      this.state.pits
    );

    const safeCaptureResult: CaptureResult = captureResult ?? {
      nextOpenPitId: nextOpenAfterEnd,
      capturedPitId: null,
      capturedSeeds: 0,
    };

    transitionTurnPhase(this.state, "TURN_END");
    let roundEnded = false;
    let roundSettlement: RoundSettlementResult | undefined;
    let matchEnded = false;
    let matchResult: MatchEndResult | undefined;
    let turnPassed = false;

    if (shouldEndRound(this.state)) {
      roundEnded = true;
      const settlementOutcome = executeRoundSettlement(this.state);
      if (settlementOutcome.success) {
        roundSettlement = settlementOutcome.data;
        this.preSettlementState = settlementOutcome.data.preSettlementState ?? null;
      }
      matchResult = checkAndHandleMatchEnd(this.state);
      matchEnded = matchResult.isMatchEnd;
    } else {
      const opponent: Player =
        this.state.currentPlayer === "PLAYER_1" ? "PLAYER_2" : "PLAYER_1";
      if (hasAnyValidMove(this.state, opponent)) {
        this.state.currentPlayer = opponent;
      } else {
        turnPassed = true;
      }
      this.state.turnPhase = "PLAYER_TURN";
    }

    this.turnContext.isComplete = true;

    const sowResult: SowResult = {
      startPitId: this.turnContext.startPitId,
      finalDestinationPit: this.turnContext.lastDestinationPit,
      nextOpenPitAfterDestination: nextOpenAfterEnd,
      shouldEvaluateCapture:
        nextOpenAfterEnd !== null &&
        this.state.pits[nextOpenAfterEnd].seeds === 0,
      steps: this.turnContext.sowSteps,
      scoopsCount: this.turnContext.scoopsCount,
      animationEvents: this.turnContext.animationEvents,
    };

    const turnResult: TurnResult = {
      pitSelected: this.turnContext.startPitId,
      sowResult,
      captureResult: safeCaptureResult,
      roundEnded,
      roundSettlement,
      matchEnded,
      matchResult,
      turnPassed,
      nextPlayer: this.state.currentPlayer,
      animationEvents: this.turnContext.animationEvents,
    };

    this.turnContext.turnResult = turnResult;

    return {
      success: true,
      data: {
        type: "TURN_COMPLETED",
        captureResult: safeCaptureResult,
        roundEnded,
        roundSettlement,
        matchEnded,
        matchResult,
        turnPassed,
        nextPlayer: this.state.currentPlayer,
        isComplete: true,
      },
    };
  }

  /**
   * Gets the pit currently awaiting continuation, if any.
   */
  public getAwaitingContinuationPit(): number | null {
    return this.turnContext?.awaitingContinuationPitId ?? null;
  }

  /**
   * Gets the pit currently awaiting capture confirmation, if any.
   */
  public getAwaitingCapturePit(): number | null {
    return this.turnContext?.awaitingCapturePitId ?? null;
  }

  /**
   * Selects a pit and executes the full turn to completion synchronously (auto-confirming any continuations/captures).
   */
  public selectPit(pitId: number): ActionResult<TurnResult> {
    const startRes = this.startTurn(pitId);
    if (!startRes.success) {
      return { success: false, error: startRes.error };
    }

    while (this.isTurnInProgress()) {
      const awaitingCont = this.getAwaitingContinuationPit();
      if (awaitingCont !== null) {
        this.continueSowing(awaitingCont);
        continue;
      }
      const awaitingCap = this.getAwaitingCapturePit();
      if (awaitingCap !== null) {
        this.confirmCapture(awaitingCap);
        continue;
      }
      const stepRes = this.stepTurn();
      if (!stepRes.success) {
        return { success: false, error: stepRes.error };
      }
    }

    const lastResult = this.getLastTurnResult();
    if (!lastResult) {
      const fallback = playTurn(this.state, pitId);
      if (fallback.success && fallback.data.roundSettlement) {
        this.preSettlementState = fallback.data.roundSettlement.preSettlementState ?? null;
      }
      return fallback;
    }

    return { success: true, data: lastResult };
  }

  /**
   * Claims an available bonus on a pit.
   */
  public claimBonus(
    pitId: number,
    player?: Player
  ): ActionResult<ClaimBonusResult> {
    const res = claimBonus(this.state, pitId, player);
    if (res.success && res.data.roundEnded && res.data.roundSettlement) {
      this.preSettlementState = res.data.roundSettlement.preSettlementState ?? null;
    }
    return res;
  }

  /**
   * Returns a deep clone of the pre-settlement board state snapshot if the round has settled.
   */
  public getPreSettlementState(): GameState | null {
    return this.preSettlementState ? cloneGameState(this.preSettlementState) : null;
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
    this.preSettlementState = null;
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
