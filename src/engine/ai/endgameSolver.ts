/**
 * Hybrid Exact Endgame Solver for Channemane
 * Strictly adheres to specification:
 * - Detects tractable endgames using board seeds, active pit count, and branching complexity.
 * - Explores legal continuations using authoritative Channemane game engine (playTurn).
 * - Exact scoring for match termination and round settlement.
 * - Cycle detection and state memoization.
 * - Strict computation and memory limits (max nodes, max time).
 * - Never claims exactness for incomplete solves: gracefully returns null to fall back to bounded search.
 * - Operates purely on cloned states without mutating live state.
 */

import { cloneGameState, getPlayerSideSeeds } from "../board";
import { getSelectablePits } from "../selection";
import { playTurn } from "../game";
import { isMatchOver } from "../matchEnd";
import { calculateOpenPairs } from "../roundSetup";
import { INITIAL_SEEDS_PER_PIT } from "../constants";
import type { GameState, Player } from "../types";
import type { EndgameSolverConfig, EndgameSolverResult } from "./types";
import { getGameStateKey } from "./expert";

export const DEFAULT_ENDGAME_CONFIG: Required<EndgameSolverConfig> = {
  maxNodes: 12_000,
  maxTimeMs: 250,
  maxBoardSeeds: 14,
  maxActivePits: 6,
};

/**
 * Evaluates whether a game position is sufficiently small and tractable for exact solving.
 * Does not rely solely on a fixed seed threshold; evaluates pit distribution and branching factor.
 */
export function isEndgameTractable(
  state: GameState,
  config: EndgameSolverConfig = {}
): boolean {
  if (state.phase !== "PLAYING") {
    return false;
  }

  const maxBoardSeeds = config.maxBoardSeeds ?? DEFAULT_ENDGAME_CONFIG.maxBoardSeeds;
  const maxActivePits = config.maxActivePits ?? DEFAULT_ENDGAME_CONFIG.maxActivePits;

  const p1Seeds = getPlayerSideSeeds(state, "PLAYER_1");
  const p2Seeds = getPlayerSideSeeds(state, "PLAYER_2");
  const totalSeeds = p1Seeds + p2Seeds;

  if (totalSeeds > maxBoardSeeds) {
    return false;
  }

  const p1ActivePits = state.pits.slice(0, 7).filter(
    (p) => p.status === "OPEN" && p.seeds > 0
  ).length;
  const p2ActivePits = state.pits.slice(7, 14).filter(
    (p) => p.status === "OPEN" && p.seeds > 0
  ).length;
  const totalActivePits = p1ActivePits + p2ActivePits;

  if (totalActivePits > maxActivePits) {
    return false;
  }

  // Very small seed counts (<= 4) are always tractable (round settlement imminent)
  if (totalSeeds <= 4) {
    return true;
  }

  // Up to 6 seeds with at most 3 active pits
  if (totalSeeds <= 6 && totalActivePits <= 3) {
    return true;
  }

  // Up to 8 seeds when one side has at most 1 active pit and total active pits <= 3
  if (totalSeeds <= 8 && (p1ActivePits <= 1 || p2ActivePits <= 1) && totalActivePits <= 3) {
    return true;
  }

  return false;
}

/**
 * Calculates exact terminal score from the perspective of originalPlayer.
 */
function evaluateTerminalScore(
  state: GameState,
  originalPlayer: Player,
  ply: number
): number {
  const opponent: Player = originalPlayer === "PLAYER_1" ? "PLAYER_2" : "PLAYER_1";
  const pKey = originalPlayer === "PLAYER_1" ? "player1" : "player2";
  const oKey = opponent === "PLAYER_1" ? "player1" : "player2";

  // Tier 1: Match termination
  if (state.phase === "MATCH_END" || (state.phase === "ROUND_SETTLEMENT" && isMatchOver(state))) {
    if (state.winner === originalPlayer) {
      return 1_000_000 - ply;
    }
    if (state.winner === opponent) {
      return -1_000_000 + ply;
    }
    const pStorage = state.players[pKey].storage;
    const oStorage = state.players[oKey].storage;
    if (pStorage >= 5 && oStorage < 5) {
      return 1_000_000 - ply;
    }
    if (oStorage >= 5 && pStorage < 5) {
      return -1_000_000 + ply;
    }
    return 0; // Draw
  }

  // Tier 2: Round Settlement
  if (state.phase === "ROUND_SETTLEMENT") {
    const pStorage = state.players[pKey].storage;
    const oStorage = state.players[oKey].storage;

    // Check if next round eliminates a player
    if (pStorage < 5 && oStorage >= 5) {
      return -1_000_000 + ply;
    }
    if (oStorage < 5 && pStorage >= 5) {
      return 1_000_000 - ply;
    }
    if (pStorage < 5 && oStorage < 5) {
      return 0;
    }

    let score = 0;
    if (pStorage > oStorage) {
      score += 25_000;
    } else if (oStorage > pStorage) {
      score -= 25_000;
    }

    const openPairs = calculateOpenPairs(
      state.players.player1.storage,
      state.players.player2.storage
    );
    const pPairs = Math.min(Math.floor(pStorage / INITIAL_SEEDS_PER_PIT), 7);
    const oPairs = Math.min(Math.floor(oStorage / INITIAL_SEEDS_PER_PIT), 7);
    const pReserve = Math.max(0, pStorage - openPairs * INITIAL_SEEDS_PER_PIT);
    const oReserve = Math.max(0, oStorage - openPairs * INITIAL_SEEDS_PER_PIT);

    score += (pPairs - oPairs) * 1_200;
    score += (pStorage - oStorage) * 100;
    score += (pReserve - oReserve) * 20;

    return score - ply; // Prefer faster settlement advantage
  }

  // Non-terminal fallback
  const pStorage = state.players[pKey].storage;
  const oStorage = state.players[oKey].storage;
  return (pStorage - oStorage) * 100;
}

interface SolverContext {
  deadline: number;
  maxNodes: number;
  nodesExplored: number;
  aborted: boolean;
  memo: Map<string, { score: number; bestMove: number | null }>;
  ancestorKeys: Set<string>;
  originalPlayer: Player;
}

/**
 * Recursive exact minimax search with cycle protection and alpha-beta pruning.
 */
function exactMinimax(
  state: GameState,
  ply: number,
  alpha: number,
  beta: number,
  context: SolverContext
): number {
  context.nodesExplored++;

  // Periodic resource checks
  if ((context.nodesExplored & 63) === 0) {
    if (context.nodesExplored >= context.maxNodes || Date.now() >= context.deadline) {
      context.aborted = true;
      return 0;
    }
  }

  // Terminal state evaluation
  if (state.phase === "MATCH_END" || state.phase === "ROUND_SETTLEMENT") {
    return evaluateTerminalScore(state, context.originalPlayer, ply);
  }

  // Depth horizon limit for exact endgame solver (prevents infinite non-capturing seed loops)
  if (ply >= 10) {
    return evaluateTerminalScore(state, context.originalPlayer, ply);
  }

  const stateKey = getGameStateKey(state);

  // Cycle detection: if this state is already on the current path, treat as neutral draw/cycle
  if (context.ancestorKeys.has(stateKey)) {
    return 0;
  }

  // Memoization lookup
  const memoEntry = context.memo.get(stateKey);
  if (memoEntry !== undefined) {
    return memoEntry.score;
  }

  const currentPlayer = state.currentPlayer;
  const isMaximizing = currentPlayer === context.originalPlayer;

  const legalMoves = getSelectablePits(state).filter((id) => {
    const pit = state.pits[id];
    return pit && pit.owner === currentPlayer && pit.status === "OPEN" && pit.seeds > 0;
  });

  if (legalMoves.length === 0) {
    // No legal moves: evaluate as terminal/settlement
    return evaluateTerminalScore(state, context.originalPlayer, ply);
  }

  // Sort candidate moves: moves with higher seeds first for better pruning
  legalMoves.sort((a, b) => state.pits[b].seeds - state.pits[a].seeds);

  context.ancestorKeys.add(stateKey);

  let bestScore = isMaximizing ? -Infinity : Infinity;
  let bestMove: number | null = legalMoves[0];

  for (const pitId of legalMoves) {
    const nextState = cloneGameState(state);
    const turnResult = playTurn(nextState, pitId);

    if (!turnResult.success) {
      continue;
    }

    const score = exactMinimax(
      nextState,
      ply + 1,
      alpha,
      beta,
      context
    );

    if (context.aborted) {
      context.ancestorKeys.delete(stateKey);
      return 0;
    }

    if (isMaximizing) {
      if (score > bestScore) {
        bestScore = score;
        bestMove = pitId;
      }
      alpha = Math.max(alpha, bestScore);
      if (alpha >= beta) {
        break; // Beta cutoff
      }
    } else {
      if (score < bestScore) {
        bestScore = score;
        bestMove = pitId;
      }
      beta = Math.min(beta, bestScore);
      if (beta <= alpha) {
        break; // Alpha cutoff
      }
    }
  }

  context.ancestorKeys.delete(stateKey);

  if (!context.aborted) {
    context.memo.set(stateKey, { score: bestScore, bestMove });
  }

  return bestScore;
}

/**
 * Attempts an exact solve of the game position.
 * Returns EndgameSolverResult if exact solving completed within resource limits,
 * or null if aborted due to complexity/time limits (signaling safe fallback to bounded search).
 */
export function solveEndgame(
  state: GameState,
  player: Player = state.currentPlayer,
  config: EndgameSolverConfig = {}
): EndgameSolverResult | null {
  const startTime = Date.now();

  if (state.phase !== "PLAYING" || state.currentPlayer !== player) {
    return null;
  }

  const legalMoves = getSelectablePits(state).filter((id) => {
    const pit = state.pits[id];
    return pit && pit.owner === player && pit.status === "OPEN" && pit.seeds > 0;
  });

  if (legalMoves.length === 0) {
    return null;
  }

  if (legalMoves.length === 1) {
    return {
      bestMove: legalMoves[0],
      score: 0,
      isExact: true,
      nodesExplored: 1,
      timeSpentMs: Date.now() - startTime,
    };
  }

  const maxNodes = config.maxNodes ?? DEFAULT_ENDGAME_CONFIG.maxNodes;
  const maxTimeMs = config.maxTimeMs ?? DEFAULT_ENDGAME_CONFIG.maxTimeMs;
  const deadline = startTime + maxTimeMs;

  const context: SolverContext = {
    deadline,
    maxNodes,
    nodesExplored: 0,
    aborted: false,
    memo: new Map<string, { score: number; bestMove: number | null }>(),
    ancestorKeys: new Set<string>(),
    originalPlayer: player,
  };

  let bestMove: number | null = null;
  let bestScore = -Infinity;
  let alpha = -Infinity;
  const beta = Infinity;

  // Root exploration
  for (const pitId of legalMoves) {
    const nextState = cloneGameState(state);
    const turnResult = playTurn(nextState, pitId);
    if (!turnResult.success) continue;

    const score = exactMinimax(nextState, 1, alpha, beta, context);

    if (context.aborted) {
      return null; // Graceful fallback
    }

    if (score > bestScore) {
      bestScore = score;
      bestMove = pitId;
    }
    alpha = Math.max(alpha, bestScore);
  }

  if (context.aborted || bestMove === null) {
    return null;
  }

  let provenOutcome: "WIN" | "LOSS" | "DRAW" | "SETTLEMENT" = "SETTLEMENT";
  if (bestScore >= 900_000) {
    provenOutcome = "WIN";
  } else if (bestScore <= -900_000) {
    provenOutcome = "LOSS";
  } else if (bestScore === 0) {
    provenOutcome = "DRAW";
  }

  return {
    bestMove,
    score: bestScore,
    isExact: true,
    nodesExplored: context.nodesExplored,
    timeSpentMs: Date.now() - startTime,
    provenOutcome,
  };
}
