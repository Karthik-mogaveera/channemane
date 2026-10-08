/**
 * Seed Pickup & Hand Management Engine
 * Strictly follows Phase 2 Specification (PH2-T05)
 */

import { validatePitSelection } from "./selection";
import type { ActionResult, GameState } from "./types";

export interface PickupResult {
  pitId: number;
  seedsPickedUp: number;
}

/**
 * Executes the seed pickup phase of a turn.
 *
 * Rules:
 * 1. Validates that the pit is selectable by the current player in the current turn.
 * 2. Scoops all seeds from the pit into state.seedsInHand.
 * 3. Sets the source pit's seeds to 0.
 * 4. Resets bonusAvailable to false on the emptied pit.
 * 5. Records state.selectedPit = pitId.
 * 6. Transitions state.turnPhase to "PIT_SELECTED".
 * 7. Invariant: 70 total seeds is conserved (board seeds + storage + seedsInHand = 70).
 */
export function pickupSeeds(
  state: GameState,
  pitId: number
): ActionResult<PickupResult> {
  const validation = validatePitSelection(state, pitId);
  if (!validation.success) {
    return {
      success: false,
      error: validation.error,
    };
  }

  const pit = state.pits[pitId];
  const count = pit.seeds;

  pit.seeds = 0;
  pit.bonusAvailable = false;
  state.seedsInHand = count;
  state.selectedPit = pitId;
  state.turnPhase = "PIT_SELECTED";

  return {
    success: true,
    data: {
      pitId,
      seedsPickedUp: count,
    },
  };
}
