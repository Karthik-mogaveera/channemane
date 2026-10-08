import { describe, it, expect } from "vitest";
import { evaluateAndExecuteCapture } from "../src/engine/capture";
import { createInitialGame, verifySeedConservation } from "../src/engine/board";

describe("TASK-08: Positional Capture Logic (Section 26, Clarifications 2 & 4)", () => {
  it("should capture seeds when destination has empty next pit and populated following pit", () => {
    const game = createInitialGame("PLAYER_1");
    for (const pit of game.pits) {
      pit.seeds = 0;
    }
    game.players.player1.storage = 61; // 61 + 1 + 8 = 70
    game.pits[2].seeds = 1;
    game.pits[3].seeds = 0;
    game.pits[4].seeds = 8; // On Player 1's side

    expect(verifySeedConservation(game)).toBe(true);

    const captureResult = evaluateAndExecuteCapture(game, 2);
    expect(captureResult.capturedSeeds).toBe(8);
    expect(captureResult.capturedPitId).toBe(4);
    expect(game.pits[4].seeds).toBe(0);
    expect(game.players.player1.storage).toBe(69);
    expect(game.players.player1.roundCaptured).toBe(8);
    expect(verifySeedConservation(game)).toBe(true);
  });

  it("should capture seeds regardless of whose side the captured pit is on (Clarification 2)", () => {
    // Current player is Player 1.
    // Destination is P5.
    // Next open pit is P6 (empty).
    // Following open pit is P7 (Player 2's pit!) with 6 seeds.
    const game = createInitialGame("PLAYER_1");
    for (const pit of game.pits) {
      pit.seeds = 0;
    }
    game.players.player1.storage = 63; // 63 + 1 + 6 = 70
    game.pits[5].seeds = 1;
    game.pits[6].seeds = 0;
    game.pits[7].seeds = 6;

    expect(verifySeedConservation(game)).toBe(true);

    const captureResult = evaluateAndExecuteCapture(game, 5);
    expect(captureResult.capturedSeeds).toBe(6);
    expect(captureResult.capturedPitId).toBe(7);
    expect(game.pits[7].seeds).toBe(0);
    expect(game.players.player1.storage).toBe(69);
    expect(verifySeedConservation(game)).toBe(true);
  });

  it("should capture 0 seeds if following pit is empty", () => {
    const game = createInitialGame("PLAYER_1");
    for (const pit of game.pits) {
      pit.seeds = 0;
    }
    game.players.player1.storage = 70;
    // Destination is P1. Next is P2 (empty), Following is P3 (empty).
    const captureResult = evaluateAndExecuteCapture(game, 1);
    expect(captureResult.capturedSeeds).toBe(0);
    expect(captureResult.capturedPitId).toBeNull();
    expect(game.players.player1.storage).toBe(70);
    expect(verifySeedConservation(game)).toBe(true);
  });

  it("should skip closed pits when determining next and following open pits", () => {
    const game = createInitialGame("PLAYER_1");
    for (const pit of game.pits) {
      pit.seeds = 0;
    }
    game.players.player1.storage = 64; // 64 + 1 + 5 = 70

    // Destination: P0.
    // P1 is CLOSED.
    // Next open is P2 (empty).
    // P3 is CLOSED.
    // Following open is P4 (contains 5 seeds).
    game.pits[0].seeds = 1;
    game.pits[1].status = "CLOSED";
    game.pits[2].seeds = 0;
    game.pits[3].status = "CLOSED";
    game.pits[4].seeds = 5;

    expect(verifySeedConservation(game)).toBe(true);

    const captureResult = evaluateAndExecuteCapture(game, 0);
    expect(captureResult.capturedSeeds).toBe(5);
    expect(captureResult.capturedPitId).toBe(4);
    expect(game.pits[4].seeds).toBe(0);
    expect(game.players.player1.storage).toBe(69);
    expect(verifySeedConservation(game)).toBe(true);
  });
});
