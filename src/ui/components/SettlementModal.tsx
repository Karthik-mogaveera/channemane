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
  const isThreePlayer = settlement.player3FinalStorage !== undefined;

  const winnerText =
    settlement.roundWinner === "PLAYER_1"
      ? "Player 1 Wins the Round!"
      : settlement.roundWinner === "PLAYER_2"
      ? "Player 2 Wins the Round!"
      : settlement.roundWinner === "PLAYER_3"
      ? "Player 3 Wins the Round!"
      : "Round Tied!";

  const openPairs = Math.min(
    Math.floor(settlement.player1FinalStorage / 5),
    Math.floor(settlement.player2FinalStorage / 5),
    7
  );

  const canStartNextRound = isThreePlayer ? true : openPairs > 0;

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
        </div>

        <div className="modal-body">
          <div className="winner-banner" data-testid="round-winner-banner">
            🏆 {winnerText}
          </div>

          <div
            className="settlement-score-grid"
            style={isThreePlayer ? { gridTemplateColumns: "1fr 1fr 1fr" } : undefined}
          >
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

            {isThreePlayer && (
              <div className="score-box">
                <h5>Player 3 Total Storage</h5>
                <div className="score-val" data-testid="settlement-p3-storage">
                  {settlement.player3FinalStorage}
                </div>
                <small>Seeds swept from Player 3 side: +{settlement.player3RemainingTransferred ?? 0}</small>
              </div>
            )}
          </div>

          {isThreePlayer ? (
            <p style={{ marginTop: "12px", color: "var(--gold-light)" }}>
              <strong>Next Round Setup:</strong> Pair-wise pit groups G1–G5 will open atomically
              if all active players can contribute 5 seeds per group.
            </p>
          ) : (
            <p style={{ marginTop: "12px", color: "var(--gold-light)" }}>
              <strong>Next Round Setup:</strong> Each player needs 5 seeds per pit.
              With current storage totals, <strong>{openPairs} pairs ({openPairs * 2} pits)</strong> will open for the next round.
              {openPairs < 7 && ` ${7 - openPairs} pairs (${(7 - openPairs) * 2} pits) will be closed.`}
            </p>
          )}
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
          {canStartNextRound && (
            <button
              type="button"
              className="btn"
              onClick={onStartNextRound}
              data-testid="start-next-round-btn"
            >
              Start Next Round →
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
