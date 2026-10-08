/**
 * Sowing & Continuous Sowing Engine
 * Strictly follows Phase 1 & Phase 2 Specification (PH2-T06, PH2-T07)
 */

import { BONUS_THRESHOLD, BONUS_EXPIRATION_THRESHOLD } from "./constants";
import { getNextOpenPit } from "./traversal";
import { pickupSeeds } from "./pickup";
import type { ActionResult, GameState, SowStep } from "./types";

export interface SowResult {
  startPitId: number;
  finalDestinationPit: number;
  nextOpenPitAfterDestination: number | null;
  shouldEvaluateCapture: boolean;
  steps: SowStep[];
  scoopsCount: number;
}

/**
 * Executes sowing and continuous sowing starting from a selected pit.
 * Mutates the provided GameState in-place.
 */
export function sowFromPit(
  state: GameState,
  startPitId: number
): ActionResult<SowResult> {
  const pickupRes = pickupSeeds(state, startPitId);
  if (!pickupRes.success) {
    return {
      success: false,
      error: pickupRes.error,
    };
  }

  state.turnPhase = "SOWING";
  const steps: SowStep[] = [];
  let scoopsCount = 1;
  let currentDropPointer = startPitId;
  let lastDestinationPit: number = startPitId;
  let shouldEvaluateCapture = false;
  let nextOpenAfterEnd: number | null = null;

  const MAX_SCOOPS = 1000;

  while (scoopsCount <= MAX_SCOOPS) {
    let hand = state.seedsInHand;

    while (hand > 0) {
      const nextPitId = getNextOpenPit(currentDropPointer, state.pits);
      if (nextPitId === null) {
        return {
          success: false,
          error: "No open pits available to receive seeds during sowing",
        };
      }

      const targetPit = state.pits[nextPitId];
      const previousSeeds = targetPit.seeds;
      targetPit.seeds += 1;
      hand -= 1;
      state.seedsInHand = hand;
      currentDropPointer = nextPitId;
      lastDestinationPit = nextPitId;

      let bonusTriggered = false;

      // Bonus Detection Rule (Section 27): 3 -> 4
      if (previousSeeds === BONUS_THRESHOLD - 1 && targetPit.seeds === BONUS_THRESHOLD) {
        targetPit.bonusAvailable = true;
        bonusTriggered = true;
      }
      // Bonus Expiration Rule (Section 29): 4 -> 5
      else if (
        previousSeeds === BONUS_THRESHOLD &&
        targetPit.seeds === BONUS_EXPIRATION_THRESHOLD
      ) {
        targetPit.bonusAvailable = false;
      }

      steps.push({
        pitId: nextPitId,
        seedsPlaced: 1,
        resultingSeeds: targetPit.seeds,
        bonusTriggered,
        bonusOwner: bonusTriggered ? targetPit.owner : null,
        seedsRemainingInHand: hand,
      });
    }

    state.seedsInHand = 0;

    // Hand exhausted! Inspect next OPEN pit after final destination
    nextOpenAfterEnd = getNextOpenPit(lastDestinationPit, state.pits);
    if (nextOpenAfterEnd === null) {
      break;
    }

    const nextPit = state.pits[nextOpenAfterEnd];
    if (nextPit.seeds > 0) {
      // Continuous sowing condition met: next open pit contains seeds
      scoopsCount++;
      state.turnPhase = "CONTINUOUS_SOWING";
      state.seedsInHand = nextPit.seeds;
      nextPit.seeds = 0;
      nextPit.bonusAvailable = false;
      currentDropPointer = nextOpenAfterEnd;
    } else {
      // Stopping condition met: next open pit is empty (0 seeds)
      shouldEvaluateCapture = true;
      break;
    }
  }

  return {
    success: true,
    data: {
      startPitId,
      finalDestinationPit: lastDestinationPit,
      nextOpenPitAfterDestination: nextOpenAfterEnd,
      shouldEvaluateCapture,
      steps,
      scoopsCount,
    },
  };
}
