/**
 * Turn Banner Component
 * Clearly indicates active player turn, game state, sowing hand visualizer,
 * interactive continuation/capture prompts, and round info.
 */

import React from "react";
import type { Player, GamePhase, TurnPhase } from "../../engine/types";
import type { InteractionState } from "../hooks/useChannemaneGame";

export interface TurnBannerProps {
  currentPlayer: Player;
  gamePhase: GamePhase;
  turnPhase: TurnPhase;
  round: number;
  isAnimating: boolean;
  visualHandSeeds: number;
  interactionState?: InteractionState;
  hasClaimableBonus?: boolean;
}

export const TurnBanner: React.FC<TurnBannerProps> = ({
  currentPlayer,
  gamePhase,
  round,
  isAnimating,
  visualHandSeeds,
  interactionState = "WAITING_FOR_START",
  hasClaimableBonus = false,
}) => {
  const isP1 = currentPlayer === "PLAYER_1";
  const playerText = isP1 ? "PLAYER 1" : "PLAYER 2";
  let playerClass = isP1 ? "p1-turn" : "p2-turn";

  let statusText = `${playerText}'S TURN`;
  let indicatorDotColor = isP1 ? "var(--p1-crimson)" : "var(--p2-indigo)";

  if (interactionState === "WAITING_FOR_CONTINUATION") {
    statusText = "Choose the highlighted pit to continue sowing.";
    playerClass = "continuation-prompt";
    indicatorDotColor = "#22c55e";
  } else if (interactionState === "WAITING_FOR_CAPTURE") {
    statusText = "Tap the highlighted pit to collect its seeds.";
    playerClass = "capture-prompt";
    indicatorDotColor = "#f97316";
  } else if (isAnimating) {
    statusText = `${playerText} IS SOWING...`;
  } else if (gamePhase === "ROUND_SETTLEMENT") {
    statusText = "ROUND SETTLEMENT IN PROGRESS";
  } else if (gamePhase === "MATCH_END") {
    statusText = "MATCH ENDED";
  } else {
    // WAITING_FOR_START
    statusText = `${playerText}'S TURN`;
  }

  return (
    <div className="turn-banner" role="status" aria-live="polite" data-testid="turn-banner">
      <div className={`turn-badge ${playerClass}`} data-testid="turn-indicator">
        <span
          className="turn-indicator-dot"
          style={{ background: indicatorDotColor }}
          aria-hidden="true"
        />
        <span className="turn-status-text" data-testid="turn-status-text">
          {statusText}
        </span>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
        {hasClaimableBonus && (
          <div className="bonus-hint-pill" data-testid="bonus-hint">
            <span>✨ Hold glowing pit to collect +4 bonus</span>
          </div>
        )}

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
