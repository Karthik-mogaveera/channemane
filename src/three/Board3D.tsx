/**
 * 3D Channemane Board View Component
 * Primary React Three Fiber Canvas container.
 * Renders the 2–6 player walnut board, procedural lighting, fixed angled perspective camera,
 * interactive pits (selection, continuation, capture, long-press/right-click bonus),
 * hovering virtual hand seed cluster, and GSAP parabolic flying seeds.
 */

import React, { useMemo, useEffect, useState, useRef, useCallback } from "react";
import { Canvas } from "@react-three/fiber";
import * as THREE from "three";
import { Lighting } from "./scene/Lighting";
import { BoardCamera } from "./scene/BoardCamera";
import { SceneEnvironment } from "./scene/SceneEnvironment";
import { Board } from "./board/Board";
import { Seed3D } from "./seeds/Seed3D";
import {
  mapEngineToVisualState,
  type VisualBoardState,
} from "../adapters/engineToVisualState";
import type { VisualSeedAnimationEvent } from "../adapters/engineToVisualEvents";
import {
  AnimationCoordinator,
  type CoordinatorVisualSnapshot,
} from "./animation/AnimationCoordinator";
import { DEFAULT_GRAPHICS_SETTINGS } from "./config/graphicsSettings";
import type { GameState } from "../engine/types";
import type { InteractionState } from "../ui/hooks/useChannemaneGame";

export interface Board3DProps {
  gameState: GameState;
  authoritativeGameState?: GameState;
  selectablePits: number[];
  activeDropPit: number | null;
  isAnimating: boolean;
  visualEvents?: VisualSeedAnimationEvent[];
  highlightedContinuationPit?: number | null;
  highlightedCapturePit?: number | null;
  claimableBonuses?: number[];
  interactionState?: InteractionState;
  animationSpeed?: "SLOW" | "FAST";
  onSelectPit: (pitId: number) => void;
  onConfirmContinuation?: (pitId: number) => void;
  onConfirmCapture?: (pitId: number) => void;
  onClaimBonus: (pitId: number) => void;
  onVisualSettlementComplete?: () => void;
  className?: string;
}

function checkWebGLSupport(): boolean {
  if (typeof window === "undefined") return true;
  try {
    const canvas = document.createElement("canvas");
    return !!(
      window.WebGLRenderingContext &&
      (canvas.getContext("webgl") || canvas.getContext("experimental-webgl"))
    );
  } catch {
    return false;
  }
}

const EMPTY_SNAPSHOT: CoordinatorVisualSnapshot = {
  flyingSeeds: [],
  handCluster: { visible: false, position: [0, 1.38, 0], seedCount: 0 },
  pitIncomingReserve: {},
  storageIncomingReserve: {},
  pitSeedOverrides: {},
  activeSettlement: false,
  isBusy: false,
};

const HandSeedCluster3D: React.FC<{
  visible: boolean;
  position: [number, number, number];
  seedCount: number;
}> = React.memo(({ visible, position, seedCount }) => {
  const clusterTransforms = useMemo(() => {
    if (!visible || seedCount <= 0) return [];
    const shown = Math.min(seedCount, 10);
    const items: Array<{
      position: [number, number, number];
      rotation: [number, number, number];
      scale: [number, number, number];
      variant: "light" | "dark";
      toneIndex: number;
    }> = [];
    for (let i = 0; i < shown; i++) {
      if (i === 0) {
        items.push({
          position: [0, 0, 0],
          rotation: [0.15, 0.4, 0.08],
          scale: [0.92, 0.92, 0.92],
          variant: "light",
          toneIndex: 0,
        });
      } else {
        const ringIdx = i - 1;
        const ringCount = Math.min(9, shown - 1);
        const angle = (ringIdx / Math.max(1, ringCount)) * Math.PI * 2;
        const radius = i > 6 ? 0.28 : 0.19;
        const yOff = i > 6 ? 0.08 : -0.02;
        items.push({
          position: [Math.cos(angle) * radius, yOff, Math.sin(angle) * radius],
          rotation: [0.22 * Math.sin(angle), angle, 0.18 * Math.cos(angle)],
          scale: [0.9, 0.9, 0.9],
          variant: i % 2 === 0 ? "light" : "dark",
          toneIndex: i % 3,
        });
      }
    }
    return items;
  }, [visible, seedCount]);

  if (!visible || seedCount <= 0) return null;

  return (
    <group position={position} name="virtual-hand-seed-cluster">
      {clusterTransforms.map((seed, idx) => (
        <Seed3D
          key={`hand-seed-${idx}`}
          position={seed.position}
          rotation={seed.rotation}
          scale={seed.scale}
          variant={seed.variant}
          toneIndex={seed.toneIndex}
          castShadow
        />
      ))}
    </group>
  );
});

export const Board3D: React.FC<Board3DProps> = ({
  gameState,
  authoritativeGameState,
  selectablePits,
  activeDropPit,
  isAnimating,
  visualEvents = [],
  highlightedContinuationPit = null,
  highlightedCapturePit = null,
  claimableBonuses = [],
  interactionState = "WAITING_FOR_START",
  animationSpeed = "FAST",
  onSelectPit,
  onConfirmContinuation,
  onConfirmCapture,
  onClaimBonus,
  onVisualSettlementComplete,
  className = "",
}) => {
  const [hasWebGL, setHasWebGL] = useState<boolean>(true);
  const [contextLost, setContextLost] = useState<boolean>(false);
  const [snapshot, setSnapshot] = useState<CoordinatorVisualSnapshot>(EMPTY_SNAPSHOT);
  const canvasElRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    setHasWebGL(checkWebGLSupport());
  }, []);

  const coordinator = useMemo(() => new AnimationCoordinator(), []);

  useEffect(() => {
    coordinator.setSpeed(animationSpeed);
  }, [coordinator, animationSpeed]);

  useEffect(() => {
    const unsub = coordinator.subscribeSnapshot(setSnapshot);
    return () => {
      unsub();
      coordinator.dispose();
    };
  }, [coordinator]);

  // Translate engine state into authoritative visual state (2–6 players)
  const visualState: VisualBoardState = useMemo(() => {
    return mapEngineToVisualState({
      gameState,
      selectablePits,
      claimableBonuses,
      activeDropPit,
      highlightedContinuationPit,
      highlightedCapturePit,
      interactionState,
      isAnimating,
    });
  }, [
    gameState,
    selectablePits,
    claimableBonuses,
    activeDropPit,
    highlightedContinuationPit,
    highlightedCapturePit,
    interactionState,
    isAnimating,
  ]);

  // Feed ordered visual animation events to the GSAP coordinator
  const settlementCompleteRef = useRef(onVisualSettlementComplete);
  settlementCompleteRef.current = onVisualSettlementComplete;

  useEffect(() => {
    if (visualEvents.length === 0) return;
    coordinator.enqueueEvents(visualEvents, {
      playerCount: visualState.playerCount,
      onSettlementComplete: () => {
        settlementCompleteRef.current?.();
      },
    });
  }, [visualEvents, visualState.playerCount, coordinator]);

  // Reconcile when all animation turns finish and no settlement/flight timeline owns state
  useEffect(() => {
    if (!isAnimating && !snapshot.activeSettlement && authoritativeGameState && visualEvents.length === 0) {
      coordinator.cancelAndReconcile(authoritativeGameState);
    }
  }, [isAnimating, snapshot.activeSettlement, authoritativeGameState, visualEvents.length, coordinator]);

  const handleContextLost = useCallback((event: Event) => {
    event.preventDefault();
    setContextLost(true);
    coordinator.cancelAndReconcile(authoritativeGameState);
  }, [coordinator, authoritativeGameState]);

  const handleContextRestored = useCallback(() => {
    setContextLost(false);
  }, []);

  useEffect(() => {
    return () => {
      const el = canvasElRef.current;
      if (el) {
        el.removeEventListener("webglcontextlost", handleContextLost);
        el.removeEventListener("webglcontextrestored", handleContextRestored);
      }
    };
  }, [handleContextLost, handleContextRestored]);

  const isAITurn =
    gameState.gameMode === "ai" &&
    gameState.currentPlayer === (gameState.aiPlayer ?? "PLAYER_2");

  const isInteractable =
    !isAnimating &&
    !snapshot.activeSettlement &&
    !isAITurn &&
    (interactionState === "WAITING_FOR_START" ||
      interactionState === "WAITING_FOR_CONTINUATION" ||
      interactionState === "WAITING_FOR_CAPTURE");

  const isBonusInteractable =
    !snapshot.activeSettlement &&
    !isAITurn &&
    interactionState !== "ROUND_SETTLEMENT" &&
    interactionState !== "MATCH_COMPLETE";

  if (!hasWebGL || contextLost) {
    return (
      <div className="webgl-fallback-container" data-testid="webgl-fallback">
        <h3 className="webgl-fallback-title">
          {contextLost ? "3D Graphics Context Interrupted" : "3D Acceleration Unavailable"}
        </h3>
        <p className="webgl-fallback-desc">
          {contextLost
            ? "The WebGL graphics context was interrupted. Switch to 2D View or reload to continue seamlessly."
            : "Your device or browser does not currently support WebGL rendering. Please switch to the 2D board view for a fully animated experience."}
        </p>
      </div>
    );
  }

  return (
    <div
      className={`board-3d-viewport relative w-full h-full min-h-[420px] select-none ${className}`}
      data-testid="channemane-board-3d"
    >
      <Canvas
        camera={{ position: [0, 12, 10], fov: 38 }}
        gl={{
          antialias: DEFAULT_GRAPHICS_SETTINGS.antialias,
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: DEFAULT_GRAPHICS_SETTINGS.toneMappingExposure,
          powerPreference: "high-performance",
        }}
        dpr={[1, DEFAULT_GRAPHICS_SETTINGS.maxPixelRatio]}
        shadows={DEFAULT_GRAPHICS_SETTINGS.shadows ? "soft" : false}
        onCreated={({ gl }) => {
          const dom = gl.domElement;
          canvasElRef.current = dom;
          dom.addEventListener("webglcontextlost", handleContextLost, false);
          dom.addEventListener("webglcontextrestored", handleContextRestored, false);
        }}
      >
        {/* Fixed Angled Perspective Camera with Controlled Zoom */}
        <BoardCamera playerCount={visualState.playerCount} />

        {/* Studio Natural Wood Lighting */}
        <Lighting playerCount={visualState.playerCount} />

        {/* Scene Environment & Contact Shadow */}
        <SceneEnvironment playerCount={visualState.playerCount} />

        {/* Procedural 3D Board, Pits, and Storage Trays */}
        <Board
          visualState={visualState}
          pitIncomingReserve={snapshot.pitIncomingReserve}
          pitSeedOverrides={snapshot.pitSeedOverrides}
          storageIncomingReserve={snapshot.storageIncomingReserve}
          onSelectPit={onSelectPit}
          onConfirmContinuation={onConfirmContinuation}
          onConfirmCapture={onConfirmCapture}
          onClaimBonus={onClaimBonus}
          isInteractable={isInteractable}
          isBonusInteractable={isBonusInteractable}
        />

        {/* Hovering Hand Seed Cluster */}
        <HandSeedCluster3D
          visible={snapshot.handCluster.visible}
          position={snapshot.handCluster.position}
          seedCount={snapshot.handCluster.seedCount}
        />

        {/* Animated Parabolic Flying Seeds Layer */}
        {snapshot.flyingSeeds.map((seed, idx) => {
          const hash = seed.id.charCodeAt(seed.id.length - 1) + idx;
          return (
            <Seed3D
              key={seed.id}
              position={seed.position}
              rotation={seed.rotation}
              scale={seed.scale}
              variant={seed.variant ?? (hash % 2 === 0 ? "light" : "dark")}
              toneIndex={seed.toneIndex ?? (hash % 3)}
              castShadow
            />
          );
        })}
      </Canvas>
    </div>
  );
};
