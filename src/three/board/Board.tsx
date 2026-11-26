/**
 * Complete 3D Channemane Board
 * Assembles BoardBase, 14 Pit3D instances, and 2 PlayerStorage3D instances.
 */

import React from "react";
import type { Player } from "../../engine/types";
import { BoardBase } from "./BoardBase";
import { Pit3D } from "../pits/Pit3D";
import { PlayerStorage3D } from "../storage/PlayerStorage3D";
import type { VisualBoardState } from "../../adapters/engineToVisualState";

export interface BoardProps {
  visualState: VisualBoardState;
  pitIncomingReserve?: Record<number, number>;
  pitSeedOverrides?: Record<number, number>;
  storageIncomingReserve?: Partial<Record<Player, number>>;
  onSelectPit: (pitId: number) => void;
  onConfirmContinuation?: (pitId: number) => void;
  onConfirmCapture?: (pitId: number) => void;
  onClaimBonus: (pitId: number) => void;
  isInteractable: boolean;
  isBonusInteractable?: boolean;
}

export const Board: React.FC<BoardProps> = ({
  visualState,
  pitIncomingReserve,
  pitSeedOverrides,
  storageIncomingReserve,
  onSelectPit,
  onConfirmContinuation,
  onConfirmCapture,
  onClaimBonus,
  isInteractable,
  isBonusInteractable = isInteractable,
}) => {
  return (
    <group name="channemane-board-3d">
      {/* Solid Wooden Base Slab */}
      <BoardBase playerCount={visualState.playerCount} />

      {/* Carved Pits */}
      {visualState.pits.map((pitState) => {
        const override = pitSeedOverrides?.[pitState.pitId];
        const incoming = pitIncomingReserve?.[pitState.pitId] ?? 0;
        const displayedSeeds =
          override !== undefined
            ? override
            : incoming > 0
              ? Math.max(0, pitState.seeds - incoming)
              : undefined;

        return (
          <Pit3D
            key={`pit-3d-${pitState.pitId}`}
            pitState={pitState}
            playerCount={visualState.playerCount}
            seedCountOverride={displayedSeeds}
            onSelectPit={onSelectPit}
            onConfirmContinuation={onConfirmContinuation}
            onConfirmCapture={onConfirmCapture}
            onClaimBonus={onClaimBonus}
            isInteractable={isInteractable}
            isBonusInteractable={isBonusInteractable}
          />
        );
      })}

      {/* Player Storage Bowls */}
      {visualState.storageList.map((storageState) => {
        const incoming = storageIncomingReserve?.[storageState.player] ?? 0;
        const displayedSeeds =
          incoming > 0 ? Math.max(0, storageState.seeds - incoming) : undefined;

        return (
          <PlayerStorage3D
            key={`storage-3d-${storageState.player}`}
            storageState={storageState}
            playerCount={visualState.playerCount}
            seedCountOverride={displayedSeeds}
          />
        );
      })}
    </group>
  );
};
