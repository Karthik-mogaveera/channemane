/**
 * Procedural Sculpted Walnut Board Base
 * Constructs the carved top deck (with 14 pit cutouts and 2 storage cutouts),
 * smooth bevelled outer slab shell, recessed furniture plinth base,
 * and flush warm ivory, sandstone, sage, and antique brass marquetry inlays.
 */

import React, { useEffect, useMemo } from "react";
import * as THREE from "three";
import {
  getBoardVisualConfig,
  type BoardVisualConfig,
  type SupportedPlayerCount,
} from "../config/boardVisualConfigs";
import { BoardMaterialsManager } from "./BoardMaterials";
import {
  CARVED_BOARD_METRICS,
  computeBoardPlanarUV,
  sampleCircleLoop,
  sampleOuterPerimeterWithNormals,
  sampleRoundedRectLoop,
} from "./boardGeometryUtils";

function createTopDeckGeometry(cfg: BoardVisualConfig): THREE.BufferGeometry {
  const halfW = cfg.width / 2;
  const halfD = cfg.depth / 2;
  const cornerR = cfg.cornerRadius;
  const {
    topBevelRadius,
    topY,
    pitRimRadius,
    pitRadialSegments,
    storageCornerSegments,
  } = CARVED_BOARD_METRICS;

  const deckHalfW = halfW - topBevelRadius;
  const deckHalfD = halfD - topBevelRadius;
  const deckCornerR = cornerR - topBevelRadius;

  const outerXZ = sampleOuterPerimeterWithNormals(deckHalfW, deckHalfD, deckCornerR, 16);

  // Reverse clockwise XZ to build a strict CCW 2D contour in (x, -z) for clean Shape holes
  const shape = new THREE.Shape();
  const lastIdx = outerXZ.length - 1;
  shape.moveTo(outerXZ[lastIdx].x, -outerXZ[lastIdx].z);
  for (let i = lastIdx - 1; i >= 0; i--) {
    shape.lineTo(outerXZ[i].x, -outerXZ[i].z);
  }
  shape.closePath();

  // Add circular pit holes matching PitGeometry top rim radius
  for (const pitId of cfg.pitIds) {
    const coord = cfg.pits[pitId];
    if (!coord) continue;
    const [px, , pz] = coord.position;
    const loop = sampleCircleLoop(px, -pz, pitRimRadius, pitRadialSegments, true);
    const hole = new THREE.Path();
    hole.moveTo(loop[0].x, loop[0].y);
    for (let i = 1; i < loop.length; i++) {
      hole.lineTo(loop[i].x, loop[i].y);
    }
    hole.closePath();
    shape.holes.push(hole);
  }

  // Add rounded storage tray cutouts for all active players
  for (const storage of cfg.storageList) {
    const [sx, , sz] = storage.position;
    const halfTrayW = storage.width / 2 + 0.05;
    const halfTrayL = storage.length / 2 + 0.04;
    const trayCornerR = Math.min(storage.cornerRadius, Math.min(halfTrayW, halfTrayL) * 0.94);
    const loop = sampleRoundedRectLoop(
      sx,
      -sz,
      halfTrayW,
      halfTrayL,
      trayCornerR,
      storageCornerSegments,
      true
    );
    const hole = new THREE.Path();
    hole.moveTo(loop[0].x, loop[0].y);
    for (let i = 1; i < loop.length; i++) {
      hole.lineTo(loop[i].x, loop[i].y);
    }
    hole.closePath();
    shape.holes.push(hole);
  }

  const geometry = new THREE.ShapeGeometry(shape, 1);
  geometry.rotateX(-Math.PI / 2);
  geometry.translate(0, topY, 0);

  const pos = geometry.attributes.position;
  const uvs = new Float32Array(pos.count * 2);
  const normals = new Float32Array(pos.count * 3);

  for (let i = 0; i < pos.count; i++) {
    const [u, v] = computeBoardPlanarUV(pos.getX(i), pos.getZ(i), cfg.width, cfg.depth);
    uvs[i * 2] = u;
    uvs[i * 2 + 1] = v;

    normals[i * 3] = 0;
    normals[i * 3 + 1] = 1;
    normals[i * 3 + 2] = 0;
  }

  geometry.setAttribute("uv", new THREE.BufferAttribute(uvs, 2));
  geometry.setAttribute("normal", new THREE.BufferAttribute(normals, 3));
  geometry.computeBoundingSphere();
  return geometry;
}

function createOuterShellGeometry(cfg: BoardVisualConfig): THREE.BufferGeometry {
  const halfW = cfg.width / 2;
  const halfD = cfg.depth / 2;
  const cornerR = cfg.cornerRadius;
  const { topBevelRadius, bottomChamfer, topY, slabBottomY } = CARVED_BOARD_METRICS;

  const deckHalfW = halfW - topBevelRadius;
  const deckHalfD = halfD - topBevelRadius;
  const deckCornerR = cornerR - topBevelRadius;

  const perimeter = sampleOuterPerimeterWithNormals(deckHalfW, deckHalfD, deckCornerR, 16);
  const n = perimeter.length;

  interface ProfileStation {
    offset: number;
    y: number;
    ny: number;
    nr: number;
    vCoord: number;
  }

  const stations: ProfileStation[] = [];
  const topBevelSegs = 8;
  for (let i = 0; i <= topBevelSegs; i++) {
    const theta = (i / topBevelSegs) * (Math.PI / 2);
    const offset = topBevelRadius * Math.sin(theta);
    const y = topY - topBevelRadius + topBevelRadius * Math.cos(theta);
    stations.push({
      offset,
      y,
      ny: Math.cos(theta),
      nr: Math.sin(theta),
      vCoord: (topY - y) * 0.45,
    });
  }

  const sideTopY = topY - topBevelRadius;
  const sideBottomY = slabBottomY + bottomChamfer;
  const sideMidY = (sideTopY + sideBottomY) * 0.5;
  stations.push({
    offset: topBevelRadius,
    y: sideMidY,
    ny: 0,
    nr: 1,
    vCoord: (topY - sideMidY) * 0.45,
  });

  const botBevelSegs = 4;
  for (let i = 0; i <= botBevelSegs; i++) {
    const theta = (i / botBevelSegs) * (Math.PI / 2);
    const offset = topBevelRadius - bottomChamfer * (1 - Math.cos(theta));
    const y = slabBottomY + bottomChamfer * (1 - Math.sin(theta));
    stations.push({
      offset,
      y,
      ny: -Math.sin(theta),
      nr: Math.cos(theta),
      vCoord: (topY - y) * 0.45,
    });
  }

  const ringCount = stations.length;
  const cols = n + 1;
  const sideVertCount = ringCount * cols;
  const bottomStartIdx = sideVertCount;
  const totalVerts = sideVertCount + 1 + n;

  const positions = new Float32Array(totalVerts * 3);
  const normals = new Float32Array(totalVerts * 3);
  const uvs = new Float32Array(totalVerts * 2);

  const lastSample = perimeter[n - 1];
  const firstSample = perimeter[0];
  const totalPerimLen =
    lastSample.arcLen + Math.hypot(firstSample.x - lastSample.x, firstSample.z - lastSample.z);

  for (let r = 0; r < ringCount; r++) {
    const st = stations[r];
    for (let c = 0; c < cols; c++) {
      const p = perimeter[c % n];
      const idx = r * cols + c;
      const x = p.x + p.nx * st.offset;
      const z = p.z + p.nz * st.offset;

      positions[idx * 3] = x;
      positions[idx * 3 + 1] = st.y;
      positions[idx * 3 + 2] = z;

      normals[idx * 3] = p.nx * st.nr;
      normals[idx * 3 + 1] = st.ny;
      normals[idx * 3 + 2] = p.nz * st.nr;

      if (r <= topBevelSegs) {
        const [pu, pv] = computeBoardPlanarUV(x, z, cfg.width, cfg.depth);
        uvs[idx * 2] = pu;
        uvs[idx * 2 + 1] = pv;
      } else {
        const arc = c === n ? totalPerimLen : p.arcLen;
        uvs[idx * 2] = (arc / totalPerimLen) * 2.0;
        uvs[idx * 2 + 1] = st.vCoord + 0.15;
      }
    }
  }

  // Underside cap
  positions[bottomStartIdx * 3] = 0;
  positions[bottomStartIdx * 3 + 1] = slabBottomY;
  positions[bottomStartIdx * 3 + 2] = 0;
  normals[bottomStartIdx * 3] = 0;
  normals[bottomStartIdx * 3 + 1] = -1;
  normals[bottomStartIdx * 3 + 2] = 0;
  uvs[bottomStartIdx * 2] = 0.5;
  uvs[bottomStartIdx * 2 + 1] = 0.5;

  const bottomStation = stations[ringCount - 1];
  for (let i = 0; i < n; i++) {
    const p = perimeter[i];
    const idx = bottomStartIdx + 1 + i;
    const x = p.x + p.nx * bottomStation.offset;
    const z = p.z + p.nz * bottomStation.offset;
    positions[idx * 3] = x;
    positions[idx * 3 + 1] = slabBottomY;
    positions[idx * 3 + 2] = z;
    normals[idx * 3] = 0;
    normals[idx * 3 + 1] = -1;
    normals[idx * 3 + 2] = 0;
    const [pu, pv] = computeBoardPlanarUV(x, z, cfg.width, cfg.depth);
    uvs[idx * 2] = pu;
    uvs[idx * 2 + 1] = pv;
  }

  const indices: number[] = [];
  for (let r = 0; r < ringCount - 1; r++) {
    for (let c = 0; c < n; c++) {
      const a = r * cols + c;
      const b = r * cols + c + 1;
      const d = (r + 1) * cols + c;
      const e = (r + 1) * cols + c + 1;

      indices.push(a, b, d);
      indices.push(b, e, d);
    }
  }

  for (let i = 0; i < n; i++) {
    const next = (i + 1) % n;
    indices.push(bottomStartIdx, bottomStartIdx + 1 + i, bottomStartIdx + 1 + next);
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("normal", new THREE.BufferAttribute(normals, 3));
  geometry.setAttribute("uv", new THREE.BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeBoundingSphere();
  return geometry;
}

function createPlinthGeometry(cfg: BoardVisualConfig): THREE.BufferGeometry {
  const halfW = cfg.width / 2;
  const halfD = cfg.depth / 2;
  const cornerR = cfg.cornerRadius;
  const { plinthInset, slabBottomY, plinthBottomY } = CARVED_BOARD_METRICS;

  const pHalfW = halfW - plinthInset;
  const pHalfD = halfD - plinthInset;
  const pCornerR = Math.max(0.16, cornerR - plinthInset * 0.6);

  const pts = sampleRoundedRectLoop(0, 0, pHalfW, pHalfD, pCornerR, 12, false);
  const shape = new THREE.Shape();
  shape.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i++) {
    shape.lineTo(pts[i].x, pts[i].y);
  }
  shape.closePath();

  const plinthDepth = slabBottomY - plinthBottomY + 0.02;
  const extrude = new THREE.ExtrudeGeometry(shape, {
    depth: plinthDepth,
    bevelEnabled: true,
    bevelThickness: 0.015,
    bevelSize: 0.02,
    bevelSegments: 2,
    curveSegments: 12,
  });
  extrude.rotateX(-Math.PI / 2);
  extrude.translate(0, plinthBottomY + 0.015, 0);
  extrude.computeVertexNormals();
  return extrude;
}

function createFlushInlayBar(length: number, width: number, thickness = 0.008): THREE.BufferGeometry {
  const halfL = length / 2;
  const halfW = width / 2;
  const r = Math.min(halfW * 0.9, 0.025);

  const pts = sampleRoundedRectLoop(0, 0, halfL, halfW, r, 6, false);
  const shape = new THREE.Shape();
  shape.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i++) {
    shape.lineTo(pts[i].x, pts[i].y);
  }
  shape.closePath();

  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: thickness,
    bevelEnabled: true,
    bevelThickness: 0.002,
    bevelSize: 0.0025,
    bevelSegments: 2,
    curveSegments: 6,
  });
  geo.rotateX(-Math.PI / 2);
  geo.computeVertexNormals();
  return geo;
}

function createPlinthBrassCollar(cfg: BoardVisualConfig): THREE.BufferGeometry {
  const halfW = cfg.width / 2;
  const halfD = cfg.depth / 2;
  const cornerR = cfg.cornerRadius;
  const { plinthInset, slabBottomY } = CARVED_BOARD_METRICS;

  const collarHalfW = halfW - plinthInset + 0.025;
  const collarHalfD = halfD - plinthInset + 0.025;
  const collarCornerR = Math.max(0.18, cornerR - plinthInset * 0.6 + 0.02);

  const outerPts = sampleRoundedRectLoop(0, 0, collarHalfW, collarHalfD, collarCornerR, 12, false);
  const innerPts = sampleRoundedRectLoop(
    0,
    0,
    collarHalfW - 0.045,
    collarHalfD - 0.045,
    Math.max(0.12, collarCornerR - 0.045),
    12,
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

  const collarGeo = new THREE.ExtrudeGeometry(shape, {
    depth: 0.032,
    bevelEnabled: false,
    curveSegments: 12,
  });
  collarGeo.rotateX(-Math.PI / 2);
  collarGeo.translate(0, slabBottomY - 0.028, 0);
  collarGeo.computeVertexNormals();
  return collarGeo;
}

export interface BoardBaseProps {
  playerCount?: SupportedPlayerCount;
}

export const BoardBase: React.FC<BoardBaseProps> = ({ playerCount = 2 }) => {
  const materials = useMemo(() => BoardMaterialsManager.getInstance(), []);
  const cfg = useMemo(() => getBoardVisualConfig(playerCount), [playerCount]);

  const geometries = useMemo(() => {
    const topDeck = createTopDeckGeometry(cfg);
    const outerShell = createOuterShellGeometry(cfg);
    const plinth = createPlinthGeometry(cfg);
    const brassCollar = createPlinthBrassCollar(cfg);
    const centerSandstoneBar = createFlushInlayBar(
      playerCount === 2 ? 12.3 : playerCount === 3 ? 8.6 : playerCount === 4 ? 15.2 : 6.0,
      0.08,
      0.006
    );
    const centerBrassBar = createFlushInlayBar(
      playerCount === 2 ? 11.9 : playerCount === 3 ? 8.2 : playerCount === 4 ? 14.8 : 5.6,
      0.026,
      0.0085
    );
    const crossBrassBar = createFlushInlayBar(playerCount === 4 ? 3.5 : 5.8, 0.032, 0.0085);
    const diamondFinial = new THREE.CylinderGeometry(0.055, 0.055, 0.008, 4);
    const sideMarginBar = createFlushInlayBar(11.2, 0.052, 0.0065);
    const alignmentPin = new THREE.CylinderGeometry(0.032, 0.034, 0.008, 20);
    const trayDot = new THREE.CylinderGeometry(0.046, 0.048, 0.008, 24);

    return {
      topDeck,
      outerShell,
      plinth,
      centerSandstoneBar,
      centerBrassBar,
      crossBrassBar,
      diamondFinial,
      sideMarginBar,
      alignmentPin,
      trayDot,
      brassCollar,
    };
  }, [cfg, playerCount]);

  useEffect(() => {
    return () => {
      Object.values(geometries).forEach((g) => g.dispose());
    };
  }, [geometries]);

  const sideMarginZ = 2.155;
  const pinX = 5.75;

  return (
    <group name="board-base">
      {/* Carved Top Deck with Exact Pit & Storage Cutouts */}
      <mesh
        name="board-top-deck"
        geometry={geometries.topDeck}
        material={materials.boardMaterial}
        castShadow
        receiveShadow
      />

      {/* Smooth Bevelled Solid Walnut Outer Shell */}
      <mesh
        name="board-outer-shell"
        geometry={geometries.outerShell}
        material={materials.boardMaterial}
        castShadow
        receiveShadow
      />

      {/* Recessed Heirloom Walnut Plinth Base */}
      <mesh
        name="board-plinth"
        geometry={geometries.plinth}
        material={materials.plinthMaterial}
        castShadow
        receiveShadow
      />

      {/* Flush Marquetry Decorative Inlays */}
      <group name="board-marquetry-inlays">
        {playerCount === 2 ? (
          <>
            {/* Center spine divider (Sandstone + Antique Brass hairline + Warm Ivory finials) */}
            <mesh
              geometry={geometries.centerSandstoneBar}
              material={materials.sandstoneMaterial}
              position={[0, -0.002, 0]}
              receiveShadow
            />
            <mesh
              geometry={geometries.centerBrassBar}
              material={materials.brassMaterial}
              position={[0, -0.002, 0]}
              receiveShadow
            />
            <mesh
              geometry={geometries.diamondFinial}
              material={materials.ivoryMaterial}
              position={[-6.28, 0.001, 0]}
              rotation={[0, Math.PI / 4, 0]}
              receiveShadow
            />
            <mesh
              geometry={geometries.diamondFinial}
              material={materials.ivoryMaterial}
              position={[6.28, 0.001, 0]}
              rotation={[0, Math.PI / 4, 0]}
              receiveShadow
            />

            {/* Player 1 (-Z) outer margin strip in muted Sage */}
            <mesh
              geometry={geometries.sideMarginBar}
              material={materials.sageMaterial}
              position={[0, -0.002, -sideMarginZ]}
              receiveShadow
            />

            {/* Player 2 (+Z) outer margin strip in Warm Ivory */}
            <mesh
              geometry={geometries.sideMarginBar}
              material={materials.ivoryMaterial}
              position={[0, -0.002, sideMarginZ]}
              receiveShadow
            />

            {/* Sandstone end-pins framing both player strips */}
            {([-1, 1] as const).map((sz) =>
              ([-1, 1] as const).map((sx) => (
                <mesh
                  key={`inlay-pin-${sz}-${sx}`}
                  geometry={geometries.alignmentPin}
                  material={materials.sandstoneMaterial}
                  position={[sx * pinX, 0.001, sz * sideMarginZ]}
                  receiveShadow
                />
              ))
            )}

            {/* Discreet dots linking each row to its dedicated outer storage tray */}
            <mesh
              geometry={geometries.trayDot}
              material={materials.sageMaterial}
              position={[-6.78, 0.001, -1.05]}
              receiveShadow
            />
            <mesh
              geometry={geometries.trayDot}
              material={materials.ivoryMaterial}
              position={[6.78, 0.001, 1.05]}
              receiveShadow
            />
          </>
        ) : (
          <>
            {/* Multi-player zone divider inlays tailored so no pit holes are intersected */}
            {playerCount === 3 &&
              ([-1.15, 1.15] as const).map((zPos) => (
                <group key={`mp3-div-${zPos}`} position={[-0.85, -0.002, zPos]}>
                  <mesh
                    geometry={geometries.centerSandstoneBar}
                    material={materials.sandstoneMaterial}
                    receiveShadow
                  />
                  <mesh
                    geometry={geometries.centerBrassBar}
                    material={materials.brassMaterial}
                    receiveShadow
                  />
                </group>
              ))}

            {playerCount === 4 && (
              <>
                <mesh
                  geometry={geometries.centerSandstoneBar}
                  material={materials.sandstoneMaterial}
                  position={[0, -0.002, 0]}
                  receiveShadow
                />
                <mesh
                  geometry={geometries.centerBrassBar}
                  material={materials.brassMaterial}
                  position={[0, -0.002, 0]}
                  receiveShadow
                />
                <mesh
                  geometry={geometries.crossBrassBar}
                  material={materials.brassMaterial}
                  position={[0, -0.002, 0]}
                  rotation={[0, Math.PI / 2, 0]}
                  receiveShadow
                />
                <mesh
                  geometry={geometries.diamondFinial}
                  material={materials.ivoryMaterial}
                  position={[0, 0.001, 0]}
                  rotation={[0, Math.PI / 4, 0]}
                  receiveShadow
                />
              </>
            )}

            {(playerCount === 5 || playerCount === 6) && (
              <>
                <mesh
                  geometry={geometries.crossBrassBar}
                  material={materials.brassMaterial}
                  position={[0, -0.002, 0]}
                  rotation={[0, Math.PI / 2, 0]}
                  receiveShadow
                />
                {([-1.125, 1.125] as const).map((zPos) =>
                  ([playerCount === 6 ? -4.05 : -4.3, playerCount === 6 ? 4.05 : 4.3] as const).map(
                    (xPos) => (
                      <group key={`mp56-div-${zPos}-${xPos}`} position={[xPos, -0.002, zPos]}>
                        <mesh
                          geometry={geometries.centerSandstoneBar}
                          material={materials.sandstoneMaterial}
                          receiveShadow
                        />
                        <mesh
                          geometry={geometries.centerBrassBar}
                          material={materials.brassMaterial}
                          receiveShadow
                        />
                      </group>
                    )
                  )
                )}
                <mesh
                  geometry={geometries.diamondFinial}
                  material={materials.ivoryMaterial}
                  position={[0, 0.001, 0]}
                  rotation={[0, Math.PI / 4, 0]}
                  receiveShadow
                />
              </>
            )}
          </>
        )}

        {/* Restrained Satin Antique Brass reveal trim around plinth junction */}
        <mesh
          geometry={geometries.brassCollar}
          material={materials.brassMaterial}
          receiveShadow
        />
      </group>
    </group>
  );
};
