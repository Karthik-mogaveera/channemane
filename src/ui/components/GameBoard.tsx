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

// 4-Player physical layout constants (2x8 rectangular board, Section 2 & Image 3)
// Top Row: P0–P3 (Player 1) [gap] P4–P7 (Player 2)
const FOUR_PLAYER_TOP_LEFT = [0, 1, 2, 3];
const FOUR_PLAYER_TOP_RIGHT = [4, 5, 6, 7];
// Bottom Row: P15–P12 (Player 4) [gap] P11–P8 (Player 3)
const FOUR_PLAYER_BOTTOM_LEFT = [15, 14, 13, 12];
const FOUR_PLAYER_BOTTOM_RIGHT = [11, 10, 9, 8];

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
  const isFourPlayer =
    gameState.playerCount === 4 || gameState.pits.length === 16;
  const isThreePlayer =
    gameState.playerCount === 3 || gameState.pits.length === 15;

  const renderPitItem = (pitId: number, countPos: "above" | "below") => {
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
        countPosition={countPos}
        onSelect={onSelectPit}
        onConfirmContinuation={onConfirmContinuation}
        onConfirmCapture={onConfirmCapture}
        onClaimBonus={onClaimBonus}
      />
    );
  };

  if (isFourPlayer) {
    return (
      <div className="board-wrapper">
        <div
          className="channemane-board four-player-board"
          data-testid="channemane-board"
          role="region"
          aria-label="4-Player Channemane Game Board"
          onContextMenu={(e) => e.preventDefault()}
        >
          {/* Top Storages Row: Player 1 (Left) & Player 2 (Right) */}
          <div className="four-player-storage-top-row">
            <div className="four-player-storage-half left" data-testid="p1-storage-container">
              <StorageBowl
                player="PLAYER_1"
                storageSeeds={gameState.players.player1.storage}
                className="board-storage-p1"
                orientation="horizontal"
                isDisqualified={gameState.disqualifiedPlayers?.includes("PLAYER_1")}
              />
            </div>
            <div className="board-center-gap-spacer" aria-hidden="true" />
            <div className="four-player-storage-half right" data-testid="p2-storage-container">
              <StorageBowl
                player="PLAYER_2"
                storageSeeds={gameState.players.player2.storage}
                className="board-storage-p2"
                orientation="horizontal"
                isDisqualified={gameState.disqualifiedPlayers?.includes("PLAYER_2")}
              />
            </div>
          </div>

          {/* Center 2x8 Pits Grid */}
          <div
            className="four-player-pits-container"
            data-testid="four-player-pits-container"
            role="grid"
            aria-label="4-Player 16 Pits Grid"
          >
            {/* Top Row: P0–P3 (Player 1) [gap] P4–P7 (Player 2) */}
            <div className="four-player-pits-row top-row" role="row">
              <div className="four-player-pit-group p1-group" data-testid="p1-pit-group">
                {FOUR_PLAYER_TOP_LEFT.map((pitId) => renderPitItem(pitId, "above"))}
              </div>
              <div className="board-center-gap" data-testid="board-center-gap-top" aria-hidden="true" />
              <div className="four-player-pit-group p2-group" data-testid="p2-pit-group">
                {FOUR_PLAYER_TOP_RIGHT.map((pitId) => renderPitItem(pitId, "above"))}
              </div>
            </div>

            {/* Bottom Row: P15–P12 (Player 4) [gap] P11–P8 (Player 3) */}
            <div className="four-player-pits-row bottom-row" role="row">
              <div className="four-player-pit-group p4-group" data-testid="p4-pit-group">
                {FOUR_PLAYER_BOTTOM_LEFT.map((pitId) => renderPitItem(pitId, "below"))}
              </div>
              <div className="board-center-gap" data-testid="board-center-gap-bottom" aria-hidden="true" />
              <div className="four-player-pit-group p3-group" data-testid="p3-pit-group">
                {FOUR_PLAYER_BOTTOM_RIGHT.map((pitId) => renderPitItem(pitId, "below"))}
              </div>
            </div>
          </div>

          {/* Bottom Storages Row: Player 4 (Left) & Player 3 (Right) */}
          <div className="four-player-storage-bottom-row">
            <div className="four-player-storage-half left" data-testid="p4-storage-container">
              <StorageBowl
                player="PLAYER_4"
                storageSeeds={gameState.players.player4?.storage ?? 0}
                className="board-storage-p4"
                orientation="horizontal"
                isDisqualified={gameState.disqualifiedPlayers?.includes("PLAYER_4")}
              />
            </div>
            <div className="board-center-gap-spacer" aria-hidden="true" />
            <div className="four-player-storage-half right" data-testid="p3-storage-container">
              <StorageBowl
                player="PLAYER_3"
                storageSeeds={gameState.players.player3?.storage ?? 0}
                className="board-storage-p3"
                orientation="horizontal"
                isDisqualified={gameState.disqualifiedPlayers?.includes("PLAYER_3")}
              />
            </div>
          </div>
        </div>
      </div>
    );
  }

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
          {/* Left: Player 1 Storage (P1S) */}
          <div className="three-player-storage-left" data-testid="p1-storage-container">
            <StorageBowl
              player="PLAYER_1"
              storageSeeds={gameState.players.player1.storage}
              className="board-storage-p1"
              isDisqualified={gameState.disqualifiedPlayers?.includes("PLAYER_1")}
            />
          </div>

          {/* Center 3x5 Pits Grid (15 Pits) */}
          <div
            className="three-player-pits-grid"
            data-testid="three-player-pits-grid"
            role="grid"
            aria-label="3-Player 15 Pits Grid"
          >
            {/* Row 1: Player 1 (P0–P4) */}
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
                  countPosition="below"
                  onSelect={onSelectPit}
                  onConfirmContinuation={onConfirmContinuation}
                  onConfirmCapture={onConfirmCapture}
                  onClaimBonus={onClaimBonus}
                />
              );
            })}

            {/* Row 2: Player 2 (P9–P5) */}
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
                  countPosition="below"
                  onSelect={onSelectPit}
                  onConfirmContinuation={onConfirmContinuation}
                  onConfirmCapture={onConfirmCapture}
                  onClaimBonus={onClaimBonus}
                />
              );
            })}

            {/* Row 3: Player 3 (P10–P14) */}
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
                  countPosition="below"
                  onSelect={onSelectPit}
                  onConfirmContinuation={onConfirmContinuation}
                  onConfirmCapture={onConfirmCapture}
                  onClaimBonus={onClaimBonus}
                />
              );
            })}
          </div>

          {/* Right: Player 2 Storage (P2S) & Player 3 Storage (P3S) side-by-side */}
          <div className="three-player-storage-right" data-testid="p2-p3-storage-container">
            <StorageBowl
              player="PLAYER_2"
              storageSeeds={gameState.players.player2.storage}
              className="board-storage-p2"
              isDisqualified={gameState.disqualifiedPlayers?.includes("PLAYER_2")}
            />
            <StorageBowl
              player="PLAYER_3"
              storageSeeds={gameState.players.player3?.storage ?? 0}
              className="board-storage-p3"
              isDisqualified={gameState.disqualifiedPlayers?.includes("PLAYER_3")}
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
