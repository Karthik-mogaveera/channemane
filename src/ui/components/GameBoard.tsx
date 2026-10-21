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
  highlightedContinuationPit?: number | null;
  highlightedCapturePit?: number | null;
  onSelectPit: (pitId: number) => void;
  onConfirmContinuation?: (pitId: number) => void;
  onConfirmCapture?: (pitId: number) => void;
  onClaimBonus: (pitId: number) => void;
}

// Authoritative physical layout constants
const TOP_ROW_PIT_IDS = [0, 1, 2, 3, 4, 5, 6];
const BOTTOM_ROW_PIT_IDS = [13, 12, 11, 10, 9, 8, 7];

// 3-Player physical layout constants (Section 4 & 11)
const THREE_PLAYER_ROW_1_PITS = [0, 1, 2, 3, 4];
const THREE_PLAYER_ROW_2_PITS = [9, 8, 7, 6, 5];
const THREE_PLAYER_ROW_3_PITS = [10, 11, 12, 13, 14];

export const GameBoard: React.FC<GameBoardProps> = React.memo(({
  gameState,
  selectablePits,
  activeDropPit,
  isAnimating,
  highlightedContinuationPit = null,
  highlightedCapturePit = null,
  onSelectPit,
  onConfirmContinuation,
  onConfirmCapture,
  onClaimBonus,
}) => {
  const isThreePlayer =
    gameState.playerCount === 3 || gameState.pits.length === 15;

  if (isThreePlayer) {
    return (
      <div className="board-wrapper">
        <div
          className="channemane-board three-player-board"
          data-testid="channemane-board"
          role="region"
          aria-label="3-Player Channemane Game Board"
          onContextMenu={(e) => e.preventDefault()}
        >
          {/* Left Storage Bowls: Player 1 & Player 3 */}
          <div className="board-storage-col storage-col-left">
            <StorageBowl
              player="PLAYER_1"
              storageSeeds={gameState.players.player1.storage}
              className="board-storage-p1"
            />
            <StorageBowl
              player="PLAYER_3"
              storageSeeds={gameState.players.player3?.storage ?? 0}
              className="board-storage-p3"
            />
          </div>

          {/* Center 3x5 Pits Grid */}
          <div className="pits-grid-container three-player-pits-container">
            {/* Row 1: Player 1 */}
            <div className="row-label p1-label" aria-hidden="true">
              Player 1 Side (P0–P4)
            </div>
            <div
              className="pits-row three-player-row row-1"
              role="row"
              aria-label="Player 1 pits row"
            >
              {THREE_PLAYER_ROW_1_PITS.map((pitId) => {
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
                    isContinuationTarget={highlightedContinuationPit === pitId}
                    isCaptureTarget={highlightedCapturePit === pitId}
                    onSelect={onSelectPit}
                    onConfirmContinuation={onConfirmContinuation}
                    onConfirmCapture={onConfirmCapture}
                    onClaimBonus={onClaimBonus}
                  />
                );
              })}
            </div>

            {/* Row 2: Player 2 */}
            <div className="row-label p2-label" aria-hidden="true">
              Player 2 Side (P5–P9)
            </div>
            <div
              className="pits-row three-player-row row-2"
              role="row"
              aria-label="Player 2 pits row"
            >
              {THREE_PLAYER_ROW_2_PITS.map((pitId) => {
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
                    isContinuationTarget={highlightedContinuationPit === pitId}
                    isCaptureTarget={highlightedCapturePit === pitId}
                    onSelect={onSelectPit}
                    onConfirmContinuation={onConfirmContinuation}
                    onConfirmCapture={onConfirmCapture}
                    onClaimBonus={onClaimBonus}
                  />
                );
              })}
            </div>

            {/* Row 3: Player 3 */}
            <div className="row-label p3-label" aria-hidden="true">
              Player 3 Side (P10–P14)
            </div>
            <div
              className="pits-row three-player-row row-3"
              role="row"
              aria-label="Player 3 pits row"
            >
              {THREE_PLAYER_ROW_3_PITS.map((pitId) => {
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
                    isContinuationTarget={highlightedContinuationPit === pitId}
                    isCaptureTarget={highlightedCapturePit === pitId}
                    onSelect={onSelectPit}
                    onConfirmContinuation={onConfirmContinuation}
                    onConfirmCapture={onConfirmCapture}
                    onClaimBonus={onClaimBonus}
                  />
                );
              })}
            </div>
          </div>

          {/* Right Storage Bowl: Player 2 */}
          <div className="board-storage-col storage-col-right">
            <StorageBowl
              player="PLAYER_2"
              storageSeeds={gameState.players.player2.storage}
              className="board-storage-p2"
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="board-wrapper">
      <div
        className="channemane-board"
        data-testid="channemane-board"
        role="region"
        aria-label="Channemane Game Board"
        onContextMenu={(e) => e.preventDefault()}
      >
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
            {TOP_ROW_PIT_IDS.map((pitId) => {
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
                  isContinuationTarget={highlightedContinuationPit === pitId}
                  isCaptureTarget={highlightedCapturePit === pitId}
                  onSelect={onSelectPit}
                  onConfirmContinuation={onConfirmContinuation}
                  onConfirmCapture={onConfirmCapture}
                  onClaimBonus={onClaimBonus}
                />
              );
            })}
          </div>

          <div className="pits-row bottom-row" role="row" aria-label="Player 2 pits row">
            {BOTTOM_ROW_PIT_IDS.map((pitId) => {
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
                  isContinuationTarget={highlightedContinuationPit === pitId}
                  isCaptureTarget={highlightedCapturePit === pitId}
                  onSelect={onSelectPit}
                  onConfirmContinuation={onConfirmContinuation}
                  onConfirmCapture={onConfirmCapture}
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
});

GameBoard.displayName = "GameBoard";
