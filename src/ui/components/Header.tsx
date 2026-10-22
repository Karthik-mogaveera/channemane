/**
 * Header Component
 * Contains branding, subtitle, New Game / Restart controls, and Rules toggle.
 */

import React from "react";
import type { AnimationSettings } from "../hooks/useChannemaneGame";
import type { GameMode, AIDifficulty } from "../../engine/types";

export interface HeaderProps {
  onRestart: () => void;
  onOpenRules: () => void;
  animationSettings: AnimationSettings;
  onToggleAnimation: () => void;
  onReturnToMenu?: () => void;
  gameMode?: GameMode | null;
  aiDifficulty?: AIDifficulty | null;
  playerCount?: 2 | 3;
}

export const Header: React.FC<HeaderProps> = ({
  onRestart,
  onOpenRules,
  animationSettings,
  onToggleAnimation,
  onReturnToMenu,
  gameMode,
  aiDifficulty,
  playerCount = 2,
}) => {
  return (
    <header className="game-header" role="banner">
      <div className="header-branding-container">
        <h1 className="brand-title">
          <span>🏛️</span> CHANNEMANE
        </h1>
        <div className="header-sub-row">
          <p className="brand-subtitle">Royal Karnataka Mancala Engine</p>
          {gameMode && (
            <span className="game-mode-tag" data-testid="game-mode-tag">
              {gameMode === "ai"
                ? `🤖 AI (${aiDifficulty ? aiDifficulty.toUpperCase() : "STANDARD"})`
                : playerCount === 3
                ? "👥 LOCAL 3P"
                : "👥 LOCAL 2P"}
            </span>
          )}
        </div>
      </div>

      <div className="header-controls">
        {onReturnToMenu && (
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onReturnToMenu}
            aria-label="Return to Main Menu"
            data-testid="main-menu-btn"
            title="Return to Main Menu"
          >
            🏠 Menu
          </button>
        )}

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
