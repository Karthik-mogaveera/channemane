/**
 * Dedicated Web Worker for Channemane AI Search (Expert & Master)
 * Enables computation off the main browser UI thread.
 */

import { selectExpertMove } from "./expert";
import { selectMasterMove } from "./master";
import type { GameState, Player } from "../types";
import type {
  ExpertSearchConfig,
  ExpertSearchDiagnostics,
  MasterSearchConfig,
  MasterSearchDiagnostics,
} from "./types";

export interface WorkerExpertRequest {
  type: "EVALUATE_EXPERT_MOVE";
  requestId: number;
  state: GameState;
  player: Player;
  config?: ExpertSearchConfig;
}

export interface WorkerMasterRequest {
  type: "EVALUATE_MASTER_MOVE";
  requestId: number;
  state: GameState;
  player: Player;
  config?: MasterSearchConfig;
}

export type WorkerAIRequest = WorkerExpertRequest | WorkerMasterRequest;

export interface WorkerExpertResponse {
  type: "EXPERT_MOVE_RESULT";
  requestId: number;
  pitId: number | null;
  diagnostics: ExpertSearchDiagnostics;
}

export interface WorkerMasterResponse {
  type: "MASTER_MOVE_RESULT";
  requestId: number;
  pitId: number | null;
  diagnostics: MasterSearchDiagnostics;
}

export type WorkerAIResponse = WorkerExpertResponse | WorkerMasterResponse;

// Self-contained message listener in Worker scope
if (typeof self !== "undefined" && typeof (self as unknown as Worker).postMessage === "function") {
  self.onmessage = (event: MessageEvent<WorkerAIRequest>) => {
    const message = event.data;
    if (!message) return;

    if (message.type === "EVALUATE_EXPERT_MOVE") {
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
    } else if (message.type === "EVALUATE_MASTER_MOVE") {
      const result = selectMasterMove(
        message.state,
        message.player,
        message.config
      );

      const response: WorkerMasterResponse = {
        type: "MASTER_MOVE_RESULT",
        requestId: message.requestId,
        pitId: result.pitId,
        diagnostics: result.diagnostics,
      };

      self.postMessage(response);
    }
  };
}
