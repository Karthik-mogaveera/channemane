/**
 * Storage Bowl Component
 * Displays captured / accumulated storage seeds for Player 1 and Player 2.
 */

import React from "react";
import type { Player } from "../../engine/types";

export interface StorageBowlProps {
  player: Player;
  storageSeeds: number;
  className?: string;
}

export const StorageBowl: React.FC<StorageBowlProps> = ({
  player,
  storageSeeds,
  className = "",
}) => {
  const isP1 = player === "PLAYER_1";
  const playerLabel = isP1 ? "Player 1" : "Player 2";
  const testId = isP1 ? "storage-player1" : "storage-player2";

  return (
    <div
      className={`storage-bowl ${className}`}
      data-testid={testId}
      aria-label={`${playerLabel} Storage, ${storageSeeds} seeds collected`}
      role="region"
    >
      <span className="storage-label">{playerLabel}</span>
      <span className="storage-count">{storageSeeds}</span>
      <span className="storage-pill">Captured</span>
    </div>
  );
};
