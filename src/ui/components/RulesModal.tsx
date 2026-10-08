/**
 * Rules & Cultural Heritage Modal Component
 * Explains the authoritative Channemane game rules and Karnataka cultural origins.
 */

import React from "react";

export interface RulesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const RulesModal: React.FC<RulesModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div
      className="modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="rules-dialog-title"
      data-testid="rules-modal"
    >
      <div className="modal-content" style={{ maxWidth: "620px" }}>
        <div className="modal-header">
          <h2 id="rules-dialog-title" className="modal-title">
            Channemane — Rules of Play
          </h2>
          <button
            type="button"
            className="close-btn"
            onClick={onClose}
            aria-label="Close rules dialog"
            data-testid="close-rules-btn"
          >
            ×
          </button>
        </div>

        <div className="modal-body">
          <h4>Origins & Heritage</h4>
          <p>
            Channemane (ಚನ್ನೆಮಣೆ) is a traditional two-player strategy game from the Mancala family,
            deeply rooted in the cultural heritage of coastal Karnataka and Tulu Nadu. Historically played
            on hand-carved wooden boards using red tamarind seeds or cowrie shells.
          </p>

          <h4>1. The Board & Setup</h4>
          <ul>
            <li>The board features <strong>14 pits</strong> in two rows of 7: Player 1 controls P0–P6, Player 2 controls P7–P13.</li>
            <li>Each pit initially contains <strong>5 seeds</strong> (70 seeds total).</li>
            <li>Movement follows a strict <strong>counter-clockwise</strong> direction: P0 → P1 → ... → P13 → P0.</li>
          </ul>

          <h4>2. Sowing & Continuous Sowing</h4>
          <ul>
            <li>On your turn, pick up all seeds from any open pit on your side containing at least one seed.</li>
            <li>Distribute seeds one by one into consecutive open pits counter-clockwise.</li>
            <li>
              <strong>Continuous Sowing:</strong> When your hand is exhausted, check the next open pit.
              If it contains seeds, scoop them all up and continue sowing!
            </li>
          </ul>

          <h4>3. Positional Capture</h4>
          <ul>
            <li>
              If your last seed is sown and the <strong>next open pit is empty</strong>, inspect the <em>following open pit</em>.
            </li>
            <li>
              If that following pit contains seeds, you <strong>capture all of them</strong> into your storage, and your turn ends.
            </li>
            <li>At most one pit is captured per turn. Closed pits are always skipped.</li>
          </ul>

          <h4>4. The "3 → 4" Bonus Rule</h4>
          <ul>
            <li>Whenever sowing causes a pit to reach <strong>exactly 4 seeds (from 3)</strong>, a bonus is unlocked for the pit owner!</li>
            <li>The owner can tap <strong>CLAIM +4</strong> to take all 4 seeds into storage immediately.</li>
            <li>If a 5th seed is sown into that pit before it is claimed, the bonus opportunity is lost.</li>
          </ul>

          <h4>5. Round Settlement & Paired Closures</h4>
          <ul>
            <li>The round ends when total seeds on the board fall below 4, or one side is 0 and the other side has &lt; 4 seeds.</li>
            <li>At round end, remaining seeds on P0–P6 go to Player 1, and P7–P13 go to Player 2.</li>
            <li>
              Next round pits are reopened in symmetric pairs:
              <code>openPairs = min(⌊S1 / 5⌋, ⌊S2 / 5⌋, 7)</code>.
            </li>
            <li>Pits without enough seeds remain <strong>closed (locked)</strong> for the entire next round.</li>
          </ul>

          <h4>6. Match Victory</h4>
          <ul>
            <li>If either player finishes a round with fewer than 5 seeds, they cannot open even one pit pair, and their opponent wins the match!</li>
          </ul>
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "12px" }}>
          <button type="button" className="btn" onClick={onClose}>
            Got it, Let's Play!
          </button>
        </div>
      </div>
    </div>
  );
};
