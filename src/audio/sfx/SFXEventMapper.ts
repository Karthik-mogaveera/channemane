/**
 * SFX Event Mapper
 * Translates confirmed game engine events into concrete sound effect requests.
 */

import type { TurnAnimationEvent, Player } from "../../engine/types";
import type { SFXType } from "./SFXRegistry";

export class SFXEventMapper {
  /**
   * Maps a single engine turn animation event to a corresponding SFX.
   */
  public static mapAnimationEvent(event: TurnAnimationEvent): SFXType | null {
    switch (event.type) {
      case "PICKUP":
        return "seedPickup";
      case "DROP":
        return "seedPlacement";
      case "SCOOP":
        return "continuousSow";
      case "CAPTURE":
        return "capture";
      default:
        return null;
    }
  }

  /**
   * Maps bonus life-cycle occurrences to SFX.
   */
  public static mapBonusEvent(status: "AVAILABLE" | "CLAIMED"): SFXType {
    return status === "AVAILABLE" ? "bonusAvailable" : "bonusClaim";
  }

  /**
   * Maps round and match conclusions to SFX.
   */
  public static mapGameConclusion(
    type: "ROUND_SETTLEMENT" | "MATCH_VICTORY" | "MATCH_DEFEAT",
    _winner?: Player | null
  ): SFXType {
    switch (type) {
      case "ROUND_SETTLEMENT":
        return "roundSettlement";
      case "MATCH_VICTORY":
        return "matchVictory";
      case "MATCH_DEFEAT":
        return "matchDefeat";
    }
  }
}
