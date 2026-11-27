/**
 * Interactive 3D Pit Component
 * Renders a seamlessly carved circular walnut cavity, optional closed-pit walnut stopper,
 * deterministic seed beads inside the bowl, interaction highlights, and pointer events.
 */

import React, { useMemo, useState, useCallback, useRef, useEffect } from "react";
import type { ThreeEvent } from "@react-three/fiber";
import { PitGeometries } from "./PitGeometry";
import { BoardMaterialsManager } from "../board/BoardMaterials";
import { PitHighlight } from "./PitHighlight";
import { Seed3D } from "../seeds/Seed3D";
import { getPitSeedPositions3D } from "../seeds/SeedLayout";
import {
  PIT_CLICK_DRAG_THRESHOLD_PX,
  hasExceededDragThreshold,
} from "../interaction/BoardInput";
import type { VisualPitState } from "../../adapters/engineToVisualState";
import {
  getPitWorldPosition,
  type SupportedPlayerCount,
} from "../config/boardVisualConfigs";

export interface Pit3DProps {
  pitState: VisualPitState;
  playerCount?: SupportedPlayerCount;
  seedCountOverride?: number;
  onSelectPit: (pitId: number) => void;
  onConfirmContinuation?: (pitId: number) => void;
  onConfirmCapture?: (pitId: number) => void;
  onClaimBonus: (pitId: number) => void;
  isInteractable: boolean;
  isBonusInteractable?: boolean;
  shouldSuppressClick?: () => boolean;
}

const HOLD_DURATION_MS = 500;

export const Pit3D: React.FC<Pit3DProps> = React.memo(({
  pitState,
  playerCount = 2,
  seedCountOverride,
  onSelectPit,
  onConfirmContinuation,
  onConfirmCapture,
  onClaimBonus,
  isInteractable,
  isBonusInteractable = isInteractable,
  shouldSuppressClick,
}) => {
  const [isHovered, setIsHovered] = useState<boolean>(false);
  const [holdProgress, setHoldProgress] = useState<number>(0);

  const holdTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const holdRafRef = useRef<number | null>(null);
  const holdStartMsRef = useRef<number>(0);
  const holdTriggeredRef = useRef<boolean>(false);
  const startPointerRef = useRef<{ x: number; y: number } | null>(null);
  const dragExceededRef = useRef<boolean>(false);
  const lastActionAtRef = useRef<number>(0);
  const bonusClaimedLockRef = useRef<boolean>(false);

  const geometries = useMemo(() => PitGeometries.getInstance(), []);
  const materials = useMemo(() => BoardMaterialsManager.getInstance(), []);

  const worldPos = useMemo(
    () => getPitWorldPosition(pitState.pitId, playerCount),
    [pitState.pitId, playerCount]
  );

  const cavityGeometry = useMemo(
    () => geometries.getCavityGeometry(pitState.pitId, playerCount),
    [geometries, pitState.pitId, playerCount]
  );

  const isClosed = pitState.status === "CLOSED";
  const hasBonus = pitState.bonusAvailable && pitState.seeds === 4 && !isClosed;
  const canClaimBonusNow = hasBonus && pitState.isClaimableBonus && isBonusInteractable;
  const visibleSeedCount = Math.max(0, seedCountOverride ?? pitState.seeds);

  const canActPrimary =
    !isClosed &&
    ((isInteractable &&
      (pitState.isContinuationTarget ||
        pitState.isCaptureTarget ||
        pitState.isSelectable)) ||
      canClaimBonusNow);

  const cancelHold = useCallback(() => {
    if (holdTimerRef.current) {
      clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
    }
    if (holdRafRef.current !== null && typeof cancelAnimationFrame === "function") {
      cancelAnimationFrame(holdRafRef.current);
      holdRafRef.current = null;
    }
    startPointerRef.current = null;
    setHoldProgress(0);
  }, []);

  useEffect(() => {
    return () => {
      cancelHold();
      if (typeof document !== "undefined" && document.body.style.cursor === "pointer") {
        document.body.style.cursor = "default";
      }
    };
  }, [cancelHold]);

  useEffect(() => {
    if (!canClaimBonusNow) {
      bonusClaimedLockRef.current = false;
      cancelHold();
    }
  }, [canClaimBonusNow, cancelHold]);

  useEffect(() => {
    if ((!isInteractable && !isBonusInteractable) || isClosed) {
      cancelHold();
    }
  }, [isInteractable, isBonusInteractable, isClosed, cancelHold]);

  const fireBonusClaimSafely = useCallback(() => {
    if (!canClaimBonusNow || bonusClaimedLockRef.current || isClosed) return false;
    bonusClaimedLockRef.current = true;
    lastActionAtRef.current = Date.now();
    cancelHold();
    onClaimBonus(pitState.pitId);
    return true;
  }, [canClaimBonusNow, isClosed, cancelHold, onClaimBonus, pitState.pitId]);

  // Compute deterministic world positions via SeedLayout and convert to pit-local space
  const seedTransforms = useMemo(() => {
    const worldTransforms = getPitSeedPositions3D(visibleSeedCount, worldPos, pitState.pitId);
    return worldTransforms.map((st) => ({
      ...st,
      position: [
        st.position[0] - worldPos[0],
        st.position[1] - worldPos[1],
        st.position[2] - worldPos[2],
      ] as [number, number, number],
    }));
  }, [visibleSeedCount, worldPos, pitState.pitId]);

  const handlePointerDown = useCallback(
    (e: ThreeEvent<PointerEvent>) => {
      e.stopPropagation();
      dragExceededRef.current = false;
      holdTriggeredRef.current = false;

      if (isClosed) return;
      const nativeEvent = e.nativeEvent;
      if (nativeEvent && typeof nativeEvent.button === "number" && nativeEvent.button !== 0) {
        return;
      }

      startPointerRef.current = nativeEvent
        ? { x: nativeEvent.clientX, y: nativeEvent.clientY }
        : { x: 0, y: 0 };

      if (!isInteractable && !canClaimBonusNow) return;

      if (canClaimBonusNow) {
        holdStartMsRef.current = Date.now();
        setHoldProgress(0.05);

        const stepProgress = () => {
          const elapsed = Date.now() - holdStartMsRef.current;
          const pct = Math.min(1, elapsed / HOLD_DURATION_MS);
          setHoldProgress(pct);
          if (pct < 1 && holdTimerRef.current !== null && typeof requestAnimationFrame === "function") {
            holdRafRef.current = requestAnimationFrame(stepProgress);
          }
        };

        if (typeof requestAnimationFrame === "function") {
          holdRafRef.current = requestAnimationFrame(stepProgress);
        }

        holdTimerRef.current = setTimeout(() => {
          holdTriggeredRef.current = true;
          fireBonusClaimSafely();
        }, HOLD_DURATION_MS);
      }
    },
    [isInteractable, isClosed, canClaimBonusNow, fireBonusClaimSafely]
  );

  const handlePointerMove = useCallback(
    (e: ThreeEvent<PointerEvent>) => {
      if (!startPointerRef.current) return;
      const nativeEvent = e.nativeEvent;
      if (!nativeEvent) return;
      if (
        hasExceededDragThreshold(
          startPointerRef.current.x,
          startPointerRef.current.y,
          nativeEvent.clientX,
          nativeEvent.clientY
        )
      ) {
        dragExceededRef.current = true;
        cancelHold();
      }
    },
    [cancelHold]
  );

  const handlePointerUp = useCallback(() => {
    cancelHold();
  }, [cancelHold]);

  const handleContextMenu = useCallback(
    (e: ThreeEvent<MouseEvent>) => {
      e.nativeEvent?.preventDefault?.();
      e.stopPropagation();

      const deltaPx = typeof e.delta === "number" ? e.delta : 0;
      if (deltaPx > PIT_CLICK_DRAG_THRESHOLD_PX || shouldSuppressClick?.()) {
        return;
      }

      if (isClosed || !canClaimBonusNow) return;
      const now = Date.now();
      if (now - lastActionAtRef.current < 150) return;
      fireBonusClaimSafely();
    },
    [isClosed, canClaimBonusNow, fireBonusClaimSafely, shouldSuppressClick]
  );

  const handleClick = useCallback(
    (e: ThreeEvent<MouseEvent>) => {
      e.stopPropagation();

      const deltaPx = typeof e.delta === "number" ? e.delta : 0;
      const wasDragged =
        dragExceededRef.current ||
        deltaPx > PIT_CLICK_DRAG_THRESHOLD_PX ||
        Boolean(shouldSuppressClick?.());

      dragExceededRef.current = false;

      if (wasDragged) {
        holdTriggeredRef.current = false;
        return;
      }

      if (holdTriggeredRef.current) {
        holdTriggeredRef.current = false;
        return;
      }

      if (isClosed) return;

      const now = Date.now();
      if (now - lastActionAtRef.current < 160) return;

      if (isInteractable && pitState.isContinuationTarget) {
        lastActionAtRef.current = now;
        onConfirmContinuation?.(pitState.pitId);
      } else if (isInteractable && pitState.isCaptureTarget) {
        lastActionAtRef.current = now;
        onConfirmCapture?.(pitState.pitId);
      } else if (isInteractable && pitState.isSelectable) {
        lastActionAtRef.current = now;
        onSelectPit(pitState.pitId);
      } else if (canClaimBonusNow) {
        fireBonusClaimSafely();
      }
    },
    [
      isInteractable,
      isClosed,
      pitState.isContinuationTarget,
      pitState.isCaptureTarget,
      pitState.isSelectable,
      pitState.pitId,
      canClaimBonusNow,
      onConfirmContinuation,
      onConfirmCapture,
      onSelectPit,
      fireBonusClaimSafely,
      shouldSuppressClick,
    ]
  );

  const handlePointerOver = useCallback(
    (e: ThreeEvent<PointerEvent>) => {
      e.stopPropagation();
      if (canActPrimary) {
        setIsHovered(true);
        if (typeof document !== "undefined") {
          document.body.style.cursor = "pointer";
        }
      }
    },
    [canActPrimary]
  );

  const handlePointerOut = useCallback(() => {
    setIsHovered(false);
    cancelHold();
    if (typeof document !== "undefined") {
      document.body.style.cursor = "default";
    }
  }, [cancelHold]);

  return (
    <group position={worldPos} name={`pit-${pitState.pitId}`}>
      {/* Seamlessly Carved Rounded-Lip Walnut Cavity */}
      <mesh
        geometry={cavityGeometry}
        material={isClosed ? materials.closedPitMaterial : materials.cavityMaterial}
        receiveShadow
      />

      {/* Handcrafted Closed-Pit Carved Walnut Stopper & Antique Brass Finial */}
      {isClosed && (
        <group position={[0, -0.045, 0]} name={`pit-${pitState.pitId}-closed-stopper`}>
          <mesh
            geometry={geometries.closedPlugBodyGeometry}
            material={materials.closedPitMaterial}
            castShadow
            receiveShadow
          />
          <mesh
            geometry={geometries.closedPlugCollarGeometry}
            material={materials.closedPitMaterial}
            position={[0, 0.052, 0]}
            castShadow
            receiveShadow
          />
          <mesh
            geometry={geometries.closedPlugKnobGeometry}
            material={materials.brassMaterial}
            position={[0, 0.095, 0]}
            castShadow
          />
        </group>
      )}

      {/* Interaction Highlight Ring */}
      <PitHighlight
        isSelectable={pitState.isSelectable}
        isActiveDrop={pitState.isActiveDrop}
        isContinuationTarget={pitState.isContinuationTarget}
        isCaptureTarget={pitState.isCaptureTarget}
        isBonusAvailable={hasBonus}
        isHovered={isHovered && canActPrimary}
        holdProgress={holdProgress}
      />

      {/* Seeds inside Pit Cavity */}
      {seedTransforms.map((st, idx) => (
        <Seed3D
          key={`pit-${pitState.pitId}-seed-${idx}`}
          position={st.position}
          rotation={st.rotation}
          scale={st.scale}
          variant={st.variant}
          toneIndex={st.toneIndex}
          castShadow={idx < 8}
        />
      ))}

      {/* Click / Pointer / Hold / Right-Click Target Mesh */}
      <mesh
        name={`pit-${pitState.pitId}-hitbox`}
        geometry={geometries.clickTargetGeometry}
        visible={false}
        onClick={handleClick}
        onContextMenu={handleContextMenu}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onPointerOver={handlePointerOver}
        onPointerOut={handlePointerOut}
      />
    </group>
  );
});
