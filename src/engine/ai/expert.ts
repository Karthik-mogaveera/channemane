/**
 * Expert AI Decision Engine for Channemane
 * Strictly adheres to specification requirements:
 * - Minimax search with alpha-beta pruning.
 * - Iterative deepening with adaptive search budget.
 * - Move ordering to maximize alpha-beta pruning efficiency.
 * - Transposition-table caching with comprehensive state keys.
 * - 5-Tier position evaluator (Match Outcome > Round Outcome > Storage > Tactics > Positional Quality).
 * - Limited tactical search extensions for unstable positions.
 * - Rare tie variation among genuinely equal/near-equal candidates with injectable RNG.
 * - Complete-turn simulation operating on isolated state copies without mutating live state.
 */

import { cloneGameState, getPlayerSideSeeds } from "../board";
import { getSelectablePits } from "../selection";
import { playTurn } from "../game";
import { getClaimableBonusPits } from "../bonus";
import { calculateOpenPairs } from "../roundSetup";
import { isMatchOver } from "../matchEnd";
import {
  BONUS_THRESHOLD,
  INITIAL_SEEDS_PER_PIT,
} from "../constants";
import type { GameState, Player } from "../types";
import type {
  ExpertEvaluationWeights,
  ExpertSearchConfig,
  ExpertSearchDiagnostics,
  TTEntry,
} from "./types";

export const DEFAULT_EXPERT_WEIGHTS: ExpertEvaluationWeights = {
  matchWin: 1_000_000,
  roundWin: 20_000,
  openPairsWeight: 800,
  storageWeight: 100,
  boardSeedWeight: 15,
  mobilityWeight: 25,
  captureSeedWeight: 50,
  bonusWeight: 120,
  opponentBonusPenalty: 140,
  threeSeedBonusSetupWeight: 35,
  opponentThreeSeedThreatPenalty: 40,
  defenseWeight: 20,
};

export const DEFAULT_EXPERT_CONFIG: Required<ExpertSearchConfig> = {
  maxDepth: 6,
  maxTimeMs: 400,
  adaptiveTime: true,
  minDepth: 1,
  weights: DEFAULT_EXPERT_WEIGHTS,
  tieThreshold: 15,
  variationProbability: 0.10,
  rng: Math.random,
  useTranspositionTable: true,
  allowTacticalExtensions: true,
  maxExtensions: 1,
};

/**
 * Generates an immutable, comprehensive state key for transposition table lookup.
 * Includes pit seeds, open/closed status, bonus availability, storage totals, active player, phase, and round.
 */
export function getGameStateKey(state: GameState): string {
  let pitStr = "";
  for (let i = 0; i < 14; i++) {
    const p = state.pits[i];
    pitStr += `${p.seeds}${p.status === "OPEN" ? "O" : "C"}${p.bonusAvailable ? "B" : ""},`;
  }
  return `r:${state.round}|p:${state.phase}|tp:${state.turnPhase}|c:${state.currentPlayer}|s:${state.players.player1.storage}_${state.players.player2.storage}|${pitStr}`;
}

/**
 * 5-Tier Position Evaluator for Expert AI
 * Strictly prioritizes:
 * 1. Match outcome (forced win/loss)
 * 2. Round outcome (settlement consequence & next round pit pairs)
 * 3. Storage advantage (secured seeds)
 * 4. Tactical opportunities (captures, bonuses, 3-seed setups)
 * 5. Positional quality (mobility, seed defense)
 */
export function evaluatePosition(
  state: GameState,
  player: Player,
  weights: ExpertEvaluationWeights = DEFAULT_EXPERT_WEIGHTS,
  depth: number = 0
): number {
  const opponent: Player = player === "PLAYER_1" ? "PLAYER_2" : "PLAYER_1";
  const playerKey = player === "PLAYER_1" ? "player1" : "player2";
  const oppKey = opponent === "PLAYER_1" ? "player1" : "player2";

  // Tier 1: Match Outcome (Highest Priority)
  if (state.phase === "MATCH_END" || (state.phase === "ROUND_SETTLEMENT" && isMatchOver(state))) {
    if (state.winner === player) {
      return weights.matchWin - depth;
    }
    if (state.winner === opponent) {
      return -weights.matchWin + depth;
    }
    const pStorage = state.players[playerKey].storage;
    const oStorage = state.players[oppKey].storage;
    if (pStorage >= 5 && oStorage < 5) {
      return weights.matchWin - depth;
    }
    if (oStorage >= 5 && pStorage < 5) {
      return -weights.matchWin + depth;
    }
    return 0;
  }

  // Tier 2: Round Outcome (Settlement & Next Round Preparation)
  let roundScore = 0;
  if (state.phase === "ROUND_SETTLEMENT") {
    const pStorage = state.players[playerKey].storage;
    const oStorage = state.players[oppKey].storage;
    if (pStorage > oStorage) {
      roundScore += weights.roundWin;
    } else if (oStorage > pStorage) {
      roundScore -= weights.roundWin;
    }

    const openPairs = calculateOpenPairs(
      state.players.player1.storage,
      state.players.player2.storage
    );
    const pPairs = Math.min(Math.floor(pStorage / INITIAL_SEEDS_PER_PIT), 7);
    const oPairs = Math.min(Math.floor(oStorage / INITIAL_SEEDS_PER_PIT), 7);
    const pReserve = Math.max(0, pStorage - openPairs * INITIAL_SEEDS_PER_PIT);
    const oReserve = Math.max(0, oStorage - openPairs * INITIAL_SEEDS_PER_PIT);
    roundScore += (pPairs - oPairs) * weights.openPairsWeight;
    roundScore += (pReserve - oReserve) * weights.storageWeight;
    return roundScore;
  }

  // Tier 3: Storage Advantage
  const pStorage = state.players[playerKey].storage;
  const oStorage = state.players[oppKey].storage;
  const storageScore = (pStorage - oStorage) * weights.storageWeight;

  const playerBoardSeeds = getPlayerSideSeeds(state, player);
  const oppBoardSeeds = getPlayerSideSeeds(state, opponent);
  const boardSeedScore = (playerBoardSeeds - oppBoardSeeds) * weights.boardSeedWeight;

  // Tier 4: Tactical Opportunities
  const playerBonuses = getClaimableBonusPits(state, player).length;
  const oppBonuses = getClaimableBonusPits(state, opponent).length;
  const bonusScore =
    playerBonuses * weights.bonusWeight -
    oppBonuses * weights.opponentBonusPenalty;

  // 3-seed pits: on player's side, a 3-seed pit can become a bonus upon receiving 1 seed
  let threeSeedBonusSetups = 0;
  let oppThreeSeedThreats = 0;
  let protectedSeeds = 0;
  let vulnerableSeeds = 0;

  for (let i = 0; i < 14; i++) {
    const pit = state.pits[i];
    if (pit.status !== "OPEN" || pit.seeds <= 0) continue;

    if (pit.owner === player) {
      if (pit.seeds === BONUS_THRESHOLD - 1) {
        threeSeedBonusSetups++;
      }
      // Pits with 1 or 2 seeds are easily scooped or defended
      if (pit.seeds > 4) {
        protectedSeeds += 1;
      }
    } else {
      if (pit.seeds === BONUS_THRESHOLD - 1) {
        oppThreeSeedThreats++;
      }
      if (pit.seeds <= 2) {
        vulnerableSeeds += 1;
      }
    }
  }

  const tacticalScore =
    threeSeedBonusSetups * weights.threeSeedBonusSetupWeight -
    oppThreeSeedThreats * weights.opponentThreeSeedThreatPenalty;

  // Tier 5: Positional Quality (Mobility & Defense)
  const legalMoves = getSelectablePits(state).filter((id) => {
    const pit = state.pits[id];
    return pit && pit.owner === state.currentPlayer && pit.status === "OPEN" && pit.seeds > 0;
  });

  const mobilityScore =
    (state.currentPlayer === player ? 1 : -1) *
    legalMoves.length *
    weights.mobilityWeight;

  const defenseScore =
    (protectedSeeds - vulnerableSeeds) * weights.defenseWeight;

  return (
    storageScore +
    boardSeedScore +
    bonusScore +
    tacticalScore +
    mobilityScore +
    defenseScore
  );
}

/**
 * Quick heuristic score for candidate move ordering.
 * Ranks moves by tactical indicators on the immediately resulting state.
 */
function estimateMovePriority(
  state: GameState,
  pitId: number,
  player: Player,
  ttBestMove: number | null
): number {
  if (pitId === ttBestMove) {
    return 100_000; // Search TT suggested best move first
  }

  const sim = cloneGameState(state);
  const res = playTurn(sim, pitId);
  if (!res.success) {
    return -100_000;
  }

  const data = res.data;
  let priority = 0;

  if (data.matchEnded && data.matchResult?.winner === player) {
    priority += 50_000;
  }
  if (data.roundEnded && data.roundSettlement?.roundWinner === player) {
    priority += 20_000;
  }

  const captured = data.captureResult?.capturedSeeds ?? 0;
  priority += captured * 200;

  const opponent: Player = player === "PLAYER_1" ? "PLAYER_2" : "PLAYER_1";
  const newBonuses = getClaimableBonusPits(sim, player).length;
  const oppBonuses = getClaimableBonusPits(sim, opponent).length;
  priority += newBonuses * 150 - oppBonuses * 100;

  return priority;
}

/**
 * Returns candidate legal pits ordered by likelihood of pruning / cutoff.
 */
export function getOrderedCandidateMoves(
  state: GameState,
  player: Player,
  ttBestMove: number | null = null
): number[] {
  const legalPits = getSelectablePits(state).filter((id) => {
    const pit = state.pits[id];
    return pit && pit.owner === player && pit.status === "OPEN" && pit.seeds > 0;
  });

  if (legalPits.length <= 1) {
    return legalPits;
  }

  return legalPits
    .map((pitId) => ({
      pitId,
      priority: estimateMovePriority(state, pitId, player, ttBestMove),
    }))
    .sort((a, b) => b.priority - a.priority)
    .map((item) => item.pitId);
}

/**
 * Fast move ordering for interior minimax nodes (TT move first, then higher seed counts).
 */
function getMinimaxCandidateMoves(
  state: GameState,
  player: Player,
  ttBestMove: number | null
): number[] {
  const legalPits = getSelectablePits(state).filter((id) => {
    const pit = state.pits[id];
    return pit && pit.owner === player && pit.status === "OPEN" && pit.seeds > 0;
  });

  if (legalPits.length <= 1) {
    return legalPits;
  }

  // TT best move first if present
  if (ttBestMove !== null && legalPits.includes(ttBestMove)) {
    const others = legalPits.filter((id) => id !== ttBestMove);
    others.sort((a, b) => state.pits[b].seeds - state.pits[a].seeds);
    return [ttBestMove, ...others];
  }

  // Otherwise sort by seed counts descending
  return legalPits.sort((a, b) => state.pits[b].seeds - state.pits[a].seeds);
}

interface SearchContext {
  deadline: number;
  interrupted: boolean;
  nodesEvaluated: number;
  ttHits: number;
  tt: Map<string, TTEntry>;
  weights: ExpertEvaluationWeights;
  allowTacticalExtensions: boolean;
  maxExtensions: number;
  useTT: boolean;
}

/**
 * Minimax search with Alpha-Beta pruning, TT caching, and tactical extension.
 */
function minimax(
  state: GameState,
  depth: number,
  alpha: number,
  beta: number,
  originalPlayer: Player,
  context: SearchContext,
  extensionsLeft: number
): number {
  context.nodesEvaluated++;

  // Periodic time check
  if ((context.nodesEvaluated & 63) === 0) {
    if (Date.now() >= context.deadline) {
      context.interrupted = true;
      return 0;
    }
  }

  const stateKey = context.useTT ? getGameStateKey(state) : null;
  let ttBestMove: number | null = null;

  if (stateKey && context.useTT) {
    const entry = context.tt.get(stateKey);
    if (entry) {
      ttBestMove = entry.bestMove;
      if (entry.depth >= depth) {
        context.ttHits++;
        if (entry.type === "EXACT") {
          return entry.score;
        }
        if (entry.type === "LOWERBOUND") {
          alpha = Math.max(alpha, entry.score);
        } else if (entry.type === "UPPERBOUND") {
          beta = Math.min(beta, entry.score);
        }
        if (alpha >= beta) {
          return entry.score;
        }
      }
    }
  }

  // Terminal state check
  if (state.phase === "MATCH_END" || (state.phase === "ROUND_SETTLEMENT" && isMatchOver(state))) {
    return evaluatePosition(state, originalPlayer, context.weights, depth);
  }
  if (state.phase === "ROUND_SETTLEMENT") {
    return evaluatePosition(state, originalPlayer, context.weights, depth);
  }

  // Depth horizon check
  if (depth <= 0) {
    // Limited tactical extension for unstable positions (tactical captures or low seeds)
    if (context.allowTacticalExtensions && extensionsLeft > 0) {
      const activePits = getSelectablePits(state);
      const isTacticallyUnstable =
        activePits.length <= 3 ||
        getPlayerSideSeeds(state, "PLAYER_1") + getPlayerSideSeeds(state, "PLAYER_2") <= 14;

      if (isTacticallyUnstable) {
        return minimax(
          state,
          1,
          alpha,
          beta,
          originalPlayer,
          context,
          extensionsLeft - 1
        );
      }
    }
    return evaluatePosition(state, originalPlayer, context.weights, depth);
  }

  const currentPlayer = state.currentPlayer;
  const isMaximizing = currentPlayer === originalPlayer;
  const candidateMoves = getMinimaxCandidateMoves(state, currentPlayer, ttBestMove);

  if (candidateMoves.length === 0) {
    // No legal moves: evaluated as terminal or auto-pass outcome
    return evaluatePosition(state, originalPlayer, context.weights, depth);
  }

  const originalAlpha = alpha;
  let bestScore = isMaximizing ? -Infinity : Infinity;
  let bestMove: number | null = candidateMoves[0];

  for (const pitId of candidateMoves) {
    const nextState = cloneGameState(state);
    const turnResult = playTurn(nextState, pitId);

    if (!turnResult.success) {
      continue;
    }

    const score = minimax(
      nextState,
      depth - 1,
      alpha,
      beta,
      originalPlayer,
      context,
      extensionsLeft
    );

    if (context.interrupted) {
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

  // Store in Transposition Table
  if (stateKey && context.useTT && !context.interrupted) {
    let type: "EXACT" | "LOWERBOUND" | "UPPERBOUND" = "EXACT";
    if (bestScore <= originalAlpha) {
      type = "UPPERBOUND";
    } else if (bestScore >= beta) {
      type = "LOWERBOUND";
    }
    context.tt.set(stateKey, {
      depth,
      score: bestScore,
      type,
      bestMove,
    });
  }

  return bestScore;
}

/**
 * Calculates adaptive time budget based on position complexity.
 */
function calculateAdaptiveBudget(
  legalMovesCount: number,
  totalBoardSeeds: number,
  baseMaxTimeMs: number
): number {
  if (legalMovesCount <= 1) {
    return 0; // Immediate decision for 1 move
  }
  if (legalMovesCount === 2) {
    return Math.min(baseMaxTimeMs, 180);
  }
  // Endgame or tactical: seeds <= 14 or fewer moves
  if (totalBoardSeeds <= 16) {
    return baseMaxTimeMs;
  }
  // Normal middlegame
  return Math.min(baseMaxTimeMs, 350);
}

/**
 * Selects the optimal move for Expert AI using Iterative Deepening Minimax.
 *
 * Guarantees:
 * 1. Completes depth 1 first to establish a reliable baseline legal move.
 * 2. Deepens progressively as time budget permits.
 * 3. Never accepts an incomplete iteration's partial evaluation.
 * 4. Rare tie variation among candidates within tieThreshold.
 * 5. Returns comprehensive diagnostics for telemetry and performance verification.
 */
export function selectExpertMove(
  state: GameState,
  player: Player = state.currentPlayer,
  config: ExpertSearchConfig = {}
): { pitId: number | null; diagnostics: ExpertSearchDiagnostics } {
  const startTime = Date.now();

  if (state.phase !== "PLAYING" || state.currentPlayer !== player) {
    return {
      pitId: null,
      diagnostics: {
        bestMove: null,
        bestScore: 0,
        completedDepth: 0,
        nodesEvaluated: 0,
        ttHits: 0,
        ttEntries: 0,
        timeSpentMs: 0,
        iterationHistory: [],
      },
    };
  }

  const legalPits = getSelectablePits(state).filter((id) => {
    const pit = state.pits[id];
    return pit && pit.owner === player && pit.status === "OPEN" && pit.seeds > 0;
  });

  if (legalPits.length === 0) {
    return {
      pitId: null,
      diagnostics: {
        bestMove: null,
        bestScore: 0,
        completedDepth: 0,
        nodesEvaluated: 0,
        ttHits: 0,
        ttEntries: 0,
        timeSpentMs: Date.now() - startTime,
        iterationHistory: [],
      },
    };
  }

  // Trivial single-move position: return instantly without wasting search budget
  if (legalPits.length === 1) {
    return {
      pitId: legalPits[0],
      diagnostics: {
        bestMove: legalPits[0],
        bestScore: 0,
        completedDepth: 1,
        nodesEvaluated: 1,
        ttHits: 0,
        ttEntries: 0,
        timeSpentMs: Date.now() - startTime,
        iterationHistory: [
          {
            depth: 1,
            bestMove: legalPits[0],
            score: 0,
            nodes: 1,
            timeMs: Date.now() - startTime,
          },
        ],
      },
    };
  }

  const mergedWeights: ExpertEvaluationWeights = {
    ...DEFAULT_EXPERT_WEIGHTS,
    ...(config.weights ?? {}),
  };
  const maxDepth = config.maxDepth ?? DEFAULT_EXPERT_CONFIG.maxDepth;
  const baseMaxTimeMs = config.maxTimeMs ?? DEFAULT_EXPERT_CONFIG.maxTimeMs;
  const adaptive = config.adaptiveTime ?? DEFAULT_EXPERT_CONFIG.adaptiveTime;
  const minDepth = config.minDepth ?? DEFAULT_EXPERT_CONFIG.minDepth;
  const tieThreshold = config.tieThreshold ?? DEFAULT_EXPERT_CONFIG.tieThreshold;
  const variationProbability =
    config.variationProbability ?? DEFAULT_EXPERT_CONFIG.variationProbability;
  const rng = config.rng ?? DEFAULT_EXPERT_CONFIG.rng;
  const useTT = config.useTranspositionTable ?? DEFAULT_EXPERT_CONFIG.useTranspositionTable;
  const allowTacticalExtensions =
    config.allowTacticalExtensions ?? DEFAULT_EXPERT_CONFIG.allowTacticalExtensions;
  const maxExtensions = config.maxExtensions ?? DEFAULT_EXPERT_CONFIG.maxExtensions;

  const totalBoardSeeds =
    getPlayerSideSeeds(state, "PLAYER_1") + getPlayerSideSeeds(state, "PLAYER_2");
  const budgetMs = adaptive
    ? calculateAdaptiveBudget(legalPits.length, totalBoardSeeds, baseMaxTimeMs)
    : baseMaxTimeMs;

  const deadline = startTime + budgetMs;

  const context: SearchContext = {
    deadline,
    interrupted: false,
    nodesEvaluated: 0,
    ttHits: 0,
    tt: new Map<string, TTEntry>(),
    weights: mergedWeights,
    allowTacticalExtensions,
    maxExtensions,
    useTT,
  };

  let bestCompletedMove: number = legalPits[0];
  let bestCompletedScore = -Infinity;
  let completedDepth = 0;
  const iterationHistory: ExpertSearchDiagnostics["iterationHistory"] = [];

  // Scored candidate moves for root iteration
  let rootCandidates: Array<{ pitId: number; score: number }> = [];

  // Iterative Deepening Loop
  for (let currentDepth = 1; currentDepth <= maxDepth; currentDepth++) {
    const iterStartTime = Date.now();
    let iterBestMove: number | null = null;
    let iterBestScore = -Infinity;
    let alpha = -Infinity;
    const beta = Infinity;
    const currentIterCandidates: Array<{ pitId: number; score: number }> = [];

    // Order candidate moves using TT best move from previous iteration
    const orderedMoves = getOrderedCandidateMoves(
      state,
      player,
      bestCompletedMove
    );

    for (const pitId of orderedMoves) {
      const nextState = cloneGameState(state);
      const turnRes = playTurn(nextState, pitId);
      if (!turnRes.success) continue;

      const score = minimax(
        nextState,
        currentDepth - 1,
        alpha,
        beta,
        player,
        context,
        maxExtensions
      );

      if (context.interrupted && currentDepth > minDepth) {
        break;
      }

      currentIterCandidates.push({ pitId, score });

      if (score > iterBestScore) {
        iterBestScore = score;
        iterBestMove = pitId;
      }
      alpha = Math.max(alpha, iterBestScore);
    }

    // Only commit the iteration if it finished without interruption (or was mandatory minDepth)
    if (!context.interrupted || currentDepth <= minDepth) {
      if (iterBestMove !== null) {
        bestCompletedMove = iterBestMove;
        bestCompletedScore = iterBestScore;
        completedDepth = currentDepth;
        rootCandidates = currentIterCandidates;

        if (useTT) {
          const rootKey = getGameStateKey(state);
          context.tt.set(rootKey, {
            depth: currentDepth,
            score: iterBestScore,
            type: "EXACT",
            bestMove: iterBestMove,
          });
        }

        iterationHistory.push({
          depth: currentDepth,
          bestMove: iterBestMove,
          score: iterBestScore,
          nodes: context.nodesEvaluated,
          timeMs: Date.now() - iterStartTime,
        });
      }
    } else {
      // Discard incomplete iteration!
      break;
    }

    // Stop early on proven forced match win / loss
    if (Math.abs(bestCompletedScore) >= mergedWeights.matchWin - 100) {
      break;
    }

    // Stop if remaining time is insufficient for another iteration
    if (Date.now() >= deadline) {
      break;
    }
  }

  // Rare tie variation among genuinely equal/near-equal candidates
  let finalMove = bestCompletedMove;
  let variedFromTopMove = false;

  if (rootCandidates.length > 1 && variationProbability > 0) {
    const topScore = bestCompletedScore;
    const tiedMoves = rootCandidates.filter(
      (c) => topScore - c.score <= tieThreshold
    );

    if (tiedMoves.length > 1) {
      const roll = rng();
      if (roll < variationProbability) {
        const pickIdx = Math.floor(rng() * tiedMoves.length);
        const chosen = tiedMoves[Math.min(pickIdx, tiedMoves.length - 1)];
        if (chosen.pitId !== bestCompletedMove) {
          finalMove = chosen.pitId;
          variedFromTopMove = true;
        }
      }
    }
  }

  const timeSpentMs = Date.now() - startTime;

  return {
    pitId: finalMove,
    diagnostics: {
      bestMove: finalMove,
      bestScore: bestCompletedScore,
      completedDepth,
      nodesEvaluated: context.nodesEvaluated,
      ttHits: context.ttHits,
      ttEntries: context.tt.size,
      timeSpentMs,
      iterationHistory,
      variedFromTopMove,
    },
  };
}
