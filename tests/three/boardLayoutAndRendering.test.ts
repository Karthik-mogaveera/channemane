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

import { describe, it, expect } from "vitest";
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
});
