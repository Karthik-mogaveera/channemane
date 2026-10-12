import { describe, it, expect } from "vitest";
import {
  calculateStorageSeedPositions,
  DEFAULT_STORAGE_GEOMETRY,
} from "../src/ui/utils/storageSeedPacking";

describe("Storage Seed Packing Algorithm Geometry Verification", () => {
  const testCounts = [0, 1, 5, 10, 20, 30, 40, 50, 60, 70];

  testCounts.forEach((count) => {
    it(`verifies geometry, non-overlap, positive gap, and boundary containment for storage count = ${count}`, () => {
      const positions = calculateStorageSeedPositions(count);

      // 1. Correct count
      expect(positions.length).toBe(count);

      if (count === 0) {
        expect(positions).toEqual([]);
        return;
      }

      const { width: W, height: H } = DEFAULT_STORAGE_GEOMETRY;

      // 2. All seeds must fit strictly within [0, W] x [0, H]
      positions.forEach((seed) => {
        expect(Number.isFinite(seed.x)).toBe(true);
        expect(Number.isFinite(seed.y)).toBe(true);
        expect(seed.radius).toBeGreaterThan(0);

        // Boundary containment
        expect(seed.x - seed.radius).toBeGreaterThanOrEqual(-0.0001);
        expect(seed.x + seed.radius).toBeLessThanOrEqual(W + 0.0001);
        expect(seed.y - seed.radius).toBeGreaterThanOrEqual(-0.0001);
        expect(seed.y + seed.radius).toBeLessThanOrEqual(H + 0.0001);
      });

      // 3. For every pair of distinct seeds: must not overlap, boundaries must not touch (positive gap)
      let minObservedGap = Infinity;
      for (let i = 0; i < positions.length; i++) {
        for (let j = i + 1; j < positions.length; j++) {
          const a = positions[i];
          const b = positions[j];
          const centerDist = Math.hypot(a.x - b.x, a.y - b.y);
          const sumRadii = a.radius + b.radius;
          const gap = centerDist - sumRadii;

          expect(gap).toBeGreaterThan(0.001);
          if (gap < minObservedGap) {
            minObservedGap = gap;
          }
        }
      }

      if (count > 1) {
        expect(minObservedGap).toBeGreaterThan(0.05);
      }
    });
  });

  it("verifies determinism: repeated calls return identical positions", () => {
    [5, 20, 40, 70].forEach((count) => {
      const run1 = calculateStorageSeedPositions(count);
      const run2 = calculateStorageSeedPositions(count);
      expect(run1).toEqual(run2);
    });
  });
});
