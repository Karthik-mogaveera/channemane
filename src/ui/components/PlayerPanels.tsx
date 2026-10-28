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
  player3?: PlayerState;
  player4?: PlayerState;
  disqualifiedPlayers?: Player[];
}

export const PlayerPanels: React.FC<PlayerPanelsProps> = React.memo(({
  currentPlayer,
  player1,
  player2,
  player3,
  player4,
  disqualifiedPlayers = [],
}) => {
  const isP1Dis = disqualifiedPlayers.includes("PLAYER_1");
  const isP2Dis = disqualifiedPlayers.includes("PLAYER_2");
  const isP3Dis = disqualifiedPlayers.includes("PLAYER_3");
  const isP4Dis = disqualifiedPlayers.includes("PLAYER_4");

  return (
    <div className="players-bar" role="region" aria-label="Players status">
      {/* Player 1 Card */}
      <div
        className={`player-card p1 ${currentPlayer === "PLAYER_1" ? "active" : ""} ${isP1Dis ? "disqualified" : ""}`}
        data-testid="player-card-1"
      >
        <div className="player-name">
          <span style={{ color: "var(--p1-crimson)" }}>●</span>
          <span>Player 1 {isP1Dis && <span className="disqualified-tag">(Disqualified)</span>}</span>
        </div>
        <div className="player-stats">
          <span>Round Wins: </span>
          <strong data-testid="p1-wins-count">{player1.roundWins}</strong>
        </div>
      </div>

      {/* Player 2 Card */}
      <div
        className={`player-card p2 ${currentPlayer === "PLAYER_2" ? "active" : ""} ${isP2Dis ? "disqualified" : ""}`}
        data-testid="player-card-2"
      >
        <div className="player-name">
          <span style={{ color: "var(--p2-indigo)" }}>●</span>
          <span>Player 2 {isP2Dis && <span className="disqualified-tag">(Disqualified)</span>}</span>
        </div>
        <div className="player-stats">
          <span>Round Wins: </span>
          <strong data-testid="p2-wins-count">{player2.roundWins}</strong>
        </div>
      </div>

      {/* Player 3 Card (rendered if 3-player or 4-player mode) */}
      {player3 && (
        <div
          className={`player-card p3 ${currentPlayer === "PLAYER_3" ? "active" : ""} ${isP3Dis ? "disqualified" : ""}`}
          data-testid="player-card-3"
        >
          <div className="player-name">
            <span style={{ color: "var(--p3-emerald, #10b981)" }}>●</span>
            <span>Player 3 {isP3Dis && <span className="disqualified-tag">(Disqualified)</span>}</span>
          </div>
          <div className="player-stats">
            <span>Round Wins: </span>
            <strong data-testid="p3-wins-count">{player3.roundWins}</strong>
          </div>
        </div>
      )}

      {/* Player 4 Card (rendered if 4-player mode) */}
      {player4 && (
        <div
          className={`player-card p4 ${currentPlayer === "PLAYER_4" ? "active" : ""} ${isP4Dis ? "disqualified" : ""}`}
          data-testid="player-card-4"
        >
          <div className="player-name">
            <span style={{ color: "var(--p4-amber, #f59e0b)" }}>●</span>
            <span>Player 4 {isP4Dis && <span className="disqualified-tag">(Disqualified)</span>}</span>
          </div>
          <div className="player-stats">
            <span>Round Wins: </span>
            <strong data-testid="p4-wins-count">{player4.roundWins}</strong>
          </div>
        </div>
      )}
    </div>
  );
});

PlayerPanels.displayName = "PlayerPanels";
