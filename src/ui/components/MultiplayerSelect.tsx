/**
 * Local Multiplayer Player Count Selection Screen
 * Shown when user selects "Local Multiplayer" from the Main Menu.
 * Offers exactly five options:
 * 1. 2 Players (fully playable)
 * 2. 3 Players (work in progress)
 * 3. 4 Players (work in progress)
 * 4. 5 Players (work in progress)
 * 5. 6 Players (work in progress)
 * Plus a Back button to return to the Main Menu.
 */

import React from "react";

export type MultiplayerPlayerCount = 2 | 3 | 4 | 5 | 6;

export interface MultiplayerSelectProps {
  onSelectPlayerCount: (count: MultiplayerPlayerCount) => void;
  onBack: () => void;
}

export const MultiplayerSelect: React.FC<MultiplayerSelectProps> = ({
  onSelectPlayerCount,
  onBack,
}) => {
  return (
    <div
      className="multiplayer-select-container"
      data-testid="multiplayer-select"
    >
      <div className="multiplayer-select-card">
        {/* Screen Header */}
        <div className="multiplayer-header">
          <div className="multiplayer-badge-icon" aria-hidden="true">
            👥
          </div>
          <h2 className="multiplayer-title">Local Multiplayer</h2>
          <p className="multiplayer-subtitle">Choose the number of players</p>
        </div>

        {/* Decorative Separator */}
        <div className="menu-divider" aria-hidden="true">
          <span className="divider-line" />
          <span className="divider-diamond">♦</span>
          <span className="divider-line" />
        </div>

        {/* Five Player-Count Options */}
        <div
          className="multiplayer-options"
          role="group"
          aria-label="Player Count Options"
        >
          {/* 1. 2 Players (Playable) */}
          <button
            type="button"
            className="multiplayer-option-btn multiplayer-option-2p multiplayer-option-active"
            onClick={() => onSelectPlayerCount(2)}
            data-testid="player-count-btn-2"
            aria-label="2 Players mode, fully playable"
          >
            <div className="menu-btn-icon" aria-hidden="true">
              👥
            </div>
            <div className="menu-btn-content">
              <div className="multiplayer-title-row">
                <span className="menu-btn-title">2 Players</span>
                <span className="multiplayer-ready-pill" aria-label="Playable mode">
                  Play Now
                </span>
              </div>
              <span className="menu-btn-desc">
                Classic 2-player Karnataka rules with 14 pits &amp; 70 seeds
              </span>
            </div>
            <span className="menu-btn-arrow" aria-hidden="true">
              →
            </span>
          </button>

          {/* 2. 3 Players (Playable) */}
          <button
            type="button"
            className="multiplayer-option-btn multiplayer-option-3p multiplayer-option-active"
            onClick={() => onSelectPlayerCount(3)}
            data-testid="player-count-btn-3"
            aria-label="3 Players mode, fully playable"
          >
            <div className="menu-btn-icon" aria-hidden="true">
              👥👤
            </div>
            <div className="menu-btn-content">
              <div className="multiplayer-title-row">
                <span className="menu-btn-title">3 Players</span>
                <span className="multiplayer-ready-pill" aria-label="Playable mode">
                  Play Now
                </span>
              </div>
              <span className="menu-btn-desc">
                Traditional 3-player Karnataka rules with 15 pits &amp; 75 seeds
              </span>
            </div>
            <span className="menu-btn-arrow" aria-hidden="true">
              →
            </span>
          </button>

          {/* 3. 4 Players (Playable) */}
          <button
            type="button"
            className="multiplayer-option-btn multiplayer-option-4p multiplayer-option-active"
            onClick={() => onSelectPlayerCount(4)}
            data-testid="player-count-btn-4"
            aria-label="4 Players mode, fully playable"
          >
            <div className="menu-btn-icon" aria-hidden="true">
              👨‍👩‍👧‍👦
            </div>
            <div className="menu-btn-content">
              <div className="multiplayer-title-row">
                <span className="menu-btn-title">4 Players</span>
                <span className="multiplayer-ready-pill" aria-label="Playable mode">
                  Play Now
                </span>
              </div>
              <span className="menu-btn-desc">
                Authoritative 4-player Karnataka rules with 16 pits &amp; 80 seeds
              </span>
            </div>
            <span className="menu-btn-arrow" aria-hidden="true">
              →
            </span>
          </button>

          {/* 4. 5 Players (WIP) */}
          <button
            type="button"
            className="multiplayer-option-btn multiplayer-option-wip"
            onClick={() => onSelectPlayerCount(5)}
            data-testid="player-count-btn-5"
            aria-label="5 Players mode, coming soon"
          >
            <div className="menu-btn-icon" aria-hidden="true">
              👥👥👤
            </div>
            <div className="menu-btn-content">
              <div className="multiplayer-title-row">
                <span className="menu-btn-title">5 Players</span>
                <span className="coming-soon-pill" aria-label="Under development">
                  Coming Soon
                </span>
              </div>
              <span className="menu-btn-desc">
                5-player extended coastal heritage board setup
              </span>
            </div>
            <span className="menu-btn-arrow" aria-hidden="true">
              →
            </span>
          </button>

          {/* 5. 6 Players (WIP) */}
          <button
            type="button"
            className="multiplayer-option-btn multiplayer-option-wip"
            onClick={() => onSelectPlayerCount(6)}
            data-testid="player-count-btn-6"
            aria-label="6 Players mode, coming soon"
          >
            <div className="menu-btn-icon" aria-hidden="true">
              👥👥👥
            </div>
            <div className="menu-btn-content">
              <div className="multiplayer-title-row">
                <span className="menu-btn-title">6 Players</span>
                <span className="coming-soon-pill" aria-label="Under development">
                  Coming Soon
                </span>
              </div>
              <span className="menu-btn-desc">
                6-player grand family match with circular turn order
              </span>
            </div>
            <span className="menu-btn-arrow" aria-hidden="true">
              →
            </span>
          </button>
        </div>

        {/* Back Navigation Button */}
        <div className="multiplayer-footer">
          <button
            type="button"
            className="btn btn-secondary multiplayer-back-btn"
            onClick={onBack}
            data-testid="multiplayer-btn-back"
            aria-label="Back to Main Menu"
          >
            ⬅️ Back to Main Menu
          </button>
        </div>
      </div>
    </div>
  );
};
