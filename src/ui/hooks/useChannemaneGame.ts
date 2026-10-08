/**
 * Engine-UI Controller Adapter Hook
 * Connects the headless ChannemaneGame engine to reactive React UI state.
 * Strictly adheres to single source of truth: does NOT duplicate game rules.
 */

import { useState, useCallback, useRef, useEffect } from "react";
import { ChannemaneGame } from "../../engine/simulation";
import type {
  GameState,
  Player,
  ActionResult,
  SowStep,
} from "../../engine/types";
import type { TurnResult } from "../../engine/game";
import type { ClaimBonusResult } from "../../engine/bonus";
import type { RoundSetupResult } from "../../engine/roundSetup";
import type { RoundSettlementResult } from "../../engine/settlement";
import type { MatchEndResult } from "../../engine/matchEnd";

export interface AnimationSettings {
  enabled: boolean;
  stepDelayMs: number;
}

export interface UseChannemaneGameReturn {
  // Authoritative Engine State
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
  dismissMatchModal: () => void;

  // Modals & Controls
  isRulesOpen: boolean;
  setIsRulesOpen: (open: boolean) => void;
  animationSettings: AnimationSettings;
  setAnimationSettings: (settings: AnimationSettings) => void;

  // Player Actions
  selectPit: (pitId: number) => ActionResult<TurnResult> | null;
  claimBonus: (pitId: number) => ActionResult<ClaimBonusResult>;
  startNextRound: () => ActionResult<RoundSetupResult>;
  restartMatch: (startingPlayer?: Player) => void;
  clearError: () => void;
}

export function useChannemaneGame(
  initialStartingPlayer: Player = "PLAYER_1",
  initialAnimationSettings: AnimationSettings = { enabled: true, stepDelayMs: 140 }
): UseChannemaneGameReturn {
  const gameRef = useRef<ChannemaneGame>(new ChannemaneGame(initialStartingPlayer));
  const [gameState, setGameState] = useState<GameState>(() => gameRef.current.getState());

  const [isAnimating, setIsAnimating] = useState<boolean>(false);
  const [activeDropPit, setActiveDropPit] = useState<number | null>(null);
  const [visualHandSeeds, setVisualHandSeeds] = useState<number>(0);
  const [lastActionError, setLastActionError] = useState<string | null>(null);

  const [settlementSummary, setSettlementSummary] = useState<RoundSettlementResult | null>(null);
  const [matchSummary, setMatchSummary] = useState<MatchEndResult | null>(null);
  const [isRulesOpen, setIsRulesOpen] = useState<boolean>(false);
  const [animationSettings, setAnimationSettings] = useState<AnimationSettings>(initialAnimationSettings);

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

  const dismissMatchModal = useCallback(() => {
    setMatchSummary(null);
  }, []);

  /**
   * Selects a pit and executes a player turn through the engine.
   * Coordinates sequential sowing animations if enabled.
   */
  const selectPit = useCallback(
    (pitId: number): ActionResult<TurnResult> | null => {
      if (isAnimating) {
        return null;
      }

      if (gameState.phase === "MATCH_END") {
        setLastActionError("The match has ended. Start a new game to play again.");
        return null;
      }

      clearError();
      const result = gameRef.current.selectPit(pitId);

      if (!result.success) {
        setLastActionError(result.error);
        return result;
      }

      const turnResult = result.data;

      // Handle animation sequence
      if (animationSettings.enabled && turnResult.sowResult.steps.length > 0) {
        setIsAnimating(true);
        const steps: SowStep[] = turnResult.sowResult.steps;
        const delay = animationSettings.stepDelayMs;

        // Visual pickup initial state
        setVisualHandSeeds(gameState.pits[pitId]?.seeds ?? 0);

        steps.forEach((step, index) => {
          const timeout = setTimeout(() => {
            setActiveDropPit(step.pitId);
            setVisualHandSeeds(step.seedsRemainingInHand);
          }, (index + 1) * delay);
          animationTimeoutsRef.current.push(timeout);
        });

        // Conclude animation and sync final authoritative state
        const endTimeout = setTimeout(() => {
          setIsAnimating(false);
          setActiveDropPit(null);
          setVisualHandSeeds(0);
          setGameState(gameRef.current.getState());

          if (turnResult.roundEnded && turnResult.roundSettlement) {
            setSettlementSummary(turnResult.roundSettlement);
          }
          if (turnResult.matchEnded && turnResult.matchResult) {
            setMatchSummary(turnResult.matchResult);
          }
        }, (steps.length + 1) * delay);

        animationTimeoutsRef.current.push(endTimeout);
      } else {
        // Direct synchronous update
        setGameState(gameRef.current.getState());
        if (turnResult.roundEnded && turnResult.roundSettlement) {
          setSettlementSummary(turnResult.roundSettlement);
        }
        if (turnResult.matchEnded && turnResult.matchResult) {
          setMatchSummary(turnResult.matchResult);
        }
      }

      return result;
    },
    [isAnimating, gameState, animationSettings, clearError]
  );

  /**
   * Claims an available bonus on a pit.
   */
  const claimBonus = useCallback(
    (pitId: number): ActionResult<ClaimBonusResult> => {
      clearError();
      const res = gameRef.current.claimBonus(pitId);
      if (!res.success) {
        setLastActionError(res.error);
      } else {
        setGameState(gameRef.current.getState());
      }
      return res;
    },
    [clearError]
  );

  /**
   * Advances to next round after round settlement.
   */
  const startNextRound = useCallback((): ActionResult<RoundSetupResult> => {
    clearError();
    const res = gameRef.current.startNextRound();
    if (!res.success) {
      setLastActionError(res.error);
    } else {
      setSettlementSummary(null);
      setGameState(gameRef.current.getState());
    }
    return res;
  }, [clearError]);

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
    setMatchSummary(null);

    gameRef.current = new ChannemaneGame(startingPlayer);
    setGameState(gameRef.current.getState());
  }, []);

  const selectablePits = gameRef.current.getSelectablePits();
  const claimableBonuses = gameRef.current.getClaimableBonuses();

  return {
    gameState,
    selectablePits,
    claimableBonuses,
    isAnimating,
    activeDropPit,
    visualHandSeeds,
    lastActionError,
    settlementSummary,
    matchSummary,
    dismissSettlementModal,
    dismissMatchModal,
    isRulesOpen,
    setIsRulesOpen,
    animationSettings,
    setAnimationSettings,
    selectPit,
    claimBonus,
    startNextRound,
    restartMatch,
    clearError,
  };
}
