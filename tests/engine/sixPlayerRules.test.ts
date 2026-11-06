import { describe, it, expect } from "vitest";
import {
  SIX_PLAYER_TOTAL_PITS,
  SIX_PLAYER_TOTAL_SEEDS,
  SIX_PLAYER_GROUPS_ALL,
  getPitOwner,
  getSixPlayerPitOwner,
  getSixPlayerGroups,
} from "../../src/engine/constants";
import {
  createInitialGame,
  getTotalSeeds,
  verifySeedConservation,
  getActivePlayers,
  getNextActivePlayer,
} from "../../src/engine/board";
import { evaluateAndExecuteCapture } from "../../src/engine/capture";
import { claimBonus, canClaimBonus } from "../../src/engine/bonus";
import { executeRoundSettlement } from "../../src/engine/settlement";
import { setupNextRound } from "../../src/engine/roundSetup";
import { computeMatchRankings, isMatchOver, checkAndHandleMatchEnd } from "../../src/engine/matchEnd";

describe("6-Player Game Mode — Core Engine Rules", () => {
  it("initializes a valid 6-player game configuration", () => {
    const game = createInitialGame("PLAYER_1", "local", null, undefined, 6);

    expect(game.playerCount).toBe(6);
    expect(game.pits.length).toBe(SIX_PLAYER_TOTAL_PITS);
    expect(game.pits.length).toBe(24);
    expect(getTotalSeeds(game)).toBe(SIX_PLAYER_TOTAL_SEEDS);
    expect(getTotalSeeds(game)).toBe(120);
    expect(verifySeedConservation(game)).toBe(true);

    // Initial storage 0 for all 6 players
    expect(game.players.player1.storage).toBe(0);
    expect(game.players.player2.storage).toBe(0);
    expect(game.players.player3?.storage).toBe(0);
    expect(game.players.player4?.storage).toBe(0);
    expect(game.players.player5?.storage).toBe(0);
    expect(game.players.player6?.storage).toBe(0);

    // Initial seeds 5 in all 24 pits
    for (let i = 0; i < 24; i++) {
      expect(game.pits[i].seeds).toBe(5);
      expect(game.pits[i].status).toBe("OPEN");
      expect(game.pits[i].bonusAvailable).toBe(false);
    }
  });

  it("assigns authoritative pit ownership across 6 players (4 pits each)", () => {
    // Player 1: P0..P3
    for (let i = 0; i <= 3; i++) {
      expect(getPitOwner(i, 24)).toBe("PLAYER_1");
      expect(getSixPlayerPitOwner(i)).toBe("PLAYER_1");
    }
    // Player 2: P4..P7
    for (let i = 4; i <= 7; i++) {
      expect(getPitOwner(i, 24)).toBe("PLAYER_2");
      expect(getSixPlayerPitOwner(i)).toBe("PLAYER_2");
    }
    // Player 3: P8..P11
    for (let i = 8; i <= 11; i++) {
      expect(getPitOwner(i, 24)).toBe("PLAYER_3");
      expect(getSixPlayerPitOwner(i)).toBe("PLAYER_3");
    }
    // Player 4: P12..P15
    for (let i = 12; i <= 15; i++) {
      expect(getPitOwner(i, 24)).toBe("PLAYER_4");
      expect(getSixPlayerPitOwner(i)).toBe("PLAYER_4");
    }
    // Player 5: P16..P19
    for (let i = 16; i <= 19; i++) {
      expect(getPitOwner(i, 24)).toBe("PLAYER_5");
      expect(getSixPlayerPitOwner(i)).toBe("PLAYER_5");
    }
    // Player 6: P20..P23
    for (let i = 20; i <= 23; i++) {
      expect(getPitOwner(i, 24)).toBe("PLAYER_6");
      expect(getSixPlayerPitOwner(i)).toBe("PLAYER_6");
    }
  });

  it("rotates circular turns among all 6 active players", () => {
    const game = createInitialGame("PLAYER_1", "local", null, undefined, 6);
    expect(getActivePlayers(game)).toEqual([
      "PLAYER_1",
      "PLAYER_2",
      "PLAYER_3",
      "PLAYER_4",
      "PLAYER_5",
      "PLAYER_6",
    ]);

    expect(getNextActivePlayer(game, "PLAYER_1")).toBe("PLAYER_2");
    expect(getNextActivePlayer(game, "PLAYER_2")).toBe("PLAYER_3");
    expect(getNextActivePlayer(game, "PLAYER_3")).toBe("PLAYER_4");
    expect(getNextActivePlayer(game, "PLAYER_4")).toBe("PLAYER_5");
    expect(getNextActivePlayer(game, "PLAYER_5")).toBe("PLAYER_6");
    expect(getNextActivePlayer(game, "PLAYER_6")).toBe("PLAYER_1");
  });

  it("skips disqualified players in turn rotation", () => {
    const game = createInitialGame("PLAYER_1", "local", null, undefined, 6);
    game.disqualifiedPlayers = ["PLAYER_2", "PLAYER_5"];

    expect(getActivePlayers(game)).toEqual([
      "PLAYER_1",
      "PLAYER_3",
      "PLAYER_4",
      "PLAYER_6",
    ]);

    expect(getNextActivePlayer(game, "PLAYER_1")).toBe("PLAYER_3");
    expect(getNextActivePlayer(game, "PLAYER_3")).toBe("PLAYER_4");
    expect(getNextActivePlayer(game, "PLAYER_4")).toBe("PLAYER_6");
    expect(getNextActivePlayer(game, "PLAYER_6")).toBe("PLAYER_1");
  });

  it("preserves immutable original pit groups G1..G4", () => {
    expect(SIX_PLAYER_GROUPS_ALL).toEqual([
      [0, 4, 11, 15, 16, 20],
      [1, 5, 10, 14, 17, 21],
      [2, 6, 9, 13, 18, 22],
      [3, 7, 8, 12, 19, 23],
    ]);
  });

  describe("Dynamic Pit Group Mappings (Handwritten Pages 1–10 Verification)", () => {
    it("matches all 6 players active", () => {
      const groups = getSixPlayerGroups([]);
      expect(groups).toEqual([
        [0, 4, 11, 15, 16, 20],
        [1, 5, 10, 14, 17, 21],
        [2, 6, 9, 13, 18, 22],
        [3, 7, 8, 12, 19, 23],
      ]);
    });

    it("matches Player 1 disqualified", () => {
      // Disqualifying P1 removes pits 0, 1, 2, 3
      const groups = getSixPlayerGroups(["PLAYER_1"]);
      expect(groups).toEqual([
        [4, 11, 15, 16, 20],
        [5, 10, 14, 17, 21],
        [6, 9, 13, 18, 22],
        [7, 8, 12, 19, 23],
      ]);
    });

    it("matches Player 2 disqualified", () => {
      // Disqualifying P2 removes pits 4, 5, 6, 7
      const groups = getSixPlayerGroups(["PLAYER_2"]);
      expect(groups).toEqual([
        [0, 11, 15, 16, 20],
        [1, 10, 14, 17, 21],
        [2, 9, 13, 18, 22],
        [3, 8, 12, 19, 23],
      ]);
    });

    it("matches Player 3 disqualified", () => {
      // Disqualifying P3 removes pits 8, 9, 10, 11
      const groups = getSixPlayerGroups(["PLAYER_3"]);
      expect(groups).toEqual([
        [0, 4, 15, 16, 20],
        [1, 5, 14, 17, 21],
        [2, 6, 13, 18, 22],
        [3, 7, 12, 19, 23],
      ]);
    });

    it("matches Player 4 disqualified", () => {
      // Disqualifying P4 removes pits 12, 13, 14, 15
      const groups = getSixPlayerGroups(["PLAYER_4"]);
      expect(groups).toEqual([
        [0, 4, 11, 16, 20],
        [1, 5, 10, 17, 21],
        [2, 6, 9, 18, 22],
        [3, 7, 8, 19, 23],
      ]);
    });

    it("matches Player 5 disqualified", () => {
      // Disqualifying P5 removes pits 16, 17, 18, 19
      const groups = getSixPlayerGroups(["PLAYER_5"]);
      expect(groups).toEqual([
        [0, 4, 11, 15, 20],
        [1, 5, 10, 14, 21],
        [2, 6, 9, 13, 22],
        [3, 7, 8, 12, 23],
      ]);
    });

    it("matches Player 6 disqualified", () => {
      // Disqualifying P6 removes pits 20, 21, 22, 23
      const groups = getSixPlayerGroups(["PLAYER_6"]);
      expect(groups).toEqual([
        [0, 4, 11, 15, 16],
        [1, 5, 10, 14, 17],
        [2, 6, 9, 13, 18],
        [3, 7, 8, 12, 19],
      ]);
    });

    it("matches 2 players disqualified (e.g. Player 1 & 2)", () => {
      const groups = getSixPlayerGroups(["PLAYER_1", "PLAYER_2"]);
      expect(groups).toEqual([
        [11, 15, 16, 20],
        [10, 14, 17, 21],
        [9, 13, 18, 22],
        [8, 12, 19, 23],
      ]);
    });

    it("matches 3 players disqualified (e.g. Player 1, 2, 3)", () => {
      const groups = getSixPlayerGroups(["PLAYER_1", "PLAYER_2", "PLAYER_3"]);
      expect(groups).toEqual([
        [15, 16, 20],
        [14, 17, 21],
        [13, 18, 22],
        [12, 19, 23],
      ]);
    });

    it("matches 4 players disqualified (e.g. Player 1, 2, 3, 4 -> 2 players remain: P5 & P6)", () => {
      const groups = getSixPlayerGroups(["PLAYER_1", "PLAYER_2", "PLAYER_3", "PLAYER_4"]);
      expect(groups).toEqual([
        [16, 20],
        [17, 21],
        [18, 22],
        [19, 23],
      ]);
    });
  });

  it("properly executes captures crediting Player 6", () => {
    const game = createInitialGame("PLAYER_6", "local", null, undefined, 6);
    // Setup capture scenario:
    // finalDestinationPit: 20
    // nextOpen: 21 (0 seeds)
    // followingOpen: 22 (6 seeds)
    game.pits[21].seeds = 0;
    game.pits[22].seeds = 6;
    game.currentPlayer = "PLAYER_6";

    const capRes = evaluateAndExecuteCapture(game, 20);
    expect(capRes.capturedPitId).toBe(22);
    expect(capRes.capturedSeeds).toBe(6);
    expect(game.players.player6?.storage).toBe(6);
    expect(game.players.player6?.roundCaptured).toBe(6);
    expect(game.pits[22].seeds).toBe(0);
  });

  it("claims bonus unconditionally for pit owner in 6-player mode", () => {
    const game = createInitialGame("PLAYER_1", "local", null, undefined, 6);
    // P21 belongs to Player 6
    game.pits[21].seeds = 4;
    game.pits[21].bonusAvailable = true;

    expect(canClaimBonus(game, 21)).toBe(true);
    // Claim executed while current player is PLAYER_1
    const result = claimBonus(game, 21);
    expect(result.success).toBe(true);
    // Storage must go directly to Player 6
    expect(game.players.player6?.storage).toBe(4);
    expect(game.players.player1.storage).toBe(0);
    expect(game.pits[21].seeds).toBe(0);
    expect(game.pits[21].bonusAvailable).toBe(false);
  });

  it("executes round settlement sweeping seeds to owners and determining winner", () => {
    const game = createInitialGame("PLAYER_1", "local", null, undefined, 6);
    // Put seeds on player sides:
    // P1 (P0..P3): 10 seeds
    // P2 (P4..P7): 12 seeds
    // P3 (P8..P11): 14 seeds
    // P4 (P12..P15): 16 seeds
    // P5 (P16..P19): 18 seeds
    // P6 (P20..P23): 50 seeds
    for (let i = 0; i < 24; i++) game.pits[i].seeds = 0;
    game.pits[0].seeds = 10;
    game.pits[4].seeds = 12;
    game.pits[8].seeds = 14;
    game.pits[12].seeds = 16;
    game.pits[16].seeds = 18;
    game.pits[20].seeds = 50;

    const res = executeRoundSettlement(game);
    expect(res.success).toBe(true);
    expect(game.players.player1.storage).toBe(10);
    expect(game.players.player2.storage).toBe(12);
    expect(game.players.player3?.storage).toBe(14);
    expect(game.players.player4?.storage).toBe(16);
    expect(game.players.player5?.storage).toBe(18);
    expect(game.players.player6?.storage).toBe(50);
    expect(game.roundWinner).toBe("PLAYER_6");
    expect(game.players.player6?.roundWins).toBe(1);
    expect(verifySeedConservation(game)).toBe(true);
  });

  it("handles player elimination, seed removal, and next-round allocation", () => {
    const game = createInitialGame("PLAYER_1", "local", null, undefined, 6);
    // Player 1 has 3 seeds (< 5 seeds -> eliminated!)
    // Others have >= 5 seeds
    game.players.player1.storage = 3;
    game.players.player2.storage = 25;
    if (game.players.player3) game.players.player3.storage = 25;
    if (game.players.player4) game.players.player4.storage = 25;
    if (game.players.player5) game.players.player5.storage = 25;
    if (game.players.player6) game.players.player6.storage = 25;
    // Clear board pits
    for (const pit of game.pits) pit.seeds = 0;
    // Ensure total active seeds match 120 (3 + 5*25 = 128 -> let's make it exactly 120: 3 + 20 + 20 + 25 + 26 + 26 = 120)
    game.players.player2.storage = 20;
    if (game.players.player3) game.players.player3.storage = 20;
    if (game.players.player4) game.players.player4.storage = 25;
    if (game.players.player5) game.players.player5.storage = 26;
    if (game.players.player6) game.players.player6.storage = 26;

    expect(verifySeedConservation(game)).toBe(true);

    const setupRes = setupNextRound(game);
    expect(setupRes.success).toBe(true);

    // Player 1 should be eliminated
    expect(game.disqualifiedPlayers).toContain("PLAYER_1");
    // 20 seeds permanently removed
    expect(game.removedSeeds).toBe(20);
    // Remaining active players (5 players) allocated 20 seeds each into their 4 pits (5 seeds each)
    // 5 players * 20 seeds = 100 seeds + 20 removed seeds = 120 seeds total invariant
    expect(verifySeedConservation(game)).toBe(true);

    // Player 1 pits must be closed with 0 seeds
    for (let i = 0; i <= 3; i++) {
      expect(game.pits[i].status).toBe("CLOSED");
      expect(game.pits[i].seeds).toBe(0);
    }

    // Surviving players' pits should be open with 5 seeds each
    for (let i = 4; i <= 23; i++) {
      expect(game.pits[i].status).toBe("OPEN");
      expect(game.pits[i].seeds).toBe(5);
    }
  });

  it("computes accurate match rankings from 1st to 6th place", () => {
    const game = createInitialGame("PLAYER_1", "local", null, undefined, 6);
    // Disqualification elimination order:
    // 1st eliminated: Player 2 (6th place)
    // 2nd eliminated: Player 4 (5th place)
    // 3rd eliminated: Player 3 (4th place)
    // 4th eliminated: Player 5 (3rd place)
    // 5th eliminated: Player 6 (2nd place)
    // Surviving winner: Player 1 (1st place)
    game.disqualifiedPlayers = [
      "PLAYER_2",
      "PLAYER_4",
      "PLAYER_3",
      "PLAYER_5",
      "PLAYER_6",
    ];
    game.winner = "PLAYER_1";

    const rankings = computeMatchRankings(game, "PLAYER_1");
    expect(rankings.length).toBe(6);

    expect(rankings[0]).toMatchObject({ player: "PLAYER_1", rank: 1, label: "1st Place" });
    expect(rankings[1]).toMatchObject({ player: "PLAYER_6", rank: 2, label: "2nd Place" });
    expect(rankings[2]).toMatchObject({ player: "PLAYER_5", rank: 3, label: "3rd Place" });
    expect(rankings[3]).toMatchObject({ player: "PLAYER_3", rank: 4, label: "Lost" });
    expect(rankings[4]).toMatchObject({ player: "PLAYER_4", rank: 5, label: "Lost" });
    expect(rankings[5]).toMatchObject({ player: "PLAYER_2", rank: 6, label: "Lost" });
  });

  it("detects match over when <= 1 player remains active", () => {
    const game = createInitialGame("PLAYER_1", "local", null, undefined, 6);
    game.disqualifiedPlayers = [
      "PLAYER_2",
      "PLAYER_3",
      "PLAYER_4",
      "PLAYER_5",
      "PLAYER_6",
    ];

    expect(isMatchOver(game)).toBe(true);
    const endRes = checkAndHandleMatchEnd(game);
    expect(endRes.isMatchEnd).toBe(true);
    expect(endRes.winner).toBe("PLAYER_1");
    expect(game.phase).toBe("MATCH_END");
  });
});

