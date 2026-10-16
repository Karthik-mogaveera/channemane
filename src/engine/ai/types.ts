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
