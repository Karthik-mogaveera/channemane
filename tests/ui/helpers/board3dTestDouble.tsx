/**
 * JSDOM Test Double for Board3D
 * Used strictly via vi.mock inside App UI/engine/AI/multiplayer flow integration tests
 * where rendering a full Three.js WebGL context inside JSDOM is out of scope.
 * Translates authoritative GameState -> VisualBoardState via mapEngineToVisualState,
 * exposes accessible DOM pit & storage state + CameraModeSelector, and notifies
 * onVisualSettlementComplete when ROUND_SETTLEMENT visual events arrive.
 */

import React, { useEffect, useMemo, useRef, useState } from "react";
import { mapEngineToVisualState } from "../../../src/adapters/engineToVisualState";
import { CameraModeSelector } from "../../../src/ui/components/CameraModeSelector";
import type { BoardCameraMode } from "../../../src/three/scene/BoardCamera";
import type { Board3DProps } from "../../../src/three/Board3D";

export const Board3DTestDouble: React.FC<Board3DProps> = ({
  gameState,
  selectablePits,
  activeDropPit,
  isAnimating,
  visualEvents = [],
  highlightedContinuationPit = null,
  highlightedCapturePit = null,
  claimableBonuses = [],
  interactionState = "WAITING_FOR_START",
  onSelectPit,
  onConfirmContinuation,
  onConfirmCapture,
  onClaimBonus,
  onVisualSettlementComplete,
  className = "",
}) => {
  const [cameraMode, setCameraMode] = useState<BoardCameraMode>("SIDE");
  const holdTimersRef = useRef<Record<number, ReturnType<typeof setTimeout>>>({});
  const holdTriggeredRef = useRef<Record<number, boolean>>({});
  const lastSettledEventsRef = useRef<typeof visualEvents | null>(null);

  const visualState = useMemo(
    () =>
      mapEngineToVisualState({
        gameState,
        selectablePits,
        claimableBonuses,
        activeDropPit,
        highlightedContinuationPit,
        highlightedCapturePit,
        interactionState,
        isAnimating,
      }),
    [
      gameState,
      selectablePits,
      claimableBonuses,
      activeDropPit,
      highlightedContinuationPit,
      highlightedCapturePit,
      interactionState,
      isAnimating,
    ]
  );

  // Trigger visual settlement completion once for each ROUND_SETTLEMENT event batch
  useEffect(() => {
    if (
      visualEvents.length > 0 &&
      lastSettledEventsRef.current !== visualEvents &&
      visualEvents.some((e) => e.type === "ROUND_SETTLEMENT")
    ) {
      lastSettledEventsRef.current = visualEvents;
      onVisualSettlementComplete?.();
    }
  }, [visualEvents, onVisualSettlementComplete]);

  useEffect(() => {
    return () => {
      Object.values(holdTimersRef.current).forEach((t) => clearTimeout(t));
    };
  }, []);

  const isAITurn =
    gameState.gameMode === "ai" &&
    gameState.currentPlayer === (gameState.aiPlayer ?? "PLAYER_2");

  const isInteractable =
    !isAnimating &&
    !isAITurn &&
    (interactionState === "WAITING_FOR_START" ||
      interactionState === "WAITING_FOR_CONTINUATION" ||
      interactionState === "WAITING_FOR_CAPTURE");

  const isBonusInteractable =
    interactionState !== "ROUND_SETTLEMENT" && interactionState !== "MATCH_COMPLETE";

  const clearHold = (pitId: number) => {
    if (holdTimersRef.current[pitId]) {
      clearTimeout(holdTimersRef.current[pitId]);
      delete holdTimersRef.current[pitId];
    }
  };

  return (
    <div
      className={`board-3d-viewport ${className}`}
      data-testid="channemane-board-3d"
      onContextMenu={(e) => e.preventDefault()}
    >
      <div className="board-3d-controls-bar" data-testid="board-3d-controls-bar">
        <CameraModeSelector value={cameraMode} onChange={setCameraMode} />
      </div>

      <div className="board-3d-proxy-storages">
        {visualState.storageList.map((storage) => {
          const pNum = storage.player.replace("PLAYER_", "");
          return (
            <div
              key={storage.player}
              data-testid={`storage-player${pNum}`}
              className={storage.isDisqualified ? "disqualified" : ""}
            >
              <span data-testid={`p${pNum}-captured-count`}>
                {storage.isDisqualified ? "Disqualified" : storage.seeds}
              </span>
            </div>
          );
        })}
      </div>

      <div className="board-3d-proxy-pits">
        {visualState.pits.map((pit) => {
          const isClosed = pit.status === "CLOSED";
          const hasBonus = pit.bonusAvailable && pit.seeds === 4 && !isClosed;
          const canClaimBonus = hasBonus && pit.isClaimableBonus && isBonusInteractable;
          const canAct =
            !isClosed &&
            ((isInteractable &&
              (pit.isContinuationTarget || pit.isCaptureTarget || pit.isSelectable)) ||
              canClaimBonus);

          const classes = [
            "pit-3d-proxy",
            pit.isActiveDrop ? "active-drop" : "",
            hasBonus ? "has-bonus" : "",
            isClosed ? "closed" : "",
            pit.isContinuationTarget ? "continuation-target" : "",
            pit.isCaptureTarget ? "capture-target" : "",
          ]
            .filter(Boolean)
            .join(" ");

          return (
            <button
              key={pit.pitId}
              type="button"
              data-testid={`pit-${pit.pitId}`}
              data-pit-id={pit.pitId}
              data-seeds={pit.seeds}
              data-status={pit.status}
              data-selectable={pit.isSelectable ? "true" : "false"}
              data-active-drop={pit.isActiveDrop ? "true" : "false"}
              data-continuation-target={pit.isContinuationTarget ? "true" : "false"}
              data-capture-target={pit.isCaptureTarget ? "true" : "false"}
              data-has-bonus={hasBonus ? "true" : "false"}
              className={classes}
              disabled={!canAct}
              onPointerDown={(e) => {
                holdTriggeredRef.current[pit.pitId] = false;
                if (!canClaimBonus || e.button !== 0) return;
                clearHold(pit.pitId);
                holdTimersRef.current[pit.pitId] = setTimeout(() => {
                  holdTriggeredRef.current[pit.pitId] = true;
                  onClaimBonus(pit.pitId);
                }, 500);
              }}
              onPointerUp={() => clearHold(pit.pitId)}
              onPointerLeave={() => clearHold(pit.pitId)}
              onContextMenu={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (canClaimBonus) {
                  onClaimBonus(pit.pitId);
                }
              }}
              onClick={() => {
                if (holdTriggeredRef.current[pit.pitId]) {
                  holdTriggeredRef.current[pit.pitId] = false;
                  return;
                }
                if (isClosed) return;
                if (isInteractable && pit.isContinuationTarget) {
                  onConfirmContinuation?.(pit.pitId);
                } else if (isInteractable && pit.isCaptureTarget) {
                  onConfirmCapture?.(pit.pitId);
                } else if (isInteractable && pit.isSelectable) {
                  onSelectPit(pit.pitId);
                } else if (canClaimBonus) {
                  onClaimBonus(pit.pitId);
                }
              }}
            />
          );
        })}
      </div>
    </div>
  );
};
