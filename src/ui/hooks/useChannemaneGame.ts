/**
 * Engine-UI Controller Adapter Hook
 * Connects the headless ChannemaneGame engine to reactive React UI state.
 * Strictly adheres to single source of truth: does NOT duplicate game rules.
 */

import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import { ChannemaneGame } from "../../engine/simulation";
import type {
  GameState,
  Player,
  ActionResult,
} from "../../engine/types";
import type { TurnResult } from "../../engine/game";
import type { ClaimBonusResult } from "../../engine/bonus";
import type { RoundSetupResult } from "../../engine/roundSetup";
import type { RoundSettlementResult } from "../../engine/settlement";
import type { MatchEndResult } from "../../engine/matchEnd";
import type { TurnStepResult } from "../../engine/simulation";

export type AnimationSpeed = "SLOW" | "FAST";

export const ANIMATION_SPEED_CONFIG = {
  SLOW: { stepDelayMs: 450, label: "🎬 Slow Mode" },
  FAST: { stepDelayMs: 140, label: "⚡ Fast Mode" },
} as const;

export interface AnimationSettings {
  enabled: boolean;
  speed: AnimationSpeed;
  stepDelayMs: number;
}

export type InteractionState =
  | "WAITING_FOR_START"
  | "SOWING_ANIMATION"
  | "WAITING_FOR_CONTINUATION"
  | "WAITING_FOR_CAPTURE"
  | "TURN_COMPLETION"
  | "ROUND_SETTLEMENT"
  | "MATCH_COMPLETE";

export interface UseChannemaneGameReturn {
  // Authoritative & Visual Game State
  gameState: GameState;
  authoritativeGameState: GameState;
  isReviewingBoard: boolean;
  reviewBoardState: GameState | null;
  selectablePits: number[];
  claimableBonuses: number[];

  // Interaction State Machine
  interactionState: InteractionState;
  highlightedContinuationPit: number | null;
  highlightedCapturePit: number | null;

  // Visual & Animation State
  isAnimating: boolean;
  activeDropPit: number | null;
  visualHandSeeds: number;
  lastActionError: string | null;

  // Round / Match End Summaries
  settlementSummary: RoundSettlementResult | null;
  matchSummary: MatchEndResult | null;
  dismissSettlementModal: () => void;
  reopenSettlementModal: () => void;
  dismissMatchModal: () => void;

  // Modals & Controls
  isRulesOpen: boolean;
  setIsRulesOpen: (open: boolean) => void;
  animationSettings: AnimationSettings;
  setAnimationSettings: (settings: AnimationSettings) => void;
  toggleAnimationSpeed: () => void;

  // Player Actions
  selectPit: (pitId: number) => ActionResult<TurnResult> | null;
  confirmContinuation: (pitId: number) => ActionResult<TurnStepResult>;
  confirmCapture: (pitId: number) => ActionResult<TurnStepResult>;
  claimBonus: (pitId: number) => ActionResult<ClaimBonusResult>;
  startNextRound: () => ActionResult<RoundSetupResult>;
  restartMatch: (startingPlayer?: Player) => void;
  clearError: () => void;
}

export function useChannemaneGame(
  initialStartingPlayer: Player = "PLAYER_1",
  initialAnimationSettings?: Partial<AnimationSettings>,
  initialGameState?: GameState
): UseChannemaneGameReturn {
  const gameRef = useRef<ChannemaneGame>(
    new ChannemaneGame(initialStartingPlayer, initialGameState)
  );
  const [gameState, setGameState] = useState<GameState>(() =>
    gameRef.current.getState()
  );

  const [isReviewingBoard, setIsReviewingBoard] = useState<boolean>(false);
  const [reviewBoardState, setReviewBoardState] = useState<GameState | null>(null);

  const [interactionState, setInteractionState] = useState<InteractionState>(() => {
    const s = gameRef.current.getState();
    if (s.phase === "MATCH_END") return "MATCH_COMPLETE";
    if (s.phase === "ROUND_SETTLEMENT") return "ROUND_SETTLEMENT";
    return "WAITING_FOR_START";
  });
  const [highlightedContinuationPit, setHighlightedContinuationPit] = useState<number | null>(null);
  const [highlightedCapturePit, setHighlightedCapturePit] = useState<number | null>(null);

  const [isAnimating, setIsAnimating] = useState<boolean>(false);
  const [activeDropPit, setActiveDropPit] = useState<number | null>(null);
  const [visualHandSeeds, setVisualHandSeeds] = useState<number>(0);

  const [lastActionError, setLastActionError] = useState<string | null>(null);

  const [settlementSummary, setSettlementSummary] =
    useState<RoundSettlementResult | null>(null);
  const lastSettlementRef = useRef<RoundSettlementResult | null>(null);

  const [matchSummary, setMatchSummary] = useState<MatchEndResult | null>(null);
  const [isRulesOpen, setIsRulesOpen] = useState<boolean>(false);

  const [animationSettings, setAnimationSettings] = useState<AnimationSettings>(
    () => ({
      enabled: initialAnimationSettings?.enabled ?? true,
      speed: initialAnimationSettings?.speed ?? "SLOW",
      stepDelayMs:
        initialAnimationSettings?.stepDelayMs ??
        (initialAnimationSettings?.speed === "FAST"
          ? ANIMATION_SPEED_CONFIG.FAST.stepDelayMs
          : ANIMATION_SPEED_CONFIG.SLOW.stepDelayMs),
    })
  );

  const animationTimeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  // Clear pending animation timers on unmount
  useEffect(() => {
    return () => {
      animationTimeoutsRef.current.forEach((t) => clearTimeout(t));
      animationTimeoutsRef.current = [];
    };
  }, []);

  const clearError = useCallback(() => {
    setLastActionError(null);
  }, []);

  const dismissSettlementModal = useCallback(() => {
    setSettlementSummary(null);
    setIsReviewingBoard(true);
  }, []);

  const reopenSettlementModal = useCallback(() => {
    if (lastSettlementRef.current) {
      setSettlementSummary(lastSettlementRef.current);
    }
  }, []);

  const dismissMatchModal = useCallback(() => {
    setMatchSummary(null);
  }, []);

  const toggleAnimationSpeed = useCallback(() => {
    setAnimationSettings((prev) => {
      const nextSpeed: AnimationSpeed =
        prev.speed === "SLOW" ? "FAST" : "SLOW";
      return {
        enabled: true,
        speed: nextSpeed,
        stepDelayMs: ANIMATION_SPEED_CONFIG[nextSpeed].stepDelayMs,
      };
    });
  }, []);

  /**
   * Schedules recursive stepping through the active distribution batch.
   * Pauses cleanly when reaching WAITING_FOR_CONTINUATION or WAITING_FOR_CAPTURE.
   */
  const scheduleSowingSteps = useCallback(
    (delay: number) => {
      const scheduleNext = () => {
        const timeout = setTimeout(() => {
          if (!gameRef.current.isTurnInProgress()) {
            setIsAnimating(false);
            setActiveDropPit(null);
            setVisualHandSeeds(0);
            const finalState = gameRef.current.getState();
            setGameState(finalState);
            const lastTurnRes = gameRef.current.getLastTurnResult();
            if (lastTurnRes?.roundEnded && lastTurnRes.roundSettlement) {
              lastSettlementRef.current = lastTurnRes.roundSettlement;
              setSettlementSummary(lastTurnRes.roundSettlement);
              setReviewBoardState(lastTurnRes.roundSettlement.preSettlementState ?? null);
              setInteractionState("ROUND_SETTLEMENT");
            } else if (lastTurnRes?.matchEnded && lastTurnRes.matchResult) {
              setMatchSummary(lastTurnRes.matchResult);
              setInteractionState("MATCH_COMPLETE");
            } else {
              setInteractionState("WAITING_FOR_START");
            }
            return;
          }

          const stepRes = gameRef.current.stepTurn();
          if (!stepRes.success) {
            setIsAnimating(false);
            setActiveDropPit(null);
            setVisualHandSeeds(0);
            setLastActionError(stepRes.error);
            setInteractionState("WAITING_FOR_START");
            return;
          }

          const currentState = gameRef.current.getState();
          setGameState(currentState);
          setVisualHandSeeds(currentState.seedsInHand);

          if (stepRes.data.type === "WAITING_FOR_CONTINUATION") {
            setIsAnimating(false);
            setActiveDropPit(null);
            setHighlightedContinuationPit(stepRes.data.nextContinuationPitId ?? null);
            setInteractionState("WAITING_FOR_CONTINUATION");
            // PAUSE: Do not schedule next step. Awaiting player tap!
            return;
          }

          if (stepRes.data.type === "WAITING_FOR_CAPTURE") {
            setIsAnimating(false);
            setActiveDropPit(null);
            setHighlightedCapturePit(stepRes.data.capturablePitId ?? null);
            setInteractionState("WAITING_FOR_CAPTURE");
            // PAUSE: Do not schedule next step. Awaiting player tap!
            return;
          }

          if (stepRes.data.pitId !== undefined) {
            setActiveDropPit(stepRes.data.pitId);
          }

          if (stepRes.data.isComplete) {
            setIsAnimating(false);
            setActiveDropPit(null);
            setVisualHandSeeds(0);
            if (stepRes.data.roundEnded && stepRes.data.roundSettlement) {
              lastSettlementRef.current = stepRes.data.roundSettlement;
              setSettlementSummary(stepRes.data.roundSettlement);
              setReviewBoardState(stepRes.data.roundSettlement.preSettlementState ?? null);
              setInteractionState("ROUND_SETTLEMENT");
            } else if (stepRes.data.matchEnded && stepRes.data.matchResult) {
              setMatchSummary(stepRes.data.matchResult);
              setInteractionState("MATCH_COMPLETE");
            } else {
              setInteractionState("WAITING_FOR_START");
            }
          } else {
            scheduleNext();
          }
        }, delay);

        animationTimeoutsRef.current.push(timeout);
      };

      scheduleNext();
    },
    []
  );

  /**
   * Selects starting pit and begins sowing animation batch.
   */
  const selectPit = useCallback(
    (pitId: number): ActionResult<TurnResult> | null => {
      if (
        isAnimating ||
        isReviewingBoard ||
        interactionState !== "WAITING_FOR_START" ||
        gameRef.current.isTurnInProgress()
      ) {
        return null;
      }

      if (gameState.phase === "MATCH_END") {
        setLastActionError("The match has ended. Start a new game to play again.");
        return null;
      }

      clearError();
      const startRes = gameRef.current.startTurn(pitId);
      if (!startRes.success) {
        setLastActionError(startRes.error);
        return { success: false, error: startRes.error };
      }

      const pickupState = gameRef.current.getState();
      setGameState(pickupState);
      setActiveDropPit(pitId);
      setVisualHandSeeds(pickupState.seedsInHand);
      setInteractionState("SOWING_ANIMATION");

      const delay = animationSettings.enabled
        ? animationSettings.stepDelayMs
        : 0;

      if (delay === 0) {
        // Fast stepping until pause point or completion
        while (gameRef.current.isTurnInProgress()) {
          const awaitingCont = gameRef.current.getAwaitingContinuationPit();
          if (awaitingCont !== null) {
            setHighlightedContinuationPit(awaitingCont);
            setInteractionState("WAITING_FOR_CONTINUATION");
            setGameState(gameRef.current.getState());
            return {
              success: true,
              data: {
                pitSelected: pitId,
                sowResult: {
                  startPitId: pitId,
                  finalDestinationPit: pitId,
                  nextOpenPitAfterDestination: null,
                  shouldEvaluateCapture: false,
                  steps: [],
                  scoopsCount: 1,
                },
                captureResult: { nextOpenPitId: null, capturedPitId: null, capturedSeeds: 0 },
                roundEnded: false,
                matchEnded: false,
                turnPassed: false,
                nextPlayer: pickupState.currentPlayer,
              },
            };
          }
          const awaitingCap = gameRef.current.getAwaitingCapturePit();
          if (awaitingCap !== null) {
            setHighlightedCapturePit(awaitingCap);
            setInteractionState("WAITING_FOR_CAPTURE");
            setGameState(gameRef.current.getState());
            return {
              success: true,
              data: {
                pitSelected: pitId,
                sowResult: {
                  startPitId: pitId,
                  finalDestinationPit: pitId,
                  nextOpenPitAfterDestination: null,
                  shouldEvaluateCapture: false,
                  steps: [],
                  scoopsCount: 1,
                },
                captureResult: { nextOpenPitId: null, capturedPitId: null, capturedSeeds: 0 },
                roundEnded: false,
                matchEnded: false,
                turnPassed: false,
                nextPlayer: pickupState.currentPlayer,
              },
            };
          }

          const stepRes = gameRef.current.stepTurn();
          if (!stepRes.success) break;
          if (stepRes.data.type === "WAITING_FOR_CONTINUATION") {
            setHighlightedContinuationPit(stepRes.data.nextContinuationPitId ?? null);
            setInteractionState("WAITING_FOR_CONTINUATION");
            setGameState(gameRef.current.getState());
            return {
              success: true,
              data: {
                pitSelected: pitId,
                sowResult: {
                  startPitId: pitId,
                  finalDestinationPit: pitId,
                  nextOpenPitAfterDestination: null,
                  shouldEvaluateCapture: false,
                  steps: [],
                  scoopsCount: 1,
                },
                captureResult: { nextOpenPitId: null, capturedPitId: null, capturedSeeds: 0 },
                roundEnded: false,
                matchEnded: false,
                turnPassed: false,
                nextPlayer: pickupState.currentPlayer,
              },
            };
          }
          if (stepRes.data.type === "WAITING_FOR_CAPTURE") {
            setHighlightedCapturePit(stepRes.data.capturablePitId ?? null);
            setInteractionState("WAITING_FOR_CAPTURE");
            setGameState(gameRef.current.getState());
            return {
              success: true,
              data: {
                pitSelected: pitId,
                sowResult: {
                  startPitId: pitId,
                  finalDestinationPit: pitId,
                  nextOpenPitAfterDestination: null,
                  shouldEvaluateCapture: false,
                  steps: [],
                  scoopsCount: 1,
                },
                captureResult: { nextOpenPitId: null, capturedPitId: null, capturedSeeds: 0 },
                roundEnded: false,
                matchEnded: false,
                turnPassed: false,
                nextPlayer: pickupState.currentPlayer,
              },
            };
          }
        }

        const finalState = gameRef.current.getState();
        setGameState(finalState);
        setActiveDropPit(null);
        setVisualHandSeeds(0);
        const lastTurnRes = gameRef.current.getLastTurnResult();
        if (lastTurnRes?.roundEnded && lastTurnRes.roundSettlement) {
          lastSettlementRef.current = lastTurnRes.roundSettlement;
          setSettlementSummary(lastTurnRes.roundSettlement);
          setReviewBoardState(lastTurnRes.roundSettlement.preSettlementState ?? null);
          setInteractionState("ROUND_SETTLEMENT");
        } else if (lastTurnRes?.matchEnded && lastTurnRes.matchResult) {
          setMatchSummary(lastTurnRes.matchResult);
          setInteractionState("MATCH_COMPLETE");
        } else {
          setInteractionState("WAITING_FOR_START");
        }
        return { success: true, data: lastTurnRes! };
      }

      setIsAnimating(true);
      scheduleSowingSteps(delay);

      return {
        success: true,
        data: {
          pitSelected: pitId,
          sowResult: {
            startPitId: pitId,
            finalDestinationPit: pitId,
            nextOpenPitAfterDestination: null,
            shouldEvaluateCapture: false,
            steps: [],
            scoopsCount: 1,
          },
          captureResult: {
            nextOpenPitId: null,
            capturedPitId: null,
            capturedSeeds: 0,
          },
          roundEnded: false,
          matchEnded: false,
          turnPassed: false,
          nextPlayer: pickupState.currentPlayer,
        },
      };
    },
    [isAnimating, isReviewingBoard, interactionState, gameState.phase, animationSettings, clearError, scheduleSowingSteps]
  );

  /**
   * Confirms manual continuation on the required pit.
   */
  const confirmContinuation = useCallback(
    (pitId: number): ActionResult<TurnStepResult> => {
      if (interactionState !== "WAITING_FOR_CONTINUATION") {
        return { success: false, error: "Not waiting for continuous sowing confirmation" };
      }
      const expectedPit = gameRef.current.getAwaitingContinuationPit();
      if (expectedPit !== pitId) {
        return {
          success: false,
          error: `Invalid continuation pit ${pitId}; expected ${expectedPit}`,
        };
      }

      clearError();
      const res = gameRef.current.continueSowing(pitId);
      if (!res.success) {
        setLastActionError(res.error);
        return res;
      }

      setHighlightedContinuationPit(null);
      const stateAfterScoop = gameRef.current.getState();
      setGameState(stateAfterScoop);
      setVisualHandSeeds(stateAfterScoop.seedsInHand);
      setActiveDropPit(pitId);
      setInteractionState("SOWING_ANIMATION");

      const delay = animationSettings.enabled ? animationSettings.stepDelayMs : 0;
      if (delay === 0) {
        while (gameRef.current.isTurnInProgress()) {
          const awaitingCont = gameRef.current.getAwaitingContinuationPit();
          if (awaitingCont !== null) {
            setHighlightedContinuationPit(awaitingCont);
            setInteractionState("WAITING_FOR_CONTINUATION");
            setGameState(gameRef.current.getState());
            return res;
          }
          const awaitingCap = gameRef.current.getAwaitingCapturePit();
          if (awaitingCap !== null) {
            setHighlightedCapturePit(awaitingCap);
            setInteractionState("WAITING_FOR_CAPTURE");
            setGameState(gameRef.current.getState());
            return res;
          }
          const stepRes = gameRef.current.stepTurn();
          if (!stepRes.success) break;
          if (stepRes.data.type === "WAITING_FOR_CONTINUATION") {
            setHighlightedContinuationPit(stepRes.data.nextContinuationPitId ?? null);
            setInteractionState("WAITING_FOR_CONTINUATION");
            setGameState(gameRef.current.getState());
            return res;
          }
          if (stepRes.data.type === "WAITING_FOR_CAPTURE") {
            setHighlightedCapturePit(stepRes.data.capturablePitId ?? null);
            setInteractionState("WAITING_FOR_CAPTURE");
            setGameState(gameRef.current.getState());
            return res;
          }
        }
        const finalState = gameRef.current.getState();
        setGameState(finalState);
        setActiveDropPit(null);
        setVisualHandSeeds(0);
        const lastTurnRes = gameRef.current.getLastTurnResult();
        if (lastTurnRes?.roundEnded && lastTurnRes.roundSettlement) {
          lastSettlementRef.current = lastTurnRes.roundSettlement;
          setSettlementSummary(lastTurnRes.roundSettlement);
          setReviewBoardState(lastTurnRes.roundSettlement.preSettlementState ?? null);
          setInteractionState("ROUND_SETTLEMENT");
        } else if (lastTurnRes?.matchEnded && lastTurnRes.matchResult) {
          setMatchSummary(lastTurnRes.matchResult);
          setInteractionState("MATCH_COMPLETE");
        } else {
          setInteractionState("WAITING_FOR_START");
        }
        return res;
      }

      setIsAnimating(true);
      scheduleSowingSteps(delay);
      return res;
    },
    [interactionState, animationSettings, clearError, scheduleSowingSteps]
  );

  /**
   * Confirms manual capture on the highlighted capturable pit.
   */
  const confirmCapture = useCallback(
    (pitId: number): ActionResult<TurnStepResult> => {
      if (interactionState !== "WAITING_FOR_CAPTURE") {
        return { success: false, error: "Not waiting for capture confirmation" };
      }
      const expectedPit = gameRef.current.getAwaitingCapturePit();
      if (expectedPit !== pitId) {
        return {
          success: false,
          error: `Invalid capture pit ${pitId}; expected ${expectedPit}`,
        };
      }

      clearError();
      const res = gameRef.current.confirmCapture(pitId);
      if (!res.success) {
        setLastActionError(res.error);
        return res;
      }

      setHighlightedCapturePit(null);
      const finalState = gameRef.current.getState();
      setGameState(finalState);
      setIsAnimating(false);
      setActiveDropPit(null);
      setVisualHandSeeds(0);

      if (res.data.roundEnded && res.data.roundSettlement) {
        lastSettlementRef.current = res.data.roundSettlement;
        setSettlementSummary(res.data.roundSettlement);
        setReviewBoardState(res.data.roundSettlement.preSettlementState ?? null);
        setInteractionState("ROUND_SETTLEMENT");
      } else if (res.data.matchEnded && res.data.matchResult) {
        setMatchSummary(res.data.matchResult);
        setInteractionState("MATCH_COMPLETE");
      } else {
        setInteractionState("WAITING_FOR_START");
      }

      return res;
    },
    [interactionState, clearError]
  );

  /**
   * Claims an available bonus on a pit.
   * Works both during active sowing and after sowing has finished.
   */
  const claimBonus = useCallback(
    (pitId: number): ActionResult<ClaimBonusResult> => {
      if (isReviewingBoard || gameState.phase === "ROUND_SETTLEMENT") {
        return {
          success: false,
          error: "Cannot claim bonuses while reviewing the board or during round settlement.",
        };
      }

      clearError();
      const res = gameRef.current.claimBonus(pitId);
      if (!res.success) {
        setLastActionError(res.error);
      } else {
        const finalState = gameRef.current.getState();
        setGameState(finalState);

        if (res.data.roundEnded && res.data.roundSettlement) {
          lastSettlementRef.current = res.data.roundSettlement;
          setSettlementSummary(res.data.roundSettlement);
          setReviewBoardState(res.data.roundSettlement.preSettlementState ?? null);
        }
        if (res.data.matchEnded && res.data.matchResult) {
          setMatchSummary(res.data.matchResult);
        }
      }
      return res;
    },
    [isReviewingBoard, gameState.phase, clearError]
  );

  /**
   * Advances to next round after round settlement (Issue 8).
   * Guards against duplicate invocations.
   */
  const startNextRound = useCallback((): ActionResult<RoundSetupResult> => {
    if (gameState.phase !== "ROUND_SETTLEMENT") {
      return {
        success: false,
        error: `Cannot start next round: game is in phase ${gameState.phase}, expected ROUND_SETTLEMENT`,
      };
    }

    animationTimeoutsRef.current.forEach((t) => clearTimeout(t));
    animationTimeoutsRef.current = [];
    setIsAnimating(false);
    setActiveDropPit(null);
    setVisualHandSeeds(0);
    setIsReviewingBoard(false);
    setReviewBoardState(null);
    setSettlementSummary(null);
    lastSettlementRef.current = null;

    clearError();
    const res = gameRef.current.startNextRound();
    if (!res.success) {
      setLastActionError(res.error);
    } else {
      setGameState(gameRef.current.getState());
      setInteractionState("WAITING_FOR_START");
      setHighlightedContinuationPit(null);
      setHighlightedCapturePit(null);
    }
    return res;
  }, [clearError, gameState.phase]);

  /**
   * Restarts the match with a fresh board.
   */
  const restartMatch = useCallback((startingPlayer: Player = "PLAYER_1") => {
    animationTimeoutsRef.current.forEach((t) => clearTimeout(t));
    animationTimeoutsRef.current = [];
    setIsAnimating(false);
    setActiveDropPit(null);
    setVisualHandSeeds(0);
    setIsReviewingBoard(false);
    setReviewBoardState(null);
    setLastActionError(null);
    setSettlementSummary(null);
    lastSettlementRef.current = null;
    setMatchSummary(null);
    setHighlightedContinuationPit(null);
    setHighlightedCapturePit(null);
    setInteractionState("WAITING_FOR_START");

    gameRef.current = new ChannemaneGame(startingPlayer);
    setGameState(gameRef.current.getState());
  }, []);

  const effectiveGameState: GameState = useMemo(() => {
    if (isReviewingBoard && reviewBoardState) {
      return reviewBoardState;
    }
    return gameState;
  }, [isReviewingBoard, reviewBoardState, gameState]);

  const selectablePits = useMemo(() => {
    if (
      isAnimating ||
      isReviewingBoard ||
      gameState.phase === "ROUND_SETTLEMENT" ||
      interactionState !== "WAITING_FOR_START"
    ) {
      return [];
    }
    return gameRef.current.getSelectablePits();
  }, [isAnimating, isReviewingBoard, gameState, interactionState]);

  const claimableBonuses = useMemo(() => {
    if (isReviewingBoard || gameState.phase === "ROUND_SETTLEMENT") return [];
    return gameRef.current.getClaimableBonuses();
  }, [isReviewingBoard, gameState]);

  return {
    gameState: effectiveGameState,
    authoritativeGameState: gameState,
    isReviewingBoard,
    reviewBoardState,
    selectablePits,
    claimableBonuses,
    interactionState,
    highlightedContinuationPit,
    highlightedCapturePit,
    isAnimating,
    activeDropPit,
    visualHandSeeds,
    lastActionError,
    settlementSummary,
    matchSummary,
    dismissSettlementModal,
    reopenSettlementModal,
    dismissMatchModal,
    isRulesOpen,
    setIsRulesOpen,
    animationSettings,
    setAnimationSettings,
    toggleAnimationSpeed,
    selectPit,
    confirmContinuation,
    confirmCapture,
    claimBonus,
    startNextRound,
    restartMatch,
    clearError,
  };
}
