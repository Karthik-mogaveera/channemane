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

export interface UseChannemaneGameReturn {
  // Authoritative & Visual Game State
  gameState: GameState;
  selectablePits: number[];
  claimableBonuses: number[];

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
  claimBonus: (pitId: number) => ActionResult<ClaimBonusResult>;
  startNextRound: () => ActionResult<RoundSetupResult>;
  restartMatch: (startingPlayer?: Player) => void;
  clearError: () => void;
}

export function useChannemaneGame(
  initialStartingPlayer: Player = "PLAYER_1",
  initialAnimationSettings?: Partial<AnimationSettings>
): UseChannemaneGameReturn {
  const gameRef = useRef<ChannemaneGame>(
    new ChannemaneGame(initialStartingPlayer)
  );
  const [gameState, setGameState] = useState<GameState>(() =>
    gameRef.current.getState()
  );

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
   * Selects a pit and executes a player turn through the engine.
   * Coordinates sequential real-time sowing animations (Issues 3 & 6).
   */
  const selectPit = useCallback(
    (pitId: number): ActionResult<TurnResult> | null => {
      if (isAnimating || gameRef.current.isTurnInProgress()) {
        return null;
      }

      if (gameState.phase === "MATCH_END") {
        setLastActionError(
          "The match has ended. Start a new game to play again."
        );
        return null;
      }

      clearError();
      const startRes = gameRef.current.startTurn(pitId);
      if (!startRes.success) {
        setLastActionError(startRes.error);
        return { success: false, error: startRes.error };
      }

      // Pickup immediately reflected in authoritative state (Issue 6)
      const pickupState = gameRef.current.getState();
      setGameState(pickupState);
      setActiveDropPit(pitId);
      setVisualHandSeeds(pickupState.seedsInHand);

      const delay = animationSettings.enabled
        ? animationSettings.stepDelayMs
        : 0;

      if (delay === 0) {
        // Fast/instant execution
        while (gameRef.current.isTurnInProgress()) {
          gameRef.current.stepTurn();
        }
        const finalState = gameRef.current.getState();
        setGameState(finalState);
        setActiveDropPit(null);
        setVisualHandSeeds(0);
        const lastTurnRes = gameRef.current.getLastTurnResult();
        if (lastTurnRes?.roundEnded && lastTurnRes.roundSettlement) {
          lastSettlementRef.current = lastTurnRes.roundSettlement;
          setSettlementSummary(lastTurnRes.roundSettlement);
        }
        if (lastTurnRes?.matchEnded && lastTurnRes.matchResult) {
          setMatchSummary(lastTurnRes.matchResult);
        }
        return { success: true, data: lastTurnRes! };
      }

      setIsAnimating(true);

      const scheduleNextStep = () => {
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
            }
            if (lastTurnRes?.matchEnded && lastTurnRes.matchResult) {
              setMatchSummary(lastTurnRes.matchResult);
            }
            return;
          }

          const stepRes = gameRef.current.stepTurn();
          const currentState = gameRef.current.getState();
          setGameState(currentState);
          setVisualHandSeeds(currentState.seedsInHand);
          if (stepRes.success && stepRes.data.pitId !== undefined) {
            setActiveDropPit(stepRes.data.pitId);
          }

          if (stepRes.success && stepRes.data.isComplete) {
            setIsAnimating(false);
            setActiveDropPit(null);
            setVisualHandSeeds(0);
            if (stepRes.data.roundEnded && stepRes.data.roundSettlement) {
              lastSettlementRef.current = stepRes.data.roundSettlement;
              setSettlementSummary(stepRes.data.roundSettlement);
            }
            if (stepRes.data.matchEnded && stepRes.data.matchResult) {
              setMatchSummary(stepRes.data.matchResult);
            }
          } else {
            scheduleNextStep();
          }
        }, delay);

        animationTimeoutsRef.current.push(timeout);
      };

      scheduleNextStep();

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
    [isAnimating, gameState.phase, animationSettings, clearError]
  );

  /**
   * Claims an available bonus on a pit.
   * Works both during active sowing and after sowing has finished.
   */
  const claimBonus = useCallback(
    (pitId: number): ActionResult<ClaimBonusResult> => {
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
        }
        if (res.data.matchEnded && res.data.matchResult) {
          setMatchSummary(res.data.matchResult);
        }
      }
      return res;
    },
    [clearError]
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

    clearError();
    const res = gameRef.current.startNextRound();
    if (!res.success) {
      setLastActionError(res.error);
    } else {
      setSettlementSummary(null);
      lastSettlementRef.current = null;
      setGameState(gameRef.current.getState());
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
    setLastActionError(null);
    setSettlementSummary(null);
    lastSettlementRef.current = null;
    setMatchSummary(null);

    gameRef.current = new ChannemaneGame(startingPlayer);
    setGameState(gameRef.current.getState());
  }, []);

  const effectiveGameState: GameState = gameState;

  const selectablePits = useMemo(() => {
    if (isAnimating) return [];
    return gameRef.current.getSelectablePits();
  }, [isAnimating, gameState]);

  const claimableBonuses = useMemo(() => {
    return gameRef.current.getClaimableBonuses();
  }, [gameState]);

  return {
    gameState: effectiveGameState,
    selectablePits,
    claimableBonuses,
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
    claimBonus,
    startNextRound,
    restartMatch,
    clearError,
  };
}
