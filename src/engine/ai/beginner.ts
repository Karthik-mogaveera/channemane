/**
 * Beginner AI Decision Engine for Channemane
 * Strictly adheres to specifications:
 * - Isolated candidate evaluation without modifying live state.
 * - Simple immediate evaluation heuristic with configurable weights.
 * - Balanced capture preference with controlled randomness for beginner difficulty.
 * - Injectable RNG for reproducible tests.
 * - Single legal move always selected; empty/closed/human pits strictly rejected.
 */

import { cloneGameState } from "../board";
import { getSelectablePits } from "../selection";
import { playTurn } from "../game";
import { getClaimableBonusPits } from "../bonus";
import type { GameState, Player } from "../types";
import type {
  AIEvaluationWeights,
  AIMoveCandidate,
  AIBeginnerConfig,
} from "./types";

export const DEFAULT_BEGINNER_WEIGHTS: AIEvaluationWeights = {
  captureSeedWeight: 10,
  bonusOpportunityWeight: 15,
  opponentBonusPenalty: 5,
  roundWinWeight: 25,
  matchWinWeight: 100,
  storageGainWeight: 2,
};

export const DEFAULT_BEGINNER_PROBABILITY = 0.75;

/**
 * Evaluates the immediate result of selecting a candidate starting pit on an isolated copy of GameState.
 * Guaranteed: Original GameState is left completely unmodified.
 */
export function evaluateCandidateMove(
  state: GameState,
  pitId: number,
  player: Player,
  weights: AIEvaluationWeights = DEFAULT_BEGINNER_WEIGHTS
): AIMoveCandidate | null {
  // Confirm legality
  const pit = state.pits[pitId];
  if (!pit || pit.owner !== player || pit.status === "CLOSED" || pit.seeds <= 0) {
    return null;
  }

  // Pure simulation on deep copy
  const simState = cloneGameState(state);
  const turnResult = playTurn(simState, pitId);

  if (!turnResult.success) {
    return null;
  }

  const outcome = turnResult.data;
  const opponent: Player = player === "PLAYER_1" ? "PLAYER_2" : "PLAYER_1";
  const playerKey = player === "PLAYER_1" ? "player1" : "player2";

  // Immediate capture outcome
  const capturedSeeds = outcome.captureResult?.capturedSeeds ?? 0;

  // Net new bonus opportunities on AI side
  const originalAiBonuses = getClaimableBonusPits(state, player).length;
  const simAiBonuses = getClaimableBonusPits(simState, player).length;
  const bonusOpportunities = Math.max(0, simAiBonuses - originalAiBonuses);

  // Net new bonus opportunities for opponent (penalty)
  const originalOppBonuses = getClaimableBonusPits(state, opponent).length;
  const simOppBonuses = getClaimableBonusPits(simState, opponent).length;
  const opponentBonusPenalty = Math.max(0, simOppBonuses - originalOppBonuses);

  // Round and Match termination outcomes
  const roundWon =
    Boolean(outcome.roundEnded) &&
    outcome.roundSettlement?.roundWinner === player;
  const matchWon =
    Boolean(outcome.matchEnded) && outcome.matchResult?.winner === player;

  // Immediate storage increase
  const initialStorage = state.players[playerKey].storage;
  const finalStorage = simState.players[playerKey].storage;
  const storageGain = Math.max(0, finalStorage - initialStorage);

  // Calculate score
  const score =
    capturedSeeds * weights.captureSeedWeight +
    bonusOpportunities * weights.bonusOpportunityWeight -
    opponentBonusPenalty * weights.opponentBonusPenalty +
    (roundWon ? weights.roundWinWeight : 0) +
    (matchWon ? weights.matchWinWeight : 0) +
    storageGain * weights.storageGainWeight;

  return {
    pitId,
    score,
    capturedSeeds,
    bonusOpportunities,
    opponentBonusPenalty,
    roundWon,
    matchWon,
    storageGain,
  };
}

/**
 * Generates and evaluates all legal candidate moves for the current player.
 */
export function generateCandidateMoves(
  state: GameState,
  player: Player = state.currentPlayer,
  weights: AIEvaluationWeights = DEFAULT_BEGINNER_WEIGHTS
): AIMoveCandidate[] {
  if (state.phase !== "PLAYING" || state.currentPlayer !== player) {
    return [];
  }

  const legalPits = getSelectablePits(state).filter((id) => {
    const pit = state.pits[id];
    return pit && pit.owner === player && pit.status === "OPEN" && pit.seeds > 0;
  });

  const candidates: AIMoveCandidate[] = [];

  for (const pitId of legalPits) {
    const candidate = evaluateCandidateMove(state, pitId, player, weights);
    if (candidate !== null) {
      candidates.push(candidate);
    }
  }

  return candidates;
}

/**
 * Beginner AI Move Selector
 *
 * Selection Strategy:
 * 1. Confirm game is playable and current player matches.
 * 2. If no legal moves exist, return null.
 * 3. If exactly one legal move exists, select it unconditionally.
 * 4. If beneficial moves (score > 0, e.g. captures or bonuses) exist:
 *    - With probability P_best (default 75%), select one of the highest-scoring moves.
 *    - With probability (1 - P_best) (default 25%), select an alternative legal move.
 * 5. If all legal moves are neutral or negative (score <= 0):
 *    - Select among the highest-scoring legal alternatives.
 * 6. Supports injectable RNG for deterministic test verification.
 */
export function selectBeginnerMove(
  state: GameState,
  player: Player = state.currentPlayer,
  config: AIBeginnerConfig = {}
): number | null {
  if (state.phase !== "PLAYING" || state.currentPlayer !== player) {
    return null;
  }

  const weights: AIEvaluationWeights = {
    ...DEFAULT_BEGINNER_WEIGHTS,
    ...(config.weights ?? {}),
  };
  const bestMoveProbability =
    config.bestMoveProbability ?? DEFAULT_BEGINNER_PROBABILITY;
  const rng = config.rng ?? Math.random;

  const candidates = generateCandidateMoves(state, player, weights);

  if (candidates.length === 0) {
    return null;
  }

  // Exactly one legal move: must be selected unconditionally without random override
  if (candidates.length === 1) {
    return candidates[0].pitId;
  }

  // Sort candidates by score descending
  candidates.sort((a, b) => b.score - a.score);

  const topScore = candidates[0].score;

  // Case A: Beneficial moves exist (score > 0, e.g. immediate captures or bonuses)
  if (topScore > 0) {
    const bestMoves = candidates.filter((c) => c.score === topScore);
    const otherMoves = candidates.filter((c) => c.score < topScore);

    // If there are no other moves, pick from best
    if (otherMoves.length === 0) {
      const idx = Math.floor(rng() * bestMoves.length);
      return bestMoves[Math.min(idx, bestMoves.length - 1)].pitId;
    }

    const roll = rng();
    if (roll < bestMoveProbability) {
      // 75% preference: pick one of the best moves
      const idx =
        bestMoves.length === 1 ? 0 : Math.floor(rng() * bestMoves.length);
      return bestMoves[Math.min(idx, bestMoves.length - 1)].pitId;
    } else {
      // 25% occasional beginner variation: pick an alternative legal move
      const idx =
        otherMoves.length === 1 ? 0 : Math.floor(rng() * otherMoves.length);
      return otherMoves[Math.min(idx, otherMoves.length - 1)].pitId;
    }
  }

  // Case B: All legal moves are neutral/zero-benefit
  const topNeutralMoves = candidates.filter((c) => c.score === topScore);
  const idx = Math.floor(rng() * topNeutralMoves.length);
  return topNeutralMoves[Math.min(idx, topNeutralMoves.length - 1)].pitId;
}
