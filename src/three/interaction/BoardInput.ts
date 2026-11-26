/**
 * Board Input & Interaction Controller
 * Manages pointer selection rules, touch gestures, and prevents double-triggers during active animations.
 */

import type { VisualPitState } from "../../adapters/engineToVisualState";

export interface InputGuardResult {
  allowed: boolean;
  reason?: string;
}

export class BoardInputController {
  /**
   * Evaluates if a pit click/tap is legally actionable.
   */
  public static canSelectPit(
    pitState: VisualPitState,
    isAnimating: boolean,
    interactionState: string
  ): InputGuardResult {
    if (isAnimating) {
      return { allowed: false, reason: "Animation in progress" };
    }

    if (
      interactionState !== "WAITING_FOR_START" &&
      interactionState !== "WAITING_FOR_CONTINUATION" &&
      interactionState !== "WAITING_FOR_CAPTURE"
    ) {
      return { allowed: false, reason: "Game is not awaiting user move" };
    }

    if (pitState.status === "CLOSED") {
      return { allowed: false, reason: "Pit is closed" };
    }

    if (!pitState.isSelectable && !pitState.isClaimableBonus) {
      return { allowed: false, reason: "Pit is not selectable by active player" };
    }

    return { allowed: true };
  }
}
