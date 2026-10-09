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
  Pit,
  TurnAnimationEvent,
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
  const [visualPits, setVisualPits] = useState<Pit[] | null>(null);
  const [visualPlayers, setVisualPlayers] = useState<
    GameState["players"] | null
  >(null);

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
      if (isAnimating) {
        return null;
      }

      if (gameState.phase === "MATCH_END") {
        setLastActionError(
          "The match has ended. Start a new game to play again."
        );
        return null;
      }

      clearError();
      const result = gameRef.current.selectPit(pitId);

      if (!result.success) {
        setLastActionError(result.error);
        return result;
      }

      const turnResult = result.data;
      const events: TurnAnimationEvent[] = turnResult.animationEvents ?? [];

      // Handle real-time animation sequence
      if (animationSettings.enabled && events.length > 0) {
        setIsAnimating(true);
        const delay = animationSettings.stepDelayMs;

        // Mutable snapshot for step-by-step updates
        const currentPits = gameState.pits.map((p) => ({ ...p }));
        let currentHand = 0;
        let p1Storage = gameState.players.player1.storage;
        let p2Storage = gameState.players.player2.storage;

        // Step 1: Immediate Pickup representation on user click (Issue 6)
        if (events[0]?.type === "PICKUP") {
          const pickupEvent = events[0];
          const pit = currentPits[pickupEvent.pitId];
          if (pit) {
            pit.seeds = 0;
            pit.bonusAvailable = false;
          }
          currentHand = pickupEvent.seedsPickedUp;
          setActiveDropPit(pickupEvent.pitId);
          setVisualHandSeeds(currentHand);
          setVisualPits(currentPits.map((p) => ({ ...p })));
        }

        // Subsequent steps (drops, scoops, captures) scheduled with sequential delay
        const dropEvents = events.slice(1);
        dropEvents.forEach((event, idx) => {
          const timeout = setTimeout(() => {
            if (event.type === "DROP") {
              const pit = currentPits[event.pitId];
              if (pit) {
                pit.seeds = event.resultingSeeds;
                if (event.bonusTriggered) {
                  pit.bonusAvailable = true;
                }
                if (event.resultingSeeds === 5) {
                  pit.bonusAvailable = false;
                }
              }
              currentHand = event.seedsRemainingInHand;
              setActiveDropPit(event.pitId);
              setVisualHandSeeds(currentHand);
              setVisualPits(currentPits.map((p) => ({ ...p })));
            } else if (event.type === "SCOOP") {
              const pit = currentPits[event.pitId];
              if (pit) {
                pit.seeds = 0;
                pit.bonusAvailable = false;
              }
              currentHand = event.seedsScooped;
              setActiveDropPit(event.pitId);
              setVisualHandSeeds(currentHand);
              setVisualPits(currentPits.map((p) => ({ ...p })));
            } else if (event.type === "CAPTURE") {
              const pit = currentPits[event.capturedPitId];
              if (pit) {
                pit.seeds = 0;
                pit.bonusAvailable = false;
              }
              if (event.capturingPlayer === "PLAYER_1") {
                p1Storage = event.newStorageTotal;
              } else {
                p2Storage = event.newStorageTotal;
              }
              setActiveDropPit(event.capturedPitId);
              setVisualPits(currentPits.map((p) => ({ ...p })));
              setVisualPlayers({
                player1: { ...gameState.players.player1, storage: p1Storage },
                player2: { ...gameState.players.player2, storage: p2Storage },
              });
            }
          }, (idx + 1) * delay);
          animationTimeoutsRef.current.push(timeout);
        });

        // Conclude animation and sync final authoritative state
        const endTimeout = setTimeout(() => {
          setIsAnimating(false);
          setActiveDropPit(null);
          setVisualHandSeeds(0);
          setVisualPits(null);
          setVisualPlayers(null);
          const finalState = gameRef.current.getState();
          setGameState(finalState);

          if (turnResult.roundEnded && turnResult.roundSettlement) {
            lastSettlementRef.current = turnResult.roundSettlement;
            setSettlementSummary(turnResult.roundSettlement);
          }
          if (turnResult.matchEnded && turnResult.matchResult) {
            setMatchSummary(turnResult.matchResult);
          }
        }, (dropEvents.length + 1) * delay);

        animationTimeoutsRef.current.push(endTimeout);
      } else {
        // Direct synchronous update
        const finalState = gameRef.current.getState();
        setGameState(finalState);
        if (turnResult.roundEnded && turnResult.roundSettlement) {
          lastSettlementRef.current = turnResult.roundSettlement;
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
   * Claims an available bonus on a pit (Issues 1 & 2).
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

        // Also update visual state if currently animating
        setVisualPits((prev) => {
          if (!prev) return null;
          return prev.map((p) =>
            p.id === pitId ? { ...p, seeds: 0, bonusAvailable: false } : p
          );
        });

        // Ensure visualPlayers reflects the updated storage immediately if active during animation
        setVisualPlayers((prev) => {
          if (!prev) return null;
          return {
            player1: { ...finalState.players.player1 },
            player2: { ...finalState.players.player2 },
          };
        });

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
    setVisualPits(null);
    setVisualPlayers(null);
    setLastActionError(null);
    setSettlementSummary(null);
    lastSettlementRef.current = null;
    setMatchSummary(null);

    gameRef.current = new ChannemaneGame(startingPlayer);
    setGameState(gameRef.current.getState());
  }, []);

  const effectiveGameState: GameState = useMemo(() => {
    if (!isAnimating || !visualPits) {
      return gameState;
    }
    return {
      ...gameState,
      pits: visualPits,
      players: visualPlayers ?? gameState.players,
    };
  }, [gameState, isAnimating, visualPits, visualPlayers]);

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
