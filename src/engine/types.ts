/**
 * Authoritative Channemane Game Types and State Models
 * Strictly follows Phase 1 & Phase 2 Specification
 */

export type Player = "PLAYER_1" | "PLAYER_2";

export type PitStatus = "OPEN" | "CLOSED";

export type GamePhase =
  | "GAME_START"
  | "ROUND_SETUP"
  | "PLAYING"
  | "ROUND_SETTLEMENT"
  | "MATCH_END";

export type TurnPhase =
  | "PLAYER_TURN"
  | "PIT_SELECTED"
  | "SOWING"
  | "CONTINUOUS_SOWING"
  | "CAPTURE_CHECK"
  | "TURN_END";

/**
 * Pit representation (Section 15)
 */
export interface Pit {
  id: number;
  owner: Player;
  seeds: number;
  status: PitStatus;
  bonusAvailable: boolean;
}

/**
 * Player state representation (Section 15)
 */
export interface PlayerState {
  storage: number;
  roundCaptured: number;
  roundWins: number;
}

/**
 * Authoritative Game State representation
 */
export interface GameState {
  round: number;
  phase: GamePhase;
  turnPhase: TurnPhase;

  currentPlayer: Player;
  startingPlayer: Player;

  pits: Pit[];

  players: {
    player1: PlayerState;
    player2: PlayerState;
  };

  /**
   * Seeds currently held in hand during active sowing (default 0).
   * Ensures the 70-seed conservation invariant is mathematically true
   * even during mid-sowing step execution.
   */
  seedsInHand: number;

  selectedPit: number | null;
  lastPit: number | null;

  winner: Player | null;
  roundWinner: Player | null;
}

/**
 * Result wrapper for deterministic state mutations and validations
 */
export type ActionResult<T = GameState> =
  | { success: true; data: T }
  | { success: false; error: string };

/**
 * Sowing step event for replay, headless simulation, and UI animation
 */
export interface SowStep {
  pitId: number;
  seedsPlaced: number;
  resultingSeeds: number;
  bonusTriggered: boolean;
  bonusOwner: Player | null;
  seedsRemainingInHand: number;
}

/**
 * Deterministic fine-grained turn animation events for real-time visualization (Issue 6)
 */
export type TurnAnimationEvent =
  | {
      type: "PICKUP";
      pitId: number;
      seedsPickedUp: number;
    }
  | {
      type: "DROP";
      pitId: number;
      seedsPlaced: number;
      resultingSeeds: number;
      seedsRemainingInHand: number;
      bonusTriggered: boolean;
      bonusOwner: Player | null;
    }
  | {
      type: "SCOOP";
      pitId: number;
      seedsScooped: number;
    }
  | {
      type: "CAPTURE";
      capturedPitId: number;
      capturingPlayer: Player;
      seedsCaptured: number;
      newStorageTotal: number;
    };

/**
 * Type guard for Player
 */
export function isPlayer(value: unknown): value is Player {
  return value === "PLAYER_1" || value === "PLAYER_2";
}

/**
 * Type guard for PitStatus
 */
export function isPitStatus(value: unknown): value is PitStatus {
  return value === "OPEN" || value === "CLOSED";
}

/**
 * Type guard for GamePhase
 */
export function isGamePhase(value: unknown): value is GamePhase {
  return (
    typeof value === "string" &&
    [
      "GAME_START",
      "ROUND_SETUP",
      "PLAYING",
      "ROUND_SETTLEMENT",
      "MATCH_END",
    ].includes(value)
  );
}

/**
 * Type guard for TurnPhase
 */
export function isTurnPhase(value: unknown): value is TurnPhase {
  return (
    typeof value === "string" &&
    [
      "PLAYER_TURN",
      "PIT_SELECTED",
      "SOWING",
      "CONTINUOUS_SOWING",
      "CAPTURE_CHECK",
      "TURN_END",
    ].includes(value)
  );
}
