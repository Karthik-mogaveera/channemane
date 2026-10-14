/**
 * Main Menu Component
 * Initial landing screen providing access to:
 * 1. Play with AI
 * 2. Local Multiplayer
 * 3. Rules
 */

import React from "react";

export interface MainMenuProps {
  onPlayAI: () => void;
  onPlayLocal: () => void;
  onOpenRules: () => void;
}

export const MainMenu: React.FC<MainMenuProps> = ({
  onPlayAI,
  onPlayLocal,
  onOpenRules,
}) => {
  return (
    <div className="main-menu-container" data-testid="main-menu">
      <div className="main-menu-card">
        {/* Cultural Header & Emblem */}
        <div className="main-menu-header">
          <div className="menu-emblem" aria-hidden="true">
            🏛️
          </div>
          <h1 className="menu-brand-title">CHANNEMANE</h1>
          <p className="menu-brand-kannada">ಪಾರಂಪರಿಕ ಚನ್ನೆಮಣೆ ಆಟ</p>
          <p className="menu-brand-subtitle">Royal Karnataka Mancala Engine</p>
        </div>

        {/* Decorative Brass Separator */}
        <div className="menu-divider" aria-hidden="true">
          <span className="divider-line" />
          <span className="divider-diamond">♦</span>
          <span className="divider-line" />
        </div>

        {/* Primary Navigation Options */}
        <nav className="main-menu-options" aria-label="Game Modes">
          {/* 1. Play with AI */}
          <button
            type="button"
            className="menu-option-btn"
            onClick={onPlayAI}
            data-testid="menu-btn-ai"
            aria-label="Play with AI mode"
          >
            <div className="menu-btn-icon" aria-hidden="true">
              🤖
            </div>
            <div className="menu-btn-content">
              <span className="menu-btn-title">Play with AI</span>
              <span className="menu-btn-desc">
                Challenge the computer at your preferred difficulty
              </span>
            </div>
            <span className="menu-btn-arrow" aria-hidden="true">
              →
            </span>
          </button>

          {/* 2. Local Multiplayer */}
          <button
            type="button"
            className="menu-option-btn"
            onClick={onPlayLocal}
            data-testid="menu-btn-local"
            aria-label="Local Multiplayer mode"
          >
            <div className="menu-btn-icon" aria-hidden="true">
              👥
            </div>
            <div className="menu-btn-content">
              <span className="menu-btn-title">Local Multiplayer</span>
              <span className="menu-btn-desc">
                Pass &amp; play with a friend on the same device
              </span>
            </div>
            <span className="menu-btn-arrow" aria-hidden="true">
              →
            </span>
          </button>

          {/* 3. Rules */}
          <button
            type="button"
            className="menu-option-btn menu-option-rules"
            onClick={onOpenRules}
            data-testid="menu-btn-rules"
            aria-label="View Channemane Rules"
          >
            <div className="menu-btn-icon" aria-hidden="true">
              📜
            </div>
            <div className="menu-btn-content">
              <span className="menu-btn-title">Rules</span>
              <span className="menu-btn-desc">
                Learn sowing, captures, bonuses, and coastal traditions
              </span>
            </div>
            <span className="menu-btn-arrow" aria-hidden="true">
              →
            </span>
          </button>
        </nav>

        {/* Footer Note */}
        <div className="main-menu-footer">
          <span>70 Seeds · 14 Pits · 2 Players · Ancient Coastal Heritage</span>
        </div>
      </div>
    </div>
  );
};
