/**
 * Interactive Pit Component
 * Renders an individual Channemane pit with circular geometry, seed beads,
 * ownership styling, active sowing highlight, gesture-based bonus claim,
 * interactive continuation/capture glowing highlights, and external seed count (Issues 4, 5, 9).
 */

import React, { useMemo, useState, useRef, useEffect, useCallback } from "react";
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
  isContinuationTarget?: boolean;
  isCaptureTarget?: boolean;
  onSelect: (pitId: number) => void;
  onConfirmContinuation?: (pitId: number) => void;
  onConfirmCapture?: (pitId: number) => void;
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
  isContinuationTarget = false,
  isCaptureTarget = false,
  onSelect,
  onConfirmContinuation,
  onConfirmCapture,
  onClaimBonus,
}) => {
  const isClosed = status === "CLOSED";
  const hasBonus = bonusAvailable && seeds === 4 && !isClosed;
  const isPlayer1 = owner === "PLAYER_1";
  const ownerLabel = isPlayer1 ? "Player 1" : "Player 2";

  // Long-press gesture state & refs
  const [isHolding, setIsHolding] = useState<boolean>(false);
  const holdTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const holdTriggeredRef = useRef<boolean>(false);
  const startPosRef = useRef<{ x: number; y: number } | null>(null);

  // Clear pending timers on unmount
  useEffect(() => {
    return () => {
      if (holdTimerRef.current) {
        clearTimeout(holdTimerRef.current);
        holdTimerRef.current = null;
      }
    };
  }, []);

  const cancelHold = useCallback(() => {
    if (holdTimerRef.current) {
      clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
    }
    setIsHolding(false);
    startPosRef.current = null;
  }, []);

  const handlePointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    // Only primary button (left click / touch contact) initiates long-press
    if (e.button !== 0) return;
    holdTriggeredRef.current = false;
    startPosRef.current = { x: e.clientX, y: e.clientY };

    if (hasBonus && !isClosed) {
      setIsHolding(true);
      holdTimerRef.current = setTimeout(() => {
        holdTriggeredRef.current = true;
        setIsHolding(false);
        holdTimerRef.current = null;
        onClaimBonus(pitId);
      }, 500);
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (holdTimerRef.current && startPosRef.current) {
      const dist = Math.hypot(
        e.clientX - startPosRef.current.x,
        e.clientY - startPosRef.current.y
      );
      // Cancel hold if finger/pointer moved > 10px
      if (dist > 10) {
        cancelHold();
      }
    }
  };

  const handlePointerUp = (_e: React.PointerEvent<HTMLButtonElement>) => {
    if (holdTimerRef.current) {
      clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
    }
    setIsHolding(false);
    startPosRef.current = null;
  };

  const handlePointerCancel = () => {
    cancelHold();
  };

  const handlePointerLeave = () => {
    cancelHold();
  };

  // Right-click desktop gesture
  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (hasBonus && !isClosed) {
      onClaimBonus(pitId);
    }
  };

  // Accessible keyboard bonus collection
  const handleKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    if (hasBonus && !isClosed && (e.key === "b" || e.key === "B")) {
      e.preventDefault();
      onClaimBonus(pitId);
    }
  };

  // Primary tap / click handler
  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();

    // If a long-press bonus claim just fired, suppress the ordinary tap
    if (holdTriggeredRef.current) {
      holdTriggeredRef.current = false;
      return;
    }

    if (isAnimating || isClosed) return;

    if (isContinuationTarget) {
      onConfirmContinuation?.(pitId);
    } else if (isCaptureTarget) {
      onConfirmCapture?.(pitId);
    } else if (isSelectable) {
      onSelect(pitId);
    }
  };

  const ariaLabel = isClosed
    ? `${ownerLabel} Pit, Closed`
    : isContinuationTarget
    ? `${ownerLabel} Pit, ${seeds} seeds, Continue sowing here`
    : isCaptureTarget
    ? `${ownerLabel} Pit, ${seeds} seeds, Tap to collect captured seeds`
    : hasBonus
    ? `${ownerLabel} Pit, 4 seeds, Bonus Available (Hold or Right-click to claim)`
    : `${ownerLabel} Pit, ${seeds} seeds${isSelectable ? ", Selectable" : ""}`;

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
          } ${hasBonus ? "has-bonus" : ""} ${
            isContinuationTarget ? "continuation-target" : ""
          } ${isCaptureTarget ? "capture-target" : ""} ${
            isHolding ? "holding-bonus" : ""
          } ${isClosed ? "closed" : ""}`}
          onClick={handleClick}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerCancel}
          onPointerLeave={handlePointerLeave}
          onContextMenu={handleContextMenu}
          onKeyDown={handleKeyDown}
          disabled={
            isClosed ||
            isAnimating ||
            (!isSelectable && !hasBonus && !isContinuationTarget && !isCaptureTarget)
          }
          aria-label={ariaLabel}
          data-testid={`pit-${pitId}`}
          data-pit-id={pitId}
          data-seeds={seeds}
          data-status={status}
          data-selectable={isSelectable}
          data-has-bonus={hasBonus}
          data-continuation-target={isContinuationTarget}
          data-capture-target={isCaptureTarget}
        >
          {/* Circular hold-to-claim progress animation ring */}
          {isHolding && (
            <svg
              className="hold-progress-svg"
              data-testid={`hold-progress-${pitId}`}
              viewBox="0 0 44 44"
              aria-hidden="true"
            >
              <circle
                cx="22"
                cy="22"
                r="19"
                fill="none"
                stroke="rgba(250, 204, 21, 0.35)"
                strokeWidth="3.5"
              />
              <circle
                className="hold-progress-circle"
                cx="22"
                cy="22"
                r="19"
                fill="none"
                stroke="#facc15"
                strokeWidth="3.5"
                strokeDasharray="119.38"
                strokeDashoffset="119.38"
              />
            </svg>
          )}

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
