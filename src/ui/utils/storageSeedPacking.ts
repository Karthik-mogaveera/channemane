/**
 * Deterministic Rectangular/Grid Seed Packing Algorithm for Storage Bowls
 *
 * Requirements:
 * - Packs up to 70 seeds deterministically inside a rectangular or pill-shaped container.
 * - Every pair of distinct seeds satisfies: distance(seedA, seedB) >= radiusA + radiusB + minGap (minGap > 0).
 * - Every seed satisfies: x - r >= 0, x + r <= width, y - r >= 0, y + r <= height.
 * - Fits within the container geometry without clipping or overflow.
 * - Deterministic, balanced, and visually consistent across both players.
 */

import type { SeedPosition } from "./seedPacking";

export interface StorageGeometry {
  /** Usable inner width of the storage area (SVG viewBox coordinates) */
  width: number;
  /** Usable inner height of the storage area (SVG viewBox coordinates) */
  height: number;
  /** Maximum supported seed count (default: 70) */
  maxSupportedSeeds?: number;
}

export const DEFAULT_STORAGE_GEOMETRY: StorageGeometry = {
  width: 90,
  height: 180,
  maxSupportedSeeds: 70,
};

/**
 * Computes deterministic (x, y, radius) positions for every seed in storage.
 * Arranges seeds in a clean, compact multi-row grid centered within the storage geometry.
 *
 * @param seedCount The number of seeds present in storage (0..70+)
 * @param customGeometry Storage dimensions override
 * @returns Array of SeedPosition objects within [0, width] x [0, height]
 */
export function calculateStorageSeedPositions(
  seedCount: number,
  customGeometry?: Partial<StorageGeometry>
): SeedPosition[] {
  if (seedCount <= 0) {
    return [];
  }

  const geometry: StorageGeometry = {
    ...DEFAULT_STORAGE_GEOMETRY,
    ...customGeometry,
  };

  const W = geometry.width;
  const H = geometry.height;

  let cols: number;
  let rows: number;

  if (W > H) {
    // Horizontal storage orientation (e.g., 4-player top/bottom bowls)
    if (seedCount <= 8) {
      rows = 1;
      cols = Math.max(1, seedCount);
    } else if (seedCount <= 24) {
      rows = 2;
      cols = Math.ceil(seedCount / 2);
    } else {
      rows = 3;
      cols = Math.ceil(seedCount / 3);
    }
  } else {
    // Choose optimal grid columns based on count:
    // e.g. for small counts, 3-4 cols; for 70 seeds, 5 or 6 cols (e.g. 5 cols x 14 rows, or 6 cols x 12 rows)
    if (seedCount <= 4) {
      cols = Math.min(seedCount, 2);
    } else if (seedCount <= 12) {
      cols = 3;
    } else if (seedCount <= 28) {
      cols = 4;
    } else if (seedCount <= 45) {
      cols = 5;
    } else {
      // Up to 70 seeds: 5 or 6 cols
      cols = 5;
    }
    rows = Math.ceil(seedCount / cols);
  }

  // Available space per cell
  const cellWidth = W / cols;
  const cellHeight = H / rows;

  // Maximum seed radius that fits cell with positive gap
  const maxPossibleRadius = Math.min(cellWidth, cellHeight) * 0.42;

  // Seed radius clamped to attractive bounds
  // For 1 seed: max 8.5
  // For 70 seeds: ~5.0
  const seedRadius = Math.max(
    2.5,
    Math.min(maxPossibleRadius, seedCount <= 5 ? 7.5 : seedCount <= 20 ? 5.8 : 4.6)
  );

  // Calculate actual grid dimensions
  const gridWidth = cols * cellWidth;
  const gridHeight = rows * cellHeight;

  // Centering offsets
  const startX = (W - gridWidth) / 2 + cellWidth / 2;
  const startY = (H - gridHeight) / 2 + cellHeight / 2;

  const positions: SeedPosition[] = [];

  for (let idx = 0; idx < seedCount; idx++) {
    const r = Math.floor(idx / cols);
    const c = idx % cols;

    // For the last row, center remaining items horizontally
    const itemsInThisRow =
      r === rows - 1 && seedCount % cols !== 0 ? seedCount % cols : cols;
    const rowOffset =
      r === rows - 1 && seedCount % cols !== 0
        ? ((cols - itemsInThisRow) * cellWidth) / 2
        : 0;

    const x = Number((startX + rowOffset + c * cellWidth).toFixed(4));
    const y = Number((startY + r * cellHeight).toFixed(4));

    positions.push({
      x,
      y,
      radius: seedRadius,
    });
  }

  return positions;
}
