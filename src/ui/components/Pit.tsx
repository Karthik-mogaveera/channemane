/**
 * Interactive Pit Component
 * Renders an individual Channemane pit with seed counters, visual beads,
 * ownership indicators, active sowing highlight, and bonus claim badge.
 * Uses a pit-cell wrapper to avoid invalid nested <button> HTML structures.
 */

import React from "react";
import type { Player, PitStatus } from "../../engine/types";

export interface PitProps {
  pitId: number;
  owner: Player;
  seeds: number;
  status: PitStatus;
  bonusAvailable: boolean;
  isSelectable: boolean;
  isActiveDrop: boolean;
  isAnimating: boolean;
  onSelect: (pitId: number) => void;
  onClaimBonus: (pitId: number) => void;
}

export const Pit: React.FC<PitProps> = ({
  pitId,
  owner,
  seeds,
  status,
  bonusAvailable,
  isSelectable,
  isActiveDrop,
  isAnimating,
  onSelect,
  onClaimBonus,
}) => {
  const isClosed = status === "CLOSED";
  const hasBonus = bonusAvailable && seeds === 4 && !isClosed;
  const ownerLabel = owner === "PLAYER_1" ? "Player 1" : "Player 2";

  const ariaLabel = isClosed
    ? `Pit P${pitId}, ${ownerLabel}, Closed`
    : hasBonus
    ? `Pit P${pitId}, ${ownerLabel}, 4 seeds, Bonus Available to claim`
    : `Pit P${pitId}, ${ownerLabel}, ${seeds} seeds${isSelectable ? ", Selectable" : ""}`;

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (isAnimating || isClosed) return;

    if (isSelectable) {
      onSelect(pitId);
    }
  };

  const handleBonusClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (!isAnimating && hasBonus) {
      onClaimBonus(pitId);
    }
  };

  // Up to 5 small graphical beads for visual flair
  const visualBeadsCount = Math.min(seeds, 5);

  return (
    <div className="pit-cell" style={{ position: "relative", display: "flex", justifyContent: "center" }}>
      <button
        type="button"
        className={`channemane-pit ${isSelectable ? "selectable" : ""} ${
          isActiveDrop ? "active-drop" : ""
        } ${hasBonus ? "has-bonus" : ""} ${isClosed ? "closed" : ""}`}
        onClick={handleClick}
        disabled={isClosed || isAnimating || (!isSelectable && !hasBonus)}
        aria-label={ariaLabel}
        data-testid={`pit-${pitId}`}
        data-pit-id={pitId}
        data-seeds={seeds}
        data-status={status}
        data-selectable={isSelectable}
        data-has-bonus={hasBonus}
      >
        <span className="pit-id-badge">P{pitId}</span>

        {isClosed ? (
          <span className="closed-lock-icon" aria-hidden="true" title="Closed Pit">
            🔒
          </span>
        ) : (
          <>
            <span className={`pit-seed-count ${seeds === 0 ? "empty" : ""}`}>
              {seeds}
            </span>

            {seeds > 0 && (
              <div className="seed-cluster" aria-hidden="true">
                {Array.from({ length: visualBeadsCount }).map((_, i) => (
                  <span key={i} className="seed-bead" />
                ))}
              </div>
            )}
          </>
        )}
      </button>

      {hasBonus && (
        <button
          type="button"
          className="bonus-claim-badge"
          onClick={handleBonusClick}
          aria-label={`Claim +4 bonus on Pit P${pitId}`}
          data-testid={`claim-bonus-${pitId}`}
        >
          CLAIM +4
        </button>
      )}
    </div>
  );
};
