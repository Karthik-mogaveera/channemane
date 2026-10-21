/**
 * Work in Progress Modal Component
 * Shown when user selects 3, 4, 5, or 6 Players from Local Multiplayer selection.
 * Displays friendly notice that the player count is currently under development.
 */

import React, { useEffect } from "react";
import type { MultiplayerPlayerCount } from "./MultiplayerSelect";

export interface WorkInProgressModalProps {
  playerCount: MultiplayerPlayerCount | null;
  onClose: () => void;
}

export const WorkInProgressModal: React.FC<WorkInProgressModalProps> = ({
  playerCount,
  onClose,
}) => {
  if (!playerCount) return null;

  // Handle Escape key dismissal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  // Handle backdrop overlay click
  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div
      className="modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="wip-title"
      data-testid="wip-modal"
      onClick={handleOverlayClick}
    >
      <div
        className="modal-content wip-card"
        data-testid="wip-card"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="modal-header wip-header">
          <div className="wip-badge-icon" aria-hidden="true">
            🚧
          </div>
          <h2 id="wip-title" className="modal-title">
            Work in Progress
          </h2>
          <p className="wip-subtitle" data-testid="wip-player-count">
            {playerCount}-Player Multiplayer
          </p>
        </div>

        {/* Decorative Brass Separator */}
        <div className="menu-divider" aria-hidden="true">
          <span className="divider-line" />
          <span className="divider-diamond">♦</span>
          <span className="divider-line" />
        </div>

        {/* Modal Body with Exact Required Message */}
        <div className="modal-body wip-body">
          <p className="wip-description" data-testid="wip-message">
            Multiplayer for this player count is currently under development. Stay tuned for future updates!
          </p>
        </div>

        {/* Action Button */}
        <div className="modal-footer wip-footer">
          <button
            type="button"
            className="btn btn-primary wip-ok-btn"
            onClick={onClose}
            data-testid="wip-modal-ok-btn"
            aria-label="Close dialog"
            autoFocus
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
};
