/**
 * Interactive Pit Component
 * Renders an individual Channemane pit with circular geometry, seed beads,
 * ownership styling, active sowing highlight, bonus claim button, and
 * external seed count positioned on the player's side (Issues 4, 5, 9).
 */

import React, { useMemo } from "react";
import type { Player, PitStatus } from "../../engine/types";
import { calculateSeedPositions } from "../utils/seedPacking";

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
  const isPlayer1 = owner === "PLAYER_1";
  const ownerLabel = isPlayer1 ? "Player 1" : "Player 2";

  const ariaLabel = isClosed
    ? `${ownerLabel} Pit, Closed`
    : hasBonus
    ? `${ownerLabel} Pit, 4 seeds, Bonus Available to claim`
    : `${ownerLabel} Pit, ${seeds} seeds${isSelectable ? ", Selectable" : ""}`;

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
    if (hasBonus) {
      onClaimBonus(pitId);
    }
  };

  // Deterministic circular seed packing positions (0..70+)
  const seedPositions = useMemo(() => {
    return calculateSeedPositions(seeds);
  }, [seeds]);

  return (
    <div
      className={`pit-cell ${isPlayer1 ? "p1-pit-cell" : "p2-pit-cell"}`}
      data-testid={`pit-cell-${pitId}`}
    >
      {/* Player 1 external count: ABOVE pit (Player 1 side) */}
      {isPlayer1 && (
        <div
          className={`pit-external-count p1-count ${seeds === 0 ? "empty" : ""}`}
          data-testid={`pit-count-${pitId}`}
          aria-hidden="true"
        >
          {seeds}
        </div>
      )}

      <div className="pit-button-wrapper" style={{ position: "relative" }}>
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
          {/* Note: Pit IDs P0-P13 are hidden per Issue 9 */}

          {isClosed ? (
            <span
              className="closed-lock-icon"
              aria-hidden="true"
              title="Closed Pit"
            >
              🔒
            </span>
          ) : (
            seeds > 0 && (
              <svg
                className="pit-seeds-svg"
                data-testid={`pit-seeds-svg-${pitId}`}
                viewBox="-50 -50 100 100"
                width="100%"
                height="100%"
                aria-hidden="true"
              >
                <defs>
                  <radialGradient id={`seed-grad-${pitId}`} cx="35%" cy="30%" r="70%">
                    <stop offset="0%" stopColor="#fffdfa" />
                    <stop offset="35%" stopColor="#f3e5ab" />
                    <stop offset="70%" stopColor="#bca172" />
                    <stop offset="100%" stopColor="#6b4423" />
                  </radialGradient>
                </defs>
                {seedPositions.map((pos, idx) => (
                  <g
                    key={idx}
                    className="seed-element"
                    data-testid={`seed-${pitId}-${idx}`}
                  >
                    {/* Shadow */}
                    <circle
                      cx={pos.x + 0.3}
                      cy={pos.y + 0.5}
                      r={pos.radius}
                      fill="rgba(0,0,0,0.4)"
                    />
                    {/* Main Seed Bead */}
                    <circle
                      cx={pos.x}
                      cy={pos.y}
                      r={pos.radius}
                      fill={`url(#seed-grad-${pitId})`}
                      stroke="#4a2e18"
                      strokeWidth="0.35"
                    />
                    {/* Gloss specular reflection */}
                    <circle
                      cx={pos.x - pos.radius * 0.28}
                      cy={pos.y - pos.radius * 0.28}
                      r={pos.radius * 0.28}
                      fill="rgba(255,255,255,0.7)"
                    />
                  </g>
                ))}
              </svg>
            )
          )}
        </button>

        {hasBonus && (
          <button
            type="button"
            className="bonus-claim-badge"
            onClick={handleBonusClick}
            aria-label={`Claim +4 bonus on ${ownerLabel} Pit`}
            data-testid={`claim-bonus-${pitId}`}
          >
            CLAIM +4
          </button>
        )}
      </div>

      {/* Player 2 external count: BELOW pit (Player 2 side) */}
      {!isPlayer1 && (
        <div
          className={`pit-external-count p2-count ${seeds === 0 ? "empty" : ""}`}
          data-testid={`pit-count-${pitId}`}
          aria-hidden="true"
        >
          {seeds}
        </div>
      )}
    </div>
  );
};
