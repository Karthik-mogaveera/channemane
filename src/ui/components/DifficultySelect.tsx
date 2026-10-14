/**
 * Difficulty Selection Component
 * Second screen when user selects "Play with AI".
 * Offers exactly three options:
 * 1. Beginner
 * 2. Expert
 * 3. Master
 * Plus a Back button to return to Main Menu.
 */

import React from "react";
import type { AIDifficulty } from "../../engine/types";

export interface DifficultySelectProps {
  onSelectDifficulty: (difficulty: AIDifficulty) => void;
  onBack: () => void;
}

export const DifficultySelect: React.FC<DifficultySelectProps> = ({
  onSelectDifficulty,
  onBack,
}) => {
  return (
    <div className="difficulty-select-container" data-testid="difficulty-select">
      <div className="difficulty-select-card">
        {/* Header */}
        <div className="difficulty-header">
          <div className="difficulty-badge-icon" aria-hidden="true">
            🤖
          </div>
          <h2 className="difficulty-title">Select AI Difficulty</h2>
          <p className="difficulty-subtitle">
            Choose the challenge level for your AI opponent
          </p>
        </div>

        {/* Decorative Separator */}
        <div className="menu-divider" aria-hidden="true">
          <span className="divider-line" />
          <span className="divider-diamond">♦</span>
          <span className="divider-line" />
        </div>

        {/* 3 Difficulty Options */}
        <div className="difficulty-options" role="group" aria-label="AI Difficulty Levels">
          {/* 1. Beginner */}
          <button
            type="button"
            className="difficulty-option-btn difficulty-beginner"
            onClick={() => onSelectDifficulty("beginner")}
            data-testid="difficulty-btn-beginner"
            aria-label="Beginner AI difficulty"
          >
            <div className="difficulty-level-indicator" aria-hidden="true">
              🟢
            </div>
            <div className="difficulty-btn-content">
              <span className="difficulty-btn-title">Beginner</span>
              <span className="difficulty-btn-desc">
                Relaxed gameplay, ideal for learning Channemane rules and sowing mechanics
              </span>
            </div>
            <span className="menu-btn-arrow" aria-hidden="true">
              →
            </span>
          </button>

          {/* 2. Expert */}
          <button
            type="button"
            className="difficulty-option-btn difficulty-expert"
            onClick={() => onSelectDifficulty("expert")}
            data-testid="difficulty-btn-expert"
            aria-label="Expert AI difficulty"
          >
            <div className="difficulty-level-indicator" aria-hidden="true">
              🟡
            </div>
            <div className="difficulty-btn-content">
              <span className="difficulty-btn-title">Expert</span>
              <span className="difficulty-btn-desc">
                Balanced tactical gameplay with active capture planning and bonus defense
              </span>
            </div>
            <span className="menu-btn-arrow" aria-hidden="true">
              →
            </span>
          </button>

          {/* 3. Master */}
          <button
            type="button"
            className="difficulty-option-btn difficulty-master"
            onClick={() => onSelectDifficulty("master")}
            data-testid="difficulty-btn-master"
            aria-label="Master AI difficulty"
          >
            <div className="difficulty-level-indicator" aria-hidden="true">
              🔴
            </div>
            <div className="difficulty-btn-content">
              <span className="difficulty-btn-title">Master</span>
              <span className="difficulty-btn-desc">
                Uncompromising tactical evaluation, pit starvation, and round settlement control
              </span>
            </div>
            <span className="menu-btn-arrow" aria-hidden="true">
              →
            </span>
          </button>
        </div>

        {/* Back Navigation Button */}
        <div className="difficulty-footer">
          <button
            type="button"
            className="btn btn-secondary difficulty-back-btn"
            onClick={onBack}
            data-testid="difficulty-btn-back"
            aria-label="Back to Main Menu"
          >
            ⬅️ Back to Main Menu
          </button>
        </div>
      </div>
    </div>
  );
};
