import { describe, it, expect } from "vitest";
import {
  createInitialGame,
  getTotalSeeds,
  verifySeedConservation,
  getActivePlayers,
  getNextActivePlayer,
} from "../../src/engine/board";
import {
  FIVE_PLAYER_TOTAL_PITS,
  FIVE_PLAYER_TOTAL_SEEDS,
  FIVE_PLAYER_P1_PITS,
  FIVE_PLAYER_P2_PITS,
  FIVE_PLAYER_P3_PITS,
  FIVE_PLAYER_P4_PITS,
  FIVE_PLAYER_P5_PITS,
  FIVE_PLAYER_GROUPS_ALL,
  FIVE_PLAYER_GROUPS_P1_DISQUALIFIED,
  FIVE_PLAYER_GROUPS_P2_DISQUALIFIED,
  FIVE_PLAYER_GROUPS_P3_DISQUALIFIED,
  FIVE_PLAYER_GROUPS_P4_DISQUALIFIED,
  FIVE_PLAYER_GROUPS_P5_DISQUALIFIED,
  FIVE_PLAYER_GROUPS_P1_P2_DISQUALIFIED,
  FIVE_PLAYER_GROUPS_P1_P3_DISQUALIFIED,
  FIVE_PLAYER_GROUPS_P1_P4_DISQUALIFIED,
  FIVE_PLAYER_GROUPS_P1_P5_DISQUALIFIED,
  FIVE_PLAYER_GROUPS_P2_P3_DISQUALIFIED,
  FIVE_PLAYER_GROUPS_P2_P4_DISQUALIFIED,
  FIVE_PLAYER_GROUPS_P2_P5_DISQUALIFIED,
  FIVE_PLAYER_GROUPS_P3_P4_DISQUALIFIED,
  FIVE_PLAYER_GROUPS_P3_P5_DISQUALIFIED,
  FIVE_PLAYER_GROUPS_P4_P5_DISQUALIFIED,
  FIVE_PLAYER_GROUPS_P1_P2_P3_DISQUALIFIED,
  FIVE_PLAYER_GROUPS_P1_P2_P4_DISQUALIFIED,
  FIVE_PLAYER_GROUPS_P1_P2_P5_DISQUALIFIED,
  FIVE_PLAYER_GROUPS_P1_P3_P4_DISQUALIFIED,
  FIVE_PLAYER_GROUPS_P1_P3_P5_DISQUALIFIED,
  FIVE_PLAYER_GROUPS_P1_P4_P5_DISQUALIFIED,
  FIVE_PLAYER_GROUPS_P2_P3_P4_DISQUALIFIED,
  FIVE_PLAYER_GROUPS_P2_P3_P5_DISQUALIFIED,
  FIVE_PLAYER_GROUPS_P2_P4_P5_DISQUALIFIED,
  FIVE_PLAYER_GROUPS_P3_P4_P5_DISQUALIFIED,
  getFivePlayerGroups,
  getPitOwner,
  getFivePlayerPitOwner,
} from "../../src/engine/constants";
import {
  getNextOpenPit,
  getFollowingOpenPit,
} from "../../src/engine/traversal";
import { sowFromPit } from "../../src/engine/sowing";
import { claimBonus } from "../../src/engine/bonus";
import { evaluateAndExecuteCapture } from "../../src/engine/capture";
import { setupNextRound } from "../../src/engine/roundSetup";
import { computeMatchRankings } from "../../src/engine/matchEnd";

const create5PGame = () => createInitialGame("PLAYER_1", "local", null, "PLAYER_2", 5);

describe("5-Player Channemane Engine & Rules Suite", () => {
  describe("1. Initial 5-Player Board Setup and Ownership", () => {
    it("initializes board with 20 pits, 5 seeds per pit, 100 total seeds, and 5 players with 0 storage", () => {
      const state = create5PGame();

      expect(state.playerCount).toBe(5);
      expect(state.pits.length).toBe(FIVE_PLAYER_TOTAL_PITS); // 20
      expect(getTotalSeeds(state)).toBe(FIVE_PLAYER_TOTAL_SEEDS); // 100
      expect(state.removedSeeds).toBe(0);
      expect(verifySeedConservation(state)).toBe(true);

      // Check each player's storage is initially 0
      expect(state.players.player1.storage).toBe(0);
      expect(state.players.player2.storage).toBe(0);
      expect(state.players.player3?.storage).toBe(0);
      expect(state.players.player4?.storage).toBe(0);
      expect(state.players.player5?.storage).toBe(0);

      // Check active players: P1, P2, P3, P4, P5
      const active = getActivePlayers(state);
      expect(active).toEqual(["PLAYER_1", "PLAYER_2", "PLAYER_3", "PLAYER_4", "PLAYER_5"]);
      expect(state.currentPlayer).toBe("PLAYER_1");

      // Verify every pit is open with 5 seeds
      for (let i = 0; i < 20; i++) {
        expect(state.pits[i]!.seeds).toBe(5);
        expect(state.pits[i]!.status).toBe("OPEN");
      }
    });

    it("assigns authoritative pit ownership across 20 pits", () => {
      FIVE_PLAYER_P1_PITS.forEach((id) => {
        expect(getPitOwner(id, 20)).toBe("PLAYER_1");
        expect(getFivePlayerPitOwner(id)).toBe("PLAYER_1");
      });
      FIVE_PLAYER_P2_PITS.forEach((id) => {
        expect(getPitOwner(id, 20)).toBe("PLAYER_2");
        expect(getFivePlayerPitOwner(id)).toBe("PLAYER_2");
      });
      FIVE_PLAYER_P3_PITS.forEach((id) => {
        expect(getPitOwner(id, 20)).toBe("PLAYER_3");
        expect(getFivePlayerPitOwner(id)).toBe("PLAYER_3");
      });
      FIVE_PLAYER_P4_PITS.forEach((id) => {
        expect(getPitOwner(id, 20)).toBe("PLAYER_4");
        expect(getFivePlayerPitOwner(id)).toBe("PLAYER_4");
      });
      FIVE_PLAYER_P5_PITS.forEach((id) => {
        expect(getPitOwner(id, 20)).toBe("PLAYER_5");
        expect(getFivePlayerPitOwner(id)).toBe("PLAYER_5");
      });
    });
  });

  describe("2. Authoritative Pit Traversal & Sowing Direction", () => {
    it("follows authoritative clockwise circular sequence P0 -> P1 -> ... -> P19 -> P0", () => {
      const state = create5PGame();

      for (let i = 0; i < 20; i++) {
        const expectedNext = (i + 1) % 20;
        expect(getNextOpenPit(i, state.pits)).toBe(expectedNext);
      }
    });

    it("skips closed pits seamlessly during traversal", () => {
      const state = create5PGame();
      state.pits[7].status = "CLOSED";
      state.pits[8].status = "CLOSED";

      expect(getNextOpenPit(6, state.pits)).toBe(9);
      expect(getFollowingOpenPit(6, state.pits)).toBe(10);
    });

    it("sows continuously and scoops seeds when landing on a non-empty pit", () => {
      const state = create5PGame();
      for (let i = 0; i < 20; i++) {
        state.pits[i].seeds = 0;
      }
      state.pits[0].seeds = 2; // drops into P1 and P2
      state.pits[3].seeds = 1; // next open pit after P2 is P3 -> scoops and drops into P4
      // Put remaining 97 seeds into storage so invariant holds
      state.players.player1.storage = 97;

      const res = sowFromPit(state, 0);
      expect(res.success).toBe(true);
      if (!res.success) throw new Error("Expected sowing to succeed");
      expect(res.data.finalDestinationPit).toBe(4);
      expect(state.pits[0].seeds).toBe(0);
      expect(state.pits[1].seeds).toBe(1);
      expect(state.pits[2].seeds).toBe(1);
      expect(state.pits[3].seeds).toBe(0);
      expect(state.pits[4].seeds).toBe(1);
      expect(verifySeedConservation(state)).toBe(true);
    });
  });

  describe("3. Turn Order & Rotation", () => {
    it("rotates turns in order: P1 -> P2 -> P3 -> P4 -> P5 -> P1", () => {
      const state = create5PGame();

      expect(getNextActivePlayer(state, "PLAYER_1")).toBe("PLAYER_2");
      expect(getNextActivePlayer(state, "PLAYER_2")).toBe("PLAYER_3");
      expect(getNextActivePlayer(state, "PLAYER_3")).toBe("PLAYER_4");
      expect(getNextActivePlayer(state, "PLAYER_4")).toBe("PLAYER_5");
      expect(getNextActivePlayer(state, "PLAYER_5")).toBe("PLAYER_1");
    });

    it("skips disqualified players in turn rotation", () => {
      const state = create5PGame();
      state.disqualifiedPlayers = ["PLAYER_2", "PLAYER_4"];

      expect(getNextActivePlayer(state, "PLAYER_1")).toBe("PLAYER_3");
      expect(getNextActivePlayer(state, "PLAYER_3")).toBe("PLAYER_5");
      expect(getNextActivePlayer(state, "PLAYER_5")).toBe("PLAYER_1");
    });
  });

  describe("4. Capture & Bonus Evaluation", () => {
    it("credits captures by Player 5 directly to Player 5 storage", () => {
      const state = create5PGame();
      state.currentPlayer = "PLAYER_5";
      // To trigger capture, destination pit must land on empty pit, next open pit is empty, following open pit has seeds
      // Or continuous sowing ends on destination pit (P1). Next open pit (P2) is empty. Following pit (P3) has seeds.
      state.pits[2].seeds = 0; // empty pit between destination and captured pit
      state.pits[3].seeds = 10; // 5 original + 5 from pit 2

      const capRes = evaluateAndExecuteCapture(state, 1);
      expect(capRes.capturedPitId).toBe(3);
      expect(capRes.capturedSeeds).toBe(10);
      expect(state.pits[3].seeds).toBe(0);
      expect(state.players.player5?.storage).toBe(10);
      expect(state.players.player5?.roundCaptured).toBe(10);
      expect(verifySeedConservation(state)).toBe(true);
    });

    it("claims 4-seed bonus for Player 5 and deposits seeds in storage", () => {
      const state = create5PGame();
      state.pits[17].seeds = 4;
      state.pits[18].seeds = 6; // balance conservation: 4 + 6 = 10
      state.pits[17].bonusAvailable = true;

      const bonusRes = claimBonus(state, 17, "PLAYER_5");
      expect(bonusRes.success).toBe(true);
      expect(state.pits[17].seeds).toBe(0);
      expect(state.pits[17].bonusAvailable).toBe(false);
      expect(state.players.player5?.storage).toBe(4);
      expect(verifySeedConservation(state)).toBe(true);
    });
  });

  describe("5. Disqualification & Seed Accounting Progression", () => {
    it("1st elimination (5 -> 4): removes 20 seeds permanently, allocates 20 seeds to remaining 4 players (80 active seeds)", () => {
      const state = create5PGame();
      state.phase = "ROUND_SETTLEMENT";
      for (const p of state.pits) p.seeds = 0;

      // P5 has 0 seeds (ineligible), P1..P4 each have 25 seeds
      state.players.player1.storage = 25;
      state.players.player2.storage = 25;
      if (state.players.player3) state.players.player3.storage = 25;
      if (state.players.player4) state.players.player4.storage = 25;
      if (state.players.player5) state.players.player5.storage = 0;

      const setupRes = setupNextRound(state);
      expect(setupRes.success).toBe(true);
      expect(state.disqualifiedPlayers).toEqual(["PLAYER_5"]);
      expect(state.removedSeeds).toBe(20);

      // Remaining 4 players active
      expect(getActivePlayers(state)).toEqual(["PLAYER_1", "PLAYER_2", "PLAYER_3", "PLAYER_4"]);
      // P5 pits closed
      FIVE_PLAYER_P5_PITS.forEach((id) => {
        expect(state.pits[id].status).toBe("CLOSED");
        expect(state.pits[id].seeds).toBe(0);
      });

      // Total seeds in play = 80 active seeds + 20 removedSeeds = 100
      expect(getTotalSeeds(state)).toBe(80);
      expect(verifySeedConservation(state)).toBe(true);
    });

    it("2nd elimination (4 -> 3): removes another 20 seeds, 3 players continue with 60 active seeds", () => {
      const state = create5PGame();
      state.phase = "ROUND_SETTLEMENT";
      state.disqualifiedPlayers = ["PLAYER_5"];
      state.removedSeeds = 20;
      for (const p of state.pits) p.seeds = 0;

      // Now P4 also has < 5 seeds, P1..P3 have sufficient
      state.players.player1.storage = 30;
      state.players.player2.storage = 30;
      if (state.players.player3) state.players.player3.storage = 20;
      if (state.players.player4) state.players.player4.storage = 0;
      if (state.players.player5) state.players.player5.storage = 0;

      const setupRes = setupNextRound(state);
      expect(setupRes.success).toBe(true);
      expect(state.disqualifiedPlayers).toEqual(["PLAYER_5", "PLAYER_4"]);
      expect(state.removedSeeds).toBe(40);

      expect(getActivePlayers(state)).toEqual(["PLAYER_1", "PLAYER_2", "PLAYER_3"]);
      expect(getTotalSeeds(state)).toBe(60);
      expect(verifySeedConservation(state)).toBe(true);
    });

    it("3rd elimination (3 -> 2): removes another 20 seeds, 2 players continue with 40 active seeds", () => {
      const state = create5PGame();
      state.phase = "ROUND_SETTLEMENT";
      state.disqualifiedPlayers = ["PLAYER_5", "PLAYER_4"];
      state.removedSeeds = 40;
      for (const p of state.pits) p.seeds = 0;

      // Now P3 has < 5 seeds
      state.players.player1.storage = 30;
      state.players.player2.storage = 30;
      if (state.players.player3) state.players.player3.storage = 0;
      if (state.players.player4) state.players.player4.storage = 0;
      if (state.players.player5) state.players.player5.storage = 0;

      const setupRes = setupNextRound(state);
      expect(setupRes.success).toBe(true);
      expect(state.disqualifiedPlayers).toEqual(["PLAYER_5", "PLAYER_4", "PLAYER_3"]);
      expect(state.removedSeeds).toBe(60);

      expect(getActivePlayers(state)).toEqual(["PLAYER_1", "PLAYER_2"]);
      expect(getTotalSeeds(state)).toBe(40);
      expect(verifySeedConservation(state)).toBe(true);
    });

    it("4th elimination (2 -> 1): match ends immediately and sole survivor is declared winner", () => {
      const state = create5PGame();
      state.phase = "ROUND_SETTLEMENT";
      state.disqualifiedPlayers = ["PLAYER_5", "PLAYER_4", "PLAYER_3"];
      state.removedSeeds = 60;
      for (const p of state.pits) p.seeds = 0;

      // P2 has < 5 seeds -> P1 is sole survivor
      state.players.player1.storage = 40;
      state.players.player2.storage = 0;
      if (state.players.player3) state.players.player3.storage = 0;
      if (state.players.player4) state.players.player4.storage = 0;
      if (state.players.player5) state.players.player5.storage = 0;

      const setupRes = setupNextRound(state);
      expect(setupRes.success).toBe(true);
      if (!setupRes.success) throw new Error("Expected setupNextRound to succeed");
      expect(setupRes.data.matchEnded).toBe(true);
      expect(setupRes.data.winner).toBe("PLAYER_1");
      expect(state.phase).toBe("MATCH_END");
      expect(state.winner).toBe("PLAYER_1");
    });
  });

  describe("6. Authoritative Pit Group Mappings (Images 1 & 3)", () => {
    it("returns correct groups G1..G4 when all 5 players are active", () => {
      const groups = getFivePlayerGroups([]);
      expect(groups).toEqual(FIVE_PLAYER_GROUPS_ALL);
      expect(groups[0]).toEqual([0, 4, 11, 12, 16]); // G1
      expect(groups[1]).toEqual([1, 5, 10, 13, 17]); // G2
      expect(groups[2]).toEqual([2, 6, 9, 14, 18]);  // G3
      expect(groups[3]).toEqual([3, 7, 8, 15, 19]);  // G4
    });

    it("returns correct groups for single-player disqualifications", () => {
      expect(getFivePlayerGroups(["PLAYER_1"])).toEqual(FIVE_PLAYER_GROUPS_P1_DISQUALIFIED);
      expect(getFivePlayerGroups(["PLAYER_2"])).toEqual(FIVE_PLAYER_GROUPS_P2_DISQUALIFIED);
      expect(getFivePlayerGroups(["PLAYER_3"])).toEqual(FIVE_PLAYER_GROUPS_P3_DISQUALIFIED);
      expect(getFivePlayerGroups(["PLAYER_4"])).toEqual(FIVE_PLAYER_GROUPS_P4_DISQUALIFIED);
      expect(getFivePlayerGroups(["PLAYER_5"])).toEqual(FIVE_PLAYER_GROUPS_P5_DISQUALIFIED);
    });

    it("returns correct groups for all 10 two-player disqualifications", () => {
      expect(getFivePlayerGroups(["PLAYER_1", "PLAYER_2"])).toEqual(FIVE_PLAYER_GROUPS_P1_P2_DISQUALIFIED);
      expect(getFivePlayerGroups(["PLAYER_1", "PLAYER_3"])).toEqual(FIVE_PLAYER_GROUPS_P1_P3_DISQUALIFIED);
      expect(getFivePlayerGroups(["PLAYER_1", "PLAYER_4"])).toEqual(FIVE_PLAYER_GROUPS_P1_P4_DISQUALIFIED);
      expect(getFivePlayerGroups(["PLAYER_1", "PLAYER_5"])).toEqual(FIVE_PLAYER_GROUPS_P1_P5_DISQUALIFIED);
      expect(getFivePlayerGroups(["PLAYER_2", "PLAYER_3"])).toEqual(FIVE_PLAYER_GROUPS_P2_P3_DISQUALIFIED);
      expect(getFivePlayerGroups(["PLAYER_2", "PLAYER_4"])).toEqual(FIVE_PLAYER_GROUPS_P2_P4_DISQUALIFIED);
      expect(getFivePlayerGroups(["PLAYER_2", "PLAYER_5"])).toEqual(FIVE_PLAYER_GROUPS_P2_P5_DISQUALIFIED);
      expect(getFivePlayerGroups(["PLAYER_3", "PLAYER_4"])).toEqual(FIVE_PLAYER_GROUPS_P3_P4_DISQUALIFIED);
      expect(getFivePlayerGroups(["PLAYER_3", "PLAYER_5"])).toEqual(FIVE_PLAYER_GROUPS_P3_P5_DISQUALIFIED);
      expect(getFivePlayerGroups(["PLAYER_4", "PLAYER_5"])).toEqual(FIVE_PLAYER_GROUPS_P4_P5_DISQUALIFIED);
    });

    it("returns correct groups for all 10 three-player disqualifications", () => {
      expect(getFivePlayerGroups(["PLAYER_1", "PLAYER_2", "PLAYER_3"])).toEqual(FIVE_PLAYER_GROUPS_P1_P2_P3_DISQUALIFIED);
      expect(getFivePlayerGroups(["PLAYER_1", "PLAYER_2", "PLAYER_4"])).toEqual(FIVE_PLAYER_GROUPS_P1_P2_P4_DISQUALIFIED);
      expect(getFivePlayerGroups(["PLAYER_1", "PLAYER_2", "PLAYER_5"])).toEqual(FIVE_PLAYER_GROUPS_P1_P2_P5_DISQUALIFIED);
      expect(getFivePlayerGroups(["PLAYER_1", "PLAYER_3", "PLAYER_4"])).toEqual(FIVE_PLAYER_GROUPS_P1_P3_P4_DISQUALIFIED);
      expect(getFivePlayerGroups(["PLAYER_1", "PLAYER_3", "PLAYER_5"])).toEqual(FIVE_PLAYER_GROUPS_P1_P3_P5_DISQUALIFIED);
      expect(getFivePlayerGroups(["PLAYER_1", "PLAYER_4", "PLAYER_5"])).toEqual(FIVE_PLAYER_GROUPS_P1_P4_P5_DISQUALIFIED);
      expect(getFivePlayerGroups(["PLAYER_2", "PLAYER_3", "PLAYER_4"])).toEqual(FIVE_PLAYER_GROUPS_P2_P3_P4_DISQUALIFIED);
      expect(getFivePlayerGroups(["PLAYER_2", "PLAYER_3", "PLAYER_5"])).toEqual(FIVE_PLAYER_GROUPS_P2_P3_P5_DISQUALIFIED);
      expect(getFivePlayerGroups(["PLAYER_2", "PLAYER_4", "PLAYER_5"])).toEqual(FIVE_PLAYER_GROUPS_P2_P4_P5_DISQUALIFIED);
      expect(getFivePlayerGroups(["PLAYER_3", "PLAYER_4", "PLAYER_5"])).toEqual(FIVE_PLAYER_GROUPS_P3_P4_P5_DISQUALIFIED);
    });
  });

  describe("7. Match End Rankings in 5-Player Mode", () => {
    it("computes authoritative 5-player rankings based on elimination sequence", () => {
      const state = create5PGame();
      state.disqualifiedPlayers = ["PLAYER_1", "PLAYER_5", "PLAYER_4", "PLAYER_2"];
      state.winner = "PLAYER_3";

      const rankings = computeMatchRankings(state, "PLAYER_3");
      expect(rankings.length).toBe(5);

      // Winner: 1st Place
      expect(rankings[0].player).toBe("PLAYER_3");
      expect(rankings[0].rank).toBe(1);
      expect(rankings[0].label).toBe("1st Place");

      // Player eliminated immediately before winner (P2): 2nd Place
      expect(rankings[1].player).toBe("PLAYER_2");
      expect(rankings[1].rank).toBe(2);
      expect(rankings[1].label).toBe("2nd Place");

      // Player eliminated before 2nd place (P4): 3rd Place
      expect(rankings[2].player).toBe("PLAYER_4");
      expect(rankings[2].rank).toBe(3);
      expect(rankings[2].label).toBe("3rd Place");

      // Two earliest eliminated players (P5, P1): Lost
      expect(rankings[3].player).toBe("PLAYER_5");
      expect(rankings[3].rank).toBe(4);
      expect(rankings[3].label).toBe("Lost");

      expect(rankings[4].player).toBe("PLAYER_1");
      expect(rankings[4].rank).toBe(5);
      expect(rankings[4].label).toBe("Lost");
    });
  });
});
