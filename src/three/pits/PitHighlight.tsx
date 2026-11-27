/**
 * Pit Highlight Ring
 * Refined surface indicator hugging the carved walnut rim for selectable, hover,
 * active drop, continuation, capture, and four-seed bonus states.
 */

import React, { useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { CARVED_BOARD_METRICS } from "../board/boardGeometryUtils";

export interface PitHighlightProps {
  isSelectable: boolean;
  isActiveDrop: boolean;
  isContinuationTarget: boolean;
  isCaptureTarget: boolean;
  isBonusAvailable: boolean;
  isHovered: boolean;
  holdProgress?: number;
}

export const PitHighlight: React.FC<PitHighlightProps> = ({
  isSelectable,
  isActiveDrop,
  isContinuationTarget,
  isCaptureTarget,
  isBonusAvailable,
  isHovered,
  holdProgress = 0,
}) => {
  const meshRef = useRef<THREE.Mesh>(null);

  const shouldHighlight =
    isSelectable ||
    isActiveDrop ||
    isContinuationTarget ||
    isCaptureTarget ||
    isBonusAvailable ||
    isHovered ||
    holdProgress > 0;

  const color = useMemo(() => {
    if (isCaptureTarget) return new THREE.Color("#D95D43"); // Warm Crimson for capture
    if (isContinuationTarget) return new THREE.Color("#F5B841"); // Radiant Amber for continuation scoop
    if (isBonusAvailable) return new THREE.Color("#F2C14E"); // Warm Antique Gold for 4-seed bonus
    if (isActiveDrop) return new THREE.Color("#A7B69A"); // Muted Sage for active drop
    if (isHovered) return new THREE.Color("#FFF8EC"); // Warm Ivory glow on hover
    if (isSelectable) return new THREE.Color("#E8C388"); // Soft Warm Wood/Ivory highlight
    return new THREE.Color("#ffffff");
  }, [isCaptureTarget, isBonusAvailable, isContinuationTarget, isActiveDrop, isHovered, isSelectable]);

  useFrame(({ clock }) => {
    if (!meshRef.current || !shouldHighlight) return;
    const t = clock.getElapsedTime();
    const pulse = Math.sin(t * 4.5) * 0.16 + 0.84;
    const material = meshRef.current.material as THREE.MeshBasicMaterial;
    if (material) {
      const baseOpacity =
        isBonusAvailable || isCaptureTarget || isContinuationTarget
          ? 0.9
          : isHovered
            ? 0.88
            : 0.48;
      material.opacity = baseOpacity * pulse;
    }
  });

  if (!shouldHighlight) return null;

  const r = CARVED_BOARD_METRICS.pitRimRadius;

  return (
    <group>
      <mesh
        ref={meshRef}
        position={[0, 0.012, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        renderOrder={2}
      >
        <ringGeometry args={[r - 0.045, r + 0.045, 48]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={0.55}
          depthWrite={false}
          polygonOffset
          polygonOffsetFactor={-2}
          polygonOffsetUnits={-2}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Secondary antique-brass accent inner rim cleanly distinguishing 4-seed claimable bonuses */}
      {isBonusAvailable && !isCaptureTarget && !isContinuationTarget && (
        <mesh
          position={[0, 0.014, 0]}
          rotation={[-Math.PI / 2, 0, 0]}
          renderOrder={2}
        >
          <ringGeometry args={[r - 0.115, r - 0.068, 48]} />
          <meshBasicMaterial
            color="#C9972E"
            transparent
            opacity={0.78}
            depthWrite={false}
            polygonOffset
            polygonOffsetFactor={-2}
            polygonOffsetUnits={-2}
            side={THREE.DoubleSide}
          />
        </mesh>
      )}

      {/* Long-press circular bonus progress ring */}
      {holdProgress > 0 && (
        <mesh
          position={[0, 0.018, 0]}
          rotation={[-Math.PI / 2, 0, Math.PI / 2]}
          renderOrder={3}
        >
          <ringGeometry
            args={[
              r - 0.07,
              r + 0.07,
              48,
              1,
              0,
              Math.max(0.05, Math.min(1, holdProgress)) * Math.PI * 2,
            ]}
          />
          <meshBasicMaterial
            color="#F5B841"
            transparent
            opacity={0.95}
            depthWrite={false}
            polygonOffset
            polygonOffsetFactor={-3}
            polygonOffsetUnits={-3}
            side={THREE.DoubleSide}
          />
        </mesh>
      )}
    </group>
  );
};
