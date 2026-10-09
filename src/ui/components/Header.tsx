/**
 * Header Component
 * Contains branding, subtitle, New Game / Restart controls, and Rules toggle.
 */

import React from "react";
import type { AnimationSettings } from "../hooks/useChannemaneGame";

export interface HeaderProps {
  onRestart: () => void;
  onOpenRules: () => void;
  animationSettings: AnimationSettings;
  onToggleAnimation: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onRestart,
  onOpenRules,
  animationSettings,
  onToggleAnimation,
}) => {
  return (
    <header className="game-header" role="banner">
      <div>
        <h1 className="brand-title">
          <span>🏛️</span> CHANNEMANE
        </h1>
        <p className="brand-subtitle">Royal Karnataka Mancala Engine</p>
      </div>

      <div className="header-controls">
        <button
          type="button"
          className="btn btn-secondary"
          onClick={onToggleAnimation}
          aria-label={
            animationSettings.speed === "SLOW"
              ? "Switch to Fast animation mode"
              : "Switch to Slow animation mode"
          }
          data-testid="toggle-animation-btn"
          title="Toggle Animation Speed (Slow / Fast)"
        >
          {animationSettings.speed === "SLOW" ? "🎬 Slow Mode" : "⚡ Fast Mode"}
        </button>

        <button
          type="button"
          className="btn btn-secondary"
          onClick={onOpenRules}
          aria-label="View Game Rules"
          data-testid="rules-btn"
        >
          📜 Rules
        </button>

        <button
          type="button"
          className="btn"
          onClick={onRestart}
          aria-label="Restart Match"
          data-testid="restart-btn"
        >
          🔄 New Game
        </button>
      </div>
    </header>
  );
};
