/**
 * Match End Modal Component
 * Displays the final victor of the Channemane match with final scores and restart action.
 */

import React from "react";
import type { MatchEndResult } from "../../engine/matchEnd";
import { useFocusTrap } from "../hooks/useFocusTrap";

export interface MatchEndModalProps {
  matchResult: MatchEndResult;
  onNewMatch: () => void;
  onHome?: () => void;
  onClose?: () => void;
}

export const MatchEndModal: React.FC<MatchEndModalProps> = ({
  matchResult,
  onNewMatch,
  onHome,
  onClose,
}) => {
  const modalRef = useFocusTrap<HTMLDivElement>({
    isOpen: true,
    onEscape: onClose ?? onHome,
  });

  const winnerTitle =
    matchResult.winner === "PLAYER_1"
      ? "Player 1 Wins the Match!"
      : matchResult.winner === "PLAYER_2"
      ? "Player 2 Wins the Match!"
      : matchResult.winner === "PLAYER_3"
      ? "Player 3 Wins the Match!"
      : matchResult.winner === "PLAYER_4"
      ? "Player 4 Wins the Match!"
      : matchResult.winner === "PLAYER_5"
      ? "Player 5 Wins the Match!"
      : matchResult.winner === "PLAYER_6"
      ? "Player 6 Wins the Match!"
      : "Match Tied!";

  return (
    <div
      ref={modalRef}
      className="modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="match-end-title"
      data-testid="match-end-modal"
    >
      <div className="modal-content">
        <div className="modal-header">
          <h2 id="match-end-title" className="modal-title">
            Match Finished
          </h2>
        </div>

        <div className="modal-body">
          <div
            className="winner-banner"
            style={{ fontSize: "1.3rem", padding: "16px" }}
            data-testid="match-winner-banner"
          >
            👑 {winnerTitle}
          </div>

          {matchResult.rankings && matchResult.rankings.length > 0 && (
            <div
              className="match-rankings-container"
              data-testid="match-rankings"
              style={{ marginTop: "16px", display: "flex", flexDirection: "column", gap: "8px" }}
            >
              {matchResult.rankings.map((ranking) => {
                const isWinner =
                  ranking.label === "Winner" || ranking.label === "1st Place";
                const isSecond = ranking.label === "2nd Place";
                const isThird = ranking.label === "3rd Place";
                const playerName =
                  ranking.player === "PLAYER_1"
                    ? "Player 1"
                    : ranking.player === "PLAYER_2"
                    ? "Player 2"
                    : ranking.player === "PLAYER_3"
                    ? "Player 3"
                    : ranking.player === "PLAYER_4"
                    ? "Player 4"
                    : ranking.player === "PLAYER_5"
                    ? "Player 5"
                    : "Player 6";

                const badgeClass = isWinner
                  ? "rank-winner"
                  : isSecond
                  ? "rank-second"
                  : isThird
                  ? "rank-third"
                  : "rank-lost";

                return (
                  <div
                    key={ranking.player}
                    className={`match-ranking-row ${isWinner ? "winner-row" : ""}`}
                    data-testid={`ranking-row-${ranking.player.toLowerCase()}`}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <span
                        className={`ranking-badge ${badgeClass}`}
                        data-testid={`ranking-badge-${ranking.player.toLowerCase()}`}
                      >
                        {ranking.label}
                      </span>
                      <strong
                        className="ranking-player-name"
                        data-testid={`ranking-player-${ranking.player.toLowerCase()}`}
                      >
                        {playerName}
                      </strong>
                    </div>

                    <div
                      className="ranking-storage-val"
                      data-testid={`ranking-storage-${ranking.player.toLowerCase()}`}
                    >
                      {ranking.storage} seeds
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <p style={{ marginTop: "14px", textAlign: "center", color: "var(--color-text-secondary)" }}>
            {matchResult.reason}
          </p>
        </div>

        <div
          className="match-end-actions"
          style={{ display: "flex", justifyContent: "center", gap: "12px", marginTop: "16px" }}
        >
          {onHome && (
            <button
              type="button"
              className="btn btn-secondary"
              style={{ flex: 1, justifyContent: "center" }}
              onClick={onHome}
              data-testid="match-home-btn"
              aria-label="Return to Home Menu"
            >
              🏠 Home
            </button>
          )}
          <button
            type="button"
            className="btn"
            style={{ flex: 1, justifyContent: "center" }}
            onClick={onNewMatch}
            data-testid="new-match-btn"
          >
            Play Again 🔄
          </button>
        </div>
      </div>
    </div>
  );
};
