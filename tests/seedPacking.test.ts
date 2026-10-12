import { describe, it, expect } from "vitest";
import {
  calculateSeedPositions,
  DEFAULT_PIT_GEOMETRY,
} from "../src/ui/utils/seedPacking";

describe("Seed Packing Algorithm Geometry & Spacing Verification", () => {
  const mandatoryCounts = [0, 1, 5, 10, 20, 30, 40, 50, 60, 70, 42];

  mandatoryCounts.forEach((count) => {
    it(`verifies geometry, non-overlap, positive gap, and containment for seedCount = ${count}`, () => {
      const positions = calculateSeedPositions(count);

      // 1. Correct count rendered
      expect(positions.length).toBe(count);

      if (count === 0) {
        expect(positions).toEqual([]);
        return;
      }

      const R = DEFAULT_PIT_GEOMETRY.pitRadius;

      // 2. All seeds must fit entirely within the usable circular pit boundary
      for (let i = 0; i < positions.length; i++) {
        const seed = positions[i];
        expect(Number.isFinite(seed.x)).toBe(true);
        expect(Number.isFinite(seed.y)).toBe(true);
        expect(seed.radius).toBeGreaterThan(0);

        const distFromCenter = Math.hypot(seed.x, seed.y);
        const outerEdge = distFromCenter + seed.radius;

        // Must remain entirely within pit radius R
        expect(outerEdge).toBeLessThanOrEqual(R + 0.0001);
      }

      // 3. For every pair of distinct seeds: must not overlap, boundaries must not touch (positive gap)
      let minObservedGap = Infinity;
      for (let i = 0; i < positions.length; i++) {
        for (let j = i + 1; j < positions.length; j++) {
          const a = positions[i];
          const b = positions[j];
          const centerDist = Math.hypot(a.x - b.x, a.y - b.y);
          const sumRadii = a.radius + b.radius;
          const gap = centerDist - sumRadii;

          // Gap between physical boundaries must be strictly positive (> 0)
          expect(gap).toBeGreaterThan(0.001);
          if (gap < minObservedGap) {
            minObservedGap = gap;
          }
        }
      }

      if (count > 1) {
        // Confirm measurable positive gap across all pairs
        expect(minObservedGap).toBeGreaterThan(0.05);
      }
    });
  });

  it("verifies determinism: repeated calls return identical positions", () => {
    for (const count of [5, 20, 42, 70]) {
      const run1 = calculateSeedPositions(count);
      const run2 = calculateSeedPositions(count);
      expect(run1).toEqual(run2);
    }
  });

  it("verifies full range [0..70] counts have zero overlap, positive gap, and full containment", () => {
    const R = DEFAULT_PIT_GEOMETRY.pitRadius;
    for (let count = 0; count <= 70; count++) {
      const positions = calculateSeedPositions(count);
      expect(positions.length).toBe(count);

      for (let i = 0; i < positions.length; i++) {
        const seed = positions[i];
        const distFromCenter = Math.hypot(seed.x, seed.y);
        expect(distFromCenter + seed.radius).toBeLessThanOrEqual(R + 0.0001);
      }

      for (let i = 0; i < positions.length; i++) {
        for (let j = i + 1; j < positions.length; j++) {
          const a = positions[i];
          const b = positions[j];
          const centerDist = Math.hypot(a.x - b.x, a.y - b.y);
          const gap = centerDist - (a.radius + b.radius);
          expect(gap).toBeGreaterThan(0.001);
        }
      }
    }
  });

  it("handles custom pitGeometry overrides cleanly", () => {
    const custom = { pitRadius: 50, seedRadius: 3.0, minGap: 1.0 };
    const positions = calculateSeedPositions(25, custom);
    expect(positions.length).toBe(25);
    for (const p of positions) {
      expect(p.radius).toBe(3.0);
      expect(Math.hypot(p.x, p.y) + p.radius).toBeLessThanOrEqual(50.0001);
    }
  });
});
