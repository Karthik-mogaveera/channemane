/**
 * Scene Environment & Contact Shadow Grounding
 * Builds an offline procedural RoomEnvironment PMREM map for natural satin wood and brass
 * reflections, configures anisotropy on board textures, and places a soft contact shadow
 * directly beneath the board plinth over the Stage 1 warm ivory backdrop.
 */

import React, { useEffect, useMemo } from "react";
import * as THREE from "three";
import { useThree } from "@react-three/fiber";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import {
  getBoardVisualConfig,
  type SupportedPlayerCount,
} from "../config/boardVisualConfigs";
import { BoardMaterialsManager } from "../board/BoardMaterials";
import { CARVED_BOARD_METRICS } from "../board/boardGeometryUtils";

function createContactShadowTexture(): THREE.CanvasTexture | null {
  if (typeof document === "undefined") return null;

  const w = 512;
  const h = 256;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  ctx.clearRect(0, 0, w, h);

  // Outer warm ambient occlusion falloff
  ctx.save();
  ctx.translate(w / 2, h / 2);
  ctx.scale(1.0, 0.44);
  const outerGrad = ctx.createRadialGradient(0, 0, w * 0.18, 0, 0, w * 0.49);
  outerGrad.addColorStop(0, "rgba(44, 34, 26, 0.34)");
  outerGrad.addColorStop(0.55, "rgba(44, 34, 26, 0.20)");
  outerGrad.addColorStop(0.82, "rgba(44, 34, 26, 0.06)");
  outerGrad.addColorStop(1, "rgba(44, 34, 26, 0.0)");
  ctx.fillStyle = outerGrad;
  ctx.beginPath();
  ctx.arc(0, 0, w * 0.49, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Tighter soft occlusion directly beneath the walnut plinth footprint
  const rx = w * 0.39;
  const ry = h * 0.31;
  ctx.save();
  ctx.filter = "blur(12px)";
  ctx.fillStyle = "rgba(38, 26, 17, 0.40)";
  ctx.beginPath();
  if (typeof ctx.roundRect === "function") {
    ctx.roundRect(w / 2 - rx, h / 2 - ry, rx * 2, ry * 2, 28);
  } else {
    ctx.rect(w / 2 - rx, h / 2 - ry, rx * 2, ry * 2);
  }
  ctx.fill();
  ctx.restore();

  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  return tex;
}

export interface SceneEnvironmentProps {
  playerCount?: SupportedPlayerCount;
}

export const SceneEnvironment: React.FC<SceneEnvironmentProps> = ({ playerCount = 2 }) => {
  const { scene, gl } = useThree();
  const cfg = useMemo(() => getBoardVisualConfig(playerCount), [playerCount]);

  useEffect(() => {
    BoardMaterialsManager.getInstance().applyMaxAnisotropy(gl.capabilities.getMaxAnisotropy());

    const pmrem = new THREE.PMREMGenerator(gl);
    const roomEnv = new RoomEnvironment();
    const envTarget = pmrem.fromScene(roomEnv, 0.04);
    const prevEnv = scene.environment;
    scene.environment = envTarget.texture;

    return () => {
      scene.environment = prevEnv;
      roomEnv.dispose();
      pmrem.dispose();
      envTarget.dispose();
    };
  }, [scene, gl]);

  const contactTexture = useMemo(() => createContactShadowTexture(), []);

  useEffect(() => {
    return () => {
      contactTexture?.dispose();
    };
  }, [contactTexture]);

  const floorY = CARVED_BOARD_METRICS.plinthBottomY - 0.008;

  return (
    <group name="scene-environment">
      {/* Ground directional shadow receiver aligned directly beneath the plinth */}
      <mesh position={[0, floorY - 0.004, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[Math.max(42, cfg.width * 2.2), Math.max(28, cfg.depth * 2.8)]} />
        <shadowMaterial opacity={0.28} />
      </mesh>

      {/* Soft contact shadow footprint */}
      {contactTexture && (
        <mesh position={[0, floorY, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry
            args={[cfg.width * 1.18, cfg.depth * 1.44]}
          />
          <meshBasicMaterial
            map={contactTexture}
            transparent
            opacity={0.82}
            depthWrite={false}
            polygonOffset
            polygonOffsetFactor={-1}
            polygonOffsetUnits={-1}
          />
        </mesh>
      )}
    </group>
  );
};
