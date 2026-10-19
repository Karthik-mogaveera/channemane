/**
 * Client coordinator for Expert & Master AI decision requests.
 * Transparently manages Web Worker dispatch with synchronous fallback for test/node environments,
 * cancellation token tracking, and invalidation of obsolete searches.
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
import type {
  WorkerAIRequest,
  WorkerAIResponse,
} from "./expertWorker";

export type AIResponsePayload =
  | { pitId: number | null; diagnostics: ExpertSearchDiagnostics }
  | { pitId: number | null; diagnostics: MasterSearchDiagnostics };

class ExpertAIClient {
  private worker: Worker | null = null;
  private workerFailed = false;
  private activeRequestId = 0;
  private pendingResolver: ((result: any) => void) | null = null;
  private pendingRejecter: ((reason?: unknown) => void) | null = null;

  constructor() {
    this.initWorker();
  }

  private initWorker(): void {
    if (
      typeof window === "undefined" ||
      typeof Worker === "undefined" ||
      typeof window.Worker !== "function"
    ) {
      this.workerFailed = true;
      return;
    }

    try {
      this.worker = new Worker(
        new URL("./expertWorker.ts", import.meta.url),
        { type: "module" }
      );

      this.worker.onmessage = (event: MessageEvent<WorkerAIResponse>) => {
        const data = event.data;
        if (!data) return;

        // Drop responses for canceled or superseded requests
        if (data.requestId !== this.activeRequestId) {
          return;
        }

        if (this.pendingResolver) {
          const resolver = this.pendingResolver;
          this.pendingResolver = null;
          this.pendingRejecter = null;
          resolver({
            pitId: data.pitId,
            diagnostics: data.diagnostics,
          });
        }
      };

      this.worker.onerror = () => {
        this.workerFailed = true;
        this.worker = null;
      };
    } catch {
      this.workerFailed = true;
      this.worker = null;
    }
  }

  /**
   * Dispatches an Expert AI search request.
   * Uses Web Worker if available, otherwise executes synchronously.
   */
  public requestDecision(
    state: GameState,
    player: Player,
    config?: ExpertSearchConfig
  ): Promise<{ pitId: number | null; diagnostics: ExpertSearchDiagnostics }> {
    this.cancelPendingSearch();

    this.activeRequestId++;
    const currentId = this.activeRequestId;

    if (this.worker && !this.workerFailed) {
      return new Promise((resolve, reject) => {
        this.pendingResolver = resolve;
        this.pendingRejecter = reject;

        const request: WorkerAIRequest = {
          type: "EVALUATE_EXPERT_MOVE",
          requestId: currentId,
          state,
          player,
          config,
        };

        this.worker?.postMessage(request);
      });
    }

    // Synchronous execution fallback (e.g. Node, Vitest JSDOM)
    return new Promise((resolve) => {
      const result = selectExpertMove(state, player, config);
      resolve(result);
    });
  }

  /**
   * Dispatches a Master AI search request.
   * Uses Web Worker if available, otherwise executes synchronously.
   */
  public requestMasterDecision(
    state: GameState,
    player: Player,
    config?: MasterSearchConfig
  ): Promise<{ pitId: number | null; diagnostics: MasterSearchDiagnostics }> {
    this.cancelPendingSearch();

    this.activeRequestId++;
    const currentId = this.activeRequestId;

    if (this.worker && !this.workerFailed) {
      return new Promise((resolve, reject) => {
        this.pendingResolver = resolve;
        this.pendingRejecter = reject;

        const request: WorkerAIRequest = {
          type: "EVALUATE_MASTER_MOVE",
          requestId: currentId,
          state,
          player,
          config,
        };

        this.worker?.postMessage(request);
      });
    }

    // Synchronous execution fallback (e.g. Node, Vitest JSDOM)
    return new Promise((resolve) => {
      const result = selectMasterMove(state, player, config);
      resolve(result);
    });
  }

  /**
   * Cancels any pending in-flight search request and invalidates previous callbacks.
   */
  public cancelPendingSearch(): void {
    this.activeRequestId++;
    if (this.pendingRejecter) {
      this.pendingRejecter(new Error("Search canceled"));
      this.pendingResolver = null;
      this.pendingRejecter = null;
    }
  }

  /**
   * Terminates the worker.
   */
  public terminate(): void {
    this.cancelPendingSearch();
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
  }
}

// Global client singleton
export const expertAIClient = new ExpertAIClient();
