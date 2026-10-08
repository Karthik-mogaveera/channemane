import { describe, it, expect } from "vitest";
import { pickupSeeds } from "../src/engine/pickup";
import { createInitialGame, verifySeedConservation, getTotalSeeds } from "../src/engine/board";

describe("PH2-T05: Seed Pickup & Hand Management Engine", () => {
  it("should pick up seeds from a valid pit, zero the pit, and hold seeds in hand", () => {
    const game = createInitialGame("PLAYER_1");

    expect(game.seedsInHand).toBe(0);
    expect(game.pits[2].seeds).toBe(5);

    const result = pickupSeeds(game, 2);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.pitId).toBe(2);
      expect(result.data.seedsPickedUp).toBe(5);
    }

    expect(game.selectedPit).toBe(2);
    expect(game.pits[2].seeds).toBe(0);
    expect(game.seedsInHand).toBe(5);
    expect(game.turnPhase).toBe("PIT_SELECTED");

    // Microscopic 70-seed invariant holds true with seeds in hand!
    expect(getTotalSeeds(game)).toBe(70);
    expect(verifySeedConservation(game)).toBe(true);
  });

  it("should reject pickup from opponent's pit and not mutate state", () => {
    const game = createInitialGame("PLAYER_1");

    const result = pickupSeeds(game, 7);
    expect(result.success).toBe(false);
    expect(game.seedsInHand).toBe(0);
    expect(game.pits[7].seeds).toBe(5);
    expect(game.turnPhase).toBe("PLAYER_TURN");
    expect(verifySeedConservation(game)).toBe(true);
  });

  it("should reject pickup from empty pit", () => {
    const game = createInitialGame("PLAYER_1");
    game.pits[0].seeds = 0;

    const result = pickupSeeds(game, 0);
    expect(result.success).toBe(false);
    expect(game.seedsInHand).toBe(0);
    expect(game.turnPhase).toBe("PLAYER_TURN");
  });

  it("should reject pickup from CLOSED pit", () => {
    const game = createInitialGame("PLAYER_1");
    game.pits[1].status = "CLOSED";

    const result = pickupSeeds(game, 1);
    expect(result.success).toBe(false);
    expect(game.turnPhase).toBe("PLAYER_TURN");
  });
});
