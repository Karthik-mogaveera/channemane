import { describe, it, expect } from "vitest";
import { ChannemaneGame } from "../../src/engine/simulation";
import { createInitialGame } from "../../src/engine/board";
import { TOTAL_SEEDS } from "../../src/engine/constants";

describe("Engine Interactive Gameplay: Sowing, Capture, and Bonus", () => {
  it("Requirement 1-5: pauses when continuation is required and picks up seeds only after player confirmation", () => {
    const game = new ChannemaneGame("PLAYER_1");
    // Start turn with Pit 0 (has 5 seeds)
    const startRes = game.startTurn(0);
    expect(startRes.success).toBe(true);

    // Initial state after pickup: Pit 0 has 0 seeds, hand has 5
    expect(game.getState().pits[0].seeds).toBe(0);
    expect(game.getState().seedsInHand).toBe(5);

    // Step 5 times for the 5 drops (into P1, P2, P3, P4, P5)
    for (let i = 1; i <= 5; i++) {
      const stepRes = game.stepTurn();
      expect(stepRes.success).toBe(true);
      if (stepRes.success) {
        expect(stepRes.data.type).toBe("DROP");
        expect(stepRes.data.pitId).toBe(i);
      }
    }

    // Now hand is 0. Next open pit after destination P5 is P6 (has 5 seeds).
    // The next stepTurn MUST return WAITING_FOR_CONTINUATION on P6.
    const pauseStep = game.stepTurn();
    expect(pauseStep.success).toBe(true);
    if (pauseStep.success) {
      expect(pauseStep.data.type).toBe("WAITING_FOR_CONTINUATION");
      expect(pauseStep.data.nextContinuationPitId).toBe(6);
      expect(pauseStep.data.isComplete).toBe(false);
    }

    // Requirement 4: Pit 6 seeds MUST NOT be picked up before player confirmation!
    expect(game.getState().pits[6].seeds).toBe(5);
    expect(game.getState().seedsInHand).toBe(0);
    expect(game.getAwaitingContinuationPit()).toBe(6);

    // Requirement 6: Calling continueSowing with invalid pit must fail and not change seeds
    const invalidRes = game.continueSowing(3);
    expect(invalidRes.success).toBe(false);
    expect(game.getState().pits[6].seeds).toBe(5);
    expect(game.getState().seedsInHand).toBe(0);

    // Requirement 5: Valid confirmation on Pit 6 picks up its seeds and resumes
    const validRes = game.continueSowing(6);
    expect(validRes.success).toBe(true);
    expect(game.getState().pits[6].seeds).toBe(0);
    expect(game.getState().seedsInHand).toBe(5);
    expect(game.getAwaitingContinuationPit()).toBe(null);

    // Seed conservation: total seeds across board + hand + storage = 70
    const boardSeeds = game.getState().pits.reduce((s, p) => s + p.seeds, 0);
    const handSeeds = game.getState().seedsInHand;
    const storageSeeds =
      game.getState().players.player1.storage +
      game.getState().players.player2.storage;
    expect(boardSeeds + handSeeds + storageSeeds).toBe(TOTAL_SEEDS);
  });

  it("Requirement 10-17: pauses when capture condition is met and executes only upon player confirmation", () => {
    // Construct deterministic state where stopping on empty pit leads to capturable pit
    const customState = createInitialGame("PLAYER_1");
    // Clear all pits
    for (let i = 0; i < 14; i++) {
      customState.pits[i].seeds = 0;
    }
    // Set P0 = 1 seed (will drop into P1)
    customState.pits[0].seeds = 1;
    // Set P1 = 0 seeds (destination will be P1, hand empty)
    // Next open pit after destination P1: P2
    // If P2 = 0 seeds (empty), then next open pit after P2: P3
    // Set P3 = 6 seeds (capturable!)
    customState.pits[1].seeds = 0;
    customState.pits[2].seeds = 0;
    customState.pits[3].seeds = 6;
    customState.pits[4].seeds = 4; // keep other seeds on board so round doesn't end immediately
    customState.players.player1.storage = 29;
    customState.players.player2.storage = 30;

    const game = new ChannemaneGame("PLAYER_1", customState);
    game.startTurn(0);

    // Step 1: drop seed into P1. Hand is now 0.
    const dropRes = game.stepTurn();
    expect(dropRes.success).toBe(true);
    expect(game.getState().seedsInHand).toBe(0);

    // Destination pit is P1 (seeds: 1). Next open pit after P1 is P2 (seeds: 0).
    // Stopping condition met!
    // Next open pit after P2 is P3 (seeds: 6). Capturable!
    const capStep = game.stepTurn();
    expect(capStep.success).toBe(true);
    if (capStep.success) {
      expect(capStep.data.type).toBe("WAITING_FOR_CAPTURE");
      expect(capStep.data.capturablePitId).toBe(3);
      expect(capStep.data.capturableSeeds).toBe(6);
    }

    // Requirement 11: Seeds remain in capturable pit before confirmation!
    expect(game.getState().pits[3].seeds).toBe(6);
    expect(game.getState().players.player1.storage).toBe(29);
    expect(game.getAwaitingCapturePit()).toBe(3);

    // Requirement 14: Invalid pit tap does not execute capture
    const invalidCap = game.confirmCapture(4);
    expect(invalidCap.success).toBe(false);
    expect(game.getState().pits[3].seeds).toBe(6);
    expect(game.getState().players.player1.storage).toBe(29);

    // Requirement 12-13: Valid confirmation on Pit 3 transfers seeds to Player 1 storage
    const validCap = game.confirmCapture(3);
    expect(validCap.success).toBe(true);
    expect(game.getState().pits[3].seeds).toBe(0);
    expect(game.getState().players.player1.storage).toBe(35); // 29 + 6
    expect(game.getAwaitingCapturePit()).toBe(null);

    // Requirement 15: Repeated confirmation fails
    const repeatCap = game.confirmCapture(3);
    expect(repeatCap.success).toBe(false);
  });

  it("Requirement 23-26: bonus collection always awards pit owner and works mid-turn", () => {
    const customState = createInitialGame("PLAYER_1");
    // Pit 3 is owned by PLAYER_1
    customState.pits[3].seeds = 4;
    customState.pits[3].bonusAvailable = true;

    // Pit 10 is owned by PLAYER_2
    customState.pits[10].seeds = 4;
    customState.pits[10].bonusAvailable = true;

    const game = new ChannemaneGame("PLAYER_2", customState);

    // Requirement 25: Player 1's bonus is credited to Player 1 even during Player 2's turn
    const p1StorageBefore = game.getState().players.player1.storage;
    const claimRes1 = game.claimBonus(3);
    expect(claimRes1.success).toBe(true);
    expect(game.getState().players.player1.storage).toBe(p1StorageBefore + 4);
    expect(game.getState().pits[3].seeds).toBe(0);
    expect(game.getState().pits[3].bonusAvailable).toBe(false);

    // Requirement 26: Player 2's bonus is credited to Player 2
    const p2StorageBefore = game.getState().players.player2.storage;
    const claimRes2 = game.claimBonus(10);
    expect(claimRes2.success).toBe(true);
    expect(game.getState().players.player2.storage).toBe(p2StorageBefore + 4);
    expect(game.getState().pits[10].seeds).toBe(0);

    // Requirement 28: Duplicate claims fail
    const dupClaim = game.claimBonus(3);
    expect(dupClaim.success).toBe(false);
  });

  it("Requirement 38: Seed conservation invariant remains exactly 70 across all turns and bonus claims", () => {
    const game = new ChannemaneGame("PLAYER_1");
    const initialCheck = game.getState().pits.reduce((s, p) => s + p.seeds, 0);
    expect(initialCheck).toBe(TOTAL_SEEDS);

    // Run 5 turns with selectPit (auto-confirming continuations & captures)
    for (let turn = 0; turn < 5; turn++) {
      const selectable = game.getSelectablePits();
      if (selectable.length === 0) break;
      game.selectPit(selectable[0]);

      // Claim any available bonuses
      const bonuses = game.getClaimableBonuses();
      bonuses.forEach((b) => game.claimBonus(b));

      const boardSeeds = game.getState().pits.reduce((s, p) => s + p.seeds, 0);
      const handSeeds = game.getState().seedsInHand;
      const storageSeeds =
        game.getState().players.player1.storage +
        game.getState().players.player2.storage;
      expect(boardSeeds + handSeeds + storageSeeds).toBe(TOTAL_SEEDS);
    }
  });
});
