/**
 * Player Storage Bowl 3D Component
 * Renders the recessed carved walnut accumulation tray for Player 1 (left) and Player 2 (right),
 * matching the main slab walnut grain cleanly with subtle antique brass trim.
 */

import React, { useEffect, useMemo } from "react";
import * as THREE from "three";
import {
  BOARD_DIMENSIONS,
  getBoardVisualConfig,
  getStorageWorldPosition,
  type SupportedPlayerCount,
} from "../config/boardVisualConfigs";
import { BoardMaterialsManager } from "../board/BoardMaterials";
import {
  CARVED_BOARD_METRICS,
  computeBoardPlanarUV,
  sampleRoundedRectLoop,
} from "../board/boardGeometryUtils";
import { Seed3D } from "../seeds/Seed3D";
import { getStorageSeedPositions3D } from "../seeds/SeedLayout";
import type { VisualStorageState } from "../../adapters/engineToVisualState";

export interface PlayerStorage3DProps {
  storageState: VisualStorageState;
  playerCount?: SupportedPlayerCount;
  seedCountOverride?: number;
}

interface TrayStation {
  inset: number;
  y: number;
  ny: number;
  nin: number;
  tint: THREE.Color;
}

function buildStorageTrayProfile(): TrayStation[] {
  const {
    topY,
    storageLipRadius,
    storageWallInset,
    storageBottomCoveRadius,
    storageFloorY,
  } = CARVED_BOARD_METRICS;

  const rimColor = new THREE.Color(1.0, 1.0, 1.0);
  const carvedColor = new THREE.Color(0.74, 0.69, 0.66);
  const floorAoColor = new THREE.Color(0.56, 0.51, 0.48);

  const stations: TrayStation[] = [];

  // 1. Rounded lip fillet transitioning smoothly from top deck
  const lipSegs = 6;
  for (let i = 0; i <= lipSegs; i++) {
    const t = i / lipSegs;
    const angle = t * (Math.PI * 0.44);
    const inset = storageLipRadius * (1 - Math.cos(angle));
    const y = topY - storageLipRadius * Math.sin(angle);
    stations.push({
      inset,
      y,
      ny: Math.cos(angle),
      nin: Math.sin(angle),
      tint: rimColor.clone().lerp(carvedColor, Math.pow(t, 1.2) * 0.65),
    });
  }

  // 2. Gently sloped carved wall descending to bottom cove
  const wallStartInset = stations[stations.length - 1].inset;
  const wallStartY = stations[stations.length - 1].y;
  const coveStartY = storageFloorY + storageBottomCoveRadius;

  const wallSegs = 3;
  for (let i = 1; i <= wallSegs; i++) {
    const t = i / wallSegs;
    const inset = wallStartInset + storageWallInset * t;
    const y = wallStartY + (coveStartY - wallStartY) * t;
    const slopeAngle = Math.atan2(storageWallInset, Math.max(0.01, wallStartY - coveStartY));
    stations.push({
      inset,
      y,
      ny: Math.sin(slopeAngle),
      nin: Math.cos(slopeAngle),
      tint: rimColor.clone().lerp(carvedColor, 0.65 + t * 0.35),
    });
  }

  // 3. Smooth concave bottom cove curving into flat storage dish floor
  const coveBaseInset = wallStartInset + storageWallInset;
  const coveSegs = 6;
  for (let i = 1; i <= coveSegs; i++) {
    const t = i / coveSegs;
    const angle = t * (Math.PI / 2);
    const inset = coveBaseInset + storageBottomCoveRadius * (1 - Math.cos(angle));
    const y = storageFloorY + storageBottomCoveRadius * (1 - Math.sin(angle));
    stations.push({
      inset,
      y,
      ny: Math.sin(angle),
      nin: Math.cos(angle),
      tint: carvedColor.clone().lerp(floorAoColor, Math.pow(t, 1.1) * 0.78),
    });
  }

  const last = stations[stations.length - 1];
  last.y = storageFloorY;
  last.ny = 1;
  last.nin = 0;

  return stations;
}

function computeInwardNormals(loop: Array<{ x: number; z: number }>): Array<{ nx: number; nz: number }> {
  const n = loop.length;
  const normals: Array<{ nx: number; nz: number }> = [];
  for (let i = 0; i < n; i++) {
    const prev = loop[(i - 1 + n) % n];
    const next = loop[(i + 1) % n];
    const tx = next.x - prev.x;
    const tz = next.z - prev.z;
    let nx = -tz;
    let nz = tx;
    const len = Math.hypot(nx, nz) || 1;
    nx /= len;
    nz /= len;

    // Orient toward local tray center (0, 0)
    if (nx * -loop[i].x + nz * -loop[i].z < 0) {
      nx = -nx;
      nz = -nz;
    }
    normals.push({ nx, nz });
  }
  return normals;
}

function createRecessedStorageGeometry(
  worldX: number,
  worldZ: number,
  halfW: number,
  halfL: number,
  cornerRadius: number,
  boardWidth: number,
  boardDepth: number
): THREE.BufferGeometry {
  const { storageFloorY, storageCornerSegments } = CARVED_BOARD_METRICS;

  const profile = buildStorageTrayProfile();
  const ringCount = profile.length;

  const baseLoop2D = sampleRoundedRectLoop(
    0,
    0,
    halfW,
    halfL,
    cornerRadius,
    storageCornerSegments,
    true
  );
  const baseLoop = baseLoop2D.map((p) => ({ x: p.x, z: -p.y }));
  const n = baseLoop.length;

  const rings: Array<Array<{ x: number; z: number }>> = [];
  const ringNormals: Array<Array<{ nx: number; nz: number }>> = [];

  for (let r = 0; r < ringCount; r++) {
    const inset = profile[r].inset;
    const rLoop2D = sampleRoundedRectLoop(
      0,
      0,
      Math.max(0.08, halfW - inset),
      Math.max(0.08, halfL - inset),
      Math.max(0.06, cornerRadius - inset),
      storageCornerSegments,
      true
    );
    const worldLoop = rLoop2D.map((p) => ({ x: p.x, z: -p.y }));
    rings.push(worldLoop);
    ringNormals.push(computeInwardNormals(worldLoop));
  }

  const allPositions: number[] = [];
  const allNormals: number[] = [];
  const allUvs: number[] = [];
  const allColors: number[] = [];
  const allIndices: number[] = [];

  for (let r = 0; r < ringCount; r++) {
    const st = profile[r];
    const ringPts = rings[r];
    const nPts = ringNormals[r];
    for (let i = 0; i < n; i++) {
      const pt = ringPts[i];
      const inward = nPts[i];
      allPositions.push(pt.x, st.y, pt.z);
      allNormals.push(inward.nx * st.nin, st.ny, inward.nz * st.nin);

      const [u, v] = computeBoardPlanarUV(
        worldX + pt.x,
        worldZ + pt.z,
        boardWidth,
        boardDepth
      );
      allUvs.push(u, v);
      allColors.push(st.tint.r, st.tint.g, st.tint.b);
    }
  }

  const p0 = baseLoop[0];
  const p1 = baseLoop[1];
  const crossY = p0.x * p1.z - p0.z * p1.x;

  for (let r = 0; r < ringCount - 1; r++) {
    for (let i = 0; i < n; i++) {
      const next = (i + 1) % n;
      const a = r * n + i;
      const b = r * n + next;
      const c = (r + 1) * n + i;
      const d = (r + 1) * n + next;

      if (crossY >= 0) {
        allIndices.push(a, c, b);
        allIndices.push(b, c, d);
      } else {
        allIndices.push(a, b, c);
        allIndices.push(b, d, c);
      }
    }
  }

  const centerIdx = allPositions.length / 3;
  const floorCenterTint = new THREE.Color(0.71, 0.66, 0.63);
  allPositions.push(0, storageFloorY, 0);
  allNormals.push(0, 1, 0);
  const [cu, cv] = computeBoardPlanarUV(worldX, worldZ, boardWidth, boardDepth);
  allUvs.push(cu, cv);
  allColors.push(floorCenterTint.r, floorCenterTint.g, floorCenterTint.b);

  const lastRingOffset = (ringCount - 1) * n;
  for (let i = 0; i < n; i++) {
    const next = (i + 1) % n;
    if (crossY >= 0) {
      allIndices.push(lastRingOffset + i, centerIdx, lastRingOffset + next);
    } else {
      allIndices.push(lastRingOffset + i, lastRingOffset + next, centerIdx);
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(allPositions, 3));
  geometry.setAttribute("normal", new THREE.Float32BufferAttribute(allNormals, 3));
  geometry.setAttribute("uv", new THREE.Float32BufferAttribute(allUvs, 2));
  geometry.setAttribute("color", new THREE.Float32BufferAttribute(allColors, 3));
  geometry.setIndex(allIndices);
  geometry.computeBoundingSphere();
  return geometry;
}

function createStorageTrimCollarGeometry(
  halfW: number,
  halfL: number,
  cornerRadius: number
): THREE.BufferGeometry {
  const { storageCornerSegments } = CARVED_BOARD_METRICS;
  const trimMargin = 0.032;
  const trimWidth = 0.022;

  const outerPts = sampleRoundedRectLoop(
    0,
    0,
    halfW + trimMargin + trimWidth,
    halfL + trimMargin + trimWidth,
    cornerRadius + trimMargin + trimWidth,
    storageCornerSegments,
    false
  );
  const innerPts = sampleRoundedRectLoop(
    0,
    0,
    halfW + trimMargin,
    halfL + trimMargin,
    cornerRadius + trimMargin,
    storageCornerSegments,
    true
  );

  const shape = new THREE.Shape();
  shape.moveTo(outerPts[0].x, outerPts[0].y);
  for (let i = 1; i < outerPts.length; i++) shape.lineTo(outerPts[i].x, outerPts[i].y);
  shape.closePath();

  const hole = new THREE.Path();
  hole.moveTo(innerPts[0].x, innerPts[0].y);
  for (let i = 1; i < innerPts.length; i++) hole.lineTo(innerPts[i].x, innerPts[i].y);
  hole.closePath();
  shape.holes.push(hole);

  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: 0.006,
    bevelEnabled: true,
    bevelThickness: 0.0012,
    bevelSize: 0.0014,
    bevelSegments: 2,
    curveSegments: storageCornerSegments,
  });
  geo.rotateX(-Math.PI / 2);
  geo.translate(0, -0.002, 0);
  geo.computeVertexNormals();
  return geo;
}

function createDisqualifiedCoverGeometry(
  halfW: number,
  halfL: number,
  cornerRadius: number
): THREE.BufferGeometry {
  const { storageCornerSegments } = CARVED_BOARD_METRICS;
  const lidHalfW = Math.max(0.2, halfW - 0.06);
  const lidHalfL = Math.max(0.2, halfL - 0.06);
  const lidCornerR = Math.max(0.08, Math.min(cornerRadius - 0.05, Math.min(lidHalfW, lidHalfL) * 0.9));
  const pts = sampleRoundedRectLoop(0, 0, lidHalfW, lidHalfL, lidCornerR, storageCornerSegments, false);
  const shape = new THREE.Shape();
  shape.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i++) shape.lineTo(pts[i].x, pts[i].y);
  shape.closePath();

  const lid = new THREE.ExtrudeGeometry(shape, {
    depth: 0.05,
    bevelEnabled: true,
    bevelThickness: 0.008,
    bevelSize: 0.01,
    bevelSegments: 2,
    curveSegments: storageCornerSegments,
  });
  lid.rotateX(-Math.PI / 2);
  lid.translate(0, -0.06, 0);
  lid.computeVertexNormals();
  return lid;
}

export const PlayerStorage3D: React.FC<PlayerStorage3DProps> = React.memo(({
  storageState,
  playerCount = 2,
  seedCountOverride,
}) => {
  const materials = useMemo(() => BoardMaterialsManager.getInstance(), []);
  const cfg = useMemo(() => getBoardVisualConfig(playerCount), [playerCount]);
  const storageSpec = cfg.storages[storageState.player];

  const worldPos = useMemo(
    () => getStorageWorldPosition(storageState.player, playerCount),
    [storageState.player, playerCount]
  );

  const dims = useMemo(() => {
    const rawW = storageSpec?.width ?? BOARD_DIMENSIONS.storageWidth;
    const rawL = storageSpec?.length ?? BOARD_DIMENSIONS.storageLength;
    const halfW = rawW / 2 + 0.05;
    const halfL = rawL / 2 + 0.04;
    const cornerRadius = Math.min(
      storageSpec?.cornerRadius ?? CARVED_BOARD_METRICS.storageCornerRadius,
      Math.min(halfW, halfL) * 0.94
    );
    return { rawW, rawL, halfW, halfL, cornerRadius };
  }, [storageSpec]);

  const geometries = useMemo(() => {
    const bowl = createRecessedStorageGeometry(
      worldPos[0],
      worldPos[2],
      dims.halfW,
      dims.halfL,
      dims.cornerRadius,
      cfg.width,
      cfg.depth
    );
    const trim = createStorageTrimCollarGeometry(dims.halfW, dims.halfL, dims.cornerRadius);
    const coverLid = createDisqualifiedCoverGeometry(dims.halfW, dims.halfL, dims.cornerRadius);
    const coverFinial = new THREE.SphereGeometry(0.085, 16, 12);
    coverFinial.scale(1, 0.65, 1);
    return { bowl, trim, coverLid, coverFinial };
  }, [worldPos, dims, cfg.width, cfg.depth]);

  useEffect(() => {
    return () => {
      geometries.bowl.dispose();
      geometries.trim.dispose();
      geometries.coverLid.dispose();
      geometries.coverFinial.dispose();
    };
  }, [geometries]);

  const visibleSeedCount = Math.max(0, seedCountOverride ?? storageState.seeds);

  // Convert authoritative world-space storage seed coordinates to tray-local space
  const seedTransforms = useMemo(() => {
    const worldTransforms = getStorageSeedPositions3D(visibleSeedCount, worldPos, {
      width: dims.rawW,
      length: dims.rawL,
    });
    return worldTransforms.map((st) => ({
      ...st,
      position: [
        st.position[0] - worldPos[0],
        st.position[1] - worldPos[1],
        st.position[2] - worldPos[2],
      ] as [number, number, number],
    }));
  }, [visibleSeedCount, worldPos, dims.rawW, dims.rawL]);

  return (
    <group position={worldPos} name={`storage-${storageState.player}`}>
      {/* Recessed Carved Walnut Accumulation Dish */}
      <mesh
        geometry={geometries.bowl}
        material={storageState.isDisqualified ? materials.closedPitMaterial : materials.cavityMaterial}
        receiveShadow
      />

      {/* Restrained Flush Antique Brass Border Inlay */}
      <mesh
        geometry={geometries.trim}
        material={materials.brassMaterial}
        receiveShadow
      />

      {/* Disqualified Player Smoked-Walnut Seal */}
      {storageState.isDisqualified && (
        <group name={`storage-${storageState.player}-disqualified-cover`}>
          <mesh
            geometry={geometries.coverLid}
            material={materials.closedPitMaterial}
            castShadow
            receiveShadow
          />
          <mesh
            geometry={geometries.coverFinial}
            material={materials.brassMaterial}
            position={[0, 0.005, 0]}
            castShadow
          />
        </group>
      )}

      {/* Captured Seeds inside Tray */}
      {seedTransforms.map((st, idx) => (
        <Seed3D
          key={`storage-${storageState.player}-seed-${idx}`}
          position={st.position}
          rotation={st.rotation}
          scale={st.scale}
          variant={st.variant}
          toneIndex={st.toneIndex}
          castShadow={idx < 8}
        />
      ))}
    </group>
  );
});
