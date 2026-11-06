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

// 5-Player physical layout constants (3 rows, Image 2)
// Top Row: P0–P3 (Player 1) [gap] P4–P7 (Player 2)
const FIVE_PLAYER_TOP_LEFT = [0, 1, 2, 3];
const FIVE_PLAYER_TOP_RIGHT = [4, 5, 6, 7];
// Middle Row: P11, P10, P9, P8 (Player 3) [gap] Player 3 Storage
const FIVE_PLAYER_MIDDLE_LEFT = [11, 10, 9, 8];
// Bottom Row: P12–P15 (Player 4) [gap] P16–P19 (Player 5)
const FIVE_PLAYER_BOTTOM_LEFT = [12, 13, 14, 15];
const FIVE_PLAYER_BOTTOM_RIGHT = [16, 17, 18, 19];

// 6-Player physical layout constants (3 rows, Image: Page 11)
// Top Row: P0–P3 (Player 1) [gap] P4–P7 (Player 2)
const SIX_PLAYER_TOP_LEFT = [0, 1, 2, 3];
const SIX_PLAYER_TOP_RIGHT = [4, 5, 6, 7];
// Middle Row (visually left to right): P15–P12 (Player 4) [gap] P11–P8 (Player 3)
const SIX_PLAYER_MIDDLE_LEFT = [15, 14, 13, 12];
const SIX_PLAYER_MIDDLE_RIGHT = [11, 10, 9, 8];
// Bottom Row: P16–P19 (Player 5) [gap] P20–P23 (Player 6)
const SIX_PLAYER_BOTTOM_LEFT = [16, 17, 18, 19];
const SIX_PLAYER_BOTTOM_RIGHT = [20, 21, 22, 23];

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
  const isSixPlayer =
    gameState.playerCount === 6 || gameState.pits.length === 24;
  const isFivePlayer =
    !isSixPlayer && (gameState.playerCount === 5 || gameState.pits.length === 20);
  const isFourPlayer =
    !isSixPlayer && !isFivePlayer && (gameState.playerCount === 4 || gameState.pits.length === 16);
  const isThreePlayer =
    !isSixPlayer && !isFivePlayer && !isFourPlayer && (gameState.playerCount === 3 || gameState.pits.length === 15);

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

  if (isSixPlayer) {
    return (
      <div className="board-wrapper">
        <div
          className="channemane-board six-player-board"
          data-testid="channemane-board"
          role="region"
          aria-label="6-Player Channemane Game Board"
          onContextMenu={(e) => e.preventDefault()}
        >
          {/* Top Storages Row: Player 1 (Upper-Left) & Player 2 (Upper-Right) */}
          <div className="six-player-storage-top-row">
            <div className="six-player-storage-half left" data-testid="p1-storage-container">
              <StorageBowl
                player="PLAYER_1"
                storageSeeds={gameState.players.player1.storage}
                className="board-storage-p1"
                orientation="horizontal"
                isDisqualified={gameState.disqualifiedPlayers?.includes("PLAYER_1")}
              />
            </div>
            <div className="board-center-gap-spacer" aria-hidden="true" />
            <div className="six-player-storage-half right" data-testid="p2-storage-container">
              <StorageBowl
                player="PLAYER_2"
                storageSeeds={gameState.players.player2.storage}
                className="board-storage-p2"
                orientation="horizontal"
                isDisqualified={gameState.disqualifiedPlayers?.includes("PLAYER_2")}
              />
            </div>
          </div>

          {/* Center Section: Middle Row flanked by P4 Storage (Left, Vertical) and P3 Storage (Right, Vertical) */}
          <div className="six-player-center-section">
            {/* Left Flank: Player 4 Storage (Vertical) */}
            <div className="six-player-storage-side left" data-testid="p4-storage-container">
              <StorageBowl
                player="PLAYER_4"
                storageSeeds={gameState.players.player4?.storage ?? 0}
                className="board-storage-p4"
                orientation="vertical"
                isDisqualified={gameState.disqualifiedPlayers?.includes("PLAYER_4")}
              />
            </div>

            {/* 3 Rows of Pits */}
            <div
              className="six-player-pits-container"
              data-testid="six-player-pits-container"
              role="grid"
              aria-label="6-Player 24 Pits Grid"
            >
              {/* Top Row: P0–P3 (Player 1) [gap] P4–P7 (Player 2) */}
              <div className="six-player-pits-row top-row" role="row">
                <div className="six-player-pit-group p1-group" data-testid="p1-pit-group">
                  {SIX_PLAYER_TOP_LEFT.map((pitId) => renderPitItem(pitId, "above"))}
                </div>
                <div className="board-center-gap" data-testid="board-center-gap-top" aria-hidden="true" />
                <div className="six-player-pit-group p2-group" data-testid="p2-pit-group">
                  {SIX_PLAYER_TOP_RIGHT.map((pitId) => renderPitItem(pitId, "above"))}
                </div>
              </div>

              {/* Middle Row: P15–P12 (Player 4) [gap] P11–P8 (Player 3) */}
              <div className="six-player-pits-row middle-row" role="row">
                <div className="six-player-pit-group p4-group" data-testid="p4-pit-group">
                  {SIX_PLAYER_MIDDLE_LEFT.map((pitId) => renderPitItem(pitId, "below"))}
                </div>
                <div className="board-center-gap" data-testid="board-center-gap-middle" aria-hidden="true" />
                <div className="six-player-pit-group p3-group" data-testid="p3-pit-group">
                  {SIX_PLAYER_MIDDLE_RIGHT.map((pitId) => renderPitItem(pitId, "below"))}
                </div>
              </div>

              {/* Bottom Row: P16–P19 (Player 5) [gap] P20–P23 (Player 6) */}
              <div className="six-player-pits-row bottom-row" role="row">
                <div className="six-player-pit-group p5-group" data-testid="p5-pit-group">
                  {SIX_PLAYER_BOTTOM_LEFT.map((pitId) => renderPitItem(pitId, "below"))}
                </div>
                <div className="board-center-gap" data-testid="board-center-gap-bottom" aria-hidden="true" />
                <div className="six-player-pit-group p6-group" data-testid="p6-pit-group">
                  {SIX_PLAYER_BOTTOM_RIGHT.map((pitId) => renderPitItem(pitId, "below"))}
                </div>
              </div>
            </div>

            {/* Right Flank: Player 3 Storage (Vertical) */}
            <div className="six-player-storage-side right" data-testid="p3-storage-container">
              <StorageBowl
                player="PLAYER_3"
                storageSeeds={gameState.players.player3?.storage ?? 0}
                className="board-storage-p3"
                orientation="vertical"
                isDisqualified={gameState.disqualifiedPlayers?.includes("PLAYER_3")}
              />
            </div>
          </div>

          {/* Bottom Storages Row: Player 5 (Bottom-Left) & Player 6 (Bottom-Right) */}
          <div className="six-player-storage-bottom-row">
            <div className="six-player-storage-half left" data-testid="p5-storage-container">
              <StorageBowl
                player="PLAYER_5"
                storageSeeds={gameState.players.player5?.storage ?? 0}
                className="board-storage-p5"
                orientation="horizontal"
                isDisqualified={gameState.disqualifiedPlayers?.includes("PLAYER_5")}
              />
            </div>
            <div className="board-center-gap-spacer" aria-hidden="true" />
            <div className="six-player-storage-half right" data-testid="p6-storage-container">
              <StorageBowl
                player="PLAYER_6"
                storageSeeds={gameState.players.player6?.storage ?? 0}
                className="board-storage-p6"
                orientation="horizontal"
                isDisqualified={gameState.disqualifiedPlayers?.includes("PLAYER_6")}
              />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (isFivePlayer) {
    return (
      <div className="board-wrapper">
        <div
          className="channemane-board five-player-board"
          data-testid="channemane-board"
          role="region"
          aria-label="5-Player Channemane Game Board"
          onContextMenu={(e) => e.preventDefault()}
        >
          {/* Top Storages Row: Player 1 (Left) & Player 2 (Right) */}
          <div className="five-player-storage-top-row">
            <div className="five-player-storage-half left" data-testid="p1-storage-container">
              <StorageBowl
                player="PLAYER_1"
                storageSeeds={gameState.players.player1.storage}
                className="board-storage-p1"
                orientation="horizontal"
                isDisqualified={gameState.disqualifiedPlayers?.includes("PLAYER_1")}
              />
            </div>
            <div className="board-center-gap-spacer" aria-hidden="true" />
            <div className="five-player-storage-half right" data-testid="p2-storage-container">
              <StorageBowl
                player="PLAYER_2"
                storageSeeds={gameState.players.player2.storage}
                className="board-storage-p2"
                orientation="horizontal"
                isDisqualified={gameState.disqualifiedPlayers?.includes("PLAYER_2")}
              />
            </div>
          </div>

          {/* Center 3-Row Pits & P3 Storage Container */}
          <div
            className="five-player-pits-container"
            data-testid="five-player-pits-container"
            role="grid"
            aria-label="5-Player 20 Pits Grid"
          >
            {/* Top Row: P0–P3 (Player 1) [gap] P4–P7 (Player 2) */}
            <div className="five-player-pits-row top-row" role="row">
              <div className="five-player-pit-group p1-group" data-testid="p1-pit-group">
                {FIVE_PLAYER_TOP_LEFT.map((pitId) => renderPitItem(pitId, "above"))}
              </div>
              <div className="board-center-gap" data-testid="board-center-gap-top" aria-hidden="true" />
              <div className="five-player-pit-group p2-group" data-testid="p2-pit-group">
                {FIVE_PLAYER_TOP_RIGHT.map((pitId) => renderPitItem(pitId, "above"))}
              </div>
            </div>

            {/* Middle Row: P11–P8 (Player 3) [gap] Player 3 Storage */}
            <div className="five-player-pits-row middle-row" role="row">
              <div className="five-player-pit-group p3-group" data-testid="p3-pit-group">
                {FIVE_PLAYER_MIDDLE_LEFT.map((pitId) => renderPitItem(pitId, "below"))}
              </div>
              <div className="board-center-gap" data-testid="board-center-gap-middle" aria-hidden="true" />
              <div className="five-player-storage-half p3-storage-wrapper" data-testid="p3-storage-container">
                <StorageBowl
                  player="PLAYER_3"
                  storageSeeds={gameState.players.player3?.storage ?? 0}
                  className="board-storage-p3"
                  orientation="horizontal"
                  isDisqualified={gameState.disqualifiedPlayers?.includes("PLAYER_3")}
                />
              </div>
            </div>

            {/* Bottom Row: P12–P15 (Player 4) [gap] P16–P19 (Player 5) */}
            <div className="five-player-pits-row bottom-row" role="row">
              <div className="five-player-pit-group p4-group" data-testid="p4-pit-group">
                {FIVE_PLAYER_BOTTOM_LEFT.map((pitId) => renderPitItem(pitId, "below"))}
              </div>
              <div className="board-center-gap" data-testid="board-center-gap-bottom" aria-hidden="true" />
              <div className="five-player-pit-group p5-group" data-testid="p5-pit-group">
                {FIVE_PLAYER_BOTTOM_RIGHT.map((pitId) => renderPitItem(pitId, "below"))}
              </div>
            </div>
          </div>

          {/* Bottom Storages Row: Player 4 (Left) & Player 5 (Right) */}
          <div className="five-player-storage-bottom-row">
            <div className="five-player-storage-half left" data-testid="p4-storage-container">
              <StorageBowl
                player="PLAYER_4"
                storageSeeds={gameState.players.player4?.storage ?? 0}
                className="board-storage-p4"
                orientation="horizontal"
                isDisqualified={gameState.disqualifiedPlayers?.includes("PLAYER_4")}
              />
            </div>
            <div className="board-center-gap-spacer" aria-hidden="true" />
            <div className="five-player-storage-half right" data-testid="p5-storage-container">
              <StorageBowl
                player="PLAYER_5"
                storageSeeds={gameState.players.player5?.storage ?? 0}
                className="board-storage-p5"
                orientation="horizontal"
                isDisqualified={gameState.disqualifiedPlayers?.includes("PLAYER_5")}
              />
            </div>
          </div>
        </div>
      </div>
    );
  }

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
