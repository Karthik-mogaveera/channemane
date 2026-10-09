/**
 * Settlement Modal Component
 * Displays the end-of-round settlement: swept side seeds, updated player storage,
 * round winner, and next round setup preview.
 */

import React from "react";
import type { RoundSettlementResult } from "../../engine/settlement";

export interface SettlementModalProps {
  settlement: RoundSettlementResult;
  onStartNextRound: () => void;
  onClose: () => void;
}

export const SettlementModal: React.FC<SettlementModalProps> = ({
  settlement,
  onStartNextRound,
  onClose,
}) => {
  const winnerText =
    settlement.roundWinner === "PLAYER_1"
      ? "Player 1 Wins the Round!"
      : settlement.roundWinner === "PLAYER_2"
      ? "Player 2 Wins the Round!"
      : "Round Tied!";

  const openPairs = Math.min(
    Math.floor(settlement.player1FinalStorage / 5),
    Math.floor(settlement.player2FinalStorage / 5),
    7
  );

  return (
    <div
      className="modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="settlement-title"
      data-testid="settlement-modal"
    >
      <div className="modal-content">
        <div className="modal-header">
          <h2 id="settlement-title" className="modal-title">
            Round Settled
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
          <div className="winner-banner" data-testid="round-winner-banner">
            🏆 {winnerText}
          </div>

          <div className="settlement-score-grid">
            <div className="score-box">
              <h5>Player 1 Total Storage</h5>
              <div className="score-val" data-testid="settlement-p1-storage">
                {settlement.player1FinalStorage}
              </div>
              <small>Seeds swept from Player 1 side: +{settlement.player1RemainingTransferred}</small>
            </div>

            <div className="score-box">
              <h5>Player 2 Total Storage</h5>
              <div className="score-val" data-testid="settlement-p2-storage">
                {settlement.player2FinalStorage}
              </div>
              <small>Seeds swept from Player 2 side: +{settlement.player2RemainingTransferred}</small>
            </div>
          </div>

          <p style={{ marginTop: "12px", color: "var(--gold-light)" }}>
            <strong>Next Round Setup:</strong> Each player needs 5 seeds per pit.
            With current storage totals, <strong>{openPairs} pairs ({openPairs * 2} pits)</strong> will open for the next round.
            {openPairs < 7 && ` ${7 - openPairs} pairs (${(7 - openPairs) * 2} pits) will be closed.`}
          </p>
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "10px" }}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onClose}
            data-testid="review-board-btn"
          >
            Review Board
          </button>
          <button
            type="button"
            className="btn"
            onClick={onStartNextRound}
            data-testid="start-next-round-btn"
          >
            Start Next Round →
          </button>
        </div>
      </div>
    </div>
  );
};
