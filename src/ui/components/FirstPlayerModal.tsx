/**
 * First Player Selection Modal Component
 * Shown when user selects Beginner, Expert, or Master from Play with AI.
 * Prompts the user to choose whether Player or AI plays first.
 */

import React from "react";
import type { AIDifficulty } from "../../engine/types";

export interface FirstPlayerModalProps {
  difficulty: AIDifficulty;
  onSelectFirstPlayer: (firstPlayer: "player" | "ai") => void;
  onBack: () => void;
}

export const FirstPlayerModal: React.FC<FirstPlayerModalProps> = ({
  difficulty,
  onSelectFirstPlayer,
  onBack,
}) => {
  const difficultyLabel =
    difficulty === "beginner"
      ? "Beginner"
      : difficulty === "expert"
      ? "Expert"
      : "Master";

  return (
    <div
      className="modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="first-player-title"
      data-testid="first-player-modal"
    >
      <div className="modal-content first-player-card">
        {/* Header */}
        <div className="modal-header">
          <div className="difficulty-badge-icon" aria-hidden="true">
            🎲
          </div>
          <h2 id="first-player-title" className="modal-title">
            Who will Play first
          </h2>
          <p className="first-player-subtitle">
            Choose who takes the opening turn against <strong>{difficultyLabel} AI</strong>
          </p>
        </div>

        {/* Decorative Separator */}
        <div className="menu-divider" aria-hidden="true">
          <span className="divider-line" />
          <span className="divider-diamond">♦</span>
          <span className="divider-line" />
        </div>

        {/* 2 First-Player Options */}
        <div
          className="first-player-options"
          role="group"
          aria-label="First Player Options"
        >
          {/* Option 1: Player */}
          <button
            type="button"
            className="first-player-option-btn first-player-human"
            onClick={() => onSelectFirstPlayer("player")}
            data-testid="first-player-player-btn"
            aria-label="Player takes first turn"
          >
            <div className="first-player-icon" aria-hidden="true">
              👤
            </div>
            <div className="first-player-content">
              <span className="first-player-title">Player</span>
              <span className="first-player-desc">You take the opening turn</span>
            </div>
            <span className="menu-btn-arrow" aria-hidden="true">
              →
            </span>
          </button>

          {/* Option 2: AI */}
          <button
            type="button"
            className="first-player-option-btn first-player-ai"
            onClick={() => onSelectFirstPlayer("ai")}
            data-testid="first-player-ai-btn"
            aria-label="AI takes first turn"
          >
            <div className="first-player-icon" aria-hidden="true">
              🤖
            </div>
            <div className="first-player-content">
              <span className="first-player-title">AI</span>
              <span className="first-player-desc">AI takes the opening turn</span>
            </div>
            <span className="menu-btn-arrow" aria-hidden="true">
              →
            </span>
          </button>
        </div>

        {/* Back Navigation Button */}
        <div className="modal-footer first-player-footer">
          <button
            type="button"
            className="btn btn-secondary first-player-back-btn"
            onClick={onBack}
            data-testid="first-player-back-btn"
            aria-label="Back to Difficulty Selection"
          >
            ⬅️ Back
          </button>
        </div>
      </div>
    </div>
  );
};
