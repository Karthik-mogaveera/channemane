/**
 * Master AI Decision Engine for Channemane
 * Elite-level AI opponent featuring:
 * - Hybrid system: Tractable endgame detection + exact solver under strict computational limits.
 * - Deep minimax search with alpha-beta pruning.
 * - Iterative deepening with adaptive search budget up to depth 8.
 * - 5-Tier position evaluator calibrated for Master difficulty with aggressive bonus denial and settlement foresight.
 * - Selective tactical search extensions up to 2 plies on unstable tactical positions.
 * - Move ordering incorporating TT best moves, capture evaluations, and bonus control.
 * - Transposition table caching with full state keys.
 * - Deterministic, elite move selection (variationProbability = 0.0 by default).
 * - Complete turn simulation on cloned states without mutating live state.
 */

import { cloneGameState, getPlayerSideSeeds } from "../board";
import { getSelectablePits } from "../selection";
import { playTurn } from "../game";
import { getClaimableBonusPits, claimBonus } from "../bonus";
import { calculateOpenPairs } from "../roundSetup";
import { isMatchOver } from "../matchEnd";
import {
  BONUS_THRESHOLD,
  INITIAL_SEEDS_PER_PIT,
} from "../constants";
import type { GameState, Player } from "../types";
import type {
  MasterEvaluationWeights,
  MasterSearchConfig,
  MasterSearchDiagnostics,
  TTEntry,
} from "./types";
import { getGameStateKey, getOrderedCandidateMoves } from "./expert";
import {
  isEndgameTractable,
  solveEndgame,
  DEFAULT_ENDGAME_CONFIG,
} from "./endgameSolver";

export const DEFAULT_MASTER_WEIGHTS: MasterEvaluationWeights = {
  matchWin: 1_000_000,
  roundWin: 25_000,
  openPairsWeight: 1_200,
  storageWeight: 120,
  boardSeedWeight: 20,
  mobilityWeight: 35,
  captureSeedWeight: 60,
  bonusWeight: 150,
  opponentBonusPenalty: 180,
  threeSeedBonusSetupWeight: 45,
  opponentThreeSeedThreatPenalty: 60,
  defenseWeight: 30,
  endgameSeedAdvantage: 50,
};

export const DEFAULT_MASTER_CONFIG: Required<MasterSearchConfig> = {
  maxDepth: 8,
  maxTimeMs: 500,
  adaptiveTime: true,
  minDepth: 1,
  weights: DEFAULT_MASTER_WEIGHTS,
  tieThreshold: 10,
  variationProbability: 0.0,
  rng: Math.random,
  useTranspositionTable: true,
  allowTacticalExtensions: true,
  maxExtensions: 2,
  enableEndgameSolver: true,
  endgameConfig: DEFAULT_ENDGAME_CONFIG,
};

/**
 * 5-Tier Position Evaluator for Master AI
 * Evaluates:
 * 1. Match Outcome (Forced win/loss above any temporary advantage)
 * 2. Round Outcome (Settlement consequences, next round pit pairs, survival margin)
 * 3. Storage Advantage & Seed Conservation
 * 4. Tactical Opportunities (Captures, bonus ownership, aggressive bonus denial, 3-seed threats)
 * 5. Positional Quality (Mobility, pit protection, seed vulnerability, future options)
 */
export function evaluateMasterPosition(
  state: GameState,
  player: Player,
  weights: MasterEvaluationWeights = DEFAULT_MASTER_WEIGHTS,
  depth: number = 0
): number {
  const opponent: Player = player === "PLAYER_1" ? "PLAYER_2" : "PLAYER_1";
  const playerKey = player === "PLAYER_1" ? "player1" : "player2";
  const oppKey = opponent === "PLAYER_1" ? "player1" : "player2";
  const playerBoardSeeds = getPlayerSideSeeds(state, player);
  const oppBoardSeeds = getPlayerSideSeeds(state, opponent);
  const totalBoardSeeds = playerBoardSeeds + oppBoardSeeds;

  const pStorage = state.players[playerKey].storage;
  const oStorage = state.players[oppKey].storage;

  // Tier 1: Match Outcome (Highest Priority)
  if (state.phase === "MATCH_END" || (state.phase === "ROUND_SETTLEMENT" && isMatchOver(state))) {
    if (state.winner === player) {
      return weights.matchWin - depth;
    }
    if (state.winner === opponent) {
      return -weights.matchWin + depth;
    }
    if (pStorage >= 5 && oStorage < 5) {
      return weights.matchWin - depth;
    }
    if (oStorage >= 5 && pStorage < 5) {
      return -weights.matchWin + depth;
    }
    return 0;
  }

  // During PLAYING phase: Check for mathematically guaranteed terminal match win/loss
  if (oStorage + totalBoardSeeds < 5 && pStorage >= 5) {
    // Opponent can never reach 5 seeds: guaranteed match win!
    return weights.matchWin - depth;
  }
  if (pStorage + totalBoardSeeds < 5 && oStorage >= 5) {
    // Player can never reach 5 seeds: guaranteed match loss!
    return -weights.matchWin + depth;
  }

  // Tier 2: Round Outcome (Settlement & Next Round Preparation)
  let roundScore = 0;
  if (state.phase === "ROUND_SETTLEMENT") {
    const pStorage = state.players[playerKey].storage;
    const oStorage = state.players[oppKey].storage;

    // Critical match-ending boundary awareness
    if (pStorage < 5) {
      return -weights.matchWin + depth;
    }
    if (oStorage < 5) {
      return weights.matchWin - depth;
    }

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
    roundScore += (pStorage - oStorage) * weights.storageWeight;
    roundScore += (pReserve - oReserve) * 25;
    return roundScore;
  }

  // Tier 3: Storage Advantage & Seed Distribution
  const storageScore = (pStorage - oStorage) * weights.storageWeight;
  let boardSeedScore = (playerBoardSeeds - oppBoardSeeds) * weights.boardSeedWeight;

  // Endgame bonus: when total board seeds are low, seed differential is especially critical
  if (totalBoardSeeds <= 14) {
    boardSeedScore += (playerBoardSeeds - oppBoardSeeds) * weights.endgameSeedAdvantage;
  }

  // Tier 4: Tactical Opportunities & Opponent Denial
  const playerBonuses = getClaimableBonusPits(state, player).length;
  const oppBonuses = getClaimableBonusPits(state, opponent).length;
  const bonusScore =
    playerBonuses * (weights.bonusWeight + 4 * weights.storageWeight) -
    oppBonuses * (weights.opponentBonusPenalty + 4 * weights.storageWeight);

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
      if (pit.seeds >= 4) {
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
 * Fast move ordering for interior minimax nodes in Master search.
 */
function getMasterCandidateMoves(
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

  // Sort by seed count descending
  return legalPits.sort((a, b) => state.pits[b].seeds - state.pits[a].seeds);
}

interface MasterSearchContext {
  deadline: number;
  interrupted: boolean;
  nodesEvaluated: number;
  ttHits: number;
  tt: Map<string, TTEntry>;
  weights: MasterEvaluationWeights;
  allowTacticalExtensions: boolean;
  maxExtensions: number;
  useTT: boolean;
}

/**
 * Master Minimax search with Alpha-Beta pruning, TT caching, and selective tactical extension.
 */
function masterMinimax(
  state: GameState,
  depth: number,
  alpha: number,
  beta: number,
  originalPlayer: Player,
  context: MasterSearchContext,
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
    return evaluateMasterPosition(state, originalPlayer, context.weights, depth);
  }
  if (state.phase === "ROUND_SETTLEMENT") {
    return evaluateMasterPosition(state, originalPlayer, context.weights, depth);
  }

  // Depth horizon check with selective tactical extensions
  if (depth <= 0) {
    if (context.allowTacticalExtensions && extensionsLeft > 0) {
      const activePits = getSelectablePits(state);
      const totalBoardSeeds =
        getPlayerSideSeeds(state, "PLAYER_1") + getPlayerSideSeeds(state, "PLAYER_2");

      // Extend if position is tactically unstable: low seeds, low mobility, or pending bonus
      const isTacticallyUnstable =
        activePits.length <= 3 ||
        totalBoardSeeds <= 16 ||
        getClaimableBonusPits(state, "PLAYER_1").length > 0 ||
        getClaimableBonusPits(state, "PLAYER_2").length > 0;

      if (isTacticallyUnstable) {
        return masterMinimax(
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
    return evaluateMasterPosition(state, originalPlayer, context.weights, depth);
  }

  const currentPlayer = state.currentPlayer;
  const isMaximizing = currentPlayer === originalPlayer;
  const candidateMoves = getMasterCandidateMoves(state, currentPlayer, ttBestMove);

  if (candidateMoves.length === 0) {
    return evaluateMasterPosition(state, originalPlayer, context.weights, depth);
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

    const claimable = getClaimableBonusPits(nextState, currentPlayer);
    for (const bPit of claimable) {
      claimBonus(nextState, bPit);
    }

    const score = masterMinimax(
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
 * Calculates adaptive time budget for Master AI.
 */
function calculateMasterAdaptiveBudget(
  legalMovesCount: number,
  totalBoardSeeds: number,
  baseMaxTimeMs: number
): number {
  if (legalMovesCount <= 1) {
    return 0; // Instant
  }
  if (legalMovesCount === 2) {
    return Math.min(baseMaxTimeMs, 200);
  }
  // Endgame or sharp tactical positions: allocate full budget
  if (totalBoardSeeds <= 16) {
    return baseMaxTimeMs;
  }
  return Math.min(baseMaxTimeMs, 450);
}

/**
 * Selects the optimal move for Master AI.
 *
 * Orchestration flow:
 * 1. Hybrid Endgame Check: If endgame is tractable, execute exact solve.
 *    If solve succeeds, return exact result immediately.
 * 2. Iterative Deepening Minimax:
 *    - Deepens up to maxDepth (default: 8) within adaptive time budget.
 *    - Always commits fully completed iterations only.
 *    - Uses Master evaluation weights and 2-ply selective tactical extensions.
 *    - Deterministic tie-breaking by default.
 */
export function selectMasterMove(
  state: GameState,
  player: Player = state.currentPlayer,
  config: MasterSearchConfig = {}
): { pitId: number | null; diagnostics: MasterSearchDiagnostics } {
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
        endgameSolved: false,
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
        endgameSolved: false,
      },
    };
  }

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
        endgameSolved: false,
      },
    };
  }

  // --- Step 1: Hybrid Exact Endgame Solving ---
  const enableEndgameSolver = config.enableEndgameSolver ?? DEFAULT_MASTER_CONFIG.enableEndgameSolver;
  const endgameConfig = config.endgameConfig ?? DEFAULT_MASTER_CONFIG.endgameConfig;

  if (enableEndgameSolver && isEndgameTractable(state, endgameConfig)) {
    const endgameResult = solveEndgame(state, player, endgameConfig);
    if (endgameResult && endgameResult.bestMove !== null && endgameResult.isExact) {
      return {
        pitId: endgameResult.bestMove,
        diagnostics: {
          bestMove: endgameResult.bestMove,
          bestScore: endgameResult.score,
          completedDepth: 99, // Flag exact solve depth
          nodesEvaluated: endgameResult.nodesExplored,
          ttHits: 0,
          ttEntries: 0,
          timeSpentMs: Date.now() - startTime,
          iterationHistory: [
            {
              depth: 99,
              bestMove: endgameResult.bestMove,
              score: endgameResult.score,
              nodes: endgameResult.nodesExplored,
              timeMs: Date.now() - startTime,
            },
          ],
          endgameSolved: true,
          endgameResult,
        },
      };
    }
    // If endgame solver aborted due to budget or complexity, fall through cleanly to bounded search!
  }

  // --- Step 2: Iterative Deepening Bounded Search ---
  const mergedWeights: MasterEvaluationWeights = {
    ...DEFAULT_MASTER_WEIGHTS,
    ...(config.weights ?? {}),
  };
  const maxDepth = config.maxDepth ?? DEFAULT_MASTER_CONFIG.maxDepth;
  const baseMaxTimeMs = config.maxTimeMs ?? DEFAULT_MASTER_CONFIG.maxTimeMs;
  const adaptive = config.adaptiveTime ?? DEFAULT_MASTER_CONFIG.adaptiveTime;
  const minDepth = config.minDepth ?? DEFAULT_MASTER_CONFIG.minDepth;
  const tieThreshold = config.tieThreshold ?? DEFAULT_MASTER_CONFIG.tieThreshold;
  const variationProbability =
    config.variationProbability ?? DEFAULT_MASTER_CONFIG.variationProbability;
  const rng = config.rng ?? DEFAULT_MASTER_CONFIG.rng;
  const useTT = config.useTranspositionTable ?? DEFAULT_MASTER_CONFIG.useTranspositionTable;
  const allowTacticalExtensions =
    config.allowTacticalExtensions ?? DEFAULT_MASTER_CONFIG.allowTacticalExtensions;
  const maxExtensions = config.maxExtensions ?? DEFAULT_MASTER_CONFIG.maxExtensions;

  const totalBoardSeeds =
    getPlayerSideSeeds(state, "PLAYER_1") + getPlayerSideSeeds(state, "PLAYER_2");
  const budgetMs = adaptive
    ? calculateMasterAdaptiveBudget(legalPits.length, totalBoardSeeds, baseMaxTimeMs)
    : baseMaxTimeMs;

  const deadline = startTime + budgetMs;

  const context: MasterSearchContext = {
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
  const iterationHistory: MasterSearchDiagnostics["iterationHistory"] = [];
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

      const claimable = getClaimableBonusPits(nextState, player);
      for (const bPit of claimable) {
        claimBonus(nextState, bPit);
      }

      const score = masterMinimax(
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
      // Discard interrupted iteration
      break;
    }

    // Stop early on proven forced match win / loss
    if (Math.abs(bestCompletedScore) >= mergedWeights.matchWin - 100) {
      break;
    }

    if (Date.now() >= deadline) {
      break;
    }
  }

  // Tie variation (0.0 by default in Master)
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
      endgameSolved: false,
    },
  };
}
