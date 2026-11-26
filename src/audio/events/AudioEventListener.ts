/**
 * Audio Event Listener
 * Central decoupled pub/sub event bus for game audio events.
 * Listens to confirmed game events, not visual animation callbacks.
 */

import type { TurnAnimationEvent, Player } from "../../engine/types";

export type AudioGameEvent =
  | { type: "PIT_SELECTED"; pitId: number }
  | { type: "ANIMATION_EVENT"; event: TurnAnimationEvent }
  | { type: "BONUS_AVAILABLE"; pitId: number; owner: Player }
  | { type: "BONUS_CLAIMED"; pitId: number; owner: Player }
  | { type: "TURN_CHANGED"; nextPlayer: Player }
  | { type: "ROUND_SETTLED"; winner: Player | null }
  | { type: "MATCH_ENDED"; winner: Player | null; isPlayer1Victor: boolean };

export type AudioEventHandler = (event: AudioGameEvent) => void;

export class AudioEventListener {
  private handlers: Set<AudioEventHandler> = new Set();

  public subscribe(handler: AudioEventHandler): () => void {
    this.handlers.add(handler);
    return () => {
      this.handlers.delete(handler);
    };
  }

  public dispatch(event: AudioGameEvent): void {
    for (const handler of this.handlers) {
      try {
        handler(event);
      } catch {
        // Event processing failure should never crash the game
      }
    }
  }

  public clear(): void {
    this.handlers.clear();
  }
}
