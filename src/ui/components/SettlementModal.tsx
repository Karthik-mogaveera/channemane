/**
 * Settlement Modal Component
 * Displays the end-of-round settlement: swept side seeds, updated player storage,
 * round winner, and next round setup preview.
 */

import React from "react";
import type { RoundSettlementResult } from "../../engine/settlement";
import { useFocusTrap } from "../hooks/useFocusTrap";

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
  const modalRef = useFocusTrap<HTMLDivElement>({
    isOpen: true,
    onEscape: onClose,
  });

  const isFourPlayer = settlement.player4FinalStorage !== undefined;
  const isThreePlayer = !isFourPlayer && settlement.player3FinalStorage !== undefined;
  const isMultiplayer = isFourPlayer || isThreePlayer;

  const winnerText =
    settlement.roundWinner === "PLAYER_1"
      ? "Player 1 Wins the Round!"
      : settlement.roundWinner === "PLAYER_2"
      ? "Player 2 Wins the Round!"
      : settlement.roundWinner === "PLAYER_3"
      ? "Player 3 Wins the Round!"
      : settlement.roundWinner === "PLAYER_4"
      ? "Player 4 Wins the Round!"
      : "Round Tied!";

  const openPairs = Math.min(
    Math.floor(settlement.player1FinalStorage / 5),
    Math.floor(settlement.player2FinalStorage / 5),
    7
  );

  const canStartNextRound = isMultiplayer ? true : openPairs > 0;

  const isP1Disqualified =
    isMultiplayer && Boolean(settlement.disqualifiedPlayers?.includes("PLAYER_1"));
  const isP2Disqualified =
    isMultiplayer && Boolean(settlement.disqualifiedPlayers?.includes("PLAYER_2"));
  const isP3Disqualified =
    isMultiplayer && Boolean(settlement.disqualifiedPlayers?.includes("PLAYER_3"));
  const isP4Disqualified =
    isFourPlayer && Boolean(settlement.disqualifiedPlayers?.includes("PLAYER_4"));

  return (
    <div
      ref={modalRef}
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
            style={
              isFourPlayer
                ? { gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))" }
                : isThreePlayer
                ? { gridTemplateColumns: "1fr 1fr 1fr" }
                : undefined
            }
          >
            <div className={`score-box ${isP1Disqualified ? "disqualified-box" : ""}`}>
              <h5>Player 1 Total Storage</h5>
              <div
                className={`score-val ${isP1Disqualified ? "storage-disqualified-text" : ""}`}
                data-testid="settlement-p1-storage"
              >
                {isP1Disqualified ? "Disqualified" : settlement.player1FinalStorage}
              </div>
              <small>
                {isP1Disqualified
                  ? `Eliminated (< 5 seeds in storage)`
                  : `Seeds swept from Player 1 side: +${settlement.player1RemainingTransferred}`}
              </small>
            </div>

            <div className={`score-box ${isP2Disqualified ? "disqualified-box" : ""}`}>
              <h5>Player 2 Total Storage</h5>
              <div
                className={`score-val ${isP2Disqualified ? "storage-disqualified-text" : ""}`}
                data-testid="settlement-p2-storage"
              >
                {isP2Disqualified ? "Disqualified" : settlement.player2FinalStorage}
              </div>
              <small>
                {isP2Disqualified
                  ? `Eliminated (< 5 seeds in storage)`
                  : `Seeds swept from Player 2 side: +${settlement.player2RemainingTransferred}`}
              </small>
            </div>

            {(isThreePlayer || isFourPlayer) && (
              <div className={`score-box ${isP3Disqualified ? "disqualified-box" : ""}`}>
                <h5>Player 3 Total Storage</h5>
                <div
                  className={`score-val ${isP3Disqualified ? "storage-disqualified-text" : ""}`}
                  data-testid="settlement-p3-storage"
                >
                  {isP3Disqualified ? "Disqualified" : settlement.player3FinalStorage}
                </div>
                <small>
                  {isP3Disqualified
                    ? `Eliminated (< 5 seeds in storage)`
                    : `Seeds swept from Player 3 side: +${settlement.player3RemainingTransferred ?? 0}`}
                </small>
              </div>
            )}

            {isFourPlayer && (
              <div className={`score-box ${isP4Disqualified ? "disqualified-box" : ""}`}>
                <h5>Player 4 Total Storage</h5>
                <div
                  className={`score-val ${isP4Disqualified ? "storage-disqualified-text" : ""}`}
                  data-testid="settlement-p4-storage"
                >
                  {isP4Disqualified ? "Disqualified" : settlement.player4FinalStorage}
                </div>
                <small>
                  {isP4Disqualified
                    ? `Eliminated (< 5 seeds in storage)`
                    : `Seeds swept from Player 4 side: +${settlement.player4RemainingTransferred ?? 0}`}
                </small>
              </div>
            )}
          </div>

          {isFourPlayer ? (
            <p style={{ marginTop: "12px", color: "var(--gold-light)" }}>
              <strong>Next Round Setup:</strong>{" "}
              {settlement.disqualifiedPlayers && settlement.disqualifiedPlayers.length > 0
                ? "Disqualified players are eliminated permanently. The remaining active players will continue with their allocations."
                : "Authoritative pit groups G1–G4 will open atomically if all active players can contribute 5 seeds per group."}
            </p>
          ) : isThreePlayer ? (
            <p style={{ marginTop: "12px", color: "var(--gold-light)" }}>
              <strong>Next Round Setup:</strong>{" "}
              {settlement.disqualifiedPlayers && settlement.disqualifiedPlayers.length > 0
                ? "Disqualified players are eliminated permanently. The remaining active players will enter recovery mode with 50 total seeds."
                : "Pair-wise pit groups G1–G5 will open atomically if all active players can contribute 5 seeds per group."}
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
