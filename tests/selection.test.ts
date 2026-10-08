import { describe, it, expect } from "vitest";
import {
  validatePitSelection,
  canSelectPit,
  getSelectablePits,
  hasAnyValidMove,
} from "../src/engine/selection";
import { createInitialGame } from "../src/engine/board";

describe("TASK-06: Pit Selection Validation (Section 22)", () => {
  it("should permit Player 1 to select any of their open, non-empty pits (P0-P6) on their turn", () => {
    const game = createInitialGame("PLAYER_1");

    for (let i = 0; i < 7; i++) {
      expect(canSelectPit(game, i)).toBe(true);
      const res = validatePitSelection(game, i);
      expect(res.success).toBe(true);
      if (res.success) {
        expect(res.data).toBe(i);
      }
    }
  });

  it("should reject Player 1 selecting Player 2's pits (P7-P13)", () => {
    const game = createInitialGame("PLAYER_1");

    for (let i = 7; i < 14; i++) {
      expect(canSelectPit(game, i)).toBe(false);
      const res = validatePitSelection(game, i);
      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error).toMatch(/does not belong/i);
      }
    }
  });

  it("should reject Player 2 selecting Player 1's pits on Player 2's turn", () => {
    const game = createInitialGame("PLAYER_2");

    for (let i = 0; i < 7; i++) {
      expect(canSelectPit(game, i)).toBe(false);
      const res = validatePitSelection(game, i);
      expect(res.success).toBe(false);
    }

    for (let i = 7; i < 14; i++) {
      expect(canSelectPit(game, i)).toBe(true);
    }
  });

  it("should reject selection of a CLOSED pit", () => {
    const game = createInitialGame("PLAYER_1");
    game.pits[2].status = "CLOSED";

    expect(canSelectPit(game, 2)).toBe(false);
    const res = validatePitSelection(game, 2);
    expect(res.success).toBe(false);
    if (!res.success) {
      expect(res.error).toMatch(/closed/i);
    }
  });

  it("should reject selection of an EMPTY pit (0 seeds)", () => {
    const game = createInitialGame("PLAYER_1");
    game.pits[4].seeds = 0;

    expect(canSelectPit(game, 4)).toBe(false);
    const res = validatePitSelection(game, 4);
    expect(res.success).toBe(false);
    if (!res.success) {
      expect(res.error).toMatch(/empty/i);
    }
  });

  it("should reject selection when game phase is not PLAYING", () => {
    const game = createInitialGame("PLAYER_1");
    game.phase = "ROUND_SETTLEMENT";

    expect(canSelectPit(game, 0)).toBe(false);
    const res = validatePitSelection(game, 0);
    expect(res.success).toBe(false);
    if (!res.success) {
      expect(res.error).toMatch(/not playable/i);
    }
  });

  it("should reject selection when turnPhase is not PLAYER_TURN", () => {
    const game = createInitialGame("PLAYER_1");
    game.turnPhase = "SOWING";

    expect(canSelectPit(game, 0)).toBe(false);
    const res = validatePitSelection(game, 0);
    expect(res.success).toBe(false);
    if (!res.success) {
      expect(res.error).toMatch(/not waiting for pit selection/i);
    }
  });

  it("should return the list of selectable pits accurately", () => {
    const game = createInitialGame("PLAYER_1");
    game.pits[0].seeds = 0;
    game.pits[3].status = "CLOSED";

    // P1's selectable pits: P1, P2, P4, P5, P6
    expect(getSelectablePits(game)).toEqual([1, 2, 4, 5, 6]);
  });

  it("should correctly detect if a player has any valid moves", () => {
    const game = createInitialGame("PLAYER_1");
    expect(hasAnyValidMove(game, "PLAYER_1")).toBe(true);

    // Empty all pits for Player 1
    for (let i = 0; i < 7; i++) {
      game.pits[i].seeds = 0;
    }
    expect(hasAnyValidMove(game, "PLAYER_1")).toBe(false);
    expect(hasAnyValidMove(game, "PLAYER_2")).toBe(true);
  });
});
