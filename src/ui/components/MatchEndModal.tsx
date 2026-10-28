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
                    : "Player 4";

                const badgeBg = isWinner
                  ? "rgba(234, 179, 8, 0.25)"
                  : isSecond
                  ? "rgba(148, 163, 184, 0.2)"
                  : isThird
                  ? "rgba(245, 158, 11, 0.2)"
                  : "rgba(239, 68, 68, 0.2)";
                const badgeBorder = isWinner
                  ? "#eab308"
                  : isSecond
                  ? "#94a3b8"
                  : isThird
                  ? "#f59e0b"
                  : "#ef4444";
                const badgeColor = isWinner
                  ? "#fef08a"
                  : isSecond
                  ? "#e2e8f0"
                  : isThird
                  ? "#fed7aa"
                  : "#fca5a5";

                return (
                  <div
                    key={ranking.player}
                    className={`match-ranking-row ${isWinner ? "winner-row" : ""}`}
                    data-testid={`ranking-row-${ranking.player.toLowerCase()}`}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "8px 14px",
                      borderRadius: "8px",
                      background: isWinner
                        ? "linear-gradient(135deg, rgba(234,179,8,0.15) 0%, rgba(202,138,4,0.05) 100%)"
                        : "rgba(255, 255, 255, 0.04)",
                      border: isWinner ? "1px solid rgba(234,179,8,0.4)" : "1px solid rgba(255, 255, 255, 0.08)",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <span
                        className="ranking-badge"
                        data-testid={`ranking-badge-${ranking.player.toLowerCase()}`}
                        style={{
                          display: "inline-block",
                          padding: "3px 10px",
                          borderRadius: "9999px",
                          fontSize: "0.8rem",
                          fontWeight: 700,
                          background: badgeBg,
                          border: `1px solid ${badgeBorder}`,
                          color: badgeColor,
                          letterSpacing: "0.5px",
                        }}
                      >
                        {ranking.label}
                      </span>
                      <strong
                        className="ranking-player-name"
                        data-testid={`ranking-player-${ranking.player.toLowerCase()}`}
                        style={{
                          fontSize: isWinner ? "1.05rem" : "0.95rem",
                          color: isWinner ? "var(--gold-light, #fef08a)" : "var(--text-light, #f8fafc)",
                        }}
                      >
                        {playerName}
                      </strong>
                    </div>

                    <div
                      className="ranking-storage-val"
                      data-testid={`ranking-storage-${ranking.player.toLowerCase()}`}
                      style={{
                        fontSize: "0.9rem",
                        color: "var(--text-muted, #94a3b8)",
                        fontWeight: 600,
                      }}
                    >
                      {ranking.storage} seeds
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <p style={{ marginTop: "14px", textAlign: "center", color: "var(--text-muted)" }}>
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
