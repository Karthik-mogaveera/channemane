import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { Pit } from "../../src/ui/components/Pit";
import { calculateSeedPositions } from "../../src/ui/utils/seedPacking";

describe("Pit Seed Organization and Rendering", () => {
  const mandatoryCounts = [0, 1, 5, 10, 20, 30, 40, 42, 50, 60, 70];

  mandatoryCounts.forEach((count) => {
    it(`renders exactly ${count} individual seeds when pit seed count is ${count}`, () => {
      const { container } = render(
        <Pit
          pitId={4}
          owner="PLAYER_1"
          seeds={count}
          status="OPEN"
          bonusAvailable={false}
          isSelectable={false}
          isActiveDrop={false}
          isAnimating={false}
          onSelect={vi.fn()}
          onClaimBonus={vi.fn()}
        />
      );

      const pitButton = screen.getByTestId("pit-4");
      expect(pitButton).toBeInTheDocument();
      expect(pitButton).toHaveAttribute("data-seeds", count.toString());

      if (count === 0) {
        expect(screen.queryByTestId("pit-seeds-svg-4")).not.toBeInTheDocument();
        const seedElements = container.querySelectorAll(".seed-element");
        expect(seedElements.length).toBe(0);
      } else {
        const svg = screen.getByTestId("pit-seeds-svg-4");
        expect(svg).toBeInTheDocument();
        const seedElements = container.querySelectorAll(".seed-element");
        expect(seedElements.length).toBe(count);

        // Verify each individual seed element has a distinct testid
        for (let idx = 0; idx < count; idx++) {
          const seedEl = screen.getByTestId(`seed-4-${idx}`);
          expect(seedEl).toBeInTheDocument();
        }
      }
    });
  });

  it("verifies pit button maintains constant class and DOM attributes across different seed counts", () => {
    const countsToTest = [0, 5, 20, 40, 70];
    countsToTest.forEach((count) => {
      const { unmount } = render(
        <Pit
          pitId={0}
          owner="PLAYER_1"
          seeds={count}
          status="OPEN"
          bonusAvailable={false}
          isSelectable={false}
          isActiveDrop={false}
          isAnimating={false}
          onSelect={vi.fn()}
          onClaimBonus={vi.fn()}
        />
      );

      const pitButton = screen.getByTestId("pit-0");
      expect(pitButton).toHaveClass("channemane-pit");
      expect(pitButton).not.toHaveClass("selectable");
      expect(pitButton).not.toHaveClass("closed");
      unmount();
    });
  });

  it("verifies geometric non-overlap and boundary bounds for rendered positions", () => {
    [0, 1, 5, 10, 20, 30, 40, 42, 50, 60, 70].forEach((count) => {
      const positions = calculateSeedPositions(count);
      expect(positions.length).toBe(count);

      positions.forEach((pos) => {
        // Must fit inside usable boundary of 44.0 radius
        const distFromCenter = Math.hypot(pos.x, pos.y) + pos.radius;
        expect(distFromCenter).toBeLessThanOrEqual(44.0);
      });

      // Pairwise non-overlap check
      for (let i = 0; i < positions.length; i++) {
        for (let j = i + 1; j < positions.length; j++) {
          const a = positions[i];
          const b = positions[j];
          const dist = Math.hypot(a.x - b.x, a.y - b.y);
          const minRequiredDist = a.radius + b.radius;
          expect(dist).toBeGreaterThan(minRequiredDist);
        }
      }
    });
  });
});
