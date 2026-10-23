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
  GameMode,
  AIDifficulty,
} from "../../engine/types";
import { selectBeginnerMove, expertAIClient } from "../../engine/ai";
import type { TurnResult } from "../../engine/game";
import type { ClaimBonusResult } from "../../engine/bonus";
import type { RoundSetupResult } from "../../engine/roundSetup";
import type { RoundSettlementResult } from "../../engine/settlement";
import {
  isMatchOver,
  checkAndHandleMatchEnd,
  type MatchEndResult,
} from "../../engine/matchEnd";
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

  // Turn-Start Notification (Feature 3)
  turnNotification: string | null;
  dismissTurnNotification: () => void;

  // Modals & Controls
  isRulesOpen: boolean;
  setIsRulesOpen: (open: boolean) => void;
  animationSettings: AnimationSettings;
  setAnimationSettings: (settings: AnimationSettings) => void;
  toggleAnimationSpeed: () => void;

  // Game Mode & Difficulty
  gameMode: GameMode;
  aiDifficulty: AIDifficulty | null;
  aiPlayer: Player;
  setGameMode: (
    mode: GameMode,
    difficulty?: AIDifficulty | null,
    aiPlayer?: Player
  ) => void;
  setAiPlayer: (player: Player) => void;

  // Player Actions
  selectPit: (pitId: number) => ActionResult<TurnResult> | null;
  confirmContinuation: (pitId: number) => ActionResult<TurnStepResult>;
  confirmCapture: (pitId: number) => ActionResult<TurnStepResult>;
  claimBonus: (pitId: number) => ActionResult<ClaimBonusResult>;
  startNextRound: () => ActionResult<RoundSetupResult>;
  restartMatch: (
    startingPlayer?: Player,
    mode?: GameMode,
    difficulty?: AIDifficulty | null,
    aiPlayer?: Player,
    playerCount?: 2 | 3
  ) => void;
  clearError: () => void;
}

export function useChannemaneGame(
  initialStartingPlayer: Player = "PLAYER_1",
  initialAnimationSettings?: Partial<AnimationSettings>,
  initialGameState?: GameState,
  initialGameMode: GameMode = "local",
  initialDifficulty: AIDifficulty | null = null,
  initialAIPlayer: Player = "PLAYER_2",
  initialPlayerCount: 2 | 3 = 2
): UseChannemaneGameReturn {
  const [gameMode, setGameModeState] = useState<GameMode>(
    () => initialGameState?.gameMode ?? initialGameMode
  );
  const [aiDifficulty, setAiDifficultyState] = useState<AIDifficulty | null>(
    () => initialGameState?.aiDifficulty ?? initialDifficulty
  );
  const [aiPlayer, setAiPlayerState] = useState<Player>(
    () => initialGameState?.aiPlayer ?? initialAIPlayer
  );
  const [playerCount, setPlayerCount] = useState<2 | 3>(
    () => initialGameState?.playerCount ?? initialPlayerCount
  );

  const gameRef = useRef<ChannemaneGame>(
    new ChannemaneGame(
      initialStartingPlayer,
      initialGameState,
      initialGameState?.gameMode ?? initialGameMode,
      initialGameState?.aiDifficulty ?? initialDifficulty,
      initialGameState?.aiPlayer ?? initialAIPlayer,
      initialGameState?.playerCount ?? initialPlayerCount
    )
  );
  const [gameState, setGameState] = useState<GameState>(() =>
    gameRef.current.getState()
  );

  const [isReviewingBoard, setIsReviewingBoard] = useState<boolean>(false);
  const [reviewBoardState, setReviewBoardState] = useState<GameState | null>(null);

  const [interactionState, setInteractionState] = useState<InteractionState>(() => {
    const s = gameRef.current.getState();
    if (s.phase === "MATCH_END" || (s.phase === "ROUND_SETTLEMENT" && isMatchOver(s))) {
      return "MATCH_COMPLETE";
    }
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

  const [matchSummary, setMatchSummary] = useState<MatchEndResult | null>(() => {
    const s = gameRef.current.getState();
    if (s.phase === "MATCH_END" || (s.phase === "ROUND_SETTLEMENT" && isMatchOver(s))) {
      return checkAndHandleMatchEnd(s);
    }
    return null;
  });
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

  const [turnNotification, setTurnNotificationState] = useState<string | null>(null);
  const turnNotificationRef = useRef<string | null>(null);
  const setTurnNotification = useCallback((val: string | null) => {
    turnNotificationRef.current = val;
    setTurnNotificationState(val);
  }, []);
  const turnNotificationTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [turnCount, setTurnCount] = useState<number>(1);
  const lastNotifiedTurnIdRef = useRef<number>(0);

  const animationTimeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const aiTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const aiBonusTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Clear pending animation, AI, and notification timers on unmount
  useEffect(() => {
    return () => {
      animationTimeoutsRef.current.forEach((t) => clearTimeout(t));
      animationTimeoutsRef.current = [];
      if (aiTimeoutRef.current) {
        clearTimeout(aiTimeoutRef.current);
        aiTimeoutRef.current = null;
      }
      if (aiBonusTimeoutRef.current) {
        clearTimeout(aiBonusTimeoutRef.current);
        aiBonusTimeoutRef.current = null;
      }
      if (turnNotificationTimeoutRef.current) {
        clearTimeout(turnNotificationTimeoutRef.current);
        turnNotificationTimeoutRef.current = null;
      }
      expertAIClient.cancelPendingSearch();
    };
  }, []);

  const clearError = useCallback(() => {
    setLastActionError(null);
  }, []);

  const dismissSettlementModal = useCallback(() => {
    const currentState = gameRef.current.getState();
    if (
      gameState.phase === "MATCH_END" ||
      currentState.phase === "MATCH_END" ||
      isMatchOver(currentState) ||
      matchSummary !== null
    ) {
      return;
    }
    setSettlementSummary(null);
    setIsReviewingBoard(true);
  }, [gameState.phase, matchSummary]);

  const reopenSettlementModal = useCallback(() => {
    const currentState = gameRef.current.getState();
    if (
      gameState.phase === "MATCH_END" ||
      currentState.phase === "MATCH_END" ||
      isMatchOver(currentState) ||
      matchSummary !== null
    ) {
      return;
    }
    if (lastSettlementRef.current) {
      setSettlementSummary(lastSettlementRef.current);
    }
  }, [gameState.phase, matchSummary]);

  const dismissMatchModal = useCallback(() => {
    // When match is ended, dismiss is prevented so user stays on victor screen until Play Again
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
   * Centralized Gameplay Completion Handler
   * Strictly enforces priority:
   * 1. Update authoritative game state.
   * 2. If match has ended, transition to MATCH_COMPLETE, set matchSummary,
   *    and clear/suppress settlementSummary so modals never compete.
   * 3. Else if round has settled, transition to ROUND_SETTLEMENT and set settlementSummary.
   * 4. Otherwise return to WAITING_FOR_START.
   */
  const handleGameplayCompletion = useCallback(
    (outcome?: {
      roundEnded?: boolean;
      roundSettlement?: RoundSettlementResult;
      matchEnded?: boolean;
      matchResult?: MatchEndResult;
    }) => {
      setIsAnimating(false);
      setActiveDropPit(null);
      setVisualHandSeeds(0);
      setHighlightedContinuationPit(null);
      setHighlightedCapturePit(null);

      if (turnNotificationTimeoutRef.current) {
        clearTimeout(turnNotificationTimeoutRef.current);
        turnNotificationTimeoutRef.current = null;
      }
      setTurnNotification(null);

      const currentState = gameRef.current.getState();

      if (outcome?.roundSettlement) {
        lastSettlementRef.current = outcome.roundSettlement;
        setReviewBoardState(outcome.roundSettlement.preSettlementState ?? null);
      }

      const isMatchCompleted =
        Boolean(outcome?.matchEnded) ||
        Boolean(outcome?.matchResult?.isMatchEnd) ||
        currentState.phase === "MATCH_END" ||
        ((outcome?.roundEnded || currentState.phase === "ROUND_SETTLEMENT") &&
          isMatchOver(currentState));

      if (isMatchCompleted) {
        const finalMatchResult: MatchEndResult =
          outcome?.matchResult?.isMatchEnd
            ? outcome.matchResult
            : checkAndHandleMatchEnd(currentState);

        currentState.phase = "MATCH_END";
        if (finalMatchResult.winner) {
          currentState.winner = finalMatchResult.winner;
        }
        setGameState({ ...currentState });

        setMatchSummary(finalMatchResult);
        setSettlementSummary(null);
        setInteractionState("MATCH_COMPLETE");
        return;
      }

      if (outcome?.roundSettlement) {
        lastSettlementRef.current = outcome.roundSettlement;
      }

      const isRoundSettled =
        Boolean(outcome?.roundEnded) ||
        Boolean(outcome?.roundSettlement) ||
        currentState.phase === "ROUND_SETTLEMENT";

      if (isRoundSettled) {
        const settlement =
          outcome?.roundSettlement ??
          lastSettlementRef.current ??
          gameRef.current.getLastTurnResult()?.roundSettlement ??
          null;

        if (settlement) {
          lastSettlementRef.current = settlement;
          setGameState(currentState);
          setSettlementSummary(settlement);
          setMatchSummary(null);
          setInteractionState("ROUND_SETTLEMENT");
          return;
        }

        // Even if summary is missing, keep interaction state in ROUND_SETTLEMENT
        setGameState(currentState);
        setInteractionState("ROUND_SETTLEMENT");
        return;
      }

      setTurnCount((c) => c + 1);
      setGameState(currentState);
      setSettlementSummary(null);
      setMatchSummary(null);
      setInteractionState("WAITING_FOR_START");
    },
    []
  );

  /**
   * Schedules recursive stepping through the active distribution batch.
   * Pauses cleanly when reaching WAITING_FOR_CONTINUATION or WAITING_FOR_CAPTURE.
   */
  const scheduleSowingSteps = useCallback(
    (delay: number) => {
      // Clear any lingering pending timeouts before starting a new sequence
      animationTimeoutsRef.current.forEach((t) => clearTimeout(t));
      animationTimeoutsRef.current = [];

      const scheduleNext = () => {
        let timeout: ReturnType<typeof setTimeout>;
        timeout = setTimeout(() => {
          // Remove executed timeout reference
          animationTimeoutsRef.current = animationTimeoutsRef.current.filter((t) => t !== timeout);

          if (!gameRef.current.isTurnInProgress()) {
            const lastTurnRes = gameRef.current.getLastTurnResult();
            handleGameplayCompletion(lastTurnRes ?? undefined);
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
            handleGameplayCompletion(stepRes.data);
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
        gameRef.current.isTurnInProgress() ||
        turnNotificationRef.current !== null
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

        const lastTurnRes = gameRef.current.getLastTurnResult();
        handleGameplayCompletion(lastTurnRes ?? undefined);
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
    [isAnimating, isReviewingBoard, interactionState, gameState.phase, animationSettings, clearError, scheduleSowingSteps, turnNotification]
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
        const lastTurnRes = gameRef.current.getLastTurnResult();
        handleGameplayCompletion(lastTurnRes ?? undefined);
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
      handleGameplayCompletion(res.data);
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
        if (res.data.roundEnded || res.data.matchEnded) {
          animationTimeoutsRef.current.forEach((t) => clearTimeout(t));
          animationTimeoutsRef.current = [];
          setIsAnimating(false);
          setActiveDropPit(null);
          setVisualHandSeeds(0);
          handleGameplayCompletion(res.data);
        } else {
          setGameState(gameRef.current.getState());
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
    const currentState = gameRef.current.getState();
    if (
      gameState.phase === "MATCH_END" ||
      currentState.phase === "MATCH_END" ||
      (currentState.phase === "ROUND_SETTLEMENT" && isMatchOver(currentState)) ||
      matchSummary !== null
    ) {
      const errorMsg = "Cannot start next round: match is already completed.";
      setLastActionError(errorMsg);
      return {
        success: false,
        error: errorMsg,
      };
    }
    if (gameState.phase !== "ROUND_SETTLEMENT" && currentState.phase !== "ROUND_SETTLEMENT") {
      const errorMsg = `Cannot start next round: game is in phase ${gameState.phase}, expected ROUND_SETTLEMENT`;
      setLastActionError(errorMsg);
      return {
        success: false,
        error: errorMsg,
      };
    }

    clearError();
    const res = gameRef.current.startNextRound();
    if (!res.success) {
      setLastActionError(res.error);
      return res;
    }

    animationTimeoutsRef.current.forEach((t) => clearTimeout(t));
    animationTimeoutsRef.current = [];
    if (aiTimeoutRef.current) {
      clearTimeout(aiTimeoutRef.current);
      aiTimeoutRef.current = null;
    }
    if (aiBonusTimeoutRef.current) {
      clearTimeout(aiBonusTimeoutRef.current);
      aiBonusTimeoutRef.current = null;
    }
    if (turnNotificationTimeoutRef.current) {
      clearTimeout(turnNotificationTimeoutRef.current);
      turnNotificationTimeoutRef.current = null;
    }
    setTurnNotification(null);
    setTurnCount((c) => c + 1);

    setIsAnimating(false);
    setActiveDropPit(null);
    setVisualHandSeeds(0);
    setIsReviewingBoard(false);
    setReviewBoardState(null);
    setSettlementSummary(null);
    lastSettlementRef.current = null;

    setGameState(gameRef.current.getState());
    setInteractionState("WAITING_FOR_START");
    setHighlightedContinuationPit(null);
    setHighlightedCapturePit(null);
    return res;
  }, [clearError, gameState.phase, matchSummary]);

  /**
   * Sets game mode and AI difficulty.
   */
  const setGameMode = useCallback(
    (
      mode: GameMode,
      difficulty: AIDifficulty | null = null,
      newAiPlayer: Player = "PLAYER_2"
    ) => {
      if (aiTimeoutRef.current) {
        clearTimeout(aiTimeoutRef.current);
        aiTimeoutRef.current = null;
      }
      if (aiBonusTimeoutRef.current) {
        clearTimeout(aiBonusTimeoutRef.current);
        aiBonusTimeoutRef.current = null;
      }
      if (turnNotificationTimeoutRef.current) {
        clearTimeout(turnNotificationTimeoutRef.current);
        turnNotificationTimeoutRef.current = null;
      }
      setTurnNotification(null);
      setTurnCount((c) => c + 1);
      lastNotifiedTurnIdRef.current = 0;

      setGameModeState(mode);
      setAiDifficultyState(difficulty);
      setAiPlayerState(newAiPlayer);
      if (mode === "ai") {
        setPlayerCount(2);
      }
      gameRef.current.setGameMode(mode, difficulty, newAiPlayer);
      setGameState(gameRef.current.getState());
    },
    []
  );

  const setAiPlayer = useCallback((player: Player) => {
    setAiPlayerState(player);
    const currentMode = gameRef.current.getGameMode();
    const currentDiff = gameRef.current.getAIDifficulty();
    gameRef.current.setGameMode(currentMode, currentDiff, player);
    setGameState(gameRef.current.getState());
  }, []);

  /**
   * Restarts the match with a fresh board.
   */
  const restartMatch = useCallback(
    (
      startingPlayer: Player = "PLAYER_1",
      mode?: GameMode,
      difficulty?: AIDifficulty | null,
      newAiPlayer?: Player,
      newPlayerCount?: 2 | 3
    ) => {
      animationTimeoutsRef.current.forEach((t) => clearTimeout(t));
      animationTimeoutsRef.current = [];
      if (aiTimeoutRef.current) {
        clearTimeout(aiTimeoutRef.current);
        aiTimeoutRef.current = null;
      }
      if (aiBonusTimeoutRef.current) {
        clearTimeout(aiBonusTimeoutRef.current);
        aiBonusTimeoutRef.current = null;
      }
      expertAIClient.cancelPendingSearch();
      if (turnNotificationTimeoutRef.current) {
        clearTimeout(turnNotificationTimeoutRef.current);
        turnNotificationTimeoutRef.current = null;
      }
      setTurnNotification(null);
      setTurnCount((c) => c + 1);
      lastNotifiedTurnIdRef.current = 0;

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

      const chosenMode = mode ?? gameMode;
      const chosenDiff = difficulty !== undefined ? difficulty : aiDifficulty;
      const chosenAiPlayer = newAiPlayer ?? aiPlayer;
      const chosenPlayerCount: 2 | 3 =
        chosenMode === "ai"
          ? 2
          : (newPlayerCount ?? (mode ? 2 : playerCount));
      setGameModeState(chosenMode);
      setAiDifficultyState(chosenDiff);
      setAiPlayerState(chosenAiPlayer);
      setPlayerCount(chosenPlayerCount);

      gameRef.current = new ChannemaneGame(
        startingPlayer,
        undefined,
        chosenMode,
        chosenDiff,
        chosenAiPlayer,
        chosenPlayerCount
      );
      setGameState(gameRef.current.getState());
    },
    [gameMode, aiDifficulty, aiPlayer, playerCount]
  );

  const effectiveGameState: GameState = useMemo(() => {
    if (isReviewingBoard && reviewBoardState) {
      return reviewBoardState;
    }
    return gameState;
  }, [isReviewingBoard, reviewBoardState, gameState]);

  const dismissTurnNotification = useCallback(() => {
    if (turnNotificationTimeoutRef.current) {
      clearTimeout(turnNotificationTimeoutRef.current);
      turnNotificationTimeoutRef.current = null;
    }
    setTurnNotification(null);
  }, []);

  /**
   * Turn-Start Notification Effect (Feature 3 & Local Multiplayer)
   * Displays "Your turn" or "AI turn" (in AI mode) or "Player X's Turn" (in Local mode)
   * transient popup before each player's turn begins.
   * Disables player interactions and delays AI decision-making for ~800ms.
   */
  useEffect(() => {
    if (
      (gameMode !== "ai" && gameMode !== "local") ||
      gameState.phase !== "PLAYING" ||
      interactionState !== "WAITING_FOR_START" ||
      isAnimating ||
      isReviewingBoard ||
      settlementSummary !== null ||
      matchSummary !== null
    ) {
      return;
    }

    if (lastNotifiedTurnIdRef.current === turnCount) {
      return;
    }

    lastNotifiedTurnIdRef.current = turnCount;
    let notificationText: string;
    if (gameMode === "ai") {
      const currentAI = gameState.aiPlayer ?? aiPlayer ?? "PLAYER_2";
      notificationText =
        gameState.currentPlayer === currentAI ? "AI turn" : "Your turn";
    } else {
      notificationText =
        gameState.currentPlayer === "PLAYER_1"
          ? "Player 1's Turn"
          : gameState.currentPlayer === "PLAYER_2"
          ? "Player 2's Turn"
          : "Player 3's Turn";
    }

    setTurnNotification(notificationText);

    if (turnNotificationTimeoutRef.current) {
      clearTimeout(turnNotificationTimeoutRef.current);
    }

    const duration = 800;
    turnNotificationTimeoutRef.current = setTimeout(() => {
      turnNotificationTimeoutRef.current = null;
      setTurnNotification(null);
    }, duration);
  }, [
    gameMode,
    gameState.phase,
    gameState.currentPlayer,
    gameState.aiPlayer,
    aiPlayer,
    interactionState,
    isAnimating,
    isReviewingBoard,
    settlementSummary,
    matchSummary,
    turnCount,
  ]);

  /**
   * AI Turn Orchestration & Auto-Bonus Effect (Beginner & Expert)
   * Seamlessly coordinates AI turns:
   * 1. Confirms gameMode === "ai", aiDifficulty is "beginner" | "expert", and phase === "PLAYING".
   * 2. Automatically claims AI-owned bonuses (never human bonuses), during both AI & human turns.
   * 3. Waits until any active turn-notification finishes before initiating moves.
   * 4. Selects legal starting pits after a brief thinking pause (using Beginner heuristic or Expert search).
   * 5. Automatically confirms continuation and capture when paused.
   * 6. Cleanly cancels pending timers and in-flight searches on unmount, mode switch, or match completion.
   */
  useEffect(() => {
    if (aiTimeoutRef.current) {
      clearTimeout(aiTimeoutRef.current);
      aiTimeoutRef.current = null;
    }
    if (aiBonusTimeoutRef.current) {
      clearTimeout(aiBonusTimeoutRef.current);
      aiBonusTimeoutRef.current = null;
    }
    expertAIClient.cancelPendingSearch();

    if (
      gameMode !== "ai" ||
      (aiDifficulty !== "beginner" && aiDifficulty !== "expert" && aiDifficulty !== "master") ||
      gameState.phase !== "PLAYING" ||
      isAnimating ||
      isReviewingBoard ||
      turnNotification !== null
    ) {
      return;
    }

    const currentAI = gameState.aiPlayer ?? aiPlayer ?? "PLAYER_2";

    // Feature 1: AI Auto-Collect Bonuses that belong to AI
    const aiBonuses = gameRef.current
      .getClaimableBonuses(currentAI)
      .filter((id) => gameState.pits[id]?.owner === currentAI);

    if (aiBonuses.length > 0) {
      const bonusDelay = animationSettings.enabled ? 250 : 0;
      aiBonusTimeoutRef.current = setTimeout(() => {
        aiBonusTimeoutRef.current = null;
        claimBonus(aiBonuses[0]);
      }, bonusDelay);
      return;
    }

    // AI Turn actions require active turn to belong to AI player
    if (gameState.currentPlayer !== currentAI) {
      return;
    }

    // A. AI Starting Pit Selection
    if (interactionState === "WAITING_FOR_START") {
      if (aiDifficulty === "beginner") {
        const chosenPit = selectBeginnerMove(gameState, currentAI);
        if (chosenPit === null) {
          return;
        }

        const thinkingDelay = animationSettings.enabled ? 500 : 0;
        aiTimeoutRef.current = setTimeout(() => {
          aiTimeoutRef.current = null;
          const current = gameRef.current.getState();
          if (
            current.phase === "PLAYING" &&
            current.currentPlayer === currentAI &&
            !gameRef.current.isTurnInProgress()
          ) {
            const pitToPlay = selectBeginnerMove(current, currentAI) ?? chosenPit;
            if (pitToPlay !== null) {
              selectPit(pitToPlay);
            }
          }
        }, thinkingDelay);
        return;
      }

      if (aiDifficulty === "expert") {
        const thinkingDelay = animationSettings.enabled ? 300 : 0;
        aiTimeoutRef.current = setTimeout(async () => {
          aiTimeoutRef.current = null;
          const current = gameRef.current.getState();
          if (
            current.phase === "PLAYING" &&
            current.currentPlayer === currentAI &&
            !gameRef.current.isTurnInProgress()
          ) {
            try {
              const result = await expertAIClient.requestDecision(current, currentAI);
              const pitToPlay = result.pitId;
              const freshState = gameRef.current.getState();
              if (
                pitToPlay !== null &&
                freshState.phase === "PLAYING" &&
                freshState.currentPlayer === currentAI &&
                !gameRef.current.isTurnInProgress()
              ) {
                selectPit(pitToPlay);
              }
            } catch {
              // Ignore canceled search requests
            }
          }
        }, thinkingDelay);
        return;
      }

      if (aiDifficulty === "master") {
        const thinkingDelay = animationSettings.enabled ? 300 : 0;
        aiTimeoutRef.current = setTimeout(async () => {
          aiTimeoutRef.current = null;
          const current = gameRef.current.getState();
          if (
            current.phase === "PLAYING" &&
            current.currentPlayer === currentAI &&
            !gameRef.current.isTurnInProgress()
          ) {
            try {
              const result = await expertAIClient.requestMasterDecision(current, currentAI);
              const pitToPlay = result.pitId;
              const freshState = gameRef.current.getState();
              if (
                pitToPlay !== null &&
                freshState.phase === "PLAYING" &&
                freshState.currentPlayer === currentAI &&
                !gameRef.current.isTurnInProgress()
              ) {
                selectPit(pitToPlay);
              }
            } catch {
              // Ignore canceled search requests
            }
          }
        }, thinkingDelay);
        return;
      }
    }

    // B. AI Continuous Sowing Confirmation
    if (
      interactionState === "WAITING_FOR_CONTINUATION" &&
      highlightedContinuationPit !== null
    ) {
      const continuationDelay = animationSettings.enabled ? 350 : 0;
      aiTimeoutRef.current = setTimeout(() => {
        aiTimeoutRef.current = null;
        confirmContinuation(highlightedContinuationPit);
      }, continuationDelay);
      return;
    }

    // C. AI Capture Confirmation
    if (
      interactionState === "WAITING_FOR_CAPTURE" &&
      highlightedCapturePit !== null
    ) {
      const captureDelay = animationSettings.enabled ? 350 : 0;
      aiTimeoutRef.current = setTimeout(() => {
        aiTimeoutRef.current = null;
        confirmCapture(highlightedCapturePit);
      }, captureDelay);
      return;
    }

    return () => {
      if (aiTimeoutRef.current) {
        clearTimeout(aiTimeoutRef.current);
        aiTimeoutRef.current = null;
      }
      if (aiBonusTimeoutRef.current) {
        clearTimeout(aiBonusTimeoutRef.current);
        aiBonusTimeoutRef.current = null;
      }
      expertAIClient.cancelPendingSearch();
    };
  }, [
    gameMode,
    aiDifficulty,
    aiPlayer,
    gameState,
    interactionState,
    isAnimating,
    isReviewingBoard,
    turnNotification,
    highlightedContinuationPit,
    highlightedCapturePit,
    animationSettings.enabled,
    selectPit,
    confirmContinuation,
    confirmCapture,
    claimBonus,
  ]);

  const selectablePits = useMemo(() => {
    if (
      isAnimating ||
      isReviewingBoard ||
      gameState.phase === "ROUND_SETTLEMENT" ||
      gameState.phase === "MATCH_END" ||
      interactionState !== "WAITING_FOR_START" ||
      turnNotification !== null
    ) {
      return [];
    }
    const currentAI = gameState.aiPlayer ?? aiPlayer ?? "PLAYER_2";
    if (gameMode === "ai" && gameState.currentPlayer === currentAI) {
      return [];
    }
    return gameRef.current.getSelectablePits();
  }, [isAnimating, isReviewingBoard, gameState, interactionState, gameMode, aiPlayer, turnNotification]);

  const claimableBonuses = useMemo(() => {
    if (
      isReviewingBoard ||
      gameState.phase === "ROUND_SETTLEMENT" ||
      gameState.phase === "MATCH_END"
    )
      return [];
    return gameRef.current.getClaimableBonuses();
  }, [isReviewingBoard, gameState]);

  return {
    gameState: effectiveGameState,
    authoritativeGameState: gameState,
    gameMode,
    aiDifficulty,
    aiPlayer,
    turnNotification,
    dismissTurnNotification,
    setGameMode,
    setAiPlayer,
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
