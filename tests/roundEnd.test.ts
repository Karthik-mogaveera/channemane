import { describe, it, expect } from "vitest";
import { shouldEndRound, getRoundEndReason } from "../src/engine/roundEnd";
import { createInitialGame } from "../src/engine/board";

describe("TASK-10: Round-Ending Detection (Sections 32-37, 46)", () => {
  function setupCustomBoard(p1Seeds: number[], p2Seeds: number[]) {
    const game = createInitialGame();
    for (let i = 0; i < 7; i++) {
      game.pits[i].seeds = p1Seeds[i] ?? 0;
    }
    for (let i = 7; i < 14; i++) {
      game.pits[i].seeds = p2Seeds[i - 7] ?? 0;
    }
    return game;
  }

  // Section 46 Test A: Board = 3 -> ROUND END
  it("Test A: should end round when board total is 3 seeds", () => {
    const game = setupCustomBoard([1, 1, 0, 0, 0, 0, 0], [1, 0, 0, 0, 0, 0, 0]);
    expect(shouldEndRound(game)).toBe(true);
    expect(getRoundEndReason(game)).toBe("FEWER_THAN_4_BOARD_SEEDS");
  });

  // Section 46 Test B: Board = 2 -> ROUND END
  it("Test B: should end round when board total is 2 seeds", () => {
    const game = setupCustomBoard([1, 0, 0, 0, 0, 0, 0], [1, 0, 0, 0, 0, 0, 0]);
    expect(shouldEndRound(game)).toBe(true);
    expect(getRoundEndReason(game)).toBe("FEWER_THAN_4_BOARD_SEEDS");
  });

  // Section 46 Test C: Board = 1 -> ROUND END
  it("Test C: should end round when board total is 1 seed", () => {
    const game = setupCustomBoard([1, 0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0, 0]);
    expect(shouldEndRound(game)).toBe(true);
  });

  // Section 46 Test D: Board = 0 -> ROUND END
  it("Test D: should end round when board total is 0 seeds", () => {
    const game = setupCustomBoard([0, 0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0, 0]);
    expect(shouldEndRound(game)).toBe(true);
  });

  // Section 46 Test E: Board = 4 -> ROUND DOES NOT END (when neither side is 0)
  it("Test E: should NOT end round when board total is 4 seeds (2 on each side)", () => {
    const game = setupCustomBoard([1, 1, 0, 0, 0, 0, 0], [1, 1, 0, 0, 0, 0, 0]);
    expect(shouldEndRound(game)).toBe(false);
    expect(getRoundEndReason(game)).toBeNull();
  });

  // Section 46 Test F: P1 side = 0, P2 side = 3 -> ROUND END
  it("Test F: should end round when P1 side = 0 and P2 side = 3", () => {
    const game = setupCustomBoard([0, 0, 0, 0, 0, 0, 0], [3, 0, 0, 0, 0, 0, 0]);
    expect(shouldEndRound(game)).toBe(true);
  });

  // Section 46 Test G: P1 side = 3, P2 side = 0 -> ROUND END
  it("Test G: should end round when P1 side = 3 and P2 side = 0", () => {
    const game = setupCustomBoard([0, 0, 3, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0, 0]);
    expect(shouldEndRound(game)).toBe(true);
  });

  // Section 46 Test H: P1 side = 0, P2 side = 8 -> ROUND DOES NOT END (Critical rule!)
  it("Test H: should NOT end round when P1 side = 0 and P2 side = 8", () => {
    const game = setupCustomBoard([0, 0, 0, 0, 0, 0, 0], [2, 2, 2, 2, 0, 0, 0]);
    expect(shouldEndRound(game)).toBe(false);
  });

  // Section 46 Test I: P1 side = 8, P2 side = 0 -> ROUND DOES NOT END (Critical rule!)
  it("Test I: should NOT end round when P1 side = 8 and P2 side = 0", () => {
    const game = setupCustomBoard([4, 4, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0, 0]);
    expect(shouldEndRound(game)).toBe(false);
  });

  // Section 46 Test J: Empty individual pits do not mean empty side
  it("Test J: should NOT end round when some pits are empty but side totals are non-zero", () => {
    // P0=0, P1=2, P2=1, P3=0, P4=3, P5=0, P6=4 (Total P1 = 10)
    // P2 side has 10 seeds as well
    const game = setupCustomBoard([0, 2, 1, 0, 3, 0, 4], [0, 2, 1, 0, 3, 0, 4]);
    expect(shouldEndRound(game)).toBe(false);
  });
});
