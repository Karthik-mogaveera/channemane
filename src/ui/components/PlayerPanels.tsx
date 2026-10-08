/**
 * Player Panels Component
 * Displays player cards, storage totals, and round wins.
 */

import React from "react";
import type { Player, PlayerState } from "../../engine/types";

export interface PlayerPanelsProps {
  currentPlayer: Player;
  player1: PlayerState;
  player2: PlayerState;
}

export const PlayerPanels: React.FC<PlayerPanelsProps> = ({
  currentPlayer,
  player1,
  player2,
}) => {
  return (
    <div className="players-bar" role="region" aria-label="Players status">
      {/* Player 1 Card */}
      <div
        className={`player-card p1 ${currentPlayer === "PLAYER_1" ? "active" : ""}`}
        data-testid="player-card-1"
      >
        <div className="player-name">
          <span style={{ color: "var(--p1-crimson)" }}>●</span>
          <span>Player 1 (P0–P6)</span>
        </div>
        <div className="player-stats">
          <span>Captured: </span>
          <strong data-testid="p1-captured-count">{player1.storage}</strong>
          <span style={{ margin: "0 6px" }}>|</span>
          <span>Wins: </span>
          <strong data-testid="p1-wins-count">{player1.roundWins}</strong>
        </div>
      </div>

      {/* Player 2 Card */}
      <div
        className={`player-card p2 ${currentPlayer === "PLAYER_2" ? "active" : ""}`}
        data-testid="player-card-2"
      >
        <div className="player-name">
          <span style={{ color: "var(--p2-indigo)" }}>●</span>
          <span>Player 2 (P7–P13)</span>
        </div>
        <div className="player-stats">
          <span>Captured: </span>
          <strong data-testid="p2-captured-count">{player2.storage}</strong>
          <span style={{ margin: "0 6px" }}>|</span>
          <span>Wins: </span>
          <strong data-testid="p2-wins-count">{player2.roundWins}</strong>
        </div>
      </div>
    </div>
  );
};
