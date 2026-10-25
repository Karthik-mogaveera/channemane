import { describe, it, expect } from "vitest";
import {
  createInitialGame,
  getTotalBoardSeeds,
  getTotalSeeds,
  verifySeedConservation,
  getActivePlayers,
  getNextActivePlayer,
} from "../../src/engine/board";
import {
  THREE_PLAYER_TOTAL_PITS,
  THREE_PLAYER_TOTAL_SEEDS,
  THREE_PLAYER_P1_PITS,
  THREE_PLAYER_P2_PITS,
  THREE_PLAYER_P3_PITS,
  THREE_PLAYER_GROUPS_ALL,
  THREE_PLAYER_GROUPS_P1_DISQUALIFIED,
  THREE_PLAYER_GROUPS_P2_DISQUALIFIED,
  THREE_PLAYER_GROUPS_P3_DISQUALIFIED,
  getThreePlayerGroups,
  getThreePlayerPitOwner,
  getPitOwner,
} from "../../src/engine/constants";
import { getNextOpenPit, getFollowingOpenPit } from "../../src/engine/traversal";
import { playTurn } from "../../src/engine/game";
import { claimBonus, canClaimBonus } from "../../src/engine/bonus";
import { executeRoundSettlement } from "../../src/engine/settlement";
import { setupNextRound } from "../../src/engine/roundSetup";
import { isMatchOver, checkAndHandleMatchEnd } from "../../src/engine/matchEnd";
import type { GameState, Player } from "../../src/engine/types";

describe("3-Player Engine Implementation & Section 15 Regression Suite", () => {
  describe("Board Configuration & Pit Ownership (Section 4 & 11)", () => {
    it("should initialize a 3-player game with 15 pits, 75 seeds, and 0 storage", () => {
      const state = createInitialGame("PLAYER_1", "local", null, "PLAYER_2", 3);
      expect(state.playerCount).toBe(3);
      expect(state.pits.length).toBe(THREE_PLAYER_TOTAL_PITS);
      expect(getTotalBoardSeeds(state)).toBe(THREE_PLAYER_TOTAL_SEEDS);
      expect(state.players.player1.storage).toBe(0);
      expect(state.players.player2.storage).toBe(0);
      expect(state.players.player3?.storage).toBe(0);
      expect(getTotalSeeds(state)).toBe(THREE_PLAYER_TOTAL_SEEDS);
      expect(verifySeedConservation(state)).toBe(true);

      // Verify every pit has 5 seeds and status OPEN
      for (const pit of state.pits) {
        expect(pit.seeds).toBe(5);
        expect(pit.status).toBe("OPEN");
        expect(pit.bonusAvailable).toBe(false);
      }
    });

    it("should assign correct pit ownership across all 15 pits", () => {
      for (const p of THREE_PLAYER_P1_PITS) {
        expect(getThreePlayerPitOwner(p)).toBe("PLAYER_1");
        expect(getPitOwner(p, 15)).toBe("PLAYER_1");
      }
      for (const p of THREE_PLAYER_P2_PITS) {
        expect(getThreePlayerPitOwner(p)).toBe("PLAYER_2");
        expect(getPitOwner(p, 15)).toBe("PLAYER_2");
      }
      for (const p of THREE_PLAYER_P3_PITS) {
        expect(getThreePlayerPitOwner(p)).toBe("PLAYER_3");
        expect(getPitOwner(p, 15)).toBe("PLAYER_3");
      }
      expect(getThreePlayerPitOwner(-1)).toBeNull();
      expect(getThreePlayerPitOwner(15)).toBeNull();
    });

    it("should provide authoritative group mappings for all active/disqualified states (Section 11)", () => {
      expect(getThreePlayerGroups([])).toEqual(THREE_PLAYER_GROUPS_ALL);
      expect(getThreePlayerGroups(["PLAYER_1"])).toEqual(THREE_PLAYER_GROUPS_P1_DISQUALIFIED);
      expect(getThreePlayerGroups(["PLAYER_2"])).toEqual(THREE_PLAYER_GROUPS_P2_DISQUALIFIED);
      expect(getThreePlayerGroups(["PLAYER_3"])).toEqual(THREE_PLAYER_GROUPS_P3_DISQUALIFIED);
    });
  });

  describe("Turn Order and S-Curve Traversal (Section 5 & 6)", () => {
    it("should traverse counter-clockwise 0 -> 1 -> ... -> 14 -> 0", () => {
      const state = createInitialGame("PLAYER_1", "local", null, "PLAYER_2", 3);
      for (let i = 0; i < 14; i++) {
        expect(getNextOpenPit(i, state.pits)).toBe(i + 1);
      }
      expect(getNextOpenPit(14, state.pits)).toBe(0);
    });

    it("should skip closed pits during traversal and capture inspection", () => {
      const state = createInitialGame("PLAYER_1", "local", null, "PLAYER_2", 3);
      // Close pit 1 and pit 2
      state.pits[1].status = "CLOSED";
      state.pits[2].status = "CLOSED";

      expect(getNextOpenPit(0, state.pits)).toBe(3);
      expect(getFollowingOpenPit(0, state.pits)).toBe(4);
    });

    it("should rotate turns: Player 1 -> Player 2 -> Player 3 -> Player 1", () => {
      const state = createInitialGame("PLAYER_1", "local", null, "PLAYER_2", 3);
      expect(getNextActivePlayer(state, "PLAYER_1")).toBe("PLAYER_2");
      expect(getNextActivePlayer(state, "PLAYER_2")).toBe("PLAYER_3");
      expect(getNextActivePlayer(state, "PLAYER_3")).toBe("PLAYER_1");

      // With Player 2 disqualified: P1 -> P3 -> P1
      state.disqualifiedPlayers = ["PLAYER_2"];
      expect(getNextActivePlayer(state, "PLAYER_1")).toBe("PLAYER_3");
      expect(getNextActivePlayer(state, "PLAYER_3")).toBe("PLAYER_1");
    });
  });

  describe("Sowing, Continuous Sowing, Capture, and Bonus (Section 6, 7, 8)", () => {
    it("should allow Player 1 to sow legally from P0 and distribute seeds across players", () => {
      const state = createInitialGame("PLAYER_1", "local", null, "PLAYER_2", 3);
      const result = playTurn(state, 0);
      expect(result.success).toBe(true);
      expect(verifySeedConservation(state)).toBe(true);
    });

    it("should attribute capture to PLAYER_3 when PLAYER_3 triggers capture", () => {
      const state = createInitialGame("PLAYER_3", "local", null, "PLAYER_2", 3);
      state.currentPlayer = "PLAYER_3";
      // Setup capture:
      // Sow from P13 (1 seed) -> lands at P14.
      // Next pit (P0) is empty (0 seeds).
      // Following pit (P1) contains 3 seeds -> captured by PLAYER_3!
      for (const pit of state.pits) pit.seeds = 0;
      state.pits[13].seeds = 1;
      state.pits[14].seeds = 0;
      state.pits[0].seeds = 0;
      state.pits[1].seeds = 3;
      state.players.player1.storage = 25;
      state.players.player2.storage = 25;
      if (state.players.player3) state.players.player3.storage = 21;

      const res = playTurn(state, 13);
      expect(res.success).toBe(true);
      if (res.success) {
        expect(res.data.captureResult.capturedPitId).toBe(1);
        expect(res.data.captureResult.capturedSeeds).toBe(3);
        // Pit 14 had 1 seed remaining; round ended (<4 board seeds) and P14 was swept to PLAYER_3
        expect(state.players.player3?.storage).toBe(25);
        expect(state.pits[1].seeds).toBe(0);
      }
    });

    it("should award bonus to pit owner regardless of who sowed into it", () => {
      const state = createInitialGame("PLAYER_1", "local", null, "PLAYER_2", 3);
      for (const pit of state.pits) pit.seeds = 0;
      // Pit 5 (owned by Player 2) has 3 seeds
      state.pits[5].seeds = 3;
      // Pit 4 has 1 seed -> sowing drops into P5 making it 4
      state.pits[4].seeds = 1;
      state.players.player1.storage = 35;
      state.players.player2.storage = 36;

      const turnRes = playTurn(state, 4);
      expect(turnRes.success).toBe(true);
      expect(state.pits[5].seeds).toBe(4);
      expect(state.pits[5].bonusAvailable).toBe(true);
      expect(canClaimBonus(state, 5)).toBe(true);

      // Claim bonus
      const bonusRes = claimBonus(state, 5);
      expect(bonusRes.success).toBe(true);
      expect(state.players.player2.storage).toBe(40);
      expect(state.players.player1.storage).toBe(35);
      expect(state.pits[5].seeds).toBe(0);
      expect(state.pits[5].bonusAvailable).toBe(false);
    });
  });

  describe("Section 15 — Mandatory Numerical Regression Suite", () => {
    // Helper to create a settled 3-player state with specified storage
    function createSettledState(
      p1Storage: number,
      p2Storage: number,
      p3Storage?: number,
      disqualified: Player[] = []
    ): GameState {
      const state = createInitialGame("PLAYER_1", "local", null, "PLAYER_2", 3);
      state.phase = "ROUND_SETTLEMENT";
      state.disqualifiedPlayers = [...disqualified];
      state.players.player1.storage = p1Storage;
      state.players.player2.storage = p2Storage;
      if (state.players.player3 && p3Storage !== undefined) {
        state.players.player3.storage = p3Storage;
      }
      // In settlement, pits are 0
      for (const pit of state.pits) {
        pit.seeds = 0;
        if (disqualified.includes(pit.owner)) {
          pit.status = "CLOSED";
        } else {
          pit.status = "OPEN";
        }
      }
      return state;
    }

    describe("A. Three Players Active", () => {
      it("T01: P1: 22, P2: 28, P3: 25 -> G1–G4 open; G5 closes", () => {
        const state = createSettledState(22, 28, 25);
        const res = setupNextRound(state);
        expect(res.success).toBe(true);
        if (res.success) {
          expect(res.data.openGroups).toBe(4);
          expect(res.data.player1RemainingStorage).toBe(2);
          expect(res.data.player2RemainingStorage).toBe(8);
          expect(res.data.player3RemainingStorage).toBe(5);

          // Pits in G1–G4 must be OPEN with 5 seeds:
          // G1: 0, 9, 10
          // G2: 1, 8, 11
          // G3: 2, 7, 12
          // G4: 3, 6, 13
          const openPits = [0, 9, 10, 1, 8, 11, 2, 7, 12, 3, 6, 13];
          for (const pid of openPits) {
            expect(state.pits[pid].status).toBe("OPEN");
            expect(state.pits[pid].seeds).toBe(5);
          }
          // G5 (4, 5, 14) must be CLOSED with 0 seeds
          for (const pid of [4, 5, 14]) {
            expect(state.pits[pid].status).toBe("CLOSED");
            expect(state.pits[pid].seeds).toBe(0);
          }
          expect(verifySeedConservation(state)).toBe(true);
        }
      });

      it("T02: P1: 35, P2: 23, P3: 17 -> G1–G3 open; G4–G5 close", () => {
        const state = createSettledState(35, 23, 17);
        const res = setupNextRound(state);
        expect(res.success).toBe(true);
        if (res.success) {
          expect(res.data.openGroups).toBe(3);
          expect(res.data.player1RemainingStorage).toBe(20);
          expect(res.data.player2RemainingStorage).toBe(8);
          expect(res.data.player3RemainingStorage).toBe(2);

          // G1-G3 open
          const openPits = [0, 9, 10, 1, 8, 11, 2, 7, 12];
          for (const pid of openPits) {
            expect(state.pits[pid].status).toBe("OPEN");
            expect(state.pits[pid].seeds).toBe(5);
          }
          // G4-G5 closed
          const closedPits = [3, 6, 13, 4, 5, 14];
          for (const pid of closedPits) {
            expect(state.pits[pid].status).toBe("CLOSED");
            expect(state.pits[pid].seeds).toBe(0);
          }
          expect(verifySeedConservation(state)).toBe(true);
        }
      });

      it("T03: P1: 54, P2: 6, P3: 15 -> G1 opens; G2–G5 close", () => {
        const state = createSettledState(54, 6, 15);
        const res = setupNextRound(state);
        expect(res.success).toBe(true);
        if (res.success) {
          expect(res.data.openGroups).toBe(1);
          expect(res.data.player1RemainingStorage).toBe(49);
          expect(res.data.player2RemainingStorage).toBe(1);
          expect(res.data.player3RemainingStorage).toBe(10);

          for (const pid of [0, 9, 10]) {
            expect(state.pits[pid].status).toBe("OPEN");
            expect(state.pits[pid].seeds).toBe(5);
          }
          const closedPits = [1, 8, 11, 2, 7, 12, 3, 6, 13, 4, 5, 14];
          for (const pid of closedPits) {
            expect(state.pits[pid].status).toBe("CLOSED");
            expect(state.pits[pid].seeds).toBe(0);
          }
          expect(verifySeedConservation(state)).toBe(true);
        }
      });

      it("T04: P1: 2, P2: 29, P3: 44 -> Disqualify P1 and restart P2/P3 with 25 seeds each (5 in each active pit, 0 storage)", () => {
        const state = createSettledState(2, 29, 44);
        const res = setupNextRound(state);
        expect(res.success).toBe(true);
        if (res.success) {
          expect(res.data.recovered).toBe(true);
          expect(state.disqualifiedPlayers).toContain("PLAYER_1");
          expect(getActivePlayers(state)).toEqual(["PLAYER_2", "PLAYER_3"]);

          // P1's pits (0..4) permanently closed
          for (let i = 0; i <= 4; i++) {
            expect(state.pits[i].status).toBe("CLOSED");
            expect(state.pits[i].seeds).toBe(0);
          }
          // P2's pits (5..9) and P3's pits (10..14) open with 5 seeds each
          for (let i = 5; i <= 14; i++) {
            expect(state.pits[i].status).toBe("OPEN");
            expect(state.pits[i].seeds).toBe(5);
          }
          // Zero seeds in both remaining storages
          expect(state.players.player2.storage).toBe(0);
          expect(state.players.player3?.storage).toBe(0);
          // Total active board seeds: 50
          expect(getTotalBoardSeeds(state)).toBe(50);
          expect(verifySeedConservation(state)).toBe(true);
        }
      });

      it("T05: P1: 39, P2: 4, P3: 32 -> Disqualify P2 and restart P1/P3 with 25 seeds each", () => {
        const state = createSettledState(39, 4, 32);
        const res = setupNextRound(state);
        expect(res.success).toBe(true);
        if (res.success) {
          expect(res.data.recovered).toBe(true);
          expect(state.disqualifiedPlayers).toContain("PLAYER_2");
          expect(getActivePlayers(state)).toEqual(["PLAYER_1", "PLAYER_3"]);

          for (let i = 5; i <= 9; i++) {
            expect(state.pits[i].status).toBe("CLOSED");
            expect(state.pits[i].seeds).toBe(0);
          }
          for (const i of [0, 1, 2, 3, 4, 10, 11, 12, 13, 14]) {
            expect(state.pits[i].status).toBe("OPEN");
            expect(state.pits[i].seeds).toBe(5);
          }
          expect(state.players.player1.storage).toBe(0);
          expect(state.players.player3?.storage).toBe(0);
          expect(getTotalBoardSeeds(state)).toBe(50);
          expect(verifySeedConservation(state)).toBe(true);
        }
      });

      it("T06: P1: 2, P2: 29, P3: 44 -> Same expected behavior as T04", () => {
        const state = createSettledState(2, 29, 44);
        const res = setupNextRound(state);
        expect(res.success).toBe(true);
        expect(state.disqualifiedPlayers).toContain("PLAYER_1");
        expect(getTotalBoardSeeds(state)).toBe(50);
        expect(state.players.player2.storage).toBe(0);
        expect(state.players.player3?.storage).toBe(0);
      });

      it("T07: P1: 0, P2: 32, P3: 43 -> Disqualify P1 and restart P2/P3 with 25 seeds each", () => {
        const state = createSettledState(0, 32, 43);
        const res = setupNextRound(state);
        expect(res.success).toBe(true);
        expect(state.disqualifiedPlayers).toContain("PLAYER_1");
        expect(getTotalBoardSeeds(state)).toBe(50);
        expect(state.players.player2.storage).toBe(0);
        expect(state.players.player3?.storage).toBe(0);
      });

      it("T08: P1: 4, P2: 21, P3: 50 -> Disqualify P1 and restart P2/P3 with 25 seeds each", () => {
        const state = createSettledState(4, 21, 50);
        const res = setupNextRound(state);
        expect(res.success).toBe(true);
        expect(state.disqualifiedPlayers).toContain("PLAYER_1");
        expect(getTotalBoardSeeds(state)).toBe(50);
        expect(state.players.player2.storage).toBe(0);
        expect(state.players.player3?.storage).toBe(0);
      });
    });

    describe("B. Player 3 Disqualified", () => {
      it("T09: P1: 24, P2: 26 -> G1–G4 open; G5 closes", () => {
        const state = createSettledState(24, 26, 0, ["PLAYER_3"]);
        const res = setupNextRound(state);
        expect(res.success).toBe(true);
        if (res.success) {
          expect(res.data.openGroups).toBe(4);
          expect(res.data.player1RemainingStorage).toBe(4);
          expect(res.data.player2RemainingStorage).toBe(6);

          // P3 pits (10..14) stay permanently closed
          for (let i = 10; i <= 14; i++) {
            expect(state.pits[i].status).toBe("CLOSED");
          }
          // G1-G4 open for P1/P2: [0,9], [1,8], [2,7], [3,6]
          for (const pid of [0, 9, 1, 8, 2, 7, 3, 6]) {
            expect(state.pits[pid].status).toBe("OPEN");
            expect(state.pits[pid].seeds).toBe(5);
          }
          // G5 [4, 5] closed
          expect(state.pits[4].status).toBe("CLOSED");
          expect(state.pits[5].status).toBe("CLOSED");
          expect(verifySeedConservation(state)).toBe(true);
        }
      });

      it("T10: P1: 44, P2: 6 -> G1 opens; G2–G5 close", () => {
        const state = createSettledState(44, 6, 0, ["PLAYER_3"]);
        const res = setupNextRound(state);
        expect(res.success).toBe(true);
        if (res.success) {
          expect(res.data.openGroups).toBe(1);
          expect(res.data.player1RemainingStorage).toBe(39);
          expect(res.data.player2RemainingStorage).toBe(1);

          expect(state.pits[0].status).toBe("OPEN");
          expect(state.pits[9].status).toBe("OPEN");
          for (const pid of [1, 8, 2, 7, 3, 6, 4, 5]) {
            expect(state.pits[pid].status).toBe("CLOSED");
          }
        }
      });

      it("T11: P1: 49, P2: 1 -> P2 cannot fund G1; P2 is disqualified and P1 wins", () => {
        const state = createSettledState(49, 1, 0, ["PLAYER_3"]);
        const res = setupNextRound(state);
        expect(res.success).toBe(true);
        if (res.success) {
          expect(res.data.matchEnded).toBe(true);
          expect(res.data.winner).toBe("PLAYER_1");
          expect(state.phase).toBe("MATCH_END");
          expect(state.winner).toBe("PLAYER_1");
          expect(state.disqualifiedPlayers).toContain("PLAYER_2");
        }
      });
    });

    describe("C. Player 2 Disqualified", () => {
      it("T12: P1: 9, P3: 41 -> G1 opens; G2–G5 close", () => {
        const state = createSettledState(9, 0, 41, ["PLAYER_2"]);
        const res = setupNextRound(state);
        expect(res.success).toBe(true);
        if (res.success) {
          expect(res.data.openGroups).toBe(1);
          expect(res.data.player1RemainingStorage).toBe(4);
          expect(res.data.player3RemainingStorage).toBe(36);
          // G1 for P1/P3 is [0, 10]
          expect(state.pits[0].status).toBe("OPEN");
          expect(state.pits[10].status).toBe("OPEN");
          // P2 pits 5..9 closed
          for (let i = 5; i <= 9; i++) {
            expect(state.pits[i].status).toBe("CLOSED");
          }
        }
      });

      it("T13: P1: 43, P3: 7 -> G1 opens; G2–G5 close", () => {
        const state = createSettledState(43, 0, 7, ["PLAYER_2"]);
        const res = setupNextRound(state);
        expect(res.success).toBe(true);
        if (res.success) {
          expect(res.data.openGroups).toBe(1);
          expect(res.data.player1RemainingStorage).toBe(38);
          expect(res.data.player3RemainingStorage).toBe(2);
        }
      });

      it("T14: P1: 16, P3: 34 -> G1–G3 open; G4–G5 close", () => {
        const state = createSettledState(16, 0, 34, ["PLAYER_2"]);
        const res = setupNextRound(state);
        expect(res.success).toBe(true);
        if (res.success) {
          expect(res.data.openGroups).toBe(3);
          expect(res.data.player1RemainingStorage).toBe(1);
          expect(res.data.player3RemainingStorage).toBe(19);
          // G1 [0, 10], G2 [1, 11], G3 [2, 12] open
          for (const pid of [0, 10, 1, 11, 2, 12]) {
            expect(state.pits[pid].status).toBe("OPEN");
            expect(state.pits[pid].seeds).toBe(5);
          }
          // G4 [3, 13], G5 [4, 14] closed
          for (const pid of [3, 13, 4, 14]) {
            expect(state.pits[pid].status).toBe("CLOSED");
          }
        }
      });

      it("T15: P1: 4, P3: 46 -> P1 cannot fund G1; P1 is disqualified and P3 wins", () => {
        const state = createSettledState(4, 0, 46, ["PLAYER_2"]);
        const res = setupNextRound(state);
        expect(res.success).toBe(true);
        if (res.success) {
          expect(res.data.matchEnded).toBe(true);
          expect(res.data.winner).toBe("PLAYER_3");
          expect(state.phase).toBe("MATCH_END");
          expect(state.winner).toBe("PLAYER_3");
          expect(state.disqualifiedPlayers).toContain("PLAYER_1");
        }
      });
    });

    describe("D. Player 1 Disqualified", () => {
      it("T16: P2: 42, P3: 8 -> G1 opens; G2–G5 close", () => {
        const state = createSettledState(0, 42, 8, ["PLAYER_1"]);
        const res = setupNextRound(state);
        expect(res.success).toBe(true);
        if (res.success) {
          expect(res.data.openGroups).toBe(1);
          expect(res.data.player2RemainingStorage).toBe(37);
          expect(res.data.player3RemainingStorage).toBe(3);
          // G1 for P2/P3 is [9, 10]
          expect(state.pits[9].status).toBe("OPEN");
          expect(state.pits[10].status).toBe("OPEN");
          // P1 pits (0..4) closed
          for (let i = 0; i <= 4; i++) {
            expect(state.pits[i].status).toBe("CLOSED");
          }
        }
      });
    });
  });

  describe("Settlement & Round Transitions (Section 10)", () => {
    it("should correctly sweep remaining seeds into owners' storage", () => {
      const state = createInitialGame("PLAYER_1", "local", null, "PLAYER_2", 3);
      // Put 2 seeds in P2, 3 seeds in P7, 1 seed in P12
      for (const pit of state.pits) pit.seeds = 0;
      state.pits[2].seeds = 2; // P1
      state.pits[7].seeds = 3; // P2
      state.pits[12].seeds = 1; // P3
      state.players.player1.storage = 20;
      state.players.player2.storage = 25;
      if (state.players.player3) state.players.player3.storage = 24;

      const res = executeRoundSettlement(state);
      expect(res.success).toBe(true);
      expect(state.players.player1.storage).toBe(22);
      expect(state.players.player2.storage).toBe(28);
      expect(state.players.player3?.storage).toBe(25);
      expect(getTotalSeeds(state)).toBe(75);
    });
  });

  describe("Simultaneous Multi-Player Disqualification (Issue #1)", () => {
    it("should detect match is over when two players have < 5 storage in 3-player mode", () => {
      const state = createInitialGame("PLAYER_1", "local", null, "PLAYER_2", 3);
      for (const pit of state.pits) pit.seeds = 0;
      state.players.player1.storage = 2;
      state.players.player2.storage = 3;
      if (state.players.player3) state.players.player3.storage = 70;
      state.phase = "ROUND_SETTLEMENT";

      expect(isMatchOver(state)).toBe(true);

      const matchRes = checkAndHandleMatchEnd(state);
      expect(matchRes.isMatchEnd).toBe(true);
      expect(matchRes.winner).toBe("PLAYER_3");
      expect(state.phase).toBe("MATCH_END");
      expect(state.winner).toBe("PLAYER_3");
      expect(state.disqualifiedPlayers).toContain("PLAYER_1");
      expect(state.disqualifiedPlayers).toContain("PLAYER_2");

      // Verify rankings: Player 3 = 1st, Player 2 (3 seeds) = 2nd, Player 1 (2 seeds) = 3rd (Lost)
      expect(matchRes.rankings).toBeDefined();
      expect(matchRes.rankings?.[0]).toEqual({
        player: "PLAYER_3",
        rank: 1,
        label: "1st Place",
        storage: 70,
      });
      expect(matchRes.rankings?.[1]).toEqual({
        player: "PLAYER_2",
        rank: 2,
        label: "2nd Place",
        storage: 3,
      });
      expect(matchRes.rankings?.[2]).toEqual({
        player: "PLAYER_1",
        rank: 3,
        label: "Lost",
        storage: 2,
      });
    });

    it("should cleanly end match in setupNextRound when two players have < 5 storage without invariant crash", () => {
      const state = createInitialGame("PLAYER_1", "local", null, "PLAYER_2", 3);
      for (const pit of state.pits) pit.seeds = 0;
      state.players.player1.storage = 4;
      state.players.player2.storage = 1;
      if (state.players.player3) state.players.player3.storage = 70;
      state.phase = "ROUND_SETTLEMENT";

      const res = setupNextRound(state);
      expect(res.success).toBe(true);
      if (res.success) {
        expect(res.data.matchEnded).toBe(true);
        expect(res.data.winner).toBe("PLAYER_3");
        expect(state.phase).toBe("MATCH_END");
        expect(state.winner).toBe("PLAYER_3");
        expect(state.disqualifiedPlayers).toEqual(["PLAYER_2", "PLAYER_1"]);
      }
    });

    it("should handle all three players having < 5 storage simultaneously as a mutual disqualification match end", () => {
      const state = createInitialGame("PLAYER_1", "local", null, "PLAYER_2", 3);
      for (const pit of state.pits) pit.seeds = 0;
      state.players.player1.storage = 1;
      state.players.player2.storage = 2;
      if (state.players.player3) state.players.player3.storage = 3;
      state.phase = "ROUND_SETTLEMENT";

      expect(isMatchOver(state)).toBe(true);

      const matchRes = checkAndHandleMatchEnd(state);
      expect(matchRes.isMatchEnd).toBe(true);
      expect(matchRes.winner).toBeNull();
      expect(state.phase).toBe("MATCH_END");
      expect(state.winner).toBeNull();
    });
  });
});
