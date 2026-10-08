/**
 * Match End Modal Component
 * Displays the final victor of the Channemane match with final scores and restart action.
 */

import React from "react";
import type { MatchEndResult } from "../../engine/matchEnd";

export interface MatchEndModalProps {
  matchResult: MatchEndResult;
  onNewMatch: () => void;
  onClose: () => void;
}

export const MatchEndModal: React.FC<MatchEndModalProps> = ({
  matchResult,
  onNewMatch,
  onClose,
}) => {
  const isP1Winner = matchResult.winner === "PLAYER_1";
  const winnerTitle = isP1Winner ? "Player 1 Wins the Match!" : "Player 2 Wins the Match!";

  return (
    <div
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
          <button
            type="button"
            className="close-btn"
            onClick={onClose}
            aria-label="Close modal"
          >
            ×
          </button>
        </div>

        <div className="modal-body">
          <div
            className="winner-banner"
            style={{ fontSize: "1.3rem", padding: "16px" }}
            data-testid="match-winner-banner"
          >
            👑 {winnerTitle}
          </div>

          <p style={{ marginTop: "14px", textAlign: "center", color: "var(--text-muted)" }}>
            {matchResult.reason}
          </p>
        </div>

        <div style={{ display: "flex", justifyContent: "center", gap: "12px", marginTop: "16px" }}>
          <button
            type="button"
            className="btn"
            style={{ width: "100%", justifyContent: "center" }}
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
