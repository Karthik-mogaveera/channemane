/**
 * Coming Soon Modal Component
 * Shown when user selects Expert or Master from Play with AI.
 * Displays friendly notice that the mode is not implemented yet,
 * and prevents launching incomplete AI turns or substituting Beginner silently.
 */

import React from "react";
import type { AIDifficulty } from "../../engine/types";

export interface ComingSoonModalProps {
  difficulty: AIDifficulty;
  selectedFirstPlayer: "player" | "ai";
  onPlayBeginner: () => void;
  onBackToMenu: () => void;
  onChangeDifficulty: () => void;
}

export const ComingSoonModal: React.FC<ComingSoonModalProps> = ({
  difficulty,
  onPlayBeginner,
  onBackToMenu,
  onChangeDifficulty,
}) => {
  const diffName =
    difficulty === "expert"
      ? "Expert"
      : difficulty === "master"
      ? "Master"
      : "Selected";

  return (
    <div
      className="modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="coming-soon-title"
      data-testid="coming-soon-modal"
    >
      <div className="modal-content coming-soon-card" data-testid="coming-soon-notice">
        {/* Header */}
        <div className="modal-header">
          <div className="difficulty-badge-icon" aria-hidden="true">
            🚧
          </div>
          <h2 id="coming-soon-title" className="modal-title">
            Coming Soon!
          </h2>
          <p className="coming-soon-subtitle">
            <strong>{diffName} AI</strong> difficulty is currently under development.
          </p>
        </div>

        {/* Decorative Separator */}
        <div className="menu-divider" aria-hidden="true">
          <span className="divider-line" />
          <span className="divider-diamond">♦</span>
          <span className="divider-line" />
        </div>

        {/* Body Message */}
        <div className="modal-body coming-soon-body">
          <p className="coming-soon-description">
            Currently, <strong>Beginner AI</strong> and <strong>Local Multiplayer</strong> are fully playable.
            Would you like to play against Beginner AI or choose another option?
          </p>
        </div>

        {/* Actions */}
        <div className="coming-soon-actions">
          <button
            type="button"
            className="btn btn-primary"
            onClick={onPlayBeginner}
            data-testid="coming-soon-play-beginner-btn"
          >
            🟢 Play Beginner AI
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onChangeDifficulty}
            data-testid="coming-soon-change-diff-btn"
          >
            🔄 Change Difficulty
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onBackToMenu}
            data-testid="coming-soon-back-btn"
          >
            ⬅️ Back to Menu
          </button>
        </div>
      </div>
    </div>
  );
};
