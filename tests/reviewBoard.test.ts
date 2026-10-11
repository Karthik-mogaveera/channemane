import { describe, it, expect } from "vitest";
import { executeRoundSettlement } from "../src/engine/settlement";
import { ChannemaneGame } from "../src/engine/simulation";
import { createInitialGame, verifySeedConservation } from "../src/engine/board";

describe("ISSUE 1: Review Board Pre-Settlement State Engine & Simulation Tests", () => {
  it("Test 1: round ends with seeds in several pits; preSettlementState preserves exact pit counts and storage", () => {
    const game = createInitialGame();
    for (const pit of game.pits) pit.seeds = 0;

    // Distribute remaining seeds: P1 has 1 seed, P4 has 1 seed, P8 has 1 seed
    game.pits[1].seeds = 1;
    game.pits[4].seeds = 1;
    game.pits[8].seeds = 1;
    game.players.player1.storage = 35;
    game.players.player2.storage = 32;

    expect(verifySeedConservation(game)).toBe(true);

    const result = executeRoundSettlement(game);
    expect(result.success).toBe(true);
    if (!result.success) throw new Error("Settlement failed");
    expect(result.data.preSettlementState).toBeDefined();

    const snapshot = result.data.preSettlementState!;
    // Snapshot pit seeds match pre-settlement exactly
    expect(snapshot.pits[1].seeds).toBe(1);
    expect(snapshot.pits[4].seeds).toBe(1);
    expect(snapshot.pits[8].seeds).toBe(1);
    expect(snapshot.pits[0].seeds).toBe(0);
    expect(snapshot.pits[7].seeds).toBe(0);

    // Snapshot storage counts match pre-settlement exactly
    expect(snapshot.players.player1.storage).toBe(35);
    expect(snapshot.players.player2.storage).toBe(32);

    // Authoritative game pits are cleared to 0
    for (const pit of game.pits) {
      expect(pit.seeds).toBe(0);
    }
    // Authoritative storage received transferred seeds
    expect(game.players.player1.storage).toBe(37); // 35 + 2
    expect(game.players.player2.storage).toBe(33); // 32 + 1
  });

  it("Test 2: round ends with 3 seeds distributed as 0/3, 1/2, 2/1, 3/0; review snapshot preserves exact pit distribution", () => {
    const distributions = [
      { p1Seeds: [0, 0, 0, 0, 0, 0, 0], p2Seeds: [1, 2, 0, 0, 0, 0, 0] }, // 0/3
      { p1Seeds: [1, 0, 0, 0, 0, 0, 0], p2Seeds: [0, 2, 0, 0, 0, 0, 0] }, // 1/2
      { p1Seeds: [1, 1, 0, 0, 0, 0, 0], p2Seeds: [0, 0, 1, 0, 0, 0, 0] }, // 2/1
      { p1Seeds: [3, 0, 0, 0, 0, 0, 0], p2Seeds: [0, 0, 0, 0, 0, 0, 0] }, // 3/0
    ];

    for (const dist of distributions) {
      const game = createInitialGame();
      for (const pit of game.pits) pit.seeds = 0;

      for (let i = 0; i < 7; i++) game.pits[i].seeds = dist.p1Seeds[i];
      for (let i = 0; i < 7; i++) game.pits[7 + i].seeds = dist.p2Seeds[i];

      game.players.player1.storage = 34;
      game.players.player2.storage = 33;
      expect(verifySeedConservation(game)).toBe(true);

      const result = executeRoundSettlement(game);
      expect(result.success).toBe(true);
      if (!result.success) throw new Error("Settlement failed");
      const snapshot = result.data.preSettlementState!;

      for (let i = 0; i < 7; i++) {
        expect(snapshot.pits[i].seeds).toBe(dist.p1Seeds[i]);
      }
      for (let i = 0; i < 7; i++) {
        expect(snapshot.pits[7 + i].seeds).toBe(dist.p2Seeds[i]);
      }
      expect(snapshot.players.player1.storage).toBe(34);
      expect(snapshot.players.player2.storage).toBe(33);
    }
  });

  it("Test 3: round ends with 2, 1, or 0 seeds remaining; snapshot preserves historical counts", () => {
    for (const totalRemaining of [2, 1, 0]) {
      const game = createInitialGame();
      for (const pit of game.pits) pit.seeds = 0;

      if (totalRemaining === 2) {
        game.pits[2].seeds = 1;
        game.pits[9].seeds = 1;
      } else if (totalRemaining === 1) {
        game.pits[3].seeds = 1;
      }

      game.players.player1.storage = 35;
      game.players.player2.storage = 35 - totalRemaining;
      expect(verifySeedConservation(game)).toBe(true);

      const result = executeRoundSettlement(game);
      expect(result.success).toBe(true);
      if (!result.success) throw new Error("Settlement failed");
      const snapshot = result.data.preSettlementState!;

      if (totalRemaining === 2) {
        expect(snapshot.pits[2].seeds).toBe(1);
        expect(snapshot.pits[9].seeds).toBe(1);
      } else if (totalRemaining === 1) {
        expect(snapshot.pits[3].seeds).toBe(1);
      } else {
        for (const pit of snapshot.pits) {
          expect(pit.seeds).toBe(0);
        }
      }
      expect(snapshot.players.player1.storage).toBe(35);
      expect(snapshot.players.player2.storage).toBe(35 - totalRemaining);
    }
  });

  it("Test 4 & 5: pre-settlement storage counts are preserved, and snapshot does not modify authoritative settled state", () => {
    const game = createInitialGame();
    for (const pit of game.pits) pit.seeds = 0;
    game.pits[0].seeds = 2;
    game.pits[7].seeds = 1;
    game.players.player1.storage = 30;
    game.players.player2.storage = 37;

    const result = executeRoundSettlement(game);
    expect(result.success).toBe(true);
    if (!result.success) throw new Error("Settlement failed");
    const snapshot = result.data.preSettlementState!;

    // Pre-settlement snapshot has pre-settlement storage
    expect(snapshot.players.player1.storage).toBe(30);
    expect(snapshot.players.player2.storage).toBe(37);

    // Authoritative settled state has post-settlement storage
    expect(game.players.player1.storage).toBe(32);
    expect(game.players.player2.storage).toBe(38);

    // Modifying snapshot cannot mutate live game
    snapshot.pits[0].seeds = 99;
    expect(game.pits[0].seeds).toBe(0);
  });

  it("Test 8: ChannemaneGame simulation captures preSettlementState and clears it on startNextRound()", () => {
    const customState = createInitialGame("PLAYER_1");
    for (const pit of customState.pits) pit.seeds = 0;
    customState.pits[0].seeds = 2;
    customState.pits[7].seeds = 1;
    customState.players.player1.storage = 30;
    customState.players.player2.storage = 37;
    expect(verifySeedConservation(customState)).toBe(true);

    const sim = new ChannemaneGame("PLAYER_1", customState);
    // P0 has 2 seeds. Picking P0 sows into P1, P2.
    // Total board seeds remains 3 < 4, so round ends upon turn completion!
    const turnRes = sim.selectPit(0);
    expect(turnRes.success).toBe(true);
    expect(sim.isTurnInProgress()).toBe(false);

    const lastRes = sim.getLastTurnResult();
    expect(lastRes?.roundEnded).toBe(true);
    expect(lastRes?.roundSettlement?.preSettlementState).toBeDefined();

    const preState = sim.getPreSettlementState();
    expect(preState).not.toBeNull();
    // Pre-settlement pits had 1 in P1 and 1 in P2 and 1 in P7 = 3 seeds
    expect(preState!.pits[1].seeds).toBe(1);
    expect(preState!.pits[2].seeds).toBe(1);
    expect(preState!.pits[7].seeds).toBe(1);
    expect(preState!.players.player1.storage).toBe(30);
    expect(preState!.players.player2.storage).toBe(37);

    // Authoritative state is settled (pits cleared, storage updated)
    const settledState = sim.getState();
    expect(settledState.phase).toBe("ROUND_SETTLEMENT");
    expect(settledState.pits.every((p) => p.seeds === 0)).toBe(true);
    expect(settledState.players.player1.storage).toBe(32);
    expect(settledState.players.player2.storage).toBe(38);

    // Calling startNextRound clears preSettlementState
    const nextRoundRes = sim.startNextRound();
    expect(nextRoundRes.success).toBe(true);
    expect(sim.getPreSettlementState()).toBeNull();
  });

  it("Test 9: bonus-triggered settlement preserves the correct pre-settlement snapshot", () => {
    const customState = createInitialGame("PLAYER_1");
    for (const pit of customState.pits) pit.seeds = 0;

    // Pit P2 has 4 seeds with bonus available (owned by Player 1)
    // Other pits have 2 seeds total. Total board seeds = 4 + 2 = 6.
    // When bonus on P2 is claimed, 4 seeds removed from board -> 2 seeds remaining (<4) -> Round ends!
    customState.pits[2].seeds = 4;
    customState.pits[2].bonusAvailable = true;
    customState.pits[8].seeds = 2;
    customState.players.player1.storage = 30;
    customState.players.player2.storage = 34;
    expect(verifySeedConservation(customState)).toBe(true);

    const sim = new ChannemaneGame("PLAYER_1", customState);
    const bonusRes = sim.claimBonus(2);
    expect(bonusRes.success).toBe(true);
    if (!bonusRes.success) throw new Error("Bonus claim failed");
    expect(bonusRes.data.roundEnded).toBe(true);
    expect(bonusRes.data.roundSettlement).toBeDefined();

    const snapshot = bonusRes.data.roundSettlement!.preSettlementState!;
    expect(snapshot).toBeDefined();
    // At the moment of round settlement (after claiming bonus, before round settlement transfers board seeds):
    // P2 had 0 seeds (claimed), P8 had 2 seeds.
    // Player 1 had 30 + 4 = 34 in storage.
    // Player 2 had 34 in storage.
    expect(snapshot.pits[8].seeds).toBe(2);
    expect(snapshot.pits[2].seeds).toBe(0);
    expect(snapshot.players.player1.storage).toBe(34);
    expect(snapshot.players.player2.storage).toBe(34);

    // Authoritative settled game transferred remaining 2 seeds from P8 (Player 2) to Player 2
    const settledState = sim.getState();
    expect(settledState.players.player2.storage).toBe(36);
    expect(settledState.pits[8].seeds).toBe(0);
  });
});
