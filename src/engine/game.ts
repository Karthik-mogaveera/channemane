/**
 * Game Orchestration & Turn Execution Engine
 * Strictly follows Phase 1 Specification (Sections 22–26, 31, 38–39, Clarifications 1 & 5)
 */

import { validatePitSelection, hasAnyValidMove } from "./selection";
import { sowFromPit, type SowResult } from "./sowing";
import { evaluateAndExecuteCapture, type CaptureResult } from "./capture";
import { shouldEndRound } from "./roundEnd";
import { executeRoundSettlement, type RoundSettlementResult } from "./settlement";
import { checkAndHandleMatchEnd, type MatchEndResult } from "./matchEnd";
import { transitionTurnPhase } from "./turnStateMachine";
import { getNextActivePlayer } from "./board";
import type { ActionResult, GameState, Player, TurnAnimationEvent } from "./types";

export interface TurnResult {
  pitSelected: number;
  sowResult: SowResult;
  captureResult: CaptureResult;
  roundEnded: boolean;
  roundSettlement?: RoundSettlementResult;
  matchEnded: boolean;
  matchResult?: MatchEndResult;
  turnPassed: boolean;
  nextPlayer: Player;
  animationEvents?: TurnAnimationEvent[];
}

/**
 * Executes a full player turn starting from a selected pit (Atomic Turn Completion - Clarification 1).
 *
 * Workflow:
 * 1. Validate pit selection.
 * 2. Sow & continuous sow.
 * 3. Evaluate and execute capture if continuous sowing halted on empty pit.
 * 4. Check round-ending conditions:
 *    - If round ends: execute round settlement, check match end.
 *    - If round continues: switch currentPlayer.
 *      - If next player has 0 movable seeds and round does NOT end:
 *        automatically pass turn back to the active player (Clarification 5).
 *
 * @param state The current GameState (mutated in place).
 * @param pitId The pit selected by the currentPlayer.
 * @returns ActionResult<TurnResult>
 */
export function playTurn(
  state: GameState,
  pitId: number
): ActionResult<TurnResult> {
  const validation = validatePitSelection(state, pitId);
  if (!validation.success) {
    return {
      success: false,
      error: validation.error,
    };
  }

  state.selectedPit = pitId;
  const turnPlayer = state.currentPlayer;

  // Step 1: Sowing and continuous sowing
  const sowOutcome = sowFromPit(state, pitId);
  if (!sowOutcome.success) {
    return {
      success: false,
      error: sowOutcome.error,
    };
  }

  const sowResult = sowOutcome.data;
  state.lastPit = sowResult.finalDestinationPit;

  // Step 2: Capture evaluation
  transitionTurnPhase(state, "CAPTURE_CHECK");
  let captureResult: CaptureResult = {
    nextOpenPitId: sowResult.nextOpenPitAfterDestination,
    capturedPitId: null,
    capturedSeeds: 0,
  };

  if (sowResult.shouldEvaluateCapture) {
    captureResult = evaluateAndExecuteCapture(
      state,
      sowResult.finalDestinationPit
    );
  }

  // Step 3: Turn completion & Round-ending evaluation (Atomic Turn Completion)
  transitionTurnPhase(state, "TURN_END");

  let roundEnded = false;
  let roundSettlement: RoundSettlementResult | undefined;
  let matchEnded = false;
  let matchResult: MatchEndResult | undefined;
  let turnPassed = false;

  if (shouldEndRound(state)) {
    roundEnded = true;
    const settlementOutcome = executeRoundSettlement(state);
    if (settlementOutcome.success) {
      roundSettlement = settlementOutcome.data;
    }

    // Check match termination
    matchResult = checkAndHandleMatchEnd(state);
    matchEnded = matchResult.isMatchEnd;
  } else {
    // Switch to next active player
    const nextPlayer: Player = getNextActivePlayer(state, turnPlayer);
    state.currentPlayer = nextPlayer;
    transitionTurnPhase(state, "PLAYER_TURN");
    state.selectedPit = null;

    // Check Auto-Pass (Clarification 5):
    // If next player has no valid moves:
    if (!hasAnyValidMove(state, state.currentPlayer)) {
      // Re-check round-ending condition
      if (shouldEndRound(state)) {
        roundEnded = true;
        const settlementOutcome = executeRoundSettlement(state);
        if (settlementOutcome.success) {
          roundSettlement = settlementOutcome.data;
        }
        matchResult = checkAndHandleMatchEnd(state);
        matchEnded = matchResult.isMatchEnd;
      } else {
        // Find if any other active player has valid moves
        let candidate = getNextActivePlayer(state, state.currentPlayer);
        let found = false;
        const maxChecks =
          state.playerCount === 4 ? 4 : state.playerCount === 3 ? 3 : 2;
        for (let i = 0; i < maxChecks; i++) {
          if (hasAnyValidMove(state, candidate)) {
            state.currentPlayer = candidate;
            turnPassed = true;
            found = true;
            break;
          }
          candidate = getNextActivePlayer(state, candidate);
        }
        if (!found) {
          // No player has moves -> end round
          roundEnded = true;
          const settlementOutcome = executeRoundSettlement(state);
          if (settlementOutcome.success) {
            roundSettlement = settlementOutcome.data;
          }
          matchResult = checkAndHandleMatchEnd(state);
          matchEnded = matchResult.isMatchEnd;
        }
      }
    }
  }

  const animationEvents: TurnAnimationEvent[] = [
    ...(sowResult.animationEvents ?? []),
  ];

  if (captureResult.capturedSeeds > 0 && captureResult.capturedPitId !== null) {
    animationEvents.push({
      type: "CAPTURE",
      capturedPitId: captureResult.capturedPitId,
      capturingPlayer: turnPlayer,
      seedsCaptured: captureResult.capturedSeeds,
      newStorageTotal:
        turnPlayer === "PLAYER_1"
          ? state.players.player1.storage
          : state.players.player2.storage,
    });
  }

  return {
    success: true,
    data: {
      pitSelected: pitId,
      sowResult,
      captureResult,
      roundEnded,
      roundSettlement,
      matchEnded,
      matchResult,
      turnPassed,
      nextPlayer: state.currentPlayer,
      animationEvents,
    },
  };
}
