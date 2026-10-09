/**
 * 14-Pit Physical Channemane Board Component
 * Renders the authoritative 2x7 traditional physical board:
 * Top Row: P0, P1, P2, P3, P4, P5, P6 (Player 1)
 * Bottom Row: P13, P12, P11, P10, P9, P8, P7 (Player 2)
 * Flanked by Player 1 (Left) and Player 2 (Right) Storage Bowls.
 */

import React from "react";
import { Pit } from "./Pit";
import { StorageBowl } from "./StorageBowl";
import type { GameState } from "../../engine/types";

export interface GameBoardProps {
  gameState: GameState;
  selectablePits: number[];
  activeDropPit: number | null;
  isAnimating: boolean;
  onSelectPit: (pitId: number) => void;
  onClaimBonus: (pitId: number) => void;
}

export const GameBoard: React.FC<GameBoardProps> = ({
  gameState,
  selectablePits,
  activeDropPit,
  isAnimating,
  onSelectPit,
  onClaimBonus,
}) => {
  // Authoritative physical layout
  const topRowPitIds = [0, 1, 2, 3, 4, 5, 6];
  const bottomRowPitIds = [13, 12, 11, 10, 9, 8, 7];

  return (
    <div className="board-wrapper">
      <div className="channemane-board" data-testid="channemane-board" role="region" aria-label="Channemane Game Board">
        {/* Left Bowl: Player 1 */}
        <StorageBowl
          player="PLAYER_1"
          storageSeeds={gameState.players.player1.storage}
          className="board-storage-p1"
        />

        {/* Center 2x7 Pits Grid */}
        <div className="pits-grid-container">
          <div className="row-label" aria-hidden="true">
            Player 1 Side
          </div>
          <div className="pits-row top-row" role="row" aria-label="Player 1 pits row">
            {topRowPitIds.map((pitId) => {
              const pit = gameState.pits[pitId]!;
              return (
                <Pit
                  key={pitId}
                  pitId={pitId}
                  owner={pit.owner}
                  seeds={pit.seeds}
                  status={pit.status}
                  bonusAvailable={pit.bonusAvailable}
                  isSelectable={selectablePits.includes(pitId)}
                  isActiveDrop={activeDropPit === pitId}
                  isAnimating={isAnimating}
                  onSelect={onSelectPit}
                  onClaimBonus={onClaimBonus}
                />
              );
            })}
          </div>

          <div className="pits-row bottom-row" role="row" aria-label="Player 2 pits row">
            {bottomRowPitIds.map((pitId) => {
              const pit = gameState.pits[pitId]!;
              return (
                <Pit
                  key={pitId}
                  pitId={pitId}
                  owner={pit.owner}
                  seeds={pit.seeds}
                  status={pit.status}
                  bonusAvailable={pit.bonusAvailable}
                  isSelectable={selectablePits.includes(pitId)}
                  isActiveDrop={activeDropPit === pitId}
                  isAnimating={isAnimating}
                  onSelect={onSelectPit}
                  onClaimBonus={onClaimBonus}
                />
              );
            })}
          </div>
          <div className="row-label" aria-hidden="true">
            Player 2 Side
          </div>
        </div>

        {/* Right Bowl: Player 2 */}
        <StorageBowl
          player="PLAYER_2"
          storageSeeds={gameState.players.player2.storage}
          className="board-storage-p2"
        />
      </div>
    </div>
  );
};
