/**
 * Fixed Angled Perspective Camera
 * - Fixed angled perspective showing all 14 pits and both storage bowls.
 * - Shows depth of recessed cavities.
 * - Responsive distance based on viewport aspect ratio (desktop and mobile landscape).
 * - Controlled zoom only (min/max distance); no unrestricted rotation.
 */

import React, { useEffect, useRef } from "react";
import { useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import {
  getBoardVisualConfig,
  type SupportedPlayerCount,
} from "../config/boardVisualConfigs";

export interface BoardCameraProps {
  playerCount?: SupportedPlayerCount;
}

export const BoardCamera: React.FC<BoardCameraProps> = ({ playerCount = 2 }) => {
  const { camera, size } = useThree();
  const controlsRef = useRef<OrbitControlsImpl>(null);

  // Responsive camera framing fitted cleanly for 2P-6P boards while preserving 2P Stage 2 framing
  useEffect(() => {
    const aspect = size.width / Math.max(1, size.height);
    const cfg = getBoardVisualConfig(playerCount);

    let targetDist: number;
    if (playerCount === 2) {
      targetDist = 12.0;
      if (aspect < 1.7) {
        targetDist = 14.5;
      } else if (aspect < 2.0) {
        targetDist = 13.0;
      }
    } else {
      const widthScale = cfg.width / 18.2;
      const depthFactor = playerCount >= 5 ? 1.54 : playerCount === 4 ? 1.32 : 1.24;
      const aspectBoost = aspect < 1.7 ? 1.2 : aspect < 2.0 ? 1.08 : 1.0;
      targetDist = 12.0 * Math.max(widthScale, depthFactor) * aspectBoost;
    }

    const angle = Math.PI / 4.2; // ~43 degrees elevation
    const y = targetDist * Math.sin(angle);
    const z = targetDist * Math.cos(angle);

    camera.position.set(0, y, z);
    camera.lookAt(0, 0, 0);
    camera.updateProjectionMatrix();

    if (controlsRef.current) {
      controlsRef.current.target.set(0, 0, 0);
      controlsRef.current.update();
    }
  }, [camera, size.width, size.height, playerCount]);

  const maxDist = playerCount >= 5 ? 27.0 : playerCount >= 3 ? 22.0 : 18.0;

  return (
    <OrbitControls
      ref={controlsRef}
      enableRotate={false} // NO unrestricted rotation
      enablePan={false}    // Board remains visually centered
      enableZoom={true}   // Controlled zoom only
      minDistance={7.5}
      maxDistance={maxDist}
    />
  );
};
