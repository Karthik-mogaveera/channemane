/**
 * Dedicated Web Worker for Channemane Expert AI Search
 * Enables computation off the main browser UI thread.
 */

import { selectExpertMove } from "./expert";
import type { GameState, Player } from "../types";
import type { ExpertSearchConfig, ExpertSearchDiagnostics } from "./types";

export interface WorkerExpertRequest {
  type: "EVALUATE_EXPERT_MOVE";
  requestId: number;
  state: GameState;
  player: Player;
  config?: ExpertSearchConfig;
}

export interface WorkerExpertResponse {
  type: "EXPERT_MOVE_RESULT";
  requestId: number;
  pitId: number | null;
  diagnostics: ExpertSearchDiagnostics;
}

// Self-contained message listener in Worker scope
if (typeof self !== "undefined" && typeof (self as unknown as Worker).postMessage === "function") {
  self.onmessage = (event: MessageEvent<WorkerExpertRequest>) => {
    const message = event.data;
    if (message && message.type === "EVALUATE_EXPERT_MOVE") {
      const result = selectExpertMove(
        message.state,
        message.player,
        message.config
      );

      const response: WorkerExpertResponse = {
        type: "EXPERT_MOVE_RESULT",
        requestId: message.requestId,
        pitId: result.pitId,
        diagnostics: result.diagnostics,
      };

      self.postMessage(response);
    }
  };
}
