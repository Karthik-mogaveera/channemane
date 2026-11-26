/**
 * Engine-to-Visual Events Adapter
 * Transforms engine turn animation events into high-level 3D visual animation payloads.
 */

import type { TurnAnimationEvent, Player } from "../engine/types";
import type { RoundSettlementResult } from "../engine/settlement";
import { resolvePlayerCount, type SupportedPlayerCount } from "../three/config/boardVisualConfigs";

export type VisualEventType =
  | "LIFT_FROM_PIT"
  | "DROP_INTO_PIT"
  | "SCOOP_FROM_PIT"
  | "CAPTURE_TO_STORAGE"
  | "CLAIM_BONUS_TO_STORAGE"
  | "ROUND_SETTLEMENT"
  | "ROUND_RESULT"
  | "NEXT_ROUND"
  | "MATCH_RESULT";

export interface SettlementPitTransfer {
  pitId: number;
  owner: Player;
  seeds: number;
}

export interface VisualSeedAnimationEvent {
  sequence?: number;
  type: VisualEventType;
  fromPitId?: number;
  sourcePitId?: number;
  targetPitId?: number;
  targetPlayerStorage?: Player;
  seedsCount: number;
  resultingSeedsInTarget?: number;
  remainingInHand?: number;
  playerCount?: SupportedPlayerCount;
  pitTransfers?: SettlementPitTransfer[];
  roundNumber?: number;
  winner?: Player | null;
  durationMs?: number;
}

/**
 * Translates engine TurnAnimationEvents to VisualSeedAnimationEvents.
 */
export function mapEngineEventsToVisualEvents(
  events: TurnAnimationEvent[],
  playerCount: SupportedPlayerCount = 2
): VisualSeedAnimationEvent[] {
  const visualEvents: VisualSeedAnimationEvent[] = [];

  for (const event of events) {
    switch (event.type) {
      case "PICKUP":
        visualEvents.push({
          type: "LIFT_FROM_PIT",
          sourcePitId: event.pitId,
          seedsCount: event.seedsPickedUp,
          remainingInHand: event.seedsPickedUp,
          playerCount,
        });
        break;

      case "DROP":
        visualEvents.push({
          type: "DROP_INTO_PIT",
          targetPitId: event.pitId,
          seedsCount: 1,
          resultingSeedsInTarget: event.resultingSeeds,
          remainingInHand: event.seedsRemainingInHand,
          playerCount,
        });
        break;

      case "SCOOP":
        visualEvents.push({
          type: "SCOOP_FROM_PIT",
          sourcePitId: event.pitId,
          seedsCount: event.seedsScooped,
          remainingInHand: event.seedsScooped,
          playerCount,
        });
        break;

      case "CAPTURE":
        visualEvents.push({
          type: "CAPTURE_TO_STORAGE",
          sourcePitId: event.capturedPitId,
          targetPlayerStorage: event.capturingPlayer,
          seedsCount: event.seedsCaptured,
          playerCount,
        });
        break;
    }
  }

  return visualEvents;
}

export function createSettlementVisualEvent(
  settlement: RoundSettlementResult,
  playerCount?: SupportedPlayerCount
): VisualSeedAnimationEvent {
  const preState = settlement.preSettlementState;
  const resolvedCount = resolvePlayerCount(
    playerCount ?? preState?.playerCount,
    preState?.pits.length
  );

  const pitTransfers: SettlementPitTransfer[] = [];
  let totalTransferred = 0;

  if (preState) {
    for (const pit of preState.pits) {
      if (pit.status === "OPEN" && pit.seeds > 0) {
        pitTransfers.push({
          pitId: pit.id,
          owner: pit.owner,
          seeds: pit.seeds,
        });
        totalTransferred += pit.seeds;
      }
    }
  }

  return {
    type: "ROUND_SETTLEMENT",
    seedsCount: totalTransferred,
    playerCount: resolvedCount,
    pitTransfers,
    roundNumber: preState?.round,
    winner: settlement.roundWinner,
  };
}
