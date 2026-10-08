import { describe, it, expect } from "vitest";
import { getNextOpenPit, getFollowingOpenPit } from "../src/engine/traversal";
import { createInitialGame } from "../src/engine/board";

describe("TASK-05: Traversal Helper (getNextOpenPit) & Closed-Pit Skipping", () => {
  it("should advance sequentially in counter-clockwise order on an all-open board", () => {
    const game = createInitialGame();

    // From 0 -> 1 -> ... -> 13 -> 0
    for (let i = 0; i < 13; i++) {
      expect(getNextOpenPit(i, game.pits)).toBe(i + 1);
    }
    // Wraparound P13 -> P0
    expect(getNextOpenPit(13, game.pits)).toBe(0);
  });

  it("should skip single closed pit", () => {
    const game = createInitialGame();
    // Close pit 3
    game.pits[3].status = "CLOSED";

    expect(getNextOpenPit(2, game.pits)).toBe(4);
  });

  it("should skip multiple consecutive closed pits and wrap correctly", () => {
    const game = createInitialGame();
    // Close pits 12, 13, 0, 1
    game.pits[12].status = "CLOSED";
    game.pits[13].status = "CLOSED";
    game.pits[0].status = "CLOSED";
    game.pits[1].status = "CLOSED";

    // From 11, should skip 12, 13, 0, 1 and land on 2
    expect(getNextOpenPit(11, game.pits)).toBe(2);
  });

  it("should return null if all pits are closed to avoid infinite loops", () => {
    const game = createInitialGame();
    for (const pit of game.pits) {
      pit.status = "CLOSED";
    }

    expect(getNextOpenPit(0, game.pits)).toBeNull();
  });

  it("should handle only 1 open pit remaining on the board", () => {
    const game = createInitialGame();
    for (let i = 0; i < 14; i++) {
      if (i !== 5) {
        game.pits[i].status = "CLOSED";
      }
    }

    // From 5, the next open pit wrapping around is 5 itself
    expect(getNextOpenPit(5, game.pits)).toBe(5);
    // From any closed pit, next open pit is 5
    expect(getNextOpenPit(4, game.pits)).toBe(5);
  });

  it("should return null for invalid pit IDs", () => {
    const game = createInitialGame();
    expect(getNextOpenPit(-1, game.pits)).toBeNull();
    expect(getNextOpenPit(14, game.pits)).toBeNull();
  });

  describe("getFollowingOpenPit (Two Open Pits Ahead for Capture Inspection)", () => {
    it("should return the pit 2 steps ahead when all are open", () => {
      const game = createInitialGame();
      expect(getFollowingOpenPit(0, game.pits)).toBe(2);
      expect(getFollowingOpenPit(12, game.pits)).toBe(0);
      expect(getFollowingOpenPit(13, game.pits)).toBe(1);
    });

    it("should skip closed pits during both steps", () => {
      const game = createInitialGame();
      // P1 and P3 are closed
      game.pits[1].status = "CLOSED";
      game.pits[3].status = "CLOSED";

      // From 0: next open is 2 (skips 1). Following open from 2 is 4 (skips 3).
      expect(getFollowingOpenPit(0, game.pits)).toBe(4);
    });

    it("should return null if fewer than 2 open pits exist", () => {
      const game = createInitialGame();
      for (let i = 1; i < 14; i++) {
        game.pits[i].status = "CLOSED";
      }
      // Only P0 is open: next open is 0, following open is 0 (or null if distinct required)
      expect(getFollowingOpenPit(0, game.pits)).toBe(0);
    });
  });
});
