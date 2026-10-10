import { describe, it, expect } from "vitest";
import { ChannemaneGame } from "../src/engine/simulation";
import { createInitialGame, verifySeedConservation } from "../src/engine/board";
import type { ActionResult } from "../src/engine/types";

function assertSuccess<T>(res: ActionResult<T>): T {
  expect(res.success).toBe(true);
  if (!res.success) {
    throw new Error((res as { error: string }).error);
  }
  return res.data;
}

describe("Mandatory Seven-Scenario Test Matrix (Critical Bonus Claim)", () => {
  it("Scenario 1a: Player 1 is sowing; Player 1 pit reaches 4 seeds; Claim clicked immediately", () => {
    const initialState = createInitialGame("PLAYER_1");
    // P0 has 2 seeds, P1 has 5 seeds, P2 has 3 seeds
    initialState.pits[0].seeds = 2;
    initialState.pits[1].seeds = 5;
    initialState.pits[2].seeds = 3;
    // P1 storage = 5 (to maintain 70 total seeds: 11*5 + 2 + 5 + 3 + 5 = 70)
    initialState.players.player1.storage = 5;
    expect(verifySeedConservation(initialState)).toBe(true);

    const game = new ChannemaneGame("PLAYER_1", initialState);
    const initialP1Storage = game.getState().players.player1.storage; // 5
    const initialP2Storage = game.getState().players.player2.storage; // 0

    // Player 1 starts turn from P0 (picks up 2 seeds)
    const startRes = assertSuccess(game.startTurn(0));
    expect(startRes.pitId).toBe(0);
    expect(game.isTurnInProgress()).toBe(true);

    // Step 1: Drops into P1 (P1 now has 6 seeds, 1 seed in hand)
    const step1 = assertSuccess(game.stepTurn());
    expect(step1.pitId).toBe(1);

    // Step 2: Drops into P2 (P2 transitions 3 -> 4 seeds, bonusAvailable becomes true!)
    const step2 = assertSuccess(game.stepTurn());
    expect(step2.pitId).toBe(2);
    expect(step2.resultingSeeds).toBe(4);
    expect(step2.bonusTriggered).toBe(true);

    const stateAtBonus = game.getState();
    expect(stateAtBonus.pits[2].seeds).toBe(4);
    expect(stateAtBonus.pits[2].bonusAvailable).toBe(true);
    expect(stateAtBonus.pits[2].owner).toBe("PLAYER_1");

    // Click Claim IMMEDIATELY while sowing is in progress!
    const claimRes = assertSuccess(game.claimBonus(2));
    expect(claimRes.owner).toBe("PLAYER_1");
    expect(claimRes.seedsClaimed).toBe(4);

    // Assert: Correct owner storage increases by exactly 4
    const stateAfterClaim = game.getState();
    expect(stateAfterClaim.players.player1.storage).toBe(initialP1Storage + 4);
    // Other player storage unchanged
    expect(stateAfterClaim.players.player2.storage).toBe(initialP2Storage);
    // Claimed pit becomes empty and bonus flag resets
    expect(stateAfterClaim.pits[2].seeds).toBe(0);
    expect(stateAfterClaim.pits[2].bonusAvailable).toBe(false);

    // Second claim attempt awards 0 additional seeds
    const secondClaim = game.claimBonus(2);
    expect(secondClaim.success).toBe(false);
    expect(game.getState().players.player1.storage).toBe(initialP1Storage + 4);

    // Total seeds remain exactly 70
    expect(verifySeedConservation(game.getState())).toBe(true);

    // Continue stepping turn to completion
    while (game.isTurnInProgress()) {
      game.stepTurn();
    }
    expect(verifySeedConservation(game.getState())).toBe(true);
  });

  it("Scenario 1b: Player 1 is sowing; Player 2 pit reaches 4 seeds; Claim clicked immediately", () => {
    const initialState = createInitialGame("PLAYER_1");
    // P6 (P1 pit) has 1 seed; P7 (P2 pit) has 3 seeds
    initialState.pits[6].seeds = 1;
    initialState.pits[7].seeds = 3;
    initialState.players.player1.storage = 6; // 12*5 + 1 + 3 + 6 = 70
    expect(verifySeedConservation(initialState)).toBe(true);

    const game = new ChannemaneGame("PLAYER_1", initialState);
    const initialP1Storage = game.getState().players.player1.storage; // 6
    const initialP2Storage = game.getState().players.player2.storage; // 0

    // Player 1 starts turn from P6
    const startRes = assertSuccess(game.startTurn(6));
    expect(startRes.pitId).toBe(6);

    // Step 1: Drops into P7 (P7 transitions 3 -> 4, bonusTriggered = true)
    const step1 = assertSuccess(game.stepTurn());
    expect(step1.pitId).toBe(7);
    expect(step1.resultingSeeds).toBe(4);
    expect(step1.bonusTriggered).toBe(true);

    expect(game.getState().pits[7].owner).toBe("PLAYER_2");

    // Click Claim IMMEDIATELY while sowing is in progress!
    const claimRes = assertSuccess(game.claimBonus(7));
    expect(claimRes.owner).toBe("PLAYER_2");

    // Assert: Player 2 (pit owner) storage increases by 4!
    const stateAfterClaim = game.getState();
    expect(stateAfterClaim.players.player2.storage).toBe(initialP2Storage + 4);
    // Player 1 storage is unchanged
    expect(stateAfterClaim.players.player1.storage).toBe(initialP1Storage);
    // P7 is now empty
    expect(stateAfterClaim.pits[7].seeds).toBe(0);
    expect(stateAfterClaim.pits[7].bonusAvailable).toBe(false);

    // Second claim attempt fails
    const secondClaim = game.claimBonus(7);
    expect(secondClaim.success).toBe(false);

    // Seed conservation valid
    expect(verifySeedConservation(game.getState())).toBe(true);

    // Complete turn
    while (game.isTurnInProgress()) {
      game.stepTurn();
    }
    expect(verifySeedConservation(game.getState())).toBe(true);
  });

  it("Scenario 2a: Player 2 is sowing; Player 2 pit reaches 4 seeds; Claim clicked immediately", () => {
    const initialState = createInitialGame("PLAYER_2");
    // P7 has 1 seed; P8 has 3 seeds
    initialState.pits[7].seeds = 1;
    initialState.pits[8].seeds = 3;
    initialState.players.player2.storage = 6;
    expect(verifySeedConservation(initialState)).toBe(true);

    const game = new ChannemaneGame("PLAYER_2", initialState);
    const initialP1Storage = game.getState().players.player1.storage; // 0
    const initialP2Storage = game.getState().players.player2.storage; // 6

    assertSuccess(game.startTurn(7));
    const step1 = assertSuccess(game.stepTurn());
    expect(step1.pitId).toBe(8);
    expect(step1.resultingSeeds).toBe(4);
    expect(step1.bonusTriggered).toBe(true);

    // Click Claim on P8
    const claimRes = assertSuccess(game.claimBonus(8));
    expect(claimRes.owner).toBe("PLAYER_2");

    const stateAfterClaim = game.getState();
    expect(stateAfterClaim.players.player2.storage).toBe(initialP2Storage + 4);
    expect(stateAfterClaim.players.player1.storage).toBe(initialP1Storage);
    expect(stateAfterClaim.pits[8].seeds).toBe(0);
    expect(stateAfterClaim.pits[8].bonusAvailable).toBe(false);

    // Second claim fails
    expect(game.claimBonus(8).success).toBe(false);
    expect(verifySeedConservation(game.getState())).toBe(true);
  });

  it("Scenario 2b: Player 2 is sowing; Player 1 pit reaches 4 seeds; Claim clicked immediately", () => {
    const initialState = createInitialGame("PLAYER_2");
    // P13 has 1 seed; P0 has 3 seeds
    initialState.pits[13].seeds = 1;
    initialState.pits[0].seeds = 3;
    initialState.players.player2.storage = 6;
    expect(verifySeedConservation(initialState)).toBe(true);

    const game = new ChannemaneGame("PLAYER_2", initialState);
    const initialP1Storage = game.getState().players.player1.storage; // 0
    const initialP2Storage = game.getState().players.player2.storage; // 6

    assertSuccess(game.startTurn(13));
    const step1 = assertSuccess(game.stepTurn());
    expect(step1.pitId).toBe(0);
    expect(step1.resultingSeeds).toBe(4);
    expect(step1.bonusTriggered).toBe(true);

    // Click Claim on P0 (Player 1 pit)
    const claimRes = assertSuccess(game.claimBonus(0));
    expect(claimRes.owner).toBe("PLAYER_1");

    const stateAfterClaim = game.getState();
    expect(stateAfterClaim.players.player1.storage).toBe(initialP1Storage + 4);
    expect(stateAfterClaim.players.player2.storage).toBe(initialP2Storage);
    expect(stateAfterClaim.pits[0].seeds).toBe(0);
    expect(stateAfterClaim.pits[0].bonusAvailable).toBe(false);

    expect(game.claimBonus(0).success).toBe(false);
    expect(verifySeedConservation(game.getState())).toBe(true);
  });

  it("Scenario 3: Sowing has finished; Claim is clicked on an eligible pit", () => {
    const initialState = createInitialGame("PLAYER_1");
    // Setup P4 with 4 seeds and bonusAvailable = true, game not in sowing
    initialState.pits[4].seeds = 4;
    initialState.pits[4].bonusAvailable = true;
    initialState.players.player1.storage = 1;
    expect(verifySeedConservation(initialState)).toBe(true);

    const game = new ChannemaneGame("PLAYER_1", initialState);
    expect(game.isTurnInProgress()).toBe(false);

    const claimRes = assertSuccess(game.claimBonus(4));
    expect(claimRes.owner).toBe("PLAYER_1");
    expect(claimRes.seedsClaimed).toBe(4);

    const state = game.getState();
    expect(state.players.player1.storage).toBe(5);
    expect(state.players.player2.storage).toBe(0);
    expect(state.pits[4].seeds).toBe(0);
    expect(state.pits[4].bonusAvailable).toBe(false);

    expect(game.claimBonus(4).success).toBe(false);
    expect(verifySeedConservation(state)).toBe(true);
  });

  it("Scenario 4: Player 1's turn; Player 2's bonus pit Claim button is clicked", () => {
    const initialState = createInitialGame("PLAYER_1");
    expect(initialState.currentPlayer).toBe("PLAYER_1");

    // P10 belongs to Player 2
    initialState.pits[10].seeds = 4;
    initialState.pits[10].bonusAvailable = true;
    initialState.players.player2.storage = 1;
    expect(verifySeedConservation(initialState)).toBe(true);

    const game = new ChannemaneGame("PLAYER_1", initialState);

    // Click Claim on P10
    const claimRes = assertSuccess(game.claimBonus(10));
    expect(claimRes.owner).toBe("PLAYER_2");

    const state = game.getState();
    expect(state.players.player2.storage).toBe(5);
    expect(state.players.player1.storage).toBe(0);
    expect(state.pits[10].seeds).toBe(0);
    expect(state.pits[10].bonusAvailable).toBe(false);

    expect(game.claimBonus(10).success).toBe(false);
    expect(verifySeedConservation(state)).toBe(true);
  });

  it("Scenario 5: Player 1's turn; Player 1's bonus pit Claim button is clicked", () => {
    const initialState = createInitialGame("PLAYER_1");
    expect(initialState.currentPlayer).toBe("PLAYER_1");

    // P3 belongs to Player 1
    initialState.pits[3].seeds = 4;
    initialState.pits[3].bonusAvailable = true;
    initialState.players.player1.storage = 1;
    expect(verifySeedConservation(initialState)).toBe(true);

    const game = new ChannemaneGame("PLAYER_1", initialState);

    // Click Claim on P3
    const claimRes = assertSuccess(game.claimBonus(3));
    expect(claimRes.owner).toBe("PLAYER_1");

    const state = game.getState();
    expect(state.players.player1.storage).toBe(5);
    expect(state.players.player2.storage).toBe(0);
    expect(state.pits[3].seeds).toBe(0);
    expect(state.pits[3].bonusAvailable).toBe(false);

    expect(game.claimBonus(3).success).toBe(false);
    expect(verifySeedConservation(state)).toBe(true);
  });

  it("Scenario 6: Player 2's turn; Player 1's bonus pit Claim button is clicked", () => {
    const initialState = createInitialGame("PLAYER_2");
    expect(initialState.currentPlayer).toBe("PLAYER_2");

    // P5 belongs to Player 1
    initialState.pits[5].seeds = 4;
    initialState.pits[5].bonusAvailable = true;
    initialState.players.player1.storage = 1;
    expect(verifySeedConservation(initialState)).toBe(true);

    const game = new ChannemaneGame("PLAYER_2", initialState);

    // Click Claim on P5
    const claimRes = assertSuccess(game.claimBonus(5));
    expect(claimRes.owner).toBe("PLAYER_1");

    const state = game.getState();
    expect(state.players.player1.storage).toBe(5);
    expect(state.players.player2.storage).toBe(0);
    expect(state.pits[5].seeds).toBe(0);
    expect(state.pits[5].bonusAvailable).toBe(false);

    expect(game.claimBonus(5).success).toBe(false);
    expect(verifySeedConservation(state)).toBe(true);
  });

  it("Scenario 7: Player 2's turn; Player 2's bonus pit Claim button is clicked", () => {
    const initialState = createInitialGame("PLAYER_2");
    expect(initialState.currentPlayer).toBe("PLAYER_2");

    // P11 belongs to Player 2
    initialState.pits[11].seeds = 4;
    initialState.pits[11].bonusAvailable = true;
    initialState.players.player2.storage = 1;
    expect(verifySeedConservation(initialState)).toBe(true);

    const game = new ChannemaneGame("PLAYER_2", initialState);

    // Click Claim on P11
    const claimRes = assertSuccess(game.claimBonus(11));
    expect(claimRes.owner).toBe("PLAYER_2");

    const state = game.getState();
    expect(state.players.player2.storage).toBe(5);
    expect(state.players.player1.storage).toBe(0);
    expect(state.pits[11].seeds).toBe(0);
    expect(state.pits[11].bonusAvailable).toBe(false);

    expect(game.claimBonus(11).success).toBe(false);
    expect(verifySeedConservation(state)).toBe(true);
  });
});
