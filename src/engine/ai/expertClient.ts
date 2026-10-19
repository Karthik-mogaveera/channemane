/**
 * Client coordinator for Expert AI decision requests.
 * Transparently manages Web Worker dispatch with synchronous fallback for test/node environments,
 * cancellation token tracking, and invalidation of obsolete searches.
 */

import { selectExpertMove } from "./expert";
import type { GameState, Player } from "../types";
import type { ExpertSearchConfig, ExpertSearchDiagnostics } from "./types";
import type {
  WorkerExpertRequest,
  WorkerExpertResponse,
} from "./expertWorker";

class ExpertAIClient {
  private worker: Worker | null = null;
  private workerFailed = false;
  private activeRequestId = 0;
  private pendingResolver:
    | ((result: { pitId: number | null; diagnostics: ExpertSearchDiagnostics }) => void)
    | null = null;
  private pendingRejecter: ((reason?: unknown) => void) | null = null;

  constructor() {
    this.initWorker();
  }

  private initWorker(): void {
    // Check if running in browser with Worker support
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

      this.worker.onmessage = (event: MessageEvent<WorkerExpertResponse>) => {
        const data = event.data;
        if (!data || data.type !== "EXPERT_MOVE_RESULT") {
          return;
        }

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
        // Fallback safely to synchronous calculation if Worker encounters an error
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

        const request: WorkerExpertRequest = {
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
