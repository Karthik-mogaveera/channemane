/**
 * Deterministic Circular Seed Packing Algorithm for Channemane Pits
 *
 * Requirements:
 * - Packs up to 70 seeds deterministically inside a circular pit without overlap or clipping.
 * - Every pair of distinct seeds satisfies: distance(seedA, seedB) >= radiusA + radiusB + minGap (minGap > 0).
 * - Every seed satisfies: distance(seed, center) + seedRadius <= pitRadius.
 * - Produces consistent, centered, concentric ring layouts for every count N in [0..70].
 */

export interface PitGeometry {
  /** Usable inner radius of circular pit (in SVG/canvas coordinate space) */
  pitRadius: number;
  /** Optional explicit seed radius. If omitted, calculated optimally based on seed count */
  seedRadius?: number;
  /** Optional explicit minimum gap between seed boundaries. Defaults to positive gap */
  minGap?: number;
  /** Maximum supported seed count (default: 70) */
  maxSupportedSeeds?: number;
}

export interface SeedPosition {
  /** X coordinate relative to pit center (0, 0) */
  x: number;
  /** Y coordinate relative to pit center (0, 0) */
  y: number;
  /** Radius of this individual seed */
  radius: number;
}

export const DEFAULT_PIT_GEOMETRY: PitGeometry = {
  pitRadius: 44, // In a 100x100 coordinate box (center at 50,50, inner radius 44)
  maxSupportedSeeds: 70,
};

/**
 * Calculates optimal seed radius and minimum gap based on seed count
 * and usable pit radius, guaranteeing all seeds fit without touching or clipping.
 */
function getAdaptiveSeedDimensions(
  seedCount: number,
  usablePitRadius: number
): { seedRadius: number; minGap: number } {
  if (seedCount <= 1) {
    return { seedRadius: Math.min(usablePitRadius * 0.22, 9.0), minGap: 2.0 };
  }
  if (seedCount <= 4) {
    return { seedRadius: Math.min(usablePitRadius * 0.18, 7.5), minGap: 2.0 };
  }
  if (seedCount <= 7) {
    return { seedRadius: Math.min(usablePitRadius * 0.15, 6.2), minGap: 1.8 };
  }
  if (seedCount <= 19) {
    // 2 rings: (2*2+1)r + 2g = 5r + 2g <= usablePitRadius
    return { seedRadius: Math.min(usablePitRadius * 0.115, 4.8), minGap: 1.4 };
  }
  if (seedCount <= 37) {
    // 3 rings: 7r + 3g <= usablePitRadius
    return { seedRadius: Math.min(usablePitRadius * 0.092, 3.9), minGap: 1.1 };
  }
  if (seedCount <= 61) {
    // 4 rings: 9r + 4g <= usablePitRadius
    return { seedRadius: Math.min(usablePitRadius * 0.076, 3.3), minGap: 0.9 };
  }
  // Up to 70 seeds (and up to 91 seeds on 5 rings): 11r + 5g <= usablePitRadius
  return { seedRadius: Math.min(usablePitRadius * 0.065, 2.85), minGap: 0.75 };
}

/**
 * Computes deterministic (x, y, radius) positions for every seed in a pit.
 *
 * @param seedCount The number of seeds present in the pit (0..70+)
 * @param customGeometry Pit dimensions and spacing overrides
 * @returns Array of SeedPosition objects with center (0, 0)
 */
export function calculateSeedPositions(
  seedCount: number,
  customGeometry?: Partial<PitGeometry>
): SeedPosition[] {
  if (seedCount <= 0) {
    return [];
  }

  const geometry: PitGeometry = {
    ...DEFAULT_PIT_GEOMETRY,
    ...customGeometry,
  };

  const R = geometry.pitRadius;
  const adaptive = getAdaptiveSeedDimensions(seedCount, R);
  const seedRadius = geometry.seedRadius ?? adaptive.seedRadius;
  const minGap = geometry.minGap ?? adaptive.minGap;

  // Single seed at center
  if (seedCount === 1) {
    return [{ x: 0, y: 0, radius: seedRadius }];
  }

  // Small counts (2 to 4): single ring symmetrically centered
  if (seedCount >= 2 && seedCount <= 4) {
    const ringRadius = seedRadius + minGap * 0.5 + seedRadius; // 2r + gap
    // Make sure ring radius fits
    const clampedRingRadius = Math.min(ringRadius, R - seedRadius);
    const positions: SeedPosition[] = [];
    const baseAngle = seedCount === 4 ? Math.PI / 4 : seedCount === 3 ? Math.PI / 6 : 0;

    for (let i = 0; i < seedCount; i++) {
      const angle = baseAngle + (2 * Math.PI * i) / seedCount;
      positions.push({
        x: Number((clampedRingRadius * Math.cos(angle)).toFixed(4)),
        y: Number((clampedRingRadius * Math.sin(angle)).toFixed(4)),
        radius: seedRadius,
      });
    }
    return positions;
  }

  // General concentric rings arrangement
  // Ring capacities: Ring 1: 6, Ring 2: 12, Ring 3: 18, Ring 4: 24, Ring 5: 30
  // Maximum total capacities: 1, 7, 19, 37, 61, 91
  const dMin = 2 * seedRadius + minGap;

  // Determine number of rings required
  let numRings = 1;
  if (seedCount > 61) numRings = 5;
  else if (seedCount > 37) numRings = 4;
  else if (seedCount > 19) numRings = 3;
  else if (seedCount > 7) numRings = 2;

  // Step between consecutive rings
  // Ensure maximum ring radius + seedRadius <= R
  const maxPossibleRadius = R - seedRadius;
  const ringStep = Math.min(
    dMin,
    numRings > 0 ? maxPossibleRadius / numRings : dMin
  );

  // Distribute (seedCount - 1) seeds among rings 1..numRings proportionally
  const remainingSeeds = seedCount - 1;
  const ringCounts: number[] = new Array(numRings).fill(0);

  // Weight of each ring is proportional to its index (circumference)
  const sumWeights = (numRings * (numRings + 1)) / 2;
  let assigned = 0;

  for (let m = 1; m <= numRings; m++) {
    const raw = Math.round((remainingSeeds * m) / sumWeights);
    // Capacity for ring m with dMin chord distance is 6 * m
    const maxCapacity = 6 * m;
    const count = Math.min(raw, maxCapacity);
    ringCounts[m - 1] = count;
    assigned += count;
  }

  // Adjust any rounding differences from outside inwards
  let diff = remainingSeeds - assigned;
  if (diff > 0) {
    for (let m = numRings; m >= 1 && diff > 0; m--) {
      const maxCapacity = 6 * m;
      const canAdd = maxCapacity - ringCounts[m - 1];
      const toAdd = Math.min(diff, canAdd);
      ringCounts[m - 1] += toAdd;
      diff -= toAdd;
    }
  } else if (diff < 0) {
    for (let m = numRings; m >= 1 && diff < 0; m--) {
      const canRemove = ringCounts[m - 1] - 1;
      const toRemove = Math.min(-diff, canRemove);
      ringCounts[m - 1] -= toRemove;
      diff += toRemove;
    }
  }

  const positions: SeedPosition[] = [];
  // Center seed
  positions.push({ x: 0, y: 0, radius: seedRadius });

  // Place seeds on each ring
  for (let m = 1; m <= numRings; m++) {
    const count = ringCounts[m - 1];
    if (count <= 0) continue;

    const currentRadius = m * ringStep;
    // Alternate initial angle on adjacent rings to stagger seeds
    const offsetAngle = m % 2 === 1 ? 0 : Math.PI / count;

    for (let i = 0; i < count; i++) {
      const angle = offsetAngle + (2 * Math.PI * i) / count;
      positions.push({
        x: Number((currentRadius * Math.cos(angle)).toFixed(4)),
        y: Number((currentRadius * Math.sin(angle)).toFixed(4)),
        radius: seedRadius,
      });
    }
  }

  return positions;
}
