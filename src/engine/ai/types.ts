/**
 * Channemane AI Engine Types
 * Strictly follows specification requirements for AI architecture, evaluation, and selection.
 */
export interface AIEvaluationWeights {
  /** Points awarded per seed captured in immediate turn outcome */
  captureSeedWeight: number;
  /** Points awarded for creating a new claimable bonus opportunity on AI's side */
  bonusOpportunityWeight: number;
  /** Penalty points if a move creates a claimable bonus for the opponent */
  opponentBonusPenalty: number;
  /** Points awarded if move immediately wins the round */
  roundWinWeight: number;
  /** Points awarded if move immediately wins the entire match */
  matchWinWeight: number;
  /** Points awarded per net seed increase in storage */
  storageGainWeight: number;
}

export interface AIMoveCandidate {
  pitId: number;
  score: number;
  capturedSeeds: number;
  bonusOpportunities: number;
  opponentBonusPenalty: number;
  roundWon: boolean;
  matchWon: boolean;
  storageGain: number;
}

export interface AIBeginnerConfig {
  /** Configurable evaluation weights */
  weights?: Partial<AIEvaluationWeights>;
  /**
   * Probability of choosing the highest-scoring move when beneficial moves (score > 0) exist.
   * Default: 0.75 (75% probability of optimal capture/bonus, 25% probability of choosing an alternative legal move).
   */
  bestMoveProbability?: number;
  /**
   * Injectable random number generator for reproducible and deterministic testing.
   * Default: Math.random
   */
  rng?: () => number;
}

export interface ExpertEvaluationWeights {
  /** Points awarded for a proven match win (+1,000,000) */
  matchWin: number;
  /** Points awarded for winning the current round (+10,000) */
  roundWin: number;
  /** Points per open pit pair in future round after settlement */
  openPairsWeight: number;
  /** Points per net seed in storage */
  storageWeight: number;
  /** Points per seed on own side of the board */
  boardSeedWeight: number;
  /** Points per legal candidate move (mobility) */
  mobilityWeight: number;
  /** Points per captured seed */
  captureSeedWeight: number;
  /** Points per claimable bonus on own side */
  bonusWeight: number;
  /** Penalty points per claimable bonus for opponent */
  opponentBonusPenalty: number;
  /** Points for pits with 3 seeds on own side (bonus setup opportunity) */
  threeSeedBonusSetupWeight: number;
  /** Penalty for pits with 3 seeds on opponent's side (opponent bonus threat) */
  opponentThreeSeedThreatPenalty: number;
  /** Defense weight for pits protected from immediate opponent scoop/capture */
  defenseWeight: number;
}

export interface ExpertSearchConfig {
  /** Maximum search depth (iterative deepening limit) */
  maxDepth?: number;
  /** Maximum computation budget in milliseconds */
  maxTimeMs?: number;
  /** Whether to dynamically scale time budget based on position complexity */
  adaptiveTime?: boolean;
  /** Minimum search depth to complete before stopping */
  minDepth?: number;
  /** Configurable evaluation weights */
  weights?: Partial<ExpertEvaluationWeights>;
  /** Threshold below best score within which moves are considered tied */
  tieThreshold?: number;
  /** Probability of selecting among near-tied moves (0.0 = always best, e.g. 0.10) */
  variationProbability?: number;
  /** Injectable random number generator for deterministic testing */
  rng?: () => number;
  /** Whether to use transposition table caching */
  useTranspositionTable?: boolean;
  /** Whether to allow tactical search extensions for unstable positions */
  allowTacticalExtensions?: boolean;
  /** Maximum plies of tactical extension */
  maxExtensions?: number;
}

export interface ExpertIterationInfo {
  depth: number;
  bestMove: number | null;
  score: number;
  nodes: number;
  timeMs: number;
}

export interface ExpertSearchDiagnostics {
  bestMove: number | null;
  bestScore: number;
  completedDepth: number;
  nodesEvaluated: number;
  ttHits: number;
  ttEntries: number;
  timeSpentMs: number;
  iterationHistory: ExpertIterationInfo[];
  variedFromTopMove?: boolean;
}

export type TTNodeType = "EXACT" | "LOWERBOUND" | "UPPERBOUND";

export interface TTEntry {
  depth: number;
  score: number;
  type: TTNodeType;
  bestMove: number | null;
}
