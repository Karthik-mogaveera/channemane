/**
 * Turn Banner Component
 * Clearly indicates active player turn, game state, sowing hand visualizer, and round info.
 */

import React from "react";
import type { Player, GamePhase, TurnPhase } from "../../engine/types";

export interface TurnBannerProps {
  currentPlayer: Player;
  gamePhase: GamePhase;
  turnPhase: TurnPhase;
  round: number;
  isAnimating: boolean;
  visualHandSeeds: number;
}

export const TurnBanner: React.FC<TurnBannerProps> = ({
  currentPlayer,
  gamePhase,
  round,
  isAnimating,
  visualHandSeeds,
}) => {
  const isP1 = currentPlayer === "PLAYER_1";
  const playerText = isP1 ? "PLAYER 1" : "PLAYER 2";
  const playerClass = isP1 ? "p1-turn" : "p2-turn";

  let statusText = `${playerText}'S TURN`;
  if (isAnimating) {
    statusText = `${playerText} IS SOWING...`;
  } else if (gamePhase === "ROUND_SETTLEMENT") {
    statusText = "ROUND SETTLEMENT IN PROGRESS";
  } else if (gamePhase === "MATCH_END") {
    statusText = "MATCH ENDED";
  }

  return (
    <div className="turn-banner" role="status" aria-live="polite" data-testid="turn-banner">
      <div className={`turn-badge ${playerClass}`} data-testid="turn-indicator">
        <span
          className="turn-indicator-dot"
          style={{ background: isP1 ? "var(--p1-crimson)" : "var(--p2-indigo)" }}
          aria-hidden="true"
        />
        <span>{statusText}</span>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
        {isAnimating && visualHandSeeds > 0 && (
          <div className="hand-status-indicator" data-testid="hand-seeds-indicator">
            <span>🤲 Seeds in Hand:</span>
            <strong>{visualHandSeeds}</strong>
          </div>
        )}

        <div className="match-info-pill" data-testid="round-indicator">
          Round {round}
        </div>
      </div>
    </div>
  );
};
