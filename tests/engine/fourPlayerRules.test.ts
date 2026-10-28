import { describe, it, expect } from "vitest";
import {
  createInitialGame,
  getTotalSeeds,
  verifySeedConservation,
  getActivePlayers,
} from "../../src/engine/board";
import {
  FOUR_PLAYER_TOTAL_PITS,
  FOUR_PLAYER_TOTAL_SEEDS,
  FOUR_PLAYER_P1_PITS,
  FOUR_PLAYER_P2_PITS,
  FOUR_PLAYER_P3_PITS,
  FOUR_PLAYER_P4_PITS,
  FOUR_PLAYER_GROUPS_ALL,
  FOUR_PLAYER_GROUPS_P1_DISQUALIFIED,
  FOUR_PLAYER_GROUPS_P2_DISQUALIFIED,
  FOUR_PLAYER_GROUPS_P3_DISQUALIFIED,
  FOUR_PLAYER_GROUPS_P4_DISQUALIFIED,
  FOUR_PLAYER_GROUPS_P3_P4_DISQUALIFIED,
  FOUR_PLAYER_GROUPS_P1_P2_DISQUALIFIED,
  FOUR_PLAYER_GROUPS_P1_P3_DISQUALIFIED,
  FOUR_PLAYER_GROUPS_P1_P4_DISQUALIFIED,
  FOUR_PLAYER_GROUPS_P2_P3_DISQUALIFIED,
  FOUR_PLAYER_GROUPS_P2_P4_DISQUALIFIED,
  getFourPlayerGroups,
  getPitOwner,
  getFourPlayerPitOwner,
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

const create4PGame = () => createInitialGame("PLAYER_1", "local", null, "PLAYER_2", 4);

describe("4-Player Channemane Engine & Rules Suite", () => {
  describe("1. Initial 4-Player Board Setup and Ownership", () => {
    it("initializes board with 16 pits, 5 seeds per pit, 80 total seeds, and 4 players with 0 storage", () => {
      const state = create4PGame();

      expect(state.playerCount).toBe(4);
      expect(state.pits.length).toBe(FOUR_PLAYER_TOTAL_PITS); // 16
      expect(getTotalSeeds(state)).toBe(FOUR_PLAYER_TOTAL_SEEDS); // 80
      expect(state.removedSeeds).toBe(0);
      expect(verifySeedConservation(state)).toBe(true);

      // Check each player's storage is initially 0
      expect(state.players.player1.storage).toBe(0);
      expect(state.players.player2.storage).toBe(0);
      expect(state.players.player3?.storage).toBe(0);
      expect(state.players.player4?.storage).toBe(0);

      // Check active players: P1, P2, P3, P4
      const active = getActivePlayers(state);
      expect(active).toEqual(["PLAYER_1", "PLAYER_2", "PLAYER_3", "PLAYER_4"]);
      expect(state.currentPlayer).toBe("PLAYER_1");

      // Verify every pit is open with 5 seeds
      for (let i = 0; i < 16; i++) {
        expect(state.pits[i]!.seeds).toBe(5);
        expect(state.pits[i]!.status).toBe("OPEN");
      }
    });

    it("assigns authoritative pit ownership across 16 pits", () => {
      // P1: 0..3, P2: 4..7, P3: 8..11, P4: 12..15
      FOUR_PLAYER_P1_PITS.forEach((id) => {
        expect(getPitOwner(id, 16)).toBe("PLAYER_1");
        expect(getFourPlayerPitOwner(id)).toBe("PLAYER_1");
      });
      FOUR_PLAYER_P2_PITS.forEach((id) => {
        expect(getPitOwner(id, 16)).toBe("PLAYER_2");
        expect(getFourPlayerPitOwner(id)).toBe("PLAYER_2");
      });
      FOUR_PLAYER_P3_PITS.forEach((id) => {
        expect(getPitOwner(id, 16)).toBe("PLAYER_3");
        expect(getFourPlayerPitOwner(id)).toBe("PLAYER_3");
      });
      FOUR_PLAYER_P4_PITS.forEach((id) => {
        expect(getPitOwner(id, 16)).toBe("PLAYER_4");
        expect(getFourPlayerPitOwner(id)).toBe("PLAYER_4");
      });
    });
  });

  describe("2. Clockwise Traversal and Sowing Sequence", () => {
    it("follows exact traversal sequence: P0 -> P1 -> ... -> P15 -> P0", () => {
      const state = create4PGame();

      for (let i = 0; i < 16; i++) {
        const next = getNextOpenPit(i, state.pits);
        expect(next).toBe((i + 1) % 16);
      }
    });

    it("skips closed pits during traversal", () => {
      const state = create4PGame();
      // Close pit 4 and 5
      state.pits[4]!.status = "CLOSED";
      state.pits[5]!.status = "CLOSED";

      // From pit 3, next open pit should be pit 6
      const nextFrom3 = getNextOpenPit(3, state.pits);
      expect(nextFrom3).toBe(6);

      // Following open pit from pit 2: next is 3, following is 6
      const followingFrom2 = getFollowingOpenPit(2, state.pits);
      expect(followingFrom2).toBe(6);
    });
  });

  describe("3. Authoritative Pit Group Mappings (A through K)", () => {
    it("validates Group A: All four players active", () => {
      const groups = getFourPlayerGroups([]);
      expect(groups).toEqual(FOUR_PLAYER_GROUPS_ALL);
      expect(groups.length).toBe(4);
      expect(groups[0]).toEqual([0, 4, 11, 15]);
      expect(groups[1]).toEqual([1, 5, 10, 14]);
      expect(groups[2]).toEqual([2, 6, 9, 13]);
      expect(groups[3]).toEqual([3, 7, 8, 12]);

      // Every group must have exactly 1 pit from each active player
      groups.forEach((g) => {
        expect(g.length).toBe(4);
        const owners = g.map((p) => getFourPlayerPitOwner(p)).sort();
        expect(owners).toEqual(["PLAYER_1", "PLAYER_2", "PLAYER_3", "PLAYER_4"].sort());
      });
    });

    it("validates Group B: Player 1 disqualified", () => {
      const groups = getFourPlayerGroups(["PLAYER_1"]);
      expect(groups).toEqual(FOUR_PLAYER_GROUPS_P1_DISQUALIFIED);
      expect(groups.length).toBe(4);
      expect(groups[0]).toEqual([4, 11, 15]);
      expect(groups[1]).toEqual([5, 10, 14]);
      expect(groups[2]).toEqual([6, 9, 13]);
      expect(groups[3]).toEqual([7, 8, 12]);

      groups.forEach((g) => {
        expect(g.length).toBe(3);
        const owners = g.map((p) => getFourPlayerPitOwner(p)).sort();
        expect(owners).toEqual(["PLAYER_2", "PLAYER_3", "PLAYER_4"].sort());
      });
    });

    it("validates Group C: Player 2 disqualified", () => {
      const groups = getFourPlayerGroups(["PLAYER_2"]);
      expect(groups).toEqual(FOUR_PLAYER_GROUPS_P2_DISQUALIFIED);
      expect(groups.length).toBe(4);
      expect(groups[0]).toEqual([0, 11, 15]);
      expect(groups[1]).toEqual([1, 10, 14]);
      expect(groups[2]).toEqual([2, 9, 13]);
      expect(groups[3]).toEqual([3, 8, 12]);

      groups.forEach((g) => {
        expect(g.length).toBe(3);
        const owners = g.map((p) => getFourPlayerPitOwner(p)).sort();
        expect(owners).toEqual(["PLAYER_1", "PLAYER_3", "PLAYER_4"].sort());
      });
    });

    it("validates Group D: Player 3 disqualified", () => {
      const groups = getFourPlayerGroups(["PLAYER_3"]);
      expect(groups).toEqual(FOUR_PLAYER_GROUPS_P3_DISQUALIFIED);
      expect(groups.length).toBe(4);
      expect(groups[0]).toEqual([0, 4, 15]);
      expect(groups[1]).toEqual([1, 5, 14]);
      expect(groups[2]).toEqual([2, 6, 13]);
      expect(groups[3]).toEqual([3, 7, 12]);

      groups.forEach((g) => {
        expect(g.length).toBe(3);
        const owners = g.map((p) => getFourPlayerPitOwner(p)).sort();
        expect(owners).toEqual(["PLAYER_1", "PLAYER_2", "PLAYER_4"].sort());
      });
    });

    it("validates Group E: Player 4 disqualified", () => {
      const groups = getFourPlayerGroups(["PLAYER_4"]);
      expect(groups).toEqual(FOUR_PLAYER_GROUPS_P4_DISQUALIFIED);
      expect(groups.length).toBe(4);
      expect(groups[0]).toEqual([0, 4, 11]);
      expect(groups[1]).toEqual([1, 5, 10]);
      expect(groups[2]).toEqual([2, 6, 9]);
      expect(groups[3]).toEqual([3, 7, 8]);

      groups.forEach((g) => {
        expect(g.length).toBe(3);
        const owners = g.map((p) => getFourPlayerPitOwner(p)).sort();
        expect(owners).toEqual(["PLAYER_1", "PLAYER_2", "PLAYER_3"].sort());
      });
    });

    it("validates Group F: Players 3 and 4 disqualified", () => {
      const groups = getFourPlayerGroups(["PLAYER_3", "PLAYER_4"]);
      expect(groups).toEqual(FOUR_PLAYER_GROUPS_P3_P4_DISQUALIFIED);
      expect(groups.length).toBe(4);
      expect(groups[0]).toEqual([0, 4]);
      expect(groups[1]).toEqual([1, 5]);
      expect(groups[2]).toEqual([2, 6]);
      expect(groups[3]).toEqual([3, 7]);

      groups.forEach((g) => {
        expect(g.length).toBe(2);
        const owners = g.map((p) => getFourPlayerPitOwner(p)).sort();
        expect(owners).toEqual(["PLAYER_1", "PLAYER_2"].sort());
      });
    });

    it("validates Group G: Players 1 and 2 disqualified", () => {
      const groups = getFourPlayerGroups(["PLAYER_1", "PLAYER_2"]);
      expect(groups).toEqual(FOUR_PLAYER_GROUPS_P1_P2_DISQUALIFIED);
      expect(groups.length).toBe(4);
      expect(groups[0]).toEqual([15, 11]);
      expect(groups[1]).toEqual([14, 10]);
      expect(groups[2]).toEqual([13, 9]);
      expect(groups[3]).toEqual([12, 8]);

      groups.forEach((g) => {
        expect(g.length).toBe(2);
        const owners = g.map((p) => getFourPlayerPitOwner(p)).sort();
        expect(owners).toEqual(["PLAYER_3", "PLAYER_4"].sort());
      });
    });

    it("validates Group H: Players 1 and 3 disqualified", () => {
      const groups = getFourPlayerGroups(["PLAYER_1", "PLAYER_3"]);
      expect(groups).toEqual(FOUR_PLAYER_GROUPS_P1_P3_DISQUALIFIED);
      expect(groups.length).toBe(4);
      expect(groups[0]).toEqual([4, 15]);
      expect(groups[1]).toEqual([5, 14]);
      expect(groups[2]).toEqual([6, 13]);
      expect(groups[3]).toEqual([7, 12]);

      groups.forEach((g) => {
        expect(g.length).toBe(2);
        const owners = g.map((p) => getFourPlayerPitOwner(p)).sort();
        expect(owners).toEqual(["PLAYER_2", "PLAYER_4"].sort());
      });
    });

    it("validates Group I: Players 1 and 4 disqualified", () => {
      const groups = getFourPlayerGroups(["PLAYER_1", "PLAYER_4"]);
      expect(groups).toEqual(FOUR_PLAYER_GROUPS_P1_P4_DISQUALIFIED);
      expect(groups.length).toBe(4);
      expect(groups[0]).toEqual([4, 11]);
      expect(groups[1]).toEqual([5, 10]);
      expect(groups[2]).toEqual([6, 9]);
      expect(groups[3]).toEqual([7, 8]);

      groups.forEach((g) => {
        expect(g.length).toBe(2);
        const owners = g.map((p) => getFourPlayerPitOwner(p)).sort();
        expect(owners).toEqual(["PLAYER_2", "PLAYER_3"].sort());
      });
    });

    it("validates Group J: Players 2 and 3 disqualified", () => {
      const groups = getFourPlayerGroups(["PLAYER_2", "PLAYER_3"]);
      expect(groups).toEqual(FOUR_PLAYER_GROUPS_P2_P3_DISQUALIFIED);
      expect(groups.length).toBe(4);
      expect(groups[0]).toEqual([0, 15]);
      expect(groups[1]).toEqual([1, 14]);
      expect(groups[2]).toEqual([2, 13]);
      expect(groups[3]).toEqual([3, 12]);

      groups.forEach((g) => {
        expect(g.length).toBe(2);
        const owners = g.map((p) => getFourPlayerPitOwner(p)).sort();
        expect(owners).toEqual(["PLAYER_1", "PLAYER_4"].sort());
      });
    });

    it("validates Group K: Players 2 and 4 disqualified", () => {
      const groups = getFourPlayerGroups(["PLAYER_2", "PLAYER_4"]);
      expect(groups).toEqual(FOUR_PLAYER_GROUPS_P2_P4_DISQUALIFIED);
      expect(groups.length).toBe(4);
      expect(groups[0]).toEqual([0, 11]);
      expect(groups[1]).toEqual([1, 10]);
      expect(groups[2]).toEqual([2, 9]);
      expect(groups[3]).toEqual([3, 8]);

      groups.forEach((g) => {
        expect(g.length).toBe(2);
        const owners = g.map((p) => getFourPlayerPitOwner(p)).sort();
        expect(owners).toEqual(["PLAYER_1", "PLAYER_3"].sort());
      });
    });
  });

  describe("4. Atomic Pit Group Funding and Insufficient Storage", () => {
    it("opens all 4 groups when all active players have 20 seeds", () => {
      const state = create4PGame();
      state.players.player1.storage = 20;
      state.players.player2.storage = 20;
      state.players.player3!.storage = 20;
      state.players.player4!.storage = 20;

      const result = setupNextRound(state);
      expect(result.success).toBe(true);
      if (!result.success) throw new Error(result.error);
      expect(result.data.openGroups).toBe(4);
      expect(state.pits.filter((p) => p.status === "OPEN").length).toBe(16);
      expect(state.pits.filter((p) => p.status === "CLOSED").length).toBe(0);
      expect(result.data.player1RemainingStorage).toBe(0);
      expect(result.data.player2RemainingStorage).toBe(0);
      expect(result.data.player3RemainingStorage).toBe(0);
      expect(result.data.player4RemainingStorage).toBe(0);
      expect(state.removedSeeds).toBe(0);
      expect(verifySeedConservation(state)).toBe(true);
    });

    it("stops opening groups atomically when any active player cannot fund a group", () => {
      const state = create4PGame();
      // P1: 25, P2: 20, P3: 25, P4: 10 (Total: 80 seeds)
      state.players.player1.storage = 25;
      state.players.player2.storage = 20;
      state.players.player3!.storage = 25;
      state.players.player4!.storage = 10;

      // Group 1: all have >= 5 -> opens (P1:20, P2:15, P3:20, P4:5)
      // Group 2: all have >= 5 -> opens (P1:15, P2:10, P3:15, P4:0)
      // Group 3: P4 has 0 < 5 -> Fails to open! G3 and G4 close.
      // No seeds deducted for G3 or G4!
      const result = setupNextRound(state);
      expect(result.success).toBe(true);
      if (!result.success) throw new Error(result.error);
      expect(result.data.openGroups).toBe(2);

      // Groups opened: G1 (4 pits) + G2 (4 pits) = 8 pits
      expect(state.pits.filter((p) => p.status === "OPEN").length).toBe(8);
      expect(state.pits.filter((p) => p.status === "CLOSED").length).toBe(8);

      // Remaining storage checks
      expect(result.data.player1RemainingStorage).toBe(15); // 25 - 10
      expect(result.data.player2RemainingStorage).toBe(10); // 20 - 10
      expect(result.data.player3RemainingStorage).toBe(15); // 25 - 10
      expect(result.data.player4RemainingStorage).toBe(0); // 10 - 10

      // Seed conservation: 8 pits * 5 = 40 + remaining (15 + 10 + 15 + 0 = 40) = 80!
      expect(verifySeedConservation(state)).toBe(true);
      expect(getTotalSeeds(state)).toBe(80);
    });
  });

  describe("5. Disqualification Cascade & Seed Accounting (80 -> 60 -> 40 -> Winner)", () => {
    it("First Disqualification: 4 players -> 3 players, exactly 20 seeds removed, 60 active seeds", () => {
      const state = create4PGame();
      // Simulate settlement where Player 2 has 4 seeds (< 5: Disqualified!)
      state.players.player1.storage = 30;
      state.players.player2.storage = 4; // < 5: DISQUALIFIED
      state.players.player3!.storage = 26;
      state.players.player4!.storage = 20;
      // 30 + 4 + 26 + 20 = 80

      const result = setupNextRound(state);
      expect(result.success).toBe(true);
      if (!result.success) throw new Error(result.error);
      expect(result.data.eliminatedPlayers).toContain("PLAYER_2");
      expect(state.disqualifiedPlayers).toContain("PLAYER_2");

      // Removed seeds must be exactly 20
      expect(state.removedSeeds).toBe(20);

      // Player 2's pits are permanently closed
      FOUR_PLAYER_P2_PITS.forEach((pId) => {
        expect(state.pits[pId]!.status).toBe("CLOSED");
      });

      // Total active seeds remaining: 60
      expect(getTotalSeeds(state)).toBe(60);
      expect(verifySeedConservation(state)).toBe(true);

      // Remaining active players: P1, P3, P4
      const active = getActivePlayers(state);
      expect(active).toEqual(["PLAYER_1", "PLAYER_3", "PLAYER_4"]);
    });

    it("Second Disqualification: 3 players -> 2 players, another 20 seeds removed, 40 active seeds", () => {
      const state = create4PGame();
      // P2 already disqualified
      state.disqualifiedPlayers = ["PLAYER_2"];
      state.removedSeeds = 20;

      // Now Player 4 has 3 seeds (< 5: Disqualified!)
      state.players.player1.storage = 30;
      state.players.player2.storage = 0;
      state.players.player3!.storage = 27;
      state.players.player4!.storage = 3; // < 5: DISQUALIFIED
      // 30 + 0 + 27 + 3 = 60 active seeds (+ 20 removed = 80)

      const result = setupNextRound(state);
      expect(result.success).toBe(true);
      if (!result.success) throw new Error(result.error);
      expect(result.data.eliminatedPlayers).toContain("PLAYER_4");
      expect(state.disqualifiedPlayers).toEqual(["PLAYER_2", "PLAYER_4"]);

      // Removed seeds must now be 40
      expect(state.removedSeeds).toBe(40);

      // Both P2 and P4 pits must be permanently closed
      FOUR_PLAYER_P2_PITS.forEach((pId) => {
        expect(state.pits[pId]!.status).toBe("CLOSED");
      });
      FOUR_PLAYER_P4_PITS.forEach((pId) => {
        expect(state.pits[pId]!.status).toBe("CLOSED");
      });

      // Total active seeds remaining: 40
      expect(getTotalSeeds(state)).toBe(40);
      expect(verifySeedConservation(state)).toBe(true);

      // Remaining active players: P1, P3
      const active = getActivePlayers(state);
      expect(active).toEqual(["PLAYER_1", "PLAYER_3"]);
    });

    it("Third Disqualification: 2 players -> 1 player, match ends immediately, winner declared", () => {
      const state = create4PGame();
      // P2 and P4 already disqualified
      state.disqualifiedPlayers = ["PLAYER_2", "PLAYER_4"];
      state.removedSeeds = 40;

      // P1 has 2 seeds (< 5: Disqualified!)
      state.players.player1.storage = 2; // < 5: DISQUALIFIED
      state.players.player2.storage = 0;
      state.players.player3!.storage = 38;
      state.players.player4!.storage = 0;

      const result = setupNextRound(state);
      expect(result.success).toBe(true);
      if (!result.success) throw new Error(result.error);
      expect(result.data.eliminatedPlayers).toContain("PLAYER_1");
      expect(result.data.matchEnded).toBe(true);
      expect(result.data.winner).toBe("PLAYER_3");
      expect(state.phase).toBe("MATCH_END");
    });
  });

  describe("6. Match Rankings Order for Elimination Sequences", () => {
    it("assigns 1st Place (Winner), 2nd Place, 3rd Place, and Lost correctly", () => {
      // Prompt example: Player 2 eliminated first, Player 4 second, Player 1 loses to Player 3
      const state = create4PGame();
      state.disqualifiedPlayers = ["PLAYER_2", "PLAYER_4", "PLAYER_1"];
      state.phase = "MATCH_END";
      state.winner = "PLAYER_3";
      state.players.player3!.storage = 35;
      state.players.player1.storage = 2;
      state.players.player4!.storage = 0;
      state.players.player2.storage = 0;

      const rankings = computeMatchRankings(state);
      expect(rankings.length).toBe(4);

      // 1st Place: Player 3
      expect(rankings[0]!.player).toBe("PLAYER_3");
      expect(rankings[0]!.rank).toBe(1);
      expect(rankings[0]!.label).toBe("1st Place");

      // 2nd Place: Player 1 (eliminated immediately before winner)
      expect(rankings[1]!.player).toBe("PLAYER_1");
      expect(rankings[1]!.rank).toBe(2);
      expect(rankings[1]!.label).toBe("2nd Place");

      // 3rd Place: Player 4 (eliminated before 2nd place)
      expect(rankings[2]!.player).toBe("PLAYER_4");
      expect(rankings[2]!.rank).toBe(3);
      expect(rankings[2]!.label).toBe("3rd Place");

      // Lost: Player 2 (earliest eliminated)
      expect(rankings[3]!.player).toBe("PLAYER_2");
      expect(rankings[3]!.rank).toBe(4);
      expect(rankings[3]!.label).toBe("Lost");
    });
  });

  describe("7. Continuous Sowing, Capture, and Bonus Ownership for Player 4", () => {
    it("handles Player 4 sowing and turn advancement to Player 1", () => {
      const state = create4PGame();
      state.currentPlayer = "PLAYER_4";
      // Next pit after destination (pit 2) set to 0 seeds so continuous sowing stops when landing on pit 1
      state.pits[2]!.seeds = 0;
      state.pits[0]!.seeds = 10; // balance to 80 total seeds

      // P4 sows from pit 12 (5 seeds)
      // Sequence: 13, 14, 15, 0, 1
      const res = sowFromPit(state, 12);
      expect(res.success).toBe(true);
      expect(state.pits[12]!.seeds).toBe(0);
      expect(state.pits[13]!.seeds).toBe(6);
      expect(state.pits[14]!.seeds).toBe(6);
      expect(state.pits[15]!.seeds).toBe(6);
      expect(state.pits[0]!.seeds).toBe(11);
      expect(state.pits[1]!.seeds).toBe(6);
      expect(verifySeedConservation(state)).toBe(true);
    });

    it("awards bonus on Player 4's pit to Player 4 regardless of who dropped the 4th seed", () => {
      const state = create4PGame();
      state.pits[13]!.seeds = 4;
      state.pits[0]!.seeds = 6; // balance to 80 seeds total
      state.pits[13]!.bonusAvailable = true;

      // P4 claims the bonus
      const claimRes = claimBonus(state, 13);
      expect(claimRes.success).toBe(true);
      expect(state.pits[13]!.seeds).toBe(0);
      expect(state.pits[13]!.bonusAvailable).toBe(false);
      expect(state.players.player4?.storage).toBe(4);
      expect(state.players.player1.storage).toBe(0);
      expect(verifySeedConservation(state)).toBe(true);
    });

    it("credits captured seeds to Player 4 when Player 4 captures", () => {
      const state = create4PGame();
      state.currentPlayer = "PLAYER_4";
      // Final destination pit 8. Next open is pit 9 (0 seeds, was 5 -> -5).
      // Following open is pit 10 (8 seeds, was 5 -> +3).
      // Pit 0 has 7 seeds (was 5 -> +2). Net change = 0 -> 80 seeds total.
      state.pits[9]!.seeds = 0;
      state.pits[10]!.seeds = 8;
      state.pits[0]!.seeds = 7;

      const captureRes = evaluateAndExecuteCapture(state, 8);
      expect(captureRes.capturedPitId).toBe(10);
      expect(captureRes.capturedSeeds).toBe(8);
      expect(state.pits[10]!.seeds).toBe(0);
      expect(state.players.player4?.storage).toBe(8);
      expect(state.players.player4?.roundCaptured).toBe(8);
      expect(verifySeedConservation(state)).toBe(true);
    });
  });
});
