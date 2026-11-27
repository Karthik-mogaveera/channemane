/**
 * 3D Board Layout & Visual Representation Tests
 * Verifies:
 * - Exactly 14 pits.
 * - Correct two-row arrangement:
 *     Top Row: P0..P6 (Player 1)
 *     Bottom Row: P13..P7 (Player 2)
 * - 70 initial seeds (5 seeds per pit).
 * - Correct player storage mappings.
 * - Seed conservation invariant in visual state.
 */

import * as THREE from "three";
import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { createInitialGame } from "../../src/engine/board";
import {
  mapEngineToVisualState,
  TOP_ROW_PITS,
  BOTTOM_ROW_PITS,
} from "../../src/adapters/engineToVisualState";
import {
  PIT_COORDINATES,
  getBoardVisualConfig,
  getPitWorldPosition,
  getStorageWorldPosition,
  type SupportedPlayerCount,
} from "../../src/three/config/boardVisualConfigs";
import { getPitSeedPositions3D, getStorageSeedPositions3D } from "../../src/three/seeds/SeedLayout";
import { CARVED_BOARD_METRICS } from "../../src/three/board/boardGeometryUtils";
import { PitGeometries } from "../../src/three/pits/PitGeometry";
import {
  CAMERA_FOV_DEG,
  ORBIT_MAX_POLAR_ANGLE,
  ORBIT_MIN_POLAR_ANGLE,
  SIDE_ELEVATION_RAD,
  TOP_VIEW_Z_EPSILON,
  computeCameraTargetDistance,
  getCameraControlConfig,
  getCameraPoseForMode,
  interpolateCameraSpherical,
} from "../../src/three/scene/BoardCamera";

describe("3D Board Layout & Visual Representation Suite", () => {
  it("generates exactly 14 pits in authoritative 2x7 layout with 5 starting seeds each", () => {
    const engineState = createInitialGame("PLAYER_1", "local");
    const visual = mapEngineToVisualState({ gameState: engineState });

    expect(visual.pits).toHaveLength(14);
    expect(TOP_ROW_PITS).toEqual([0, 1, 2, 3, 4, 5, 6]);
    expect(BOTTOM_ROW_PITS).toEqual([13, 12, 11, 10, 9, 8, 7]);

    // Check each pit has 5 starting seeds
    for (const pit of visual.pits) {
      expect(pit.seeds).toBe(5);
      expect(pit.status).toBe("OPEN");
      expect(pit.bonusAvailable).toBe(false);

      if (pit.pitId <= 6) {
        expect(pit.owner).toBe("PLAYER_1");
        expect(pit.row).toBe("top");
        expect(pit.columnIndex).toBe(pit.pitId);
      } else {
        expect(pit.owner).toBe("PLAYER_2");
        expect(pit.row).toBe("bottom");
        expect(pit.columnIndex).toBe(13 - pit.pitId);
      }
    }

    expect(visual.totalBoardSeeds).toBe(70);
    expect(visual.totalStorageSeeds).toBe(0);
    expect(visual.totalVisibleSeeds).toBe(70);
  });

  it("maps distinct 3D coordinates for all 14 pits without overlapping", () => {
    const positions = new Set<string>();

    for (let pitId = 0; pitId < 14; pitId++) {
      const coord = PIT_COORDINATES[pitId];
      expect(coord).toBeDefined();
      expect(coord.pitId).toBe(pitId);

      const [x, y, z] = getPitWorldPosition(pitId);
      expect(y).toBe(0);

      if (pitId <= 6) {
        expect(z).toBeLessThan(0); // Top row is negative Z
      } else {
        expect(z).toBeGreaterThan(0); // Bottom row is positive Z
      }

      const key = `${x.toFixed(2)},${z.toFixed(2)}`;
      expect(positions.has(key)).toBe(false);
      positions.add(key);
    }

    expect(positions.size).toBe(14);
  });

  it("positions Player 1 storage on left and Player 2 storage on right flanking the board", () => {
    const p1StoragePos = getStorageWorldPosition("PLAYER_1");
    const p2StoragePos = getStorageWorldPosition("PLAYER_2");

    expect(p1StoragePos[0]).toBeLessThan(-7.0); // Left of board
    expect(p2StoragePos[0]).toBeGreaterThan(7.0); // Right of board
    expect(p1StoragePos[2]).toBe(0);
    expect(p2StoragePos[2]).toBe(0);
  });

  it("calculates deterministic 3D seed positions inside pit cavities", () => {
    const pitWorldPos = getPitWorldPosition(0);
    const transforms = getPitSeedPositions3D(5, pitWorldPos);

    expect(transforms).toHaveLength(5);

    // Each seed must be recessed below surface
    for (const transform of transforms) {
      expect(transform.position[1]).toBeLessThan(0); // Inside recessed cavity
      // Check X and Z are within pit radius bounds
      const dx = transform.position[0] - pitWorldPos[0];
      const dz = transform.position[2] - pitWorldPos[2];
      const distFromCenter = Math.sqrt(dx * dx + dz * dz);
      expect(distFromCenter).toBeLessThan(0.74);
    }
  });

  it("calculates deterministic 3D seed positions inside storage bowls", () => {
    const storageWorldPos = getStorageWorldPosition("PLAYER_1");
    const transforms = getStorageSeedPositions3D(10, storageWorldPos);

    expect(transforms).toHaveLength(10);

    for (const transform of transforms) {
      expect(transform.position[1]).toBeLessThan(0);
      const dx = Math.abs(transform.position[0] - storageWorldPos[0]);
      const dz = Math.abs(transform.position[2] - storageWorldPos[2]);
      expect(dx).toBeLessThan(1.5);
      expect(dz).toBeLessThan(2.0);
    }
  });

  it("supports complete 3D layouts, storage positions, and seed conservation across 3, 4, 5, and 6 player boards", () => {
    const cases: Array<{ count: SupportedPlayerCount; expectedPits: number; expectedTotalSeeds: number }> = [
      { count: 3, expectedPits: 15, expectedTotalSeeds: 75 },
      { count: 4, expectedPits: 16, expectedTotalSeeds: 80 },
      { count: 5, expectedPits: 20, expectedTotalSeeds: 100 },
      { count: 6, expectedPits: 24, expectedTotalSeeds: 120 },
    ];

    for (const c of cases) {
      const engineState = createInitialGame("PLAYER_1", "local", null, undefined, c.count);
      const visual = mapEngineToVisualState({ gameState: engineState });
      const cfg = getBoardVisualConfig(c.count);

      expect(visual.playerCount).toBe(c.count);
      expect(visual.pits).toHaveLength(c.expectedPits);
      expect(visual.storageList).toHaveLength(c.count);
      expect(visual.totalBoardSeeds).toBe(c.expectedTotalSeeds);
      expect(visual.totalVisibleSeeds).toBe(c.expectedTotalSeeds);

      // Unique non-overlapping pit XZ coordinates
      const pitCoords = new Set<string>();
      for (const pit of visual.pits) {
        const [x, y, z] = getPitWorldPosition(pit.pitId, c.count);
        expect(y).toBe(0);
        const key = `${x.toFixed(2)},${z.toFixed(2)}`;
        expect(pitCoords.has(key)).toBe(false);
        pitCoords.add(key);
      }
      expect(pitCoords.size).toBe(c.expectedPits);

      // Unique non-overlapping storage coordinates and horizontal/vertical seed fitting
      const storageCoords = new Set<string>();
      for (const sSpec of cfg.storageList) {
        const sPos = getStorageWorldPosition(sSpec.player, c.count);
        const key = `${sPos[0].toFixed(2)},${sPos[2].toFixed(2)}`;
        expect(storageCoords.has(key)).toBe(false);
        storageCoords.add(key);

        const seeds = getStorageSeedPositions3D(8, sPos, {
          width: sSpec.width,
          length: sSpec.length,
        });
        expect(seeds).toHaveLength(8);
        for (const st of seeds) {
          expect(st.position[1]).toBeLessThan(0);
          expect(Math.abs(st.position[0] - sPos[0])).toBeLessThan(sSpec.width / 2);
          expect(Math.abs(st.position[2] - sPos[2])).toBeLessThan(sSpec.length / 2);
        }
      }
      expect(storageCoords.size).toBe(c.count);
    }
  });

  it("maintains constant physical seed size without shrinking and stacks deterministically across 1..70 seeds", () => {
    const pitPos = getPitWorldPosition(2, 2);
    const countsToTest = [1, 4, 5, 8, 9, 10, 15, 20, 42, 70];

    const baselineFive = getPitSeedPositions3D(5, pitPos, 2);
    expect(baselineFive).toHaveLength(5);

    for (const count of countsToTest) {
      const a = getPitSeedPositions3D(count, pitPos, 2);
      const b = getPitSeedPositions3D(count, pitPos, 2);

      // Deterministic and exact count preserved (no hidden/missing seeds)
      expect(a).toHaveLength(count);
      expect(a).toEqual(b);

      for (const seed of a) {
        // Seed scale remains uniform around 1.0 (±4.5% organic seed-to-seed variance) regardless of count
        expect(seed.scale[0]).toBeGreaterThanOrEqual(0.94);
        expect(seed.scale[0]).toBeLessThanOrEqual(1.06);
        expect(seed.scale[1]).toBeGreaterThanOrEqual(0.94);
        expect(seed.scale[1]).toBeLessThanOrEqual(1.06);
        expect(seed.scale[2]).toBeGreaterThanOrEqual(0.94);
        expect(seed.scale[2]).toBeLessThanOrEqual(1.06);

        // Stays inside physical carved bowl radius (pitInnerRadius = 0.71)
        const dx = seed.position[0] - pitPos[0];
        const dz = seed.position[2] - pitPos[2];
        expect(Math.hypot(dx, dz)).toBeLessThan(0.71);
      }
    }

    // High count (42 seeds) demonstrates vertical multi-layer stacking rather than flattening or shrinking
    const highCount = getPitSeedPositions3D(42, pitPos, 2);
    const minY = Math.min(...highCount.map((s) => s.position[1]));
    const maxY = Math.max(...highCount.map((s) => s.position[1]));
    expect(maxY - minY).toBeGreaterThan(0.32);

    // Storage high count also preserves full seed dimensions and layers upward cleanly
    const storagePos = getStorageWorldPosition("PLAYER_1", 2);
    const storagePile = getStorageSeedPositions3D(70, storagePos);
    expect(storagePile).toHaveLength(70);
    for (const seed of storagePile) {
      expect(seed.scale[0]).toBeGreaterThanOrEqual(0.94);
      expect(seed.scale[0]).toBeLessThanOrEqual(1.06);
    }
    const minSY = Math.min(...storagePile.map((s) => s.position[1]));
    const maxSY = Math.max(...storagePile.map((s) => s.position[1]));
    expect(maxSY - minSY).toBeGreaterThan(0.18);
  });

  it("deepens pit cavities subtly (+13.75% to -0.455 floor) without piercing slab bottom and keeps seeds recessed inside", () => {
    const floorY = -(CARVED_BOARD_METRICS.pitLipRadius + CARVED_BOARD_METRICS.pitBowlSemiDepth);
    expect(floorY).toBeCloseTo(-0.455, 3);
    expect(Math.abs(floorY)).toBeGreaterThan(Math.abs(CARVED_BOARD_METRICS.slabBottomY) * 0.5);
    expect(Math.abs(floorY)).toBeLessThan(Math.abs(CARVED_BOARD_METRICS.slabBottomY) - 0.2);

    const geometries = PitGeometries.getInstance();
    const cavity = geometries.getCavityGeometry(0, 2);
    const pos = cavity.attributes.position;
    let minGeoY = Infinity;
    for (let i = 0; i < pos.count; i++) {
      minGeoY = Math.min(minGeoY, pos.getY(i));
    }
    expect(minGeoY).toBeCloseTo(-0.455, 3);

    // Seeds seated in deeper bowl stay cleanly inside pit walls and well above slab bottom
    const pitPos = getPitWorldPosition(0, 2);
    const fiveSeeds = getPitSeedPositions3D(5, pitPos, 0);
    for (const seed of fiveSeeds) {
      expect(seed.position[1]).toBeLessThan(-0.18);
      expect(seed.position[1]).toBeGreaterThan(floorY);
    }
  });

  it("removes floating 3D pit count labels so pits show physical 3D seeds only", () => {
    const removedCountPath = path.resolve(process.cwd(), "src/three/pits/PitCount3D.tsx");
    expect(fs.existsSync(removedCountPath)).toBe(false);

    const pit3dSource = fs.readFileSync(
      path.resolve(process.cwd(), "src/three/pits/Pit3D.tsx"),
      "utf-8"
    );
    expect(pit3dSource).not.toContain("PitCount3D");
    expect(pit3dSource).not.toContain("<sprite");
  });

  it("computes responsive SIDE, TOP, and ORBIT camera poses with full board containment and safe limits", () => {
    const playerCounts: SupportedPlayerCount[] = [2, 3, 4, 5, 6];
    const aspects = [
      2.5,  // Desktop widescreen
      1.33, // Desktop standard / narrow 4:3
      2.15, // Tablet landscape
      1.85, // Mobile landscape
    ];

    for (const count of playerCounts) {
      const cfg = getBoardVisualConfig(count);

      for (const aspect of aspects) {
        // SIDE mode preserves ~43 deg elevation and blocks rotation/pan
        const sidePose = getCameraPoseForMode("SIDE", count, aspect);
        const sideControls = getCameraControlConfig("SIDE", count, sidePose.distance);
        expect(sidePose.target).toEqual([0, 0, 0]);
        expect(Math.atan2(sidePose.position[1], sidePose.position[2])).toBeCloseTo(
          SIDE_ELEVATION_RAD,
          5
        );
        expect(sideControls.enableRotate).toBe(false);
        expect(sideControls.enablePan).toBe(false);
        expect(sideControls.enableZoom).toBe(true);

        // TOP mode frames every board corner and storage bowl strictly inside [-1, 1] NDC
        const topPose = getCameraPoseForMode("TOP", count, aspect);
        const topControls = getCameraControlConfig("TOP", count, topPose.distance);
        expect(topPose.position[0]).toBe(0);
        expect(topPose.position[1]).toBe(topPose.distance);
        expect(topPose.position[2]).toBe(TOP_VIEW_Z_EPSILON);
        expect(topPose.target).toEqual([0, 0, 0]);
        expect(topControls.enableRotate).toBe(false);
        expect(topControls.enablePan).toBe(false);
        expect(topControls.enableZoom).toBe(true);
        expect(topControls.minPolarAngle).toBe(0);
        expect(topControls.maxDistance).toBeGreaterThanOrEqual(topPose.distance);

        const cam = new THREE.PerspectiveCamera(CAMERA_FOV_DEG, aspect, 0.1, 1000);
        cam.position.set(...topPose.position);
        cam.lookAt(0, 0, 0);
        cam.updateMatrixWorld();

        const corners: Array<[number, number]> = [
          [-cfg.width / 2, -cfg.depth / 2],
          [cfg.width / 2, -cfg.depth / 2],
          [-cfg.width / 2, cfg.depth / 2],
          [cfg.width / 2, cfg.depth / 2],
        ];
        for (const [cx, cz] of corners) {
          const ndc = new THREE.Vector3(cx, 0, cz).project(cam);
          expect(Math.abs(ndc.x)).toBeLessThan(1.0);
          expect(Math.abs(ndc.y)).toBeLessThan(1.0);
        }

        // ORBIT mode unlocks unrestricted 360 azimuth while keeping polar cleanly above the board
        const orbitPose = getCameraPoseForMode("ORBIT", count, aspect);
        const orbitControls = getCameraControlConfig("ORBIT", count, orbitPose.distance);
        expect(orbitControls.enableRotate).toBe(true);
        expect(orbitControls.enablePan).toBe(false);
        expect(orbitControls.enableZoom).toBe(true);
        expect(orbitControls.minAzimuthAngle).toBe(-Infinity);
        expect(orbitControls.maxAzimuthAngle).toBe(Infinity);
        expect(orbitControls.minPolarAngle).toBe(ORBIT_MIN_POLAR_ANGLE);
        expect(orbitControls.maxPolarAngle).toBe(ORBIT_MAX_POLAR_ANGLE);
        expect(orbitControls.maxPolarAngle).toBeLessThan(Math.PI / 2);
        expect(orbitControls.minDistance).toBeGreaterThanOrEqual(cfg.width * 0.5);
      }
    }

    // Spherical interpolation from back-of-board orbit (-Z) restores exact SIDE orientation via shortest arc
    const startBack = new THREE.Vector3(-4.0, 7.5, -8.2);
    const endSide = new THREE.Vector3(...getCameraPoseForMode("SIDE", 2, 2.4).position);
    const origin = new THREE.Vector3(0, 0, 0);
    const midPos = new THREE.Vector3();
    const midTarget = new THREE.Vector3();

    interpolateCameraSpherical(startBack, endSide, origin, origin, 0.5, midPos, midTarget);
    expect(midPos.y).toBeGreaterThan(5.0);
    expect(midPos.length()).toBeCloseTo(
      (startBack.length() + endSide.length()) * 0.5,
      3
    );

    const finalPos = new THREE.Vector3();
    const finalTarget = new THREE.Vector3();
    interpolateCameraSpherical(startBack, endSide, new THREE.Vector3(1, 0, 0), origin, 1.0, finalPos, finalTarget);
    expect(finalPos.distanceTo(endSide)).toBeLessThan(1e-6);
    expect(finalTarget.length()).toBeLessThan(1e-6);
    expect(computeCameraTargetDistance("SIDE", 2, 2.2)).toBe(12.0);
  });
});
