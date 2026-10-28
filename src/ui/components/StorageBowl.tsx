/**
 * Storage Bowl Component
 * Displays captured / accumulated storage seeds for Player 1 and Player 2.
 * Single source of truth for physical player storage inside the board layout.
 * Renders individual captured seed objects in a deterministic, compact grid.
 */

import React, { useMemo } from "react";
import type { Player } from "../../engine/types";
import { calculateStorageSeedPositions } from "../utils/storageSeedPacking";

export interface StorageBowlProps {
  player: Player;
  storageSeeds: number;
  className?: string;
  isDisqualified?: boolean;
  orientation?: "vertical" | "horizontal";
}

export const StorageBowl: React.FC<StorageBowlProps> = React.memo(({
  player,
  storageSeeds,
  className = "",
  isDisqualified = false,
  orientation = "vertical",
}) => {
  const isP1 = player === "PLAYER_1";
  const isP2 = player === "PLAYER_2";
  const isP3 = player === "PLAYER_3";
  const playerLabel = isP1
    ? "Player 1"
    : isP2
    ? "Player 2"
    : isP3
    ? "Player 3"
    : "Player 4";
  const testId = isP1
    ? "storage-player1"
    : isP2
    ? "storage-player2"
    : isP3
    ? "storage-player3"
    : "storage-player4";
  const countTestId = isP1
    ? "p1-captured-count"
    : isP2
    ? "p2-captured-count"
    : isP3
    ? "p3-captured-count"
    : "p4-captured-count";
  const gradId = isP1
    ? "storage-seed-grad-p1"
    : isP2
    ? "storage-seed-grad-p2"
    : isP3
    ? "storage-seed-grad-p3"
    : "storage-seed-grad-p4";

  const isHorizontal = orientation === "horizontal";
  const geometry = useMemo(() => {
    return isHorizontal
      ? { width: 200, height: 50 }
      : { width: 90, height: 180 };
  }, [isHorizontal]);

  // Deterministic seed positions (up to 70 seeds)
  const seedPositions = useMemo(() => {
    return calculateStorageSeedPositions(storageSeeds, geometry);
  }, [storageSeeds, geometry]);

  return (
    <div
      className={`storage-bowl ${className} ${orientation} ${isDisqualified ? "disqualified" : ""}`}
      data-testid={testId}
      aria-label={`${playerLabel} Storage, ${
        isDisqualified ? "Disqualified" : `${storageSeeds} seeds collected`
      }`}
      role="region"
    >
      <div className="storage-header">
        <span className="storage-label">{playerLabel}</span>
        {isDisqualified ? (
          <span
            className="storage-count storage-disqualified-text"
            data-testid={countTestId}
          >
            Disqualified
          </span>
        ) : (
          <span className="storage-count" data-testid={countTestId}>
            {storageSeeds}
          </span>
        )}
      </div>

      {/* Captured Seeds Visual Reservoir */}
      <div className="storage-seeds-reservoir" data-testid={`storage-reservoir-${player.toLowerCase()}`}>
        {storageSeeds > 0 ? (
          <svg
            className="storage-seeds-svg"
            data-testid={`storage-seeds-svg-${player.toLowerCase()}`}
            viewBox={isHorizontal ? "0 0 200 50" : "0 0 90 180"}
            width="100%"
            height="100%"
            aria-hidden="true"
          >
            <defs>
              <radialGradient id={gradId} cx="35%" cy="30%" r="70%">
                <stop offset="0%" stopColor="#fffdfa" />
                <stop offset="35%" stopColor="#f3e5ab" />
                <stop offset="70%" stopColor="#bca172" />
                <stop offset="100%" stopColor="#6b4423" />
              </radialGradient>
            </defs>
            {seedPositions.map((pos, idx) => (
              <g
                key={idx}
                className="storage-seed-element"
                data-testid={`storage-seed-${player.toLowerCase()}-${idx}`}
              >
                {/* Shadow */}
                <circle
                  cx={pos.x + 0.3}
                  cy={pos.y + 0.4}
                  r={pos.radius}
                  fill="rgba(0,0,0,0.45)"
                />
                {/* Seed Bead */}
                <circle
                  cx={pos.x}
                  cy={pos.y}
                  r={pos.radius}
                  fill={`url(#${gradId})`}
                  stroke="#4a2e18"
                  strokeWidth="0.35"
                />
                {/* Specular gloss highlight */}
                <circle
                  cx={pos.x - pos.radius * 0.28}
                  cy={pos.y - pos.radius * 0.28}
                  r={pos.radius * 0.28}
                  fill="rgba(255,255,255,0.7)"
                />
              </g>
            ))}
          </svg>
        ) : (
          <div className="storage-empty-hint" aria-hidden="true">
            Empty
          </div>
        )}
      </div>

      <span className="storage-pill">Captured</span>
    </div>
  );
});

StorageBowl.displayName = "StorageBowl";
