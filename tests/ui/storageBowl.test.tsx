import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { StorageBowl } from "../../src/ui/components/StorageBowl";
import { calculateStorageSeedPositions } from "../../src/ui/utils/storageSeedPacking";

describe("StorageBowl Component — Captured Seeds Visualization", () => {
  const mandatoryCounts = [0, 5, 20, 40, 60, 70];

  mandatoryCounts.forEach((count) => {
    it(`renders storage count ${count} accurately with matching individual seed objects`, () => {
      const { container } = render(
        <StorageBowl player="PLAYER_1" storageSeeds={count} />
      );

      const countEl = screen.getByTestId("p1-captured-count");
      expect(countEl).toHaveTextContent(count.toString());

      if (count === 0) {
        expect(screen.getByText("Empty")).toBeInTheDocument();
        expect(
          screen.queryByTestId("storage-seeds-svg-player_1")
        ).not.toBeInTheDocument();
        const seeds = container.querySelectorAll(".storage-seed-element");
        expect(seeds.length).toBe(0);
      } else {
        expect(
          screen.getByTestId("storage-seeds-svg-player_1")
        ).toBeInTheDocument();
        const seeds = container.querySelectorAll(".storage-seed-element");
        expect(seeds.length).toBe(count);

        // Verify each seed element has a distinct testid
        for (let idx = 0; idx < count; idx++) {
          expect(
            screen.getByTestId(`storage-seed-player_1-${idx}`)
          ).toBeInTheDocument();
        }
      }
    });
  });

  it("renders Player 2 storage identically with correct test IDs and aria labels", () => {
    const { container } = render(
      <StorageBowl player="PLAYER_2" storageSeeds={35} />
    );

    expect(screen.getByTestId("storage-player2")).toBeInTheDocument();
    expect(screen.getByTestId("p2-captured-count")).toHaveTextContent("35");
    expect(
      screen.getByTestId("storage-seeds-svg-player_2")
    ).toBeInTheDocument();

    const seeds = container.querySelectorAll(".storage-seed-element");
    expect(seeds.length).toBe(35);
  });

  it("verifies all rendered storage seed positions fit within bounds without overlap", () => {
    [5, 20, 40, 60, 70].forEach((count) => {
      const positions = calculateStorageSeedPositions(count);
      expect(positions.length).toBe(count);

      positions.forEach((pos) => {
        expect(pos.x - pos.radius).toBeGreaterThanOrEqual(0);
        expect(pos.x + pos.radius).toBeLessThanOrEqual(90);
        expect(pos.y - pos.radius).toBeGreaterThanOrEqual(0);
        expect(pos.y + pos.radius).toBeLessThanOrEqual(180);
      });

      for (let i = 0; i < positions.length; i++) {
        for (let j = i + 1; j < positions.length; j++) {
          const a = positions[i];
          const b = positions[j];
          const dist = Math.hypot(a.x - b.x, a.y - b.y);
          expect(dist).toBeGreaterThan(a.radius + b.radius);
        }
      }
    });
  });
});
