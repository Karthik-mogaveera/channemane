/**
 * Player Panels Component
 * Displays active turn indicator, player names, and round wins.
 * Duplicate storage displays have been removed per Issue 7 (storage is displayed
 * inside the dedicated board storage bowls).
 * Pit range labels (P0–P6, P7–P13) have been removed per Issue 9.
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
          <span>Player 1</span>
        </div>
        <div className="player-stats">
          <span>Round Wins: </span>
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
          <span>Player 2</span>
        </div>
        <div className="player-stats">
          <span>Round Wins: </span>
          <strong data-testid="p2-wins-count">{player2.roundWins}</strong>
        </div>
      </div>
    </div>
  );
};
